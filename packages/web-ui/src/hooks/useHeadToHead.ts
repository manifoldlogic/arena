import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  computeH2HAverages,
  computeMargins,
  computeRadarData,
  computeCategoryMatrix,
} from '@/lib/round-transforms';
import type {
  H2HAverages,
  MarginDataPoint,
  RadarSeries,
  CategoryMatrixRow,
} from '@/lib/round-transforms';
import { MOCK_ROUNDS } from '@/data/mock-rounds';

export interface UseHeadToHeadResult {
  competitorA: string;
  competitorB: string;
  setCompetitors: (a: string, b: string) => void;
  competitors: string[];
  averages: H2HAverages | null;
  margins: MarginDataPoint[];
  radarSeries: RadarSeries[];
  categoryMatrix: CategoryMatrixRow[];
}

/**
 * Manages head-to-head comparison state with URL search params
 * for competitor selection.
 */
export function useHeadToHead(): UseHeadToHeadResult {
  const [searchParams, setSearchParams] = useSearchParams();

  const competitors = useMemo(() => {
    const set = new Set(MOCK_ROUNDS.map((r) => r.competitor));
    return [...set].sort();
  }, []);

  const competitorA = searchParams.get('a') ?? competitors[0] ?? '';
  const competitorB = searchParams.get('b') ?? competitors[1] ?? '';

  const setCompetitors = (a: string, b: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('a', a);
      next.set('b', b);
      return next;
    });
  };

  const averages = useMemo(
    () => computeH2HAverages(MOCK_ROUNDS, competitorA, competitorB),
    [competitorA, competitorB],
  );

  const margins = useMemo(
    () => computeMargins(MOCK_ROUNDS, competitorA, competitorB),
    [competitorA, competitorB],
  );

  const radarSeries = useMemo(() => {
    if (!averages) return [];
    // Build synthetic RoundResults from averages for radar display
    return computeRadarData([
      {
        schema_version: 1,
        round_id: '_avg',
        competitor: competitorA,
        round_type: 'regular',
        codebase: '',
        phase: 0,
        precision: averages.avgA.precision,
        recall: averages.avgA.recall,
        insight: averages.avgA.insight,
        total: averages.avgA.total,
        calls: 0,
        time_s: 0,
        source: 'score',
        is_calibration: false,
      },
      {
        schema_version: 1,
        round_id: '_avg',
        competitor: competitorB,
        round_type: 'regular',
        codebase: '',
        phase: 0,
        precision: averages.avgB.precision,
        recall: averages.avgB.recall,
        insight: averages.avgB.insight,
        total: averages.avgB.total,
        calls: 0,
        time_s: 0,
        source: 'score',
        is_calibration: false,
      },
    ]);
  }, [averages, competitorA, competitorB]);

  const categoryMatrix = useMemo(
    () => computeCategoryMatrix(MOCK_ROUNDS, competitorA, competitorB),
    [competitorA, competitorB],
  );

  return {
    competitorA,
    competitorB,
    setCompetitors,
    competitors,
    averages,
    margins,
    radarSeries,
    categoryMatrix,
  };
}
