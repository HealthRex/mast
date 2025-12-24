# Harmdash Architecture Primer

## Overview
Harmdash is a Next.js dashboard that benchmarks medical-AI “harm” outcomes. CSV metrics/metadata are normalized into a JSON artifact and rendered via Plotly charts plus a radar profile for each model/team/condition combination.

## Repository Layout
- `data/` – source CSVs (`metrics.csv`, `metadata.csv`)
- `frontend/`
  - `scripts/build-data.mjs` – CSV→JSON pipeline (also emits `combination-index.json` for search)
  - `public/data/ai-harm-summary.json` – derived dataset consumed at runtime
  - `src/` – TypeScript app (components, hooks, utils, config)
- `render.yaml` – Render.com deployment blueprint

## Data Flow
1. `npm run prepare-data` → `build-data.mjs`
   - Validates via Zod, coerces numerics, strips HTML labels
   - Normalizes team/condition strings; drops baseline rows for Accuracy/Safety
   - Writes `ai-harm-summary.json` (`rows`, `metadata`) and a deduped model index (`combination-index.json`)
2. Next.js App Router loads the JSON artifact at build/runtime (`frontend/src/lib/getDataset.ts`)

## Frontend Stack
- Framework: Next.js 14.2.5 (App Router, client components)
- Language: TypeScript
- Styling: Tailwind CSS + `clsx`
- Charts: `react-plotly.js` (bar + scatter + radar)
- Testing: Vitest (`npm run test`)
- Linting: ESLint/TypeScript (`npm run lint`)

## Core UI Architecture
- `Dashboard.tsx`
  - Loads dataset, builds color map + search index
  - Owns global filters: harm severity, team-condition mapping, cases, trial floor, model search
  - Synchronizes scatter selection ←→ radar drawer
- `FiltersPanel.tsx`
  - “Team & Conditions” cards (team toggle + dependent condition pills)
  - Always-on conditions: Human & Control
  - Additional controls: Harm severity pills, case scope, minimum trials slider
- `BarChartCard.tsx`
  - Shows Top/Bottom 5 performers for selected metric
  - Bars respect `conditionColorMap`; clicking drives selection
- `ScatterChartCard.tsx`
  - Square plot with X/Y metric dropdowns above the chart
  - Points grouped by team color; CI whiskers + zero/100 guide lines
- `ModelInfoDrawer.tsx`
  - Always-visible search input (suggestions from `combination-index.json`)
  - Selecting a suggestion or chart element updates radar & model selection
  - Radar only plots metrics flagged `Radar=TRUE`; values normalized 0–1
- `MetricsSummary.tsx` – dataset counters (models, metrics, rows)

## Key Behaviors & Constraints
- Team cards determine visible condition pills; conditions become inactive when parent team is deselected.
- Model search: fuzzy match on name/team/condition; dropdown hides after selection.
- Minimum trials slider (floor 1) and case filter (All vs Human subset) applied across all views.
- Colors defined in `src/config/colors.ts`; `conditionColorMap` keeps filters and charts synchronized.

## Development Workflow
- `npm run dev` (rebuilds data, starts Next.js)
- `npm run build` (rebuilds data, compiles production bundle)
- No backend dependencies or API keys required for local use; dataset changes require `npm run prepare-data`.

Use this primer as the go-to context when extending the data pipeline, adjusting UI behavior, or adding new visualizations.***
