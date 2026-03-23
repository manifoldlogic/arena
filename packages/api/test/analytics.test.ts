import { describe, expect, test } from "bun:test";
import { join } from "path";
import {
  readRoundsFile,
  filterScoredRounds,
  filterCalibrationRounds,
} from "../src/parser";
import {
  getRoundDetails,
  getDivergenceSignals,
  getDimensionTotals,
  getBridgeRounds,
  getCalibrationRounds,
  getClosestCalls,
} from "../src/analytics";
import type { RoundResult } from "@arena/schemas";

const FIXTURE_PATH = join(import.meta.dir, "fixtures/sample-rounds.jsonl");

async function loadScoredRounds(): Promise<RoundResult[]> {
  const { rounds } = await readRoundsFile(FIXTURE_PATH);
  return filterScoredRounds(rounds);
}

describe("getRoundDetails", () => {
  test("returns all scored rounds sorted by round_id then competitor", async () => {
    const scored = await loadScoredRounds();
    const details = getRoundDetails(scored);
    expect(details).toHaveLength(9);
    // First entry: BR01 explore (alphabetically)
    expect(details[0].round_id).toBe("BR01");
    expect(details[0].competitor).toBe("explore");
    expect(details[0].total).toBe(8);
    // Second: BR01 maproom
    expect(details[1].round_id).toBe("BR01");
    expect(details[1].competitor).toBe("maproom");
    expect(details[1].total).toBe(11);
  });
});

describe("getDivergenceSignals", () => {
  test("computes spread correctly", async () => {
    const scored = await loadScoredRounds();
    const signals = getDivergenceSignals(scored);
    expect(signals.length).toBeGreaterThan(0);

    const r01 = signals.find((s) => s.round_id === "R01");
    expect(r01).toBeDefined();
    expect(r01!.spread).toBe(6); // 14 - 8
    expect(r01!.signal).toBe("signal");

    const r02 = signals.find((s) => s.round_id === "R02");
    expect(r02).toBeDefined();
    expect(r02!.spread).toBe(1); // 10 - 9
    expect(r02!.signal).toBe("gray");

    const r03 = signals.find((s) => s.round_id === "R03");
    expect(r03).toBeDefined();
    expect(r03!.spread).toBe(6); // 12 - 6
    expect(r03!.signal).toBe("signal");

    const br01 = signals.find((s) => s.round_id === "BR01");
    expect(br01).toBeDefined();
    expect(br01!.spread).toBe(3); // 11 - 8
    expect(br01!.signal).toBe("yellow");
  });

  test("classifies gray/yellow/signal correctly", async () => {
    const scored = await loadScoredRounds();
    const signals = getDivergenceSignals(scored);
    const grayCount = signals.filter((s) => s.signal === "gray").length;
    const yellowCount = signals.filter((s) => s.signal === "yellow").length;
    const signalCount = signals.filter((s) => s.signal === "signal").length;
    expect(grayCount).toBe(1); // R02
    expect(yellowCount).toBe(1); // BR01
    expect(signalCount).toBe(2); // R01, R03
  });
});

describe("getDimensionTotals", () => {
  test("matches expected scoreboard dimension totals", async () => {
    const scored = await loadScoredRounds();
    const dims = getDimensionTotals(scored);

    const baseline = dims.find((d) => d.competitor === "baseline");
    expect(baseline).toBeDefined();
    expect(baseline!.precision).toBe(2);
    expect(baseline!.recall).toBe(2);
    expect(baseline!.insight).toBe(2);

    const explore = dims.find((d) => d.competitor === "explore");
    expect(explore).toBeDefined();
    expect(explore!.precision).toBe(12);
    expect(explore!.recall).toBe(12);
    expect(explore!.insight).toBe(10);

    const maproom = dims.find((d) => d.competitor === "maproom");
    expect(maproom).toBeDefined();
    expect(maproom!.precision).toBe(15);
    expect(maproom!.recall).toBe(17);
    expect(maproom!.insight).toBe(15);
  });
});

describe("getBridgeRounds", () => {
  test("returns bridge round data with series1 scores", async () => {
    const scored = await loadScoredRounds();
    const bridges = getBridgeRounds(scored);
    expect(bridges).toHaveLength(2);

    const explore = bridges.find((b) => b.competitor === "explore");
    expect(explore).toBeDefined();
    expect(explore!.s2_total).toBe(8);
    expect(explore!.s1_precision).toBe(3);
    expect(explore!.s1_recall).toBe(3);
    expect(explore!.s1_insight).toBe(2);

    const maproom = bridges.find((b) => b.competitor === "maproom");
    expect(maproom).toBeDefined();
    expect(maproom!.s2_total).toBe(11);
    expect(maproom!.s1_precision).toBe(3);
    expect(maproom!.s1_recall).toBe(4);
    expect(maproom!.s1_insight).toBe(3);
  });
});

describe("getCalibrationRounds", () => {
  test("returns calibration round data", async () => {
    const { rounds } = await readRoundsFile(FIXTURE_PATH);
    const calRounds = filterCalibrationRounds(rounds);
    const entries = getCalibrationRounds(calRounds);
    expect(entries).toHaveLength(2);

    const explore = entries.find((e) => e.competitor === "explore");
    expect(explore).toBeDefined();
    expect(explore!.total).toBe(9);

    const maproom = entries.find((e) => e.competitor === "maproom");
    expect(maproom).toBeDefined();
    expect(maproom!.total).toBe(11);
  });
});

describe("getClosestCalls", () => {
  test("finds R02 as closest call (margin=1)", async () => {
    const scored = await loadScoredRounds();
    const calls = getClosestCalls(scored, 1);
    expect(calls).toHaveLength(1);
    expect(calls[0].round_id).toBe("R02");
    expect(calls[0].codebase).toBe("fastapi");
    expect(calls[0].margin).toBe(1);
    expect(calls[0].totals).toContain(9);
    expect(calls[0].totals).toContain(10);
  });

  test("with higher threshold finds more rounds", async () => {
    const scored = await loadScoredRounds();
    const calls = getClosestCalls(scored, 3);
    expect(calls.length).toBeGreaterThan(1);
  });
});
