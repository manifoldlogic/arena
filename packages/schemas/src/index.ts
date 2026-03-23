/**
 * Arena JSONL Round Result Schema — TypeScript types
 *
 * Canonical definition: data/schema-definition.md
 * These types mirror the JSONL schema for use in the web-ui and tooling.
 */

export type RoundType = 'regular' | 'bridge' | 'calibration';
export type Source = 'agent' | 'score';
export type DivergenceSignal = 'gray' | 'yellow' | 'signal';

export type QueryCategory =
  | 'flow'
  | 'pattern'
  | 'relationship'
  | 'boundary'
  | 'lifecycle'
  | 'error-handling'
  | 'config'
  | 'performance'
  | 'security'
  | 'testing'
  | 'integration';

export interface BridgeScores {
  precision: number;
  recall: number;
  insight: number;
}

export interface RoundResult {
  schema_version: number;
  round_id: string;
  competitor: string;
  round_type: RoundType;
  codebase: string;
  phase: number;
  query_category?: QueryCategory;
  query_text?: string;

  // Judged quality (required for source="score")
  precision?: number;
  recall?: number;
  insight?: number;
  total?: number;

  // Measured efficiency (always required)
  calls: number;
  time_s: number;

  // Metadata
  source: Source;
  round_winner?: string | null;
  judge_notes?: string;
  divergence_signal?: DivergenceSignal;
  is_calibration: boolean;

  // Bridge data
  series1_scores?: BridgeScores;
  series1_baseline?: BridgeScores;

  // Timestamps
  timestamp?: string;
  session_id?: string;
}

export interface CompetitorStanding {
  competitor: string;
  total: number;
  wins: number;
  ties: number;
  losses: number;
  rounds: number;
  avg: number;
}

export interface CompetitionStatus {
  competition: string;
  codebase: string;
  competitors: string[];
  phase: number;
  status: 'pending' | 'in_progress' | 'completed';
  rounds_planned: number;
  rounds_completed: number;
}
