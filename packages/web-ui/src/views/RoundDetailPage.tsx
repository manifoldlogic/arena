import { useParams, Link } from 'react-router-dom';
import { useRoundDetail } from '@/hooks/useRoundDetail';
import { computeRadarData } from '@/lib/round-transforms';
import { DimensionRadar } from '@/components/charts/DimensionRadar';
import { ScoreComparisonBar } from '@/components/rounds/ScoreComparisonBar';
import { EfficiencyPanel } from '@/components/rounds/EfficiencyPanel';
import { JudgeNotesPanel } from '@/components/rounds/JudgeNotesPanel';
import { BridgeRoundPanel } from '@/components/rounds/BridgeRoundPanel';
import { DivergenceBadge } from '@/components/rounds/DivergenceBadge';

export function RoundDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { group, loading } = useRoundDetail(id);

  if (loading) {
    return <p className="text-sm text-slate-500 py-8">Loading round data...</p>;
  }

  if (!group) {
    return (
      <div className="py-12 text-center">
        <p className="text-slate-500 mb-4">Round not found: {id}</p>
        <Link to="/rounds" className="text-indigo-600 hover:text-indigo-800 text-sm">
          Back to rounds
        </Link>
      </div>
    );
  }

  const radarSeries = computeRadarData(group.results);
  const winner = group.results.find((r) => r.round_winner)?.round_winner;
  const divergence = group.results.find((r) => r.divergence_signal)?.divergence_signal;
  const isBridge = group.roundType === 'bridge';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link to="/rounds" className="text-sm text-indigo-600 hover:text-indigo-800">
          &larr; All Rounds
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">{group.roundId}</h1>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-sm text-slate-500">{group.codebase}</span>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {group.roundType}
          </span>
          <DivergenceBadge signal={divergence} />
          {winner && (
            <span className="text-sm text-slate-600">
              Winner: <span className="font-medium">{winner}</span>
            </span>
          )}
        </div>
      </div>

      {/* Radar + Score Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Dimension Radar</h2>
          <DimensionRadar series={radarSeries} />
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Score Comparison</h2>
          <ScoreComparisonBar results={group.results} />
        </section>
      </div>

      {/* Efficiency */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Efficiency</h2>
        <EfficiencyPanel results={group.results} />
      </section>

      {/* Bridge Panel (only for bridge rounds) */}
      {isBridge && (
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Bridge Deltas</h2>
          <BridgeRoundPanel results={group.results} />
        </section>
      )}

      {/* Judge Notes */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Judge Notes</h2>
        <JudgeNotesPanel results={group.results} />
      </section>
    </div>
  );
}
