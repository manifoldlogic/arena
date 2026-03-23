import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { join } from "path";
import { startServer, type ServerHandle } from "../src/index";

const FIXTURE_PATH = join(import.meta.dir, "fixtures/sample-rounds.jsonl");
const SEASONS_FIXTURE_PATH = join(import.meta.dir, "fixtures/sample-seasons.json");

let server: ServerHandle;
let baseUrl: string;

beforeAll(() => {
  server = startServer({ port: 0, dataPath: FIXTURE_PATH, seasonsPath: SEASONS_FIXTURE_PATH });
  baseUrl = `http://localhost:${server.port}`;
});

afterAll(() => {
  server.close();
});

describe("seasons endpoint", () => {
  test("GET /api/seasons returns seasons data", async () => {
    const res = await fetch(`${baseUrl}/api/seasons`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.seasons).toHaveLength(1);
    expect(data.seasons[0].id).toBe("s1");
    expect(data.seasons[0].name).toBe("The Mattermost Campaign");
    expect(data.seasons[0].codebase).toBe("mattermost-webapp");
  });

  test("seasons contain chapters with correct structure", async () => {
    const res = await fetch(`${baseUrl}/api/seasons`);
    const data = await res.json();
    const chapters = data.seasons[0].chapters;
    expect(chapters).toHaveLength(2);

    const ch1 = chapters[0];
    expect(ch1.id).toBe("s1-ch1");
    expect(ch1.name).toBe("First Contact");
    expect(ch1.round_range).toEqual(["R19", "R22"]);
    expect(ch1.status).toBe("closed");
    expect(ch1.thesis).toBeUndefined();

    const ch2 = chapters[1];
    expect(ch2.id).toBe("s1-ch2");
    expect(ch2.name).toBe("Pattern Recognition");
    expect(ch2.round_range).toEqual(["R23", "R27"]);
    expect(ch2.status).toBe("in_progress");
    expect(ch2.thesis).toBe("Structured traversal wins.");
  });

  test("seasons response has CORS headers", async () => {
    const res = await fetch(`${baseUrl}/api/seasons`);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("seasons with missing file", () => {
  let badServer: ServerHandle;
  let badBaseUrl: string;

  beforeAll(() => {
    badServer = startServer({
      port: 0,
      dataPath: FIXTURE_PATH,
      seasonsPath: "/nonexistent/seasons.json",
    });
    badBaseUrl = `http://localhost:${badServer.port}`;
  });

  afterAll(() => {
    badServer.close();
  });

  test("GET /api/seasons returns 503 when file missing", async () => {
    const res = await fetch(`${badBaseUrl}/api/seasons`);
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toBe("Seasons data not available");
  });
});
