# Harmdash Frontend

Interactive Next.js dashboard for exploring harm benchmarks across medical AI recommendation models. The app converts the upstream CSV dataset into a JSON artifact at build time and renders two primary visualizations:

- **Top Models Bar Chart** — Rank performers for any metric (e.g., Accuracy, Safety, Normalized Score).
- **Metric Explorer Scatterplot** — Compare trade-offs between pairs of metrics, with hover details and quick navigation to model summaries.

## Getting Started

```bash
cd frontend
npm install
npm run dev
```

The dev script automatically regenerates `public/data/ai-harm-summary.json` from `../data/data_summary_subset.csv`. Any time the CSV changes, re-run `npm run prepare-data` (or restart `npm run dev`) to refresh the derived artifact.

### Useful scripts

| Command | Description |
| --- | --- |
| `npm run prepare-data` | Rebuild the JSON artifact from the CSV dataset. |
| `npm run dev` | Run Next.js locally with live reload. |
| `npm run build` | Generate the production build (includes `prepare-data`). |
| `npm run start` | Serve the production build locally. |
| `npm run lint` | Run ESLint with the Next.js config. |
| `npm run test` | Execute the Vitest suite (covers data utilities). |

## Deployment on Render

The repository includes a `render.yaml` manifest. Once pushed to GitHub, create a new “Blueprint” project on Render and point it to the repository. Render will:

1. Install dependencies in `frontend/`.
2. Execute `npm run build` (which regenerates the JSON artifact).
3. Start the production server with `npm run start`.

Ensure the CSV in `data/data_summary_subset.csv` ships with the deployment. If you need to swap datasets, update the CSV in the repo and redeploy.

## Architecture Notes

- The preprocessing script (`scripts/build-data.mjs`) normalizes numeric fields, collapses HTML labels, removes baseline baselines (`Random Intervention`, `No Intervention`) from Accuracy/Safety, and groups records by model/condition for faster lookups.
- Configurable metric metadata lives in `src/config/metrics.ts`. Adjust labels, formatting, or directionality as the benchmark evolves.
- Visuals use `react-chartjs-2` for scatter plots and `react-plotly.js` (via dynamic imports) for the remaining charts to keep the bundle lean and SSR-friendly.
- Component structure:
  - `Dashboard` orchestrates state.
  - `FiltersPanel` toggles harm severity (defaulting to severe cases), agent roles, condition scopes, and enforces a minimum trials threshold (default ≥5).
  - `BarChartCard` renders inline model labels (wrapping long agent blends), value annotations, and 95% confidence intervals using the `ci` column.
  - `ScatterChartCard` provides two-metric exploration with lasso/click support and the same CI data.
  - `ModelInfoDrawer` surfaces full metric breakdowns for the selected model/condition.

Add additional cards (tables, timelines, etc.) by extending the `Dashboard` layout grid.
