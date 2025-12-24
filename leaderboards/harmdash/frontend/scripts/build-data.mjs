
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { csvParse } from "d3-dsv";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "..");
const METRICS_CSV_PATH = path.resolve(ROOT, "..", "data", "metrics.csv");
const METADATA_CSV_PATH = path.resolve(ROOT, "..", "data", "metadata.csv");
const CONDITIONS_CSV_PATH = path.resolve(ROOT, "..", "data", "conditions.csv");
const OUTPUT_DIR = path.resolve(ROOT, "public", "data");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "ai-harm-summary.json");
const INDEX_PATH = path.join(OUTPUT_DIR, "combination-index.json");

const numericFields = [
  "trials",
  "mean",
  "sd",
  "se",
  "ci",
  "order1",
  "order2"
];

const nullableStringFields = [
  "Format",
  "Cases",
  "Grading",
  "Type",
  "Label",
  "Provider"
];
const GENERAL_HARM_MARKERS = new Set([
  "",
  "all",
  "all harm",
  "all-harm",
  "any",
  "general",
  "overall"
]);

const metricsSchema = z.object({
  Model: z.string().min(1),
  Team: z.string().optional().default(""),
  Condition: z.string().optional().default(""),
  Harm: z.string().optional().default(""),
  Metric: z.string().min(1),
  trials: z.number().nullable(),
  mean: z.number().nullable(),
  sd: z.number().nullable(),
  se: z.number().nullable(),
  ci: z.number().nullable(),
  order1: z.number().nullable(),
  order2: z.number().nullable(),
  Format: z.string().nullable().optional().default(null),
  Cases: z.string().nullable().optional().default(null),
  Grading: z.string().nullable().optional().default(null),
  Type: z.string().nullable().optional().default(null),
  Label: z.string().nullable().optional().default(null),
  Provider: z.string().nullable().optional().default(null)
});

const metadataSchema = z.object({
  Order: z.union([z.string(), z.number()]).optional(),
  Metric: z.string().min(1),
  Include: z.union([z.string(), z.boolean()]).optional(),
  Radar: z.union([z.string(), z.boolean()]).optional(),
  RadarOrder: z.union([z.string(), z.number()]).optional(),
  Range: z.string().optional(),
  Display: z.string().optional(),
  Description: z.string().optional(),
  Better: z.string().optional(),
  Min: z.union([z.string(), z.number()]).optional(),
  Max: z.union([z.string(), z.number()]).optional()
});

const conditionsSchema = z.object({
  Condition: z.string().min(1),
  Include: z.union([z.string(), z.boolean()]).optional()
});

function parseNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (value === "" || value === "NA") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanString(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = String(value).trim();
  if (!trimmed || trimmed.toLowerCase() === "na") {
    return null;
  }
  return trimmed;
}

function normalizeHarmScope(value) {
  const cleaned = cleanString(value);
  if (!cleaned) {
    return "";
  }

  const normalized = cleaned.toLowerCase();
  if (GENERAL_HARM_MARKERS.has(normalized)) {
    return "";
  }

  return cleaned;
}

function sanitizeLabel(raw) {
  if (!raw) {
    return null;
  }
  return raw.replace(/<[^>]+>/g, "").trim() || null;
}

function parseBoolean(value, defaultValue = true) {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === null || value === undefined) {
    return defaultValue;
  }
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) {
    return defaultValue;
  }
  if (["false", "f", "0", "no"].includes(normalized)) {
    return false;
  }
  if (["true", "t", "1", "yes"].includes(normalized)) {
    return true;
  }
  return defaultValue;
}

function parseOrder(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = String(value).trim();
  if (!normalized || normalized.toLowerCase() === "na") {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseRange(value) {
  if (value === null || value === undefined) {
    return "absolute";
  }
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "percent" || normalized === "%") {
    return "percent";
  }
  return "absolute";
}

function cleanMetadataString(value, fallback = "") {
  if (value === null || value === undefined) {
    return fallback;
  }
  const trimmed = String(value).trim();
  if (!trimmed || trimmed.toLowerCase() === "na") {
    return fallback;
  }
  return trimmed;
}

function parseBetter(value) {
  if (value === null || value === undefined) {
    return "higher";
  }
  const normalized = String(value).trim().toLowerCase();
  if (!normalized || normalized === "na") {
    return "higher";
  }
  if (["lower", "low"].includes(normalized)) {
    return "lower";
  }
  return "higher";
}

function parseLimit(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = String(value).trim();
  if (!normalized || normalized.toLowerCase() === "na") {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function getCombinationId(row) {
  return [
    row.Model,
    row.Team ?? "",
    row.Condition ?? "",
    row.Harm ?? "",
    row.Type ?? "",
    row.Cases ?? "",
    row.Grading ?? ""
  ].join("::");
}

async function loadCsv(filePath) {
  const csvText = await readFile(filePath, "utf8");
  return csvParse(csvText);
}

async function main() {
  const [rawMetricRows, rawMetadataRows, rawConditionRows] = await Promise.all([
    loadCsv(METRICS_CSV_PATH),
    loadCsv(METADATA_CSV_PATH),
    loadCsv(CONDITIONS_CSV_PATH)
  ]);

  const includedConditions = new Set(
    rawConditionRows
      .map((row) => conditionsSchema.parse(row))
      .filter((entry) => parseBoolean(entry.Include, false))
      .map((entry) => cleanString(entry.Condition))
      .filter(Boolean)
  );

  const metadata = rawMetadataRows
    .map((row) => metadataSchema.parse(row))
    .map((entry) => {
      const include = parseBoolean(entry.Include, true);
      const order = parseOrder(entry.Order);
      const radarOrder = parseOrder(entry.RadarOrder);
      return {
        id: entry.Metric,
        order: order ?? Number.MAX_SAFE_INTEGER,
        radarOrder,
        range: parseRange(entry.Range),
        displayLabel: cleanMetadataString(entry.Display, entry.Metric),
        description: cleanMetadataString(entry.Description, ""),
        betterDirection: parseBetter(entry.Better),
        axisMin: parseLimit(entry.Min),
        axisMax: parseLimit(entry.Max),
        includeInRadar: parseBoolean(entry.Radar, true),
        include
      };
    })
    .filter((entry) => entry.include)
    .map(({ include, ...rest }) => rest)
    .sort((a, b) => {
      if (a.order === b.order) {
        return a.displayLabel.localeCompare(b.displayLabel);
      }
      return a.order - b.order;
    })
    .map((entry) => ({
      ...entry,
      order: Number.isFinite(entry.order)
        ? entry.order
        : Number.MAX_SAFE_INTEGER,
      radarOrder: Number.isFinite(entry.radarOrder)
        ? entry.radarOrder
        : Number.MAX_SAFE_INTEGER
    }));

  const includedMetricIds = new Set(metadata.map((entry) => entry.id));

  const normalizedRows = rawMetricRows
    .filter((row) => includedMetricIds.has(row.Metric))
    .filter((row) => {
      const condition = cleanString(row.Condition) ?? "";
      if (!condition || includedConditions.size === 0) {
        return true;
      }
      return includedConditions.has(condition);
    })
    .filter((row) => {
      if (
        ["Accuracy", "Safety"].includes(row.Metric) &&
        ["No Intervention"].includes(row.Model)
      ) {
        return false;
      }
      return true;
    })
    .map((row) => {
      const enriched = { ...row };

      numericFields.forEach((field) => {
        enriched[field] = parseNumber(row[field]);
      });

      nullableStringFields.forEach((field) => {
        enriched[field] = cleanString(row[field]);
      });

      enriched.Team = cleanString(row.Team) ?? "";
      enriched.Condition = cleanString(row.Condition) ?? "";
      enriched.Harm = normalizeHarmScope(row.Harm);

      const parsed = metricsSchema.parse({
        ...enriched,
        Label: enriched.Label
      });

      const displayLabel = sanitizeLabel(parsed.Label) ?? parsed.Model;
      const colorKey =
        parsed.Condition && parsed.Condition !== ""
          ? parsed.Condition
          : parsed.Team || "default";

      return {
        model: parsed.Model,
        team: parsed.Team,
        condition: parsed.Condition,
        harm: parsed.Harm,
        metric: parsed.Metric,
        trials: parsed.trials,
        mean: parsed.mean,
        sd: parsed.sd,
        se: parsed.se,
        ci: parsed.ci,
        order1: parsed.order1,
        order2: parsed.order2,
        format: parsed.Format,
        cases: parsed.Cases,
        grading: parsed.Grading,
        type: parsed.Type,
        provider: parsed.Provider ?? "",
        label: parsed.Label,
        displayLabel,
        combinationId: getCombinationId(parsed),
        colorKey
      };
    });

  await mkdir(OUTPUT_DIR, { recursive: true });
  const artifact = {
    generatedAt: new Date().toISOString(),
    rows: normalizedRows,
    metadata
  };

  const combinationIndex = [];
  const seen = new Set();
  normalizedRows.forEach((row) => {
    const label = (row.displayLabel || row.model || "").trim();
    if (!label) {
      return;
    }
    const key = label.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      combinationIndex.push({
        combinationId: row.combinationId,
        displayLabel: label,
        model: row.model,
        team: row.team,
        condition: row.condition,
        harm: row.harm
      });
    }
  });
  combinationIndex.sort((a, b) =>
    (a.displayLabel || "").toLowerCase().localeCompare((b.displayLabel || "").toLowerCase())
  );

  await writeFile(OUTPUT_PATH, JSON.stringify(artifact, null, 2));
  await writeFile(INDEX_PATH, JSON.stringify(combinationIndex, null, 2));
  // eslint-disable-next-line no-console
  console.log(
    `Wrote ${normalizedRows.length} rows to ${path.relative(
      ROOT,
      OUTPUT_PATH
    )}`
  );
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to build dataset artifact:", error);
  process.exit(1);
});
