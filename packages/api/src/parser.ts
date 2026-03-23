/**
 * JSONL parser for rounds.jsonl — reads, parses, and filters round data.
 *
 * Only source="score" lines with is_calibration=false are used for standings.
 */
import type { RoundResult } from "@arena/schemas";

export interface ParseResult {
  rounds: RoundResult[];
  errors: ParseError[];
}

export interface ParseError {
  line: number;
  raw: string;
  message: string;
}

/** Parse a JSONL string into RoundResult[], collecting parse errors. */
export function parseRoundsJsonl(content: string): ParseResult {
  const rounds: RoundResult[] = [];
  const errors: ParseError[] = [];

  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (raw === "") continue;

    try {
      const obj = JSON.parse(raw);
      if (!isValidRoundResult(obj)) {
        errors.push({ line: i + 1, raw, message: "Missing required fields" });
        continue;
      }
      rounds.push(obj as RoundResult);
    } catch (e) {
      errors.push({
        line: i + 1,
        raw,
        message: e instanceof Error ? e.message : "Invalid JSON",
      });
    }
  }

  return { rounds, errors };
}

/** Read and parse a JSONL file from disk. */
export async function readRoundsFile(path: string): Promise<ParseResult> {
  const file = Bun.file(path);
  const content = await file.text();
  return parseRoundsJsonl(content);
}

/** Filter to only scored, non-calibration rounds (used for standings). */
export function filterScoredRounds(rounds: RoundResult[]): RoundResult[] {
  return rounds.filter(
    (r) => r.source === "score" && !r.is_calibration,
  );
}

/** Filter to only calibration rounds. */
export function filterCalibrationRounds(rounds: RoundResult[]): RoundResult[] {
  return rounds.filter(
    (r) => r.source === "score" && r.is_calibration,
  );
}

/** Minimal validation: check required fields exist. */
function isValidRoundResult(obj: unknown): boolean {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.schema_version === "number" &&
    typeof o.round_id === "string" &&
    typeof o.competitor === "string" &&
    typeof o.source === "string" &&
    typeof o.is_calibration === "boolean" &&
    typeof o.calls === "number" &&
    typeof o.time_s === "number"
  );
}
