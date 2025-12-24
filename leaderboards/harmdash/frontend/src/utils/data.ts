import type {
  CombinationEntry,
  DataRow,
  DatasetArtifact,
  MetricMetadata
} from "@/types/dataset";

const DIGIT_OVERRIDES: Record<
  string,
  Partial<Record<"percent" | "absolute", number>>
> = {
  pct: { percent: 1 },
  pct_cumulative: { percent: 1 },
  normalized: { absolute: 3 },
  normalized_cumulative: { absolute: 3 },
  nnh: { absolute: 1 },
  nnh_cumulative: { absolute: 1 }
};

const GENERAL_HARM_MARKERS = new Set([
  "",
  "all",
  "all harm",
  "all-harm",
  "any",
  "general",
  "na",
  "n/a",
  "overall"
]);

export function normalizeHarmValue(
  value: string | null | undefined
): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return "";
  }
  const normalized = trimmed.toLowerCase();
  if (GENERAL_HARM_MARKERS.has(normalized)) {
    return "";
  }
  return trimmed;
}

export function isSpecificHarmValue(
  value: string | null | undefined
): boolean {
  return normalizeHarmValue(value) !== "";
}

export function groupRowsByCombination(
  rows: DataRow[]
): CombinationEntry[] {
  const map = new Map<string, CombinationEntry>();
  const baseMap = new Map<string, CombinationEntry[]>();
  const generalMetrics = new Map<string, Record<string, DataRow>>();

  const getBaseKey = (row: DataRow) =>
    [
      row.model,
      row.team,
      row.condition,
      row.type ?? "",
      row.cases ?? "",
      row.grading ?? ""
    ].join("::");

  rows.forEach((row) => {
    const normalizedHarm = normalizeHarmValue(row.harm);
    const existing = map.get(row.combinationId);
    let entry: CombinationEntry;
    if (existing) {
      existing.metrics[row.metric] = row;
      entry = existing;
    } else {
      entry = {
        combinationId: row.combinationId,
        model: row.model,
        team: row.team,
        condition: row.condition,
        harm: normalizedHarm,
        cases: row.cases,
        grading: row.grading,
        type: row.type,
        displayLabel: row.displayLabel,
        metrics: {
          [row.metric]: row
        }
      };
      map.set(row.combinationId, entry);
    }

    const baseKey = getBaseKey(row);
    const siblings = baseMap.get(baseKey);
    if (siblings) {
      if (!siblings.includes(entry)) {
        siblings.push(entry);
      }
    } else {
      baseMap.set(baseKey, [entry]);
    }

    const general = generalMetrics.get(baseKey);
    if (!isSpecificHarmValue(row.harm)) {
      const updatedGeneral = general ?? {};
      updatedGeneral[row.metric] = row;
      generalMetrics.set(baseKey, updatedGeneral);
      baseMap.get(baseKey)?.forEach((target) => {
        target.metrics[row.metric] = row;
      });
    } else if (general) {
      Object.entries(general).forEach(([metricId, metricRow]) => {
        if (!entry.metrics[metricId]) {
          entry.metrics[metricId] = metricRow;
        }
      });
    }
  });

  return Array.from(map.values());
}

export function pickRowsForMetric(
  rows: DataRow[],
  metricId: string
): DataRow[] {
  return rows.filter(
    (row) => row.metric === metricId && row.mean !== null
  );
}

export function sortRowsForMetric(
  rows: DataRow[],
  higherIsBetter: boolean,
  maxItems?: number
): DataRow[] {
  const sorted = [...rows].sort((a, b) => {
    const aMean = a.mean ?? Number.NEGATIVE_INFINITY;
    const bMean = b.mean ?? Number.NEGATIVE_INFINITY;
    return higherIsBetter ? bMean - aMean : aMean - bMean;
  });

  return typeof maxItems === "number" ? sorted.slice(0, maxItems) : sorted;
}

interface FormatMetricOptions {
  digits?: number;
  metadata?: MetricMetadata | null;
  style?: "auto" | "percent" | "absolute";
  includeSymbol?: boolean;
}

export function formatMetricValue(
  value: number | null | undefined,
  options: FormatMetricOptions = {}
): string {
  if (value === null || value === undefined) {
    return "NA";
  }
  if (!Number.isFinite(value)) {
    return "NA";
  }

  const {
    metadata = null,
    digits,
    style = "auto",
    includeSymbol = true
  } = options;

  const rangeStyle =
    style === "auto"
      ? metadata?.range === "percent"
        ? "percent"
        : "absolute"
      : style;

  const overrideDigits = metadata
    ? DIGIT_OVERRIDES[metadata.id]?.[rangeStyle]
    : undefined;
  const resolvedDigits: number =
    digits !== undefined
      ? digits
      : overrideDigits !== undefined
      ? overrideDigits
      : rangeStyle === "percent"
      ? 1
      : 2;

  if (rangeStyle === "percent") {
    const scaled = Number(value) * 100;
    const formatted = Number(scaled).toLocaleString(undefined, {
      minimumFractionDigits: resolvedDigits,
      maximumFractionDigits: resolvedDigits
    });
    return includeSymbol ? `${formatted}%` : formatted;
  }

  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: resolvedDigits,
    maximumFractionDigits: resolvedDigits
  });
}

export function getCombinationBaseKeyFromId(
  combinationId: string | null | undefined
): string | null {
  if (!combinationId) {
    return null;
  }

  const parts = combinationId.split("::");
  if (parts.length < 7) {
    return combinationId;
  }

  const normalized = [...parts];
  while (normalized.length < 7) {
    normalized.push("");
  }

  const [model, team, condition, _harm, type, cases, grading] = normalized;
  return [
    model ?? "",
    team ?? "",
    condition ?? "",
    type ?? "",
    cases ?? "",
    grading ?? ""
  ].join("::");
}

export function getCombinationBaseKeyFromRow(row: DataRow): string {
  return [
    row.model ?? "",
    row.team ?? "",
    row.condition ?? "",
    row.type ?? "",
    row.cases ?? "",
    row.grading ?? ""
  ].join("::");
}
