/**
 * Arena API server — Bun HTTP server with SSE and REST endpoints.
 *
 * Endpoints:
 *   GET /api/standings                — overall standings
 *   GET /api/standings/:codebase      — per-codebase standings
 *   GET /api/categories/:category     — per-category standings
 *   GET /api/rounds                   — round-by-round details
 *   GET /api/analytics/divergence     — divergence signals
 *   GET /api/analytics/dimensions     — dimension totals
 *   GET /api/analytics/bridge         — bridge rounds
 *   GET /api/analytics/calibration    — calibration rounds
 *   GET /api/analytics/closest        — closest calls
 *   GET /api/codebases                — list of codebases
 *   GET /api/categories               — list of query categories
 *   GET /api/health                   — health check
 *   GET /events                       — SSE stream (pushes on file change)
 */
import { resolve } from "path";
import { readRoundsFile, filterScoredRounds, filterCalibrationRounds } from "./parser";
import {
  computeStandings,
  computeStandingsByCodebase,
  computeStandingsByCategory,
  getCodebases,
  getCategories,
} from "./standings";
import {
  getRoundDetails,
  getDivergenceSignals,
  getDimensionTotals,
  getBridgeRounds,
  getCalibrationRounds,
  getClosestCalls,
} from "./analytics";
import { watchFile } from "./watcher";
import type { RoundResult } from "@arena/schemas";

const DEFAULT_PORT = 3001;
const DEFAULT_DATA_PATH = resolve(import.meta.dir, "../../../data/rounds.jsonl");

export interface ServerConfig {
  port?: number;
  dataPath?: string;
}

export interface ServerHandle {
  port: number;
  close(): void;
}

/** Cached parsed data, invalidated on file change. */
let cachedScoredRounds: RoundResult[] | null = null;
let cachedCalibrationRounds: RoundResult[] | null = null;
let dataPath: string = DEFAULT_DATA_PATH;

async function loadData(): Promise<void> {
  const result = await readRoundsFile(dataPath);
  cachedScoredRounds = filterScoredRounds(result.rounds);
  cachedCalibrationRounds = filterCalibrationRounds(result.rounds);
}

function getScoredRounds(): RoundResult[] {
  return cachedScoredRounds ?? [];
}

function getCalRounds(): RoundResult[] {
  return cachedCalibrationRounds ?? [];
}

function invalidateCache(): void {
  cachedScoredRounds = null;
  cachedCalibrationRounds = null;
}

// SSE client management
const sseClients = new Set<ReadableStreamDefaultController>();

function broadcastSSE(event: string, data: unknown): void {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const controller of sseClients) {
    try {
      controller.enqueue(new TextEncoder().encode(message));
    } catch {
      sseClients.delete(controller);
    }
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function cors(response: Response): Response {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

async function handleRequest(req: Request): Promise<Response> {
  try {
    return await routeRequest(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return json({ error: message }, 500);
  }
}

async function routeRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  // CORS preflight
  if (req.method === "OPTIONS") {
    return cors(new Response(null, { status: 204 }));
  }

  // SSE endpoint
  if (path === "/events") {
    let sseController: ReadableStreamDefaultController;
    const stream = new ReadableStream({
      start(controller) {
        sseController = controller;
        sseClients.add(controller);
        // Send initial connection message
        const msg = `event: connected\ndata: ${JSON.stringify({ status: "ok" })}\n\n`;
        controller.enqueue(new TextEncoder().encode(msg));
      },
      cancel() {
        sseClients.delete(sseController);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // Ensure data is loaded
  if (!cachedScoredRounds) {
    try {
      await loadData();
    } catch {
      return json({ error: "Data file not available" }, 503);
    }
  }

  const scored = getScoredRounds();
  const calRounds = getCalRounds();

  // REST endpoints
  if (path === "/api/health") {
    return json({ status: "ok", rounds: scored.length });
  }

  if (path === "/api/standings") {
    return json(computeStandings(scored));
  }

  // /api/standings/:codebase
  const standingsMatch = path.match(/^\/api\/standings\/(.+)$/);
  if (standingsMatch) {
    const codebase = decodeURIComponent(standingsMatch[1]);
    return json(computeStandingsByCodebase(scored, codebase));
  }

  // /api/categories/:category
  const categoryMatch = path.match(/^\/api\/categories\/(.+)$/);
  if (categoryMatch) {
    const category = decodeURIComponent(categoryMatch[1]);
    return json(computeStandingsByCategory(scored, category));
  }

  if (path === "/api/rounds") {
    return json(getRoundDetails(scored));
  }

  if (path === "/api/analytics/divergence") {
    return json(getDivergenceSignals(scored));
  }

  if (path === "/api/analytics/dimensions") {
    return json(getDimensionTotals(scored));
  }

  if (path === "/api/analytics/bridge") {
    return json(getBridgeRounds(scored));
  }

  if (path === "/api/analytics/calibration") {
    return json(getCalibrationRounds(calRounds));
  }

  if (path === "/api/analytics/closest") {
    const parsed = parseInt(url.searchParams.get("margin") ?? "1", 10);
    const margin = Number.isNaN(parsed) ? 1 : parsed;
    return json(getClosestCalls(scored, margin));
  }

  if (path === "/api/codebases") {
    return json(getCodebases(scored));
  }

  if (path === "/api/categories") {
    return json(getCategories(scored));
  }

  return json({ error: "Not found" }, 404);
}

/** Start the API server. Returns a handle to close it. */
export function startServer(config?: ServerConfig): ServerHandle {
  const port = config?.port ?? parseInt(process.env.PORT ?? String(DEFAULT_PORT), 10);
  dataPath = config?.dataPath ?? process.env.DATA_PATH ?? DEFAULT_DATA_PATH;

  // Load data initially
  loadData().catch((err) => {
    console.warn(`Warning: could not load data from ${dataPath}: ${err.message}`);
  });

  // Watch for file changes
  const fileWatcher = watchFile(dataPath, async () => {
    invalidateCache();
    try {
      await loadData();
      broadcastSSE("update", { type: "rounds_updated", timestamp: new Date().toISOString() });
    } catch {
      // File may be temporarily unavailable during atomic write
    }
  });

  const server = Bun.serve({
    port,
    fetch: handleRequest,
  });

  console.log(`Arena API server listening on http://localhost:${server.port}`);

  return {
    port: server.port,
    close() {
      fileWatcher.close();
      server.stop();
    },
  };
}

// Auto-start when run directly
if (import.meta.main) {
  startServer();
}
