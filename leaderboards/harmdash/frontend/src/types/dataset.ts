export interface DataRow {
  model: string;
  team: string;
  condition: string;
  harm: string;
  metric: string;
  trials: number | null;
  mean: number | null;
  sd: number | null;
  se: number | null;
  ci: number | null;
  order1: number | null;
  order2: number | null;
  format: string | null;
  cases: string | null;
  grading: string | null;
  type: string | null;
  provider: string;
  label: string | null;
  displayLabel: string;
  combinationId: string;
  colorKey: string;
}

export interface MetricMetadata {
  id: string;
  order: number;
  radarOrder: number;
  range: "percent" | "absolute";
  displayLabel: string;
  description: string;
  betterDirection: "higher" | "lower";
  axisMin: number | null;
  axisMax: number | null;
  includeInRadar: boolean;
}

export interface DatasetArtifact {
  generatedAt: string;
  rows: DataRow[];
  metadata: MetricMetadata[];
}

export interface CombinationEntry {
  combinationId: string;
  model: string;
  team: string;
  condition: string;
  harm: string;
  cases: string | null;
  grading: string | null;
  type: string | null;
  displayLabel: string;
  metrics: Record<string, DataRow>;
}
