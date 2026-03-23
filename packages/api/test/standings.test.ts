import { describe, expect, test } from "bun:test";
import { join } from "path";
import { readRoundsFile, filterScoredRounds } from "../src/parser";
import {
  computeStandings,
  computeStandingsByCodebase,
  computeStandingsByCategory,
  getCodebases,
  getCategories,
} from "../src/standings";
import type { RoundResult, CompetitorStanding } from "@arena/schemas";

const FIXTURE_PATH = join(import.meta.dir, "fixtures/sample-rounds.jsonl");

async function loadScoredRounds(): Promise<RoundResult[]> {
  const { rounds } = await readRoundsFile(FIXTURE_PATH);
  return filterScoredRounds(rounds);
}

function findStanding(
  standings: CompetitorStanding[],
  competitor: string,
): CompetitorStanding {
  const s = standings.find((s) => s.competitor === competitor);
  if (!s) throw new Error(`No standing for ${competitor}`);
  return s;
}

describe("computeStandings — overall", () => {
  test("matches expected scoreboard totals", async () => {
    const scored = await loadScoredRounds();
    const standings = computeStandings(scored);

    const maproom = findStanding(standings, "maproom");
    expect(maproom.total).toBe(47);
    expect(maproom.wins).toBe(4);
    expect(maproom.ties).toBe(0);
    expect(maproom.losses).toBe(0);
    expect(maproom.rounds).toBe(4);

    const explore = findStanding(standings, "explore");
    expect(explore.total).toBe(34);
    expect(explore.wins).toBe(0);
    expect(explore.ties).toBe(0);
    expect(explore.losses).toBe(4);
    expect(explore.rounds).toBe(4);

    const baseline = findStanding(standings, "baseline");
    expect(baseline.total).toBe(6);
    expect(baseline.wins).toBe(0);
    expect(baseline.ties).toBe(0);
    expect(baseline.losses).toBe(1);
    expect(baseline.rounds).toBe(1);
  });

  test("sorts by total descending", async () => {
    const scored = await loadScoredRounds();
    const standings = computeStandings(scored);
    expect(standings[0].competitor).toBe("maproom");
    expect(standings[1].competitor).toBe("explore");
    expect(standings[2].competitor).toBe("baseline");
  });

  test("computes avg correctly", async () => {
    const scored = await loadScoredRounds();
    const standings = computeStandings(scored);

    const maproom = findStanding(standings, "maproom");
    expect(maproom.avg).toBe(11.75); // 47/4

    const explore = findStanding(standings, "explore");
    expect(explore.avg).toBe(8.5); // 34/4

    const baseline = findStanding(standings, "baseline");
    expect(baseline.avg).toBe(6); // 6/1
  });
});

describe("computeStandings — tied-at-max both get WIN", () => {
  test("two competitors tied at max both get a win", () => {
    const rounds: RoundResult[] = [
      {
        schema_version: 1,
        round_id: "T01",
        competitor: "alpha",
        source: "score",
        is_calibration: false,
        total: 12,
        calls: 10,
        time_s: 30,
        round_type: "regular",
        codebase: "django",
        phase: 1,
      },
      {
        schema_version: 1,
        round_id: "T01",
        competitor: "beta",
        source: "score",
        is_calibration: false,
        total: 12,
        calls: 15,
        time_s: 40,
        round_type: "regular",
        codebase: "django",
        phase: 1,
      },
      {
        schema_version: 1,
        round_id: "T01",
        competitor: "gamma",
        source: "score",
        is_calibration: false,
        total: 8,
        calls: 20,
        time_s: 50,
        round_type: "regular",
        codebase: "django",
        phase: 1,
      },
    ];

    const standings = computeStandings(rounds);

    const alpha = findStanding(standings, "alpha");
    expect(alpha.wins).toBe(1);
    expect(alpha.ties).toBe(1);
    expect(alpha.losses).toBe(0);

    const beta = findStanding(standings, "beta");
    expect(beta.wins).toBe(1);
    expect(beta.ties).toBe(1);
    expect(beta.losses).toBe(0);

    const gamma = findStanding(standings, "gamma");
    expect(gamma.wins).toBe(0);
    expect(gamma.ties).toBe(0);
    expect(gamma.losses).toBe(1);
  });
});

describe("computeStandingsByCodebase", () => {
  test("django standings match expected", async () => {
    const scored = await loadScoredRounds();
    const standings = computeStandingsByCodebase(scored, "django");

    const maproom = findStanding(standings, "maproom");
    expect(maproom.total).toBe(26);
    expect(maproom.wins).toBe(2);
    expect(maproom.rounds).toBe(2);

    const explore = findStanding(standings, "explore");
    expect(explore.total).toBe(17);
    expect(explore.wins).toBe(0);
    expect(explore.losses).toBe(2);
    expect(explore.rounds).toBe(2);

    const baseline = findStanding(standings, "baseline");
    expect(baseline.total).toBe(6);
    expect(baseline.rounds).toBe(1);
  });

  test("fastapi standings match expected", async () => {
    const scored = await loadScoredRounds();
    const standings = computeStandingsByCodebase(scored, "fastapi");

    const maproom = findStanding(standings, "maproom");
    expect(maproom.total).toBe(21);
    expect(maproom.wins).toBe(2);
    expect(maproom.rounds).toBe(2);

    const explore = findStanding(standings, "explore");
    expect(explore.total).toBe(17);
    expect(explore.rounds).toBe(2);
  });
});

describe("computeStandingsByCategory", () => {
  test("configuration standings match expected", async () => {
    const scored = await loadScoredRounds();
    const standings = computeStandingsByCategory(scored, "configuration");

    const maproom = findStanding(standings, "maproom");
    expect(maproom.total).toBe(12);
    expect(maproom.wins).toBe(1);

    const explore = findStanding(standings, "explore");
    expect(explore.total).toBe(9);

    const baseline = findStanding(standings, "baseline");
    expect(baseline.total).toBe(6);
  });

  test("flow standings match expected", async () => {
    const scored = await loadScoredRounds();
    const standings = computeStandingsByCategory(scored, "flow");

    const maproom = findStanding(standings, "maproom");
    expect(maproom.total).toBe(21);
    expect(maproom.wins).toBe(2);

    const explore = findStanding(standings, "explore");
    expect(explore.total).toBe(17);
  });

  test("relationship standings match expected", async () => {
    const scored = await loadScoredRounds();
    const standings = computeStandingsByCategory(scored, "relationship");

    const maproom = findStanding(standings, "maproom");
    expect(maproom.total).toBe(14);

    const explore = findStanding(standings, "explore");
    expect(explore.total).toBe(8);
  });
});

describe("computeStandings — edge cases", () => {
  test("empty input returns empty standings", () => {
    const standings = computeStandings([]);
    expect(standings).toEqual([]);
  });

  test("single competitor in round gets a win", () => {
    const rounds: RoundResult[] = [
      {
        schema_version: 1,
        round_id: "S01",
        competitor: "solo",
        source: "score",
        is_calibration: false,
        total: 10,
        calls: 5,
        time_s: 20,
        round_type: "regular",
        codebase: "django",
        phase: 1,
      },
    ];
    const standings = computeStandings(rounds);
    expect(standings).toHaveLength(1);
    expect(standings[0].wins).toBe(1);
    expect(standings[0].ties).toBe(0);
    expect(standings[0].losses).toBe(0);
  });
});

describe("getCodebases / getCategories", () => {
  test("returns unique sorted codebases", async () => {
    const scored = await loadScoredRounds();
    expect(getCodebases(scored)).toEqual(["django", "fastapi"]);
  });

  test("returns unique sorted categories", async () => {
    const scored = await loadScoredRounds();
    expect(getCategories(scored)).toEqual([
      "configuration",
      "flow",
      "relationship",
    ]);
  });
});
