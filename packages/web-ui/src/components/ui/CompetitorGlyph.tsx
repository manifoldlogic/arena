import { getCompetitorColor } from '@/lib/competitor-colors';

interface CompetitorGlyphProps {
  competitor: string;
  size?: number;
  className?: string;
}

/** 16x16 SVG glyph with a distinct shape per known competitor. */
export function CompetitorGlyph({ competitor, size = 16, className }: CompetitorGlyphProps) {
  const color = getCompetitorColor(competitor);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {glyphFor(competitor, color)}
    </svg>
  );
}

function glyphFor(competitor: string, color: string) {
  switch (competitor) {
    // maproom — branching tree / index icon
    case 'maproom':
      return (
        <g stroke={color} strokeWidth={1.5} strokeLinecap="round">
          {/* trunk */}
          <line x1={4} y1={3} x2={4} y2={13} />
          {/* branches */}
          <line x1={4} y1={5} x2={11} y2={5} />
          <line x1={4} y1={8} x2={9} y2={8} />
          <line x1={4} y1={11} x2={12} y2={11} />
        </g>
      );

    // explore — magnifying glass
    case 'explore':
      return (
        <g stroke={color} strokeWidth={1.5} strokeLinecap="round" fill="none">
          <circle cx={7} cy={7} r={4} />
          <line x1={10} y1={10} x2={13.5} y2={13.5} />
        </g>
      );

    // maproom-skill — diamond
    case 'maproom-skill':
      return (
        <rect
          x={3}
          y={3}
          width={10}
          height={10}
          rx={2}
          stroke={color}
          strokeWidth={1.5}
          fill="none"
          transform="rotate(45 8 8)"
        />
      );

    // ast-grep — tree
    case 'ast-grep':
      return (
        <g stroke={color} strokeWidth={1.5} strokeLinecap="round" fill="none">
          {/* trunk */}
          <line x1={8} y1={10} x2={8} y2={14} />
          {/* canopy */}
          <polygon points="8,2 3,10 13,10" stroke={color} strokeWidth={1.5} fill="none" />
        </g>
      );

    // fallback — rounded square
    default:
      return (
        <rect
          x={3}
          y={3}
          width={10}
          height={10}
          rx={2}
          stroke={color}
          strokeWidth={1.5}
          fill="none"
          transform="rotate(45 8 8)"
        />
      );
  }
}
