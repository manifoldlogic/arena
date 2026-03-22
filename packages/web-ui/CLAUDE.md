# web-ui

React dashboard for visualizing Arena competition data.

## Stack

- **React 19** + TypeScript
- **Tailwind CSS** with shadcn/ui component patterns (CSS variables, Radix primitives)
- **D3.js** for custom SVG visualizations (radar charts, heatmaps, timeline animations)
- **Observable Plot** for declarative statistical charts
- **Recharts** for standard line/bar/area charts
- **Framer Motion** for transitions and data-driven animations

## Conventions

- Components in `src/components/ui/` follow shadcn patterns (CVA + Radix + cn utility)
- Views in `src/views/` are page-level route components
- Custom D3 charts in `src/components/charts/` — each chart is a React component wrapping a D3 render
- Hooks in `src/hooks/` for data fetching, SSE subscriptions, computed analytics
- Use `@/` path alias for imports within this package

## Data

All competition data comes from the pipeline package via:
1. Static JSON files loaded at build time (for historical data)
2. SSE endpoint at `/events` for live round updates
