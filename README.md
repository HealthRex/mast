# NOHARM Leaderboard

Introducing MAST, our vision for a suite of realistic clinical benchmarks to evaluate real-world performance of medical AI systems.

**First, Do NOHARM** is the foundational benchmark of the MAST suite, and establishes a new framework to assess clinical safety and accuracy in AI-generated medical recommendations.

## About This Dashboard

This interactive dashboard visualizes performance metrics from the NOHARM benchmark, comparing solo AI models and multi-agent teams across various medical conditions and harm scenarios.

## Project Structure

- `data/` — Source CSV files with benchmark results
- `frontend/` — Next.js dashboard application
- `.github/workflows/` — CI/CD automation
- `render.yaml` — Deployment configuration

## Quick Start

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000` to explore the dashboard. The dev script automatically rebuilds data from `data/metrics.csv`.

## Features

- **Scatter Charts** - Compare models across any two metrics with confidence intervals
- **Top/Bottom Performers** - Bar charts ranking models by selected metrics
- **Model Search** - Find and compare specific models or agent combinations
- **Flexible Filtering** - Filter by team size, conditions, harm types, and case scope
- **Radar Profiles** - Multi-dimensional performance visualization

## Documentation

- `AGENTS.md` — Comprehensive architecture and development guide
- `frontend/README.md` — Frontend-specific documentation
- `PLANNING.md` — Architecture planning notes