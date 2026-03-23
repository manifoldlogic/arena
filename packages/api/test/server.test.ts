import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { join } from "path";
import { startServer, type ServerHandle } from "../src/index";

const FIXTURE_PATH = join(import.meta.dir, "fixtures/sample-rounds.jsonl");

let server: ServerHandle;
let baseUrl: string;

beforeAll(() => {
  server = startServer({ port: 0, dataPath: FIXTURE_PATH });
  baseUrl = `http://localhost:${server.port}`;
});

afterAll(() => {
  server.close();
});

async function get(path: string): Promise<Response> {
  return fetch(`${baseUrl}${path}`);
}

async function getJson<T = unknown>(path: string): Promise<T> {
  const res = await get(path);
  expect(res.status).toBe(200);
  return res.json() as Promise<T>;
}

describe("health", () => {
  test("GET /api/health returns ok", async () => {
    const data = await getJson<{ status: string; rounds: number }>("/api/health");
    expect(data.status).toBe("ok");
    expect(data.rounds).toBe(9); // 9 scored non-calibration rounds
  });
});

describe("standings", () => {
  test("GET /api/standings returns overall standings", async () => {
    const standings = await getJson<Array<{ competitor: string; total: number }>>(
      "/api/standings",
    );
    expect(standings).toHaveLength(3);
    expect(standings[0].competitor).toBe("maproom");
    expect(standings[0].total).toBe(47);
  });

  test("GET /api/standings/django returns per-codebase standings", async () => {
    const standings = await getJson<Array<{ competitor: string; total: number }>>(
      "/api/standings/django",
    );
    expect(standings).toHaveLength(3);
    expect(standings[0].competitor).toBe("maproom");
    expect(standings[0].total).toBe(26);
  });

  test("GET /api/standings/fastapi returns fastapi standings", async () => {
    const standings = await getJson<Array<{ competitor: string; total: number }>>(
      "/api/standings/fastapi",
    );
    expect(standings).toHaveLength(2);
    expect(standings[0].total).toBe(21);
  });
});

describe("categories", () => {
  test("GET /api/categories returns list", async () => {
    const cats = await getJson<string[]>("/api/categories");
    expect(cats).toEqual(["configuration", "flow", "relationship"]);
  });

  test("GET /api/categories/flow returns standings", async () => {
    const standings = await getJson<Array<{ competitor: string; total: number }>>(
      "/api/categories/flow",
    );
    expect(standings).toHaveLength(2);
    expect(standings[0].competitor).toBe("maproom");
    expect(standings[0].total).toBe(21);
  });
});

describe("rounds", () => {
  test("GET /api/rounds returns round details", async () => {
    const rounds = await getJson<Array<{ round_id: string; competitor: string }>>(
      "/api/rounds",
    );
    expect(rounds).toHaveLength(9);
    // Sorted by round_id, competitor
    expect(rounds[0].round_id).toBe("BR01");
    expect(rounds[0].competitor).toBe("explore");
  });
});

describe("analytics", () => {
  test("GET /api/analytics/divergence returns signals", async () => {
    const signals = await getJson<Array<{ round_id: string; spread: number }>>(
      "/api/analytics/divergence",
    );
    expect(signals.length).toBeGreaterThan(0);
    const r01 = signals.find((s) => s.round_id === "R01");
    expect(r01!.spread).toBe(6);
  });

  test("GET /api/analytics/dimensions returns totals", async () => {
    const dims = await getJson<
      Array<{ competitor: string; precision: number; recall: number; insight: number }>
    >("/api/analytics/dimensions");
    const maproom = dims.find((d) => d.competitor === "maproom");
    expect(maproom!.precision).toBe(15);
    expect(maproom!.recall).toBe(17);
    expect(maproom!.insight).toBe(15);
  });

  test("GET /api/analytics/bridge returns bridge data", async () => {
    const bridges = await getJson<Array<{ round_id: string; competitor: string }>>(
      "/api/analytics/bridge",
    );
    expect(bridges).toHaveLength(2);
  });

  test("GET /api/analytics/calibration returns calibration data", async () => {
    const cal = await getJson<Array<{ round_id: string; total: number }>>(
      "/api/analytics/calibration",
    );
    expect(cal).toHaveLength(2);
  });

  test("GET /api/analytics/closest returns closest calls", async () => {
    const calls = await getJson<Array<{ round_id: string; margin: number }>>(
      "/api/analytics/closest",
    );
    expect(calls).toHaveLength(1);
    expect(calls[0].round_id).toBe("R02");
    expect(calls[0].margin).toBe(1);
  });

  test("GET /api/analytics/closest?margin=3 widens threshold", async () => {
    const calls = await getJson<Array<{ round_id: string }>>(
      "/api/analytics/closest?margin=3",
    );
    expect(calls.length).toBeGreaterThan(1);
  });
});

describe("codebases", () => {
  test("GET /api/codebases returns list", async () => {
    const codebases = await getJson<string[]>("/api/codebases");
    expect(codebases).toEqual(["django", "fastapi"]);
  });
});

describe("SSE", () => {
  test("GET /events returns event stream with connected event", async () => {
    const res = await get("/events");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");

    const reader = res.body!.getReader();
    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);
    expect(text).toContain("event: connected");
    expect(text).toContain("\"status\":\"ok\"");
    reader.cancel();
  });
});

describe("standings response shape", () => {
  test("includes avg field computed correctly", async () => {
    const standings = await getJson<
      Array<{ competitor: string; total: number; avg: number; wins: number; ties: number; losses: number; rounds: number }>
    >("/api/standings");
    const maproom = standings.find((s) => s.competitor === "maproom")!;
    expect(maproom.avg).toBe(11.75);
    expect(maproom.total).toBe(47);
    expect(maproom.wins).toBe(4);
    expect(maproom.ties).toBe(0);
    expect(maproom.losses).toBe(0);
    expect(maproom.rounds).toBe(4);
  });
});

describe("edge cases", () => {
  test("GET /api/standings/unknown-codebase returns empty array", async () => {
    const standings = await getJson<unknown[]>("/api/standings/unknown-codebase");
    expect(standings).toEqual([]);
  });

  test("GET /api/categories/unknown-category returns empty array", async () => {
    const standings = await getJson<unknown[]>("/api/categories/unknown-category");
    expect(standings).toEqual([]);
  });
});

describe("error handling", () => {
  test("GET /unknown returns 404", async () => {
    const res = await get("/unknown");
    expect(res.status).toBe(404);
  });

  test("CORS headers present on JSON responses", async () => {
    const res = await get("/api/health");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  test("OPTIONS preflight returns 204 with CORS headers", async () => {
    const res = await fetch(`${baseUrl}/api/standings`, { method: "OPTIONS" });
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
  });
});

