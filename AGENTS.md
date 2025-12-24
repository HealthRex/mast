# Project AGENTS.md Guide

This document provides guidance for AI coding agents (e.g., Claude Code, Copilot, Cursor) and human contributors working with this codebase.
It describes the project structure, coding conventions, and validation requirements.

---

## Project Overview

**Harmdash** is a Next.js dashboard that benchmarks harm-related outcomes in medical AI recommendation systems. It processes CSV data into JSON artifacts and renders interactive visualizations using Plotly charts and radar profiles.

**Key characteristics:**
- Frontend-only application (no backend server)
- Static data pipeline (CSV → JSON)
- Interactive charts (bar, scatter, radar)
- Deployed on Render.com as a static site

---

## Project Structure

```
/
├── data/                    # Source CSV files
│   └── data_summary_subset.csv
├── frontend/                # Next.js application
│   ├── scripts/
│   │   └── build-data.mjs   # CSV → JSON pipeline
│   ├── public/
│   │   └── data/            # Generated JSON artifacts
│   │       ├── ai-harm-summary.json
│   │       └── combination-index.json
│   ├── src/
│   │   ├── app/             # Next.js App Router pages
│   │   ├── components/      # React components
│   │   ├── config/          # Configuration (colors, etc.)
│   │   ├── lib/             # Data loading utilities
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Utility functions
│   ├── package.json
│   └── tsconfig.json
├── agents/                  # AI agent prompt definitions
├── render.yaml              # Render.com deployment config
├── PLANNING.md              # Architecture primer
├── README.md                # Project overview
└── AGENTS.md                # This document
```

### Key Components

- **Dashboard.tsx** - Main dashboard with global filters and chart coordination
- **FiltersPanel.tsx** - Team/condition filters, harm severity pills, case scope
- **BarChartCard.tsx** - Top/Bottom 5 performers visualization
- **ScatterChartCard.tsx** - X/Y metric scatter plot with CI whiskers
- **ModelInfoDrawer.tsx** - Model search and radar profile display
- **MetricsSummary.tsx** - Dataset statistics counters

---

## Data Flow

1. **Data Preparation** (`npm run prepare-data`)
   - `build-data.mjs` reads CSV from `data/`
   - Validates with Zod, normalizes strings, coerces numerics
   - Outputs `ai-harm-summary.json` and `combination-index.json` to `public/data/`

2. **Runtime Loading**
   - Next.js loads JSON artifacts via `getDataset.ts`
   - Dashboard builds color maps and search indices
   - Charts render filtered data based on user selections

---

## Development Workflow

### Prerequisites
- Node.js 18+
- npm

### Commands
```bash
cd frontend

# Start development (rebuilds data + launches Next.js)
npm run dev

# Rebuild data only
npm run prepare-data

# Run tests
npm run test

# Type checking
npm run type-check

# Linting
npm run lint

# Production build
npm run build
```

---

## Coding Conventions

### TypeScript
- Use **TypeScript** for all code
- Define types in `src/types/` for shared interfaces
- Use strict mode (`strict: true` in tsconfig)

### React/Next.js
- Use **functional components** with React hooks
- Keep components small and focused
- Use **PascalCase** for component filenames (`MyComponent.tsx`)
- Prefer client components for interactive charts

### Styling
- Use **Tailwind CSS** (utility-first approach)
- Define shared colors in `src/config/colors.ts`
- Use `clsx` for conditional class names

### Data Validation
- Use **Zod** for runtime validation in data pipeline
- Define schemas alongside type definitions

---

## Testing

```bash
# Run all tests with Vitest
npm run test

# Run specific test file
npm run test -- path/to/file.test.ts

# Run with coverage
npm run test -- --coverage
```

---

## Programmatic Checks

All checks must pass before merging:

```bash
npm run lint         # ESLint
npm run type-check   # TypeScript strict checking
npm run test         # Vitest tests
npm run build        # Next.js production build
```

---

## Pull Request Guidelines

1. Provide a clear description of the changes
2. Reference related issues (if any)
3. Ensure all tests pass
4. Include screenshots for UI changes
5. Keep PRs focused on a single concern
6. Run `npm run build` locally before pushing

---

## Deployment

- Hosted on **Render.com** as a static site
- `render.yaml` defines the deployment blueprint
- Build command: `cd frontend && npm install && npm run build`
- Publish directory: `frontend/out`

---

## Key Behaviors & Constraints

- **Team cards** determine visible condition pills; conditions become inactive when parent team is deselected
- **Model search** uses fuzzy matching on name/team/condition from `combination-index.json`
- **Minimum trials slider** (floor 1) and case filter apply across all views
- **Radar chart** only plots metrics flagged `Radar=TRUE` with values normalized 0–1
- **Colors** defined in `src/config/colors.ts`; `conditionColorMap` keeps filters and charts synchronized

---

## Notes for AI Agents

- This is a **frontend-only** project—there is no backend or database
- Data changes require running `npm run prepare-data` to regenerate JSON
- The `PLANNING.md` file contains detailed architecture information
- When modifying charts, ensure color consistency with `conditionColorMap`
- Test locally with `npm run dev` before committing changes