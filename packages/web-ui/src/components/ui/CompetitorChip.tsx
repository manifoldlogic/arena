import { getCompetitorColor } from '@/lib/competitor-colors';
import { CompetitorGlyph } from './CompetitorGlyph';

interface CompetitorChipProps {
  competitor: string;
  className?: string;
}

/**
 * Compact chip showing a competitor glyph + name.
 * Transparent background, 1px border in competitor color, 3px left accent.
 */
export function CompetitorChip({ competitor, className }: CompetitorChipProps) {
  const color = getCompetitorColor(competitor);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs font-medium text-foreground ${className ?? ''}`}
      style={{
        border: `1px solid ${color}`,
        borderLeftWidth: 3,
        borderLeftColor: color,
      }}
    >
      <CompetitorGlyph competitor={competitor} size={14} />
      {competitor}
    </span>
  );
}
