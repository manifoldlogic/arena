# Arena Visual Identity

> **Rigorous, earned, legible — the proving ground aesthetic.**

Arena's visual language reflects the competition it measures: precise, fair, and transparent. Every color has a semantic role. Every token has a reason. If something is decorative, it does not belong here.

---

## Design Principles

1. **Earned, not decorative.** Color encodes meaning — competitor identity, dimension category, or operational status. Nothing is colored "because it looks nice."
2. **Legible in every mode.** Every token has light and dark variants in `index.css`. Components never assume a theme.
3. **Single-source tokens.** CSS custom properties in `:root` / `.dark` are the authority. TypeScript reads them at runtime via `cssVar()`. No duplication.
4. **Chart consistency.** All visualizations route through `getCompetitorColor()` for per-competitor colors and `cssVar()` for semantic tokens. D3, Recharts, and Observable Plot all use the same palette.

---

## Token Vocabulary

All CSS custom properties are defined in `src/index.css` using HSL channel format (e.g., `217 91% 65%`). Tailwind and shadcn consume them as `hsl(var(--token))`.

### Surface & Text

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `--background` | `0 0% 100%` | `222.2 84% 4.9%` | Page background |
| `--foreground` | `222.2 84% 4.9%` | `210 40% 98%` | Primary text |
| `--card` | `0 0% 100%` | `222.2 84% 4.9%` | Card / panel background |
| `--card-foreground` | `222.2 84% 4.9%` | `210 40% 98%` | Card text |
| `--popover` | `0 0% 100%` | `222.2 84% 4.9%` | Popover / dropdown background |
| `--popover-foreground` | `222.2 84% 4.9%` | `210 40% 98%` | Popover text |
| `--muted` | `210 40% 96%` | `217.2 32.6% 17.5%` | De-emphasized surface (empty states, disabled areas) |
| `--muted-foreground` | `215.4 16.3% 46.9%` | `215 20.2% 65.1%` | Secondary / helper text |

### Interactive

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `--primary` | `221.2 83.2% 53.3%` | `217.2 91.2% 59.8%` | Primary actions, active states |
| `--primary-foreground` | `210 40% 98%` | `222.2 47.4% 11.2%` | Text on primary-colored surfaces |
| `--secondary` | `210 40% 96%` | `217.2 32.6% 17.5%` | Secondary actions, subtle buttons |
| `--secondary-foreground` | `222.2 47.4% 11.2%` | `210 40% 98%` | Text on secondary surfaces |
| `--accent` | `210 40% 96%` | `217.2 32.6% 17.5%` | Hover highlights, selected rows |
| `--accent-foreground` | `222.2 47.4% 11.2%` | `210 40% 98%` | Text on accent surfaces |
| `--destructive` | `0 84.2% 60.2%` | `0 62.8% 30.6%` | Destructive actions (delete, reset) |
| `--destructive-foreground` | `210 40% 98%` | `210 40% 98%` | Text on destructive surfaces |

### Form & Layout

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `--border` | `214.3 31.8% 91.4%` | `217.2 32.6% 17.5%` | Borders, dividers |
| `--input` | `214.3 31.8% 91.4%` | `217.2 32.6% 17.5%` | Input field borders |
| `--ring` | `221.2 83.2% 53.3%` | `224.3 76.3% 48%` | Focus rings |
| `--radius` | `0.5rem` | `0.5rem` | Border radius (shared across themes) |

### Competitor Role Colors

Positional colors for head-to-head views (A vs B). These do **not** identify a specific competitor — they identify a slot.

| Token | Light | Dark | Role |
|---|---|---|---|
| `--competitor-a` | `217 91% 65%` | `217 91% 70%` | First competitor slot (blue) |
| `--competitor-b` | `24 100% 65%` | `24 100% 70%` | Second competitor slot (orange) |

TypeScript accessors: `competitorA()`, `competitorB()` from `lib/competitor-colors.ts`.

### Dimension Colors

Used in radar charts and dimension breakdowns to distinguish scoring axes.

| Token | Light | Dark | Dimension |
|---|---|---|---|
| `--dim-precision` | `217 91% 65%` | `217 91% 70%` | Precision — blue |
| `--dim-recall` | `142 76% 50%` | `142 76% 55%` | Recall — green |
| `--dim-insight` | `280 67% 60%` | `280 67% 65%` | Insight — purple |

TypeScript accessors: `dimPrecision()`, `dimRecall()`, `dimInsight()` from `lib/competitor-colors.ts`.

### Signal Colors

Status indicators for operational state. Used in badges, status dots, and conditional formatting.

| Token | Light | Dark | Meaning |
|---|---|---|---|
| `--signal-ok` | `142 76% 50%` | `142 76% 55%` | Success / healthy — green |
| `--signal-warn` | `45 90% 60%` | `45 90% 65%` | Warning / attention — amber |
| `--signal-alert` | `0 84% 60%` | `0 84% 65%` | Error / critical — red |

TypeScript accessors: `signalOk()`, `signalWarn()`, `signalAlert()` from `lib/competitor-colors.ts`.

### Chart Chrome

Structural elements inside chart SVGs (gridlines, axis labels).

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `--chart-grid` | `220 13% 91%` | `220 13% 20%` | Gridlines and tick marks |
| `--chart-axis` | `220 9% 46%` | `220 9% 55%` | Axis labels and axis lines |

---

## Competitor Color Palette

Per-competitor colors for multi-competitor views (leaderboards, timelines, radar overlays). Defined in `src/lib/competitor-colors.ts`.

| Competitor | Hex | Visual | Use |
|---|---|---|---|
| `claude-code` | `#6366f1` | Indigo | Named palette |
| `codex-cli` | `#f59e0b` | Amber | Named palette |
| `gemini-cli` | `#10b981` | Emerald | Named palette |
| `aider` | `#ef4444` | Red | Named palette |
| `cursor` | `#8b5cf6` | Violet | Named palette |
| `copilot` | `#3b82f6` | Blue | Named palette |
| `windsurf` | `#06b6d4` | Cyan | Named palette |

Unknown competitors receive a deterministic fallback from a hashed index into: pink, orange, teal, purple, slate, lime, rose, sky.

**Access:** Always use `getCompetitorColor(name)` — never index the palette directly.

---

## Competitor Colors vs Role Colors

These are two separate systems. Do not confuse them.

| System | Source | When to use |
|---|---|---|
| **Named palette** (`getCompetitorColor()`) | `competitor-colors.ts` PALETTE | Multi-competitor views: leaderboards, radar overlays, round tables |
| **Role tokens** (`--competitor-a`, `--competitor-b`) | CSS variables in `index.css` | Head-to-head views where position matters, not identity |

---

## Using Colors in Code

### In React / Tailwind components

```tsx
// Surface tokens — use Tailwind classes
<div className="bg-background text-foreground" />
<span className="text-muted-foreground" />

// Semantic tokens via inline hsl()
<div style={{ color: 'hsl(var(--signal-ok))' }} />
```

### In D3 / SVG charts

```ts
import { cssVar } from '@/lib/cssVar';
import { getCompetitorColor } from '@/lib/competitor-colors';

// Per-competitor color
const fill = getCompetitorColor(competitor);

// Semantic token (theme-aware)
const gridColor = `hsl(${cssVar('--chart-grid')})`;
```

### TypeScript semantic accessors

```ts
import {
  competitorA, competitorB,
  dimPrecision, dimRecall, dimInsight,
  signalOk, signalWarn, signalAlert,
} from '@/lib/competitor-colors';

// Returns e.g. "hsl(217 91% 65%)" — already wrapped
const color = dimPrecision();
```

---

## Do Not

1. **No `slate-*` Tailwind classes in components.** Use semantic tokens (`bg-muted`, `text-muted-foreground`, `border-border`). Hardcoded Tailwind color classes bypass theming.

2. **No hardcoded hex values in D3 or SVG code.** Use `getCompetitorColor()` for competitor fills. Use `cssVar('--token')` wrapped in `hsl()` for everything else.

3. **No chart that bypasses `getCompetitorColor()`.** Every visualization that colors by competitor must call `getCompetitorColor(name)` or use `buildColorMap()` / `resolveColorMap()`. This guarantees palette consistency and stable fallbacks for unknown competitors.

4. **Always use `cssVar()` for D3 token reads.** Never call `getComputedStyle()` directly. The `cssVar()` utility handles SSR safety (returns `''` outside browser) and is the single point of access.

5. **No raw HSL strings copied from `index.css`.** If you need a color value in TypeScript, use the accessor functions (`dimPrecision()`, `signalOk()`, etc.) or `cssVar()`. Copying HSL values creates drift when tokens change.

6. **No theme assumptions.** Never assume light or dark mode. Every color must come from a CSS variable or a function that reads one.
