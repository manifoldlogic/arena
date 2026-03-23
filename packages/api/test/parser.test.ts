import { describe, expect, test } from "bun:test";
import { join } from "path";
import {
  parseRoundsJsonl,
  readRoundsFile,
  filterScoredRounds,
  filterCalibrationRounds,
} from "../src/parser";

const FIXTURE_PATH = join(import.meta.dir, "fixtures/sample-rounds.jsonl");

describe("parseRoundsJsonl", () => {
  test("parses valid JSONL lines", () => {
    const content = `{"schema_version":1,"round_id":"R01","competitor":"maproom","source":"score","is_calibration":false,"calls":18,"time_s":45.2,"round_type":"regular","codebase":"django","phase":1,"total":14}`;
    const result = parseRoundsJsonl(content);
    expect(result.rounds).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
    expect(result.rounds[0].competitor).toBe("maproom");
    expect(result.rounds[0].total).toBe(14);
  });

  test("skips empty lines", () => {
    const content = `{"schema_version":1,"round_id":"R01","competitor":"a","source":"score","is_calibration":false,"calls":1,"time_s":1.0,"round_type":"regular","codebase":"x","phase":1}\n\n`;
    const result = parseRoundsJsonl(content);
    expect(result.rounds).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });

  test("collects JSON parse errors", () => {
    const content = `not-json\n{"schema_version":1,"round_id":"R01","competitor":"a","source":"score","is_calibration":false,"calls":1,"time_s":1.0,"round_type":"regular","codebase":"x","phase":1}`;
    const result = parseRoundsJsonl(content);
    expect(result.rounds).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].line).toBe(1);
  });

  test("empty string returns no rounds and no errors", () => {
    const result = parseRoundsJsonl("");
    expect(result.rounds).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  test("whitespace-only content returns no rounds and no errors", () => {
    const result = parseRoundsJsonl("  \n  \n  ");
    expect(result.rounds).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  test("collects validation errors for missing fields", () => {
    const content = `{"round_id":"R01"}`;
    const result = parseRoundsJsonl(content);
    expect(result.rounds).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toBe("Missing required fields");
  });
});

describe("readRoundsFile", () => {
  test("reads and parses sample fixture", async () => {
    const result = await readRoundsFile(FIXTURE_PATH);
    expect(result.rounds.length).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
    // Fixture has 12 lines (some score, some agent, some calibration)
    expect(result.rounds).toHaveLength(12);
  });
});

describe("filterScoredRounds", () => {
  test("excludes agent and calibration rounds", async () => {
    const { rounds } = await readRoundsFile(FIXTURE_PATH);
    const scored = filterScoredRounds(rounds);
    // Scored non-calibration: R01(2) + R02(2) + R03(3) + BR01(2) = 9
    // Excluded: 1 agent line + 2 calibration lines = 3
    expect(scored).toHaveLength(9);
    expect(scored.every((r) => r.source === "score")).toBe(true);
    expect(scored.every((r) => !r.is_calibration)).toBe(true);
  });
});

describe("filterCalibrationRounds", () => {
  test("returns only calibration rounds", async () => {
    const { rounds } = await readRoundsFile(FIXTURE_PATH);
    const cal = filterCalibrationRounds(rounds);
    expect(cal).toHaveLength(2);
    expect(cal.every((r) => r.is_calibration)).toBe(true);
  });
});
