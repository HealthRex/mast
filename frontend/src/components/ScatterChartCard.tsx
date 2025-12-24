'use client';

import { TEAM_COLORS } from "@/config/colors";
import { HUMAN_DISPLAY_LABEL, isHumanLabel } from "@/config/humans";
import type { CombinationEntry, MetricMetadata } from "@/types/dataset";
import { formatMetricValue } from "@/utils/data";
import {
  Chart as ChartJS,
  Legend,
  LegendItem,
  LinearScale,
  PointElement,
  ScatterDataPoint,
  Title,
  Tooltip,
  type ChartData,
  type ChartOptions,
  type ScriptableContext,
  type TooltipItem
} from "chart.js";
import clsx from "clsx";
import { useMemo, useRef } from "react";
import { Scatter } from "react-chartjs-2";

ChartJS.register(LinearScale, PointElement, Tooltip, Legend, Title);

const LEGEND_PRIORITY_GROUPS: readonly string[][] = [
  ["Solo Models", "Solo Model", "1 Agent"],
  ["2-Agent Teams", "2-Agent Team", "2 Agents"],
  ["3-Agent Teams", "3-Agent Team", "3 Agents"]
];

const LEGEND_PRIORITY_MAP = new Map<string, number>();

LEGEND_PRIORITY_GROUPS.forEach((group, index) => {
  group.forEach((label) => {
    LEGEND_PRIORITY_MAP.set(label.trim().toLowerCase(), index);
  });
});

function getLegendPriority(label: string): number {
  const normalized = label.trim().toLowerCase();
  return LEGEND_PRIORITY_MAP.get(normalized) ?? LEGEND_PRIORITY_GROUPS.length;
}

const MARKER_RADIUS = 5;

function hexToRgba(hex: string, opacity: number): string {
  const normalized = hex.replace("#", "");
  const isShort = normalized.length === 3;
  const components = isShort
    ? normalized.split("").map((char) => char + char)
    : normalized.match(/.{2}/g);

  if (!components || components.length < 3) {
    return hex;
  }

  const [r, g, b] = components.map((value) => parseInt(value, 16));
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function calculatePearsonCorrelation(
  pairs: { x: number; y: number }[]
): number | null {
  if (pairs.length < 2) {
    return null;
  }

  const validPairs = pairs.filter(
    (pair) => Number.isFinite(pair.x) && Number.isFinite(pair.y)
  );

  if (validPairs.length < 2) {
    return null;
  }

  const sumX = validPairs.reduce((total, pair) => total + pair.x, 0);
  const sumY = validPairs.reduce((total, pair) => total + pair.y, 0);
  const meanX = sumX / validPairs.length;
  const meanY = sumY / validPairs.length;

  let numerator = 0;
  let denominatorX = 0;
  let denominatorY = 0;

  validPairs.forEach(({ x, y }) => {
    const deltaX = x - meanX;
    const deltaY = y - meanY;
    numerator += deltaX * deltaY;
    denominatorX += deltaX * deltaX;
    denominatorY += deltaY * deltaY;
  });

  const denominator = Math.sqrt(denominatorX * denominatorY);
  if (denominator === 0) {
    return null;
  }

  return numerator / denominator;
}

function resolveAxisRange(
  values: number[],
  meta: MetricMetadata | undefined,
  isPercentMetric: boolean
): [number, number] | undefined {
  const convert = (value: number | null | undefined) => {
    if (value === null || value === undefined) {
      return null;
    }
    return isPercentMetric ? value * 100 : value;
  };

  const specifiedMin = convert(meta?.axisMin ?? null);
  const specifiedMax = convert(meta?.axisMax ?? null);

  const finiteValues = values.filter((value) => Number.isFinite(value));
  const dataMin =
    finiteValues.length > 0
      ? Math.min(...finiteValues)
      : null;
  const dataMax =
    finiteValues.length > 0
      ? Math.max(...finiteValues)
      : null;

  let rangeMin =
    specifiedMin ?? (isPercentMetric ? 0 : dataMin);
  let rangeMax =
    specifiedMax ?? (isPercentMetric ? 100 : dataMax);

  if (rangeMin === null && rangeMax === null) {
    return undefined;
  }

  if (rangeMin === null && rangeMax !== null) {
    rangeMin = rangeMax - Math.abs(rangeMax || 1) * 0.1;
  }

  if (rangeMax === null && rangeMin !== null) {
    rangeMax = rangeMin + Math.abs(rangeMin || 1) * 0.1 || rangeMin + 1;
  }

  if (rangeMin === null || rangeMax === null) {
    return undefined;
  }

  if (rangeMax <= rangeMin) {
    const spread = Math.abs(rangeMin || 1) * 0.1 || 1;
    rangeMax = rangeMin + spread;
  }

  return [rangeMin, rangeMax];
}

function isHumanEntry(entry: CombinationEntry) {
  const model = (entry.model ?? "").trim();
  if (isHumanLabel(model)) {
    return true;
  }

  const label = (entry.displayLabel ?? "").trim();
  return isHumanLabel(label);
}

interface ScatterChartCardProps {
  combinations: CombinationEntry[];
  xMetricId: string;
  yMetricId: string;
  onXMetricChange: (metricId: string) => void;
  onYMetricChange: (metricId: string) => void;
  onPointClick?: (entry: CombinationEntry) => void;
  highlightedCombinationId?: string | null;
  metrics: MetricMetadata[];
  metadataMap: Map<string, MetricMetadata>;
  className?: string;
}

type ScatterPoint = ScatterDataPoint & {
  combinationId: string;
  label: string;
  tooltipLines: string[];
  colorKey: string;
};

export function ScatterChartCard({
  combinations,
  xMetricId,
  yMetricId,
  onXMetricChange,
  onYMetricChange,
  onPointClick,
  highlightedCombinationId,
  metrics,
  metadataMap,
  className
}: ScatterChartCardProps) {
  const xMeta = metadataMap.get(xMetricId);
  const yMeta = metadataMap.get(yMetricId);
  const xIsPercentMetric = xMeta?.range === "percent";
  const yIsPercentMetric = yMeta?.range === "percent";

  const filtered = useMemo(() => {
    return combinations.filter((entry) => {
      const xValue = entry.metrics[xMetricId]?.mean;
      const yValue = entry.metrics[yMetricId]?.mean;
      return xValue !== undefined && xValue !== null && yValue !== undefined && yValue !== null;
    });
  }, [combinations, xMetricId, yMetricId]);

  const teamGroups = useMemo(() => {
    const map = new Map<string, CombinationEntry[]>();
    filtered.forEach((entry) => {
      const key = entry.team || "Unspecified Team";
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)?.push(entry);
    });
    return map;
  }, [filtered]);

  const sortedTeams = useMemo(() => {
    return Array.from(teamGroups.entries()).sort((a, b) => {
      const aPriority = getLegendPriority(a[0]);
      const bPriority = getLegendPriority(b[0]);

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      return a[0].localeCompare(b[0]);
    });
  }, [teamGroups]);

  const xDisplayValues = useMemo(() => {
    return filtered
      .map((entry) => entry.metrics[xMetricId]?.mean)
      .filter(
        (value): value is number =>
          value !== null && value !== undefined && Number.isFinite(value)
      )
      .map((value) => (xIsPercentMetric ? value * 100 : value));
  }, [filtered, xMetricId, xIsPercentMetric]);

  const yDisplayValues = useMemo(() => {
    return filtered
      .map((entry) => entry.metrics[yMetricId]?.mean)
      .filter(
        (value): value is number =>
          value !== null && value !== undefined && Number.isFinite(value)
      )
      .map((value) => (yIsPercentMetric ? value * 100 : value));
  }, [filtered, yMetricId, yIsPercentMetric]);

  const xAxisRange = useMemo(
    () => resolveAxisRange(xDisplayValues, xMeta, xIsPercentMetric),
    [xDisplayValues, xMeta, xIsPercentMetric]
  );

  const yAxisRange = useMemo(
    () => resolveAxisRange(yDisplayValues, yMeta, yIsPercentMetric),
    [yDisplayValues, yMeta, yIsPercentMetric]
  );

  const displayPairs = useMemo(
    () =>
      filtered
        .map((entry) => {
          const rawX = entry.metrics[xMetricId]?.mean;
          const rawY = entry.metrics[yMetricId]?.mean;
          if (rawX === null || rawX === undefined || rawY === null || rawY === undefined) {
            return null;
          }

          const x = xIsPercentMetric ? rawX * 100 : rawX;
          const y = yIsPercentMetric ? rawY * 100 : rawY;
          return { x, y };
        })
        .filter((pair): pair is { x: number; y: number } => pair !== null),
    [filtered, xIsPercentMetric, xMetricId, yIsPercentMetric, yMetricId]
  );

  const pearsonCorrelation = useMemo(
    () => calculatePearsonCorrelation(displayPairs),
    [displayPairs]
  );

  const correlationLabel = useMemo(() => {
    if (pearsonCorrelation === null) {
      return null;
    }
    const rSquared = pearsonCorrelation ** 2;
    return `Pearson's R = ${pearsonCorrelation.toFixed(2)}, R² = ${rSquared.toFixed(2)}`;
  }, [pearsonCorrelation]);

  const xAxisTitle = useMemo(() => {
    const label = xMeta?.displayLabel ?? xMetricId;
    if (!xIsPercentMetric) {
      return label;
    }
    return /%/.test(label) ? label : `${label} (%)`;
  }, [xMeta, xMetricId, xIsPercentMetric]);

  const yAxisTitle = useMemo(() => {
    const label = yMeta?.displayLabel ?? yMetricId;
    if (!yIsPercentMetric) {
      return label;
    }
    return /%/.test(label) ? label : `${label} (%)`;
  }, [yMeta, yMetricId, yIsPercentMetric]);

  const highlighted = useMemo(
    () => new Set([highlightedCombinationId ?? ""]),
    [highlightedCombinationId]
  );

  const chartData = useMemo<ChartData<"scatter", ScatterPoint[]>>(
    () => {
      const datasets: ChartData<"scatter", ScatterPoint[]>["datasets"] = [];

      const createDataset = (
        traceName: string,
        entries: CombinationEntry[],
        colorKey: string,
        legendRank?: number
      ) => {
        if (entries.length === 0) {
          return;
        }

        const data: ScatterPoint[] = entries.map((entry) => {
          const rawX = entry.metrics[xMetricId]?.mean ?? 0;
          const rawY = entry.metrics[yMetricId]?.mean ?? 0;
          const x = xIsPercentMetric ? rawX * 100 : rawX;
          const y = yIsPercentMetric ? rawY * 100 : rawY;
          const xValue = entry.metrics[xMetricId]?.mean ?? null;
          const yValue = entry.metrics[yMetricId]?.mean ?? null;
          const xCi = entry.metrics[xMetricId]?.ci ?? null;
          const yCi = entry.metrics[yMetricId]?.ci ?? null;
          const modelName = entry.displayLabel || entry.model || "Unknown Model";
          const condition = entry.condition || "NA";

          const formatAxisValue = (
            value: number | null,
            meta: MetricMetadata | undefined
          ) => {
            if (value === null) return "NA";
            return formatMetricValue(value, { metadata: meta });
          };

          const formatMetricLine = (
            label: string,
            value: number | null,
            ci: number | null,
            meta: MetricMetadata | undefined
          ) => {
            const formattedValue = formatAxisValue(value, meta);
            if (formattedValue === "NA") {
              return `${label}: NA`;
            }

            if (ci === null || ci === 0) {
              return `${label}: ${formattedValue}`;
            }

            const formattedCi = formatMetricValue(ci, { metadata: meta });
            return `${label}: ${formattedValue} ± ${formattedCi}`;
          };

          const tooltipLines = [
            `Prompt: ${condition}`,
            formatMetricLine(xMeta?.displayLabel ?? xMetricId, xValue, xCi, xMeta),
            formatMetricLine(yMeta?.displayLabel ?? yMetricId, yValue, yCi, yMeta)
          ].filter(Boolean);

          return {
            x,
            y,
            combinationId: entry.combinationId,
            label: modelName,
            tooltipLines,
            colorKey
          } satisfies ScatterPoint;
        });

        datasets.push({
          label: traceName,
          data,
          order: legendRank,
          backgroundColor: (context: ScriptableContext<'scatter'>) => {
            const point = context.raw as ScatterPoint;
            const color = TEAM_COLORS[colorKey] ?? TEAM_COLORS.default;
            const opacity = highlightedCombinationId
              ? highlighted.has(point.combinationId)
                ? 0.95
                : 0.4
              : 0.85;
            return hexToRgba(color, opacity);
          },
          borderColor: "#0f172a",
          pointRadius: (context: ScriptableContext<'scatter'>) => {
            const point = context.raw as ScatterPoint;
            if (
              highlightedCombinationId &&
              highlighted.has(point.combinationId)
            ) {
              return MARKER_RADIUS + 1.5;
            }
            return MARKER_RADIUS;
          },
          pointBorderWidth: (context: ScriptableContext<'scatter'>) => {
            const point = context.raw as ScatterPoint;
            return highlightedCombinationId && highlighted.has(point.combinationId)
              ? 2
              : 0;
          }
        });
      };

      sortedTeams.forEach(([team, entries]) => {
        const humanEntries: CombinationEntry[] = [];
        const otherEntries: CombinationEntry[] = [];

        entries.forEach((entry) => {
          if (isHumanEntry(entry)) {
            humanEntries.push(entry);
          } else {
            otherEntries.push(entry);
          }
        });

        createDataset(team, otherEntries, team, getLegendPriority(team));

        if (humanEntries.length > 0) {
          createDataset(
            HUMAN_DISPLAY_LABEL,
            humanEntries,
            HUMAN_DISPLAY_LABEL,
            Number.MAX_SAFE_INTEGER
          );
        }
      });

      return {
        datasets
      } satisfies ChartData<"scatter", ScatterPoint[]>;
    },
    [
      highlighted,
      highlightedCombinationId,
      sortedTeams,
      xIsPercentMetric,
      xMetricId,
      xMeta,
      yIsPercentMetric,
      yMetricId,
      yMeta
    ]
  );

  const chartOptions = useMemo<ChartOptions<"scatter">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            usePointStyle: true,
            sort: (a: LegendItem, b: LegendItem) => {
              const aPriority = getLegendPriority(a.text);
              const bPriority = getLegendPriority(b.text);
              return aPriority - bPriority || a.text.localeCompare(b.text);
            }
          }
        },
        title: correlationLabel
          ? {
              display: true,
              text: correlationLabel,
              font: { size: 14, family: "Inter, sans-serif" }
            }
          : {
              display: false
            },
        tooltip: {
          callbacks: {
            title: (items: TooltipItem<"scatter">[]) => (items[0]?.raw as ScatterPoint)?.label ?? "",
            label: (context: TooltipItem<"scatter">) => {
              // Chart.js can surface multiple tooltip contexts for the same point when
              // markers overlap. Only render content for the first item to avoid
              // duplicated lines in the tooltip.
              const primary = (context as any).chart.tooltip?.dataPoints?.[0];
              const isPrimaryPoint =
                primary?.dataIndex === context.dataIndex &&
                primary?.datasetIndex === context.datasetIndex;

              if (!isPrimaryPoint) {
                return [];
              }

              const point = context.raw as ScatterPoint;
              return point.tooltipLines;
            }
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: xAxisTitle,
            font: { size: 16, family: "Inter, sans-serif" }
          },
          min: xAxisRange?.[0],
          max: xAxisRange?.[1],
          ticks: {
            callback: (value: number | string) =>
              xIsPercentMetric ? `${value as number}%` : `${value as number}`,
            color: "#0f172a",
            font: { size: 12, family: "Inter, sans-serif" }
          },
          grid: { color: "#e2e8f0" },
          border: { color: "#94a3b8" }
        },
        y: {
          title: {
            display: true,
            text: yAxisTitle,
            font: { size: 16, family: "Inter, sans-serif" }
          },
          min: yAxisRange?.[0],
          max: yAxisRange?.[1],
          ticks: {
            callback: (value: number | string) =>
              yIsPercentMetric ? `${value as number}%` : `${value as number}`,
            color: "#0f172a",
            font: { size: 12, family: "Inter, sans-serif" }
          },
          grid: { color: "#e2e8f0" },
          border: { color: "#94a3b8" }
        }
      }
    }),
    [
      correlationLabel,
      xAxisRange,
      xAxisTitle,
      xIsPercentMetric,
      yAxisRange,
      yAxisTitle,
      yIsPercentMetric
    ]
  );

  const chartRef = useRef<ChartJS<"scatter"> | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onPointClick || !chartRef.current) return;

    const elements = chartRef.current.getElementsAtEventForMode(
      event.nativeEvent,
      "nearest",
      { intersect: true },
      true
    );

    if (!elements.length) return;

    const { datasetIndex, index } = elements[0];
    const dataset = chartData.datasets[datasetIndex];
    const point = dataset?.data[index] as ScatterPoint | undefined;

    if (!point) return;

    const entry = filtered.find(
      (candidate) => candidate.combinationId === point.combinationId
    );

    if (entry) {
      onPointClick(entry);
    }
  };

  const chartContainerRef = useRef<HTMLDivElement>(null);

  return (
    <section className={clsx(
      "flex w-full flex-col gap-4 rounded-2xl bg-[#f4f4f5] p-6 h-[650px]",
      className
    )}>
      <header className="flex flex-col gap-2">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Metric Explorer
            </h2>
            <p className="text-sm text-slate-500">
              Analyze multiple metrics
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Y Metric
              <select
                value={yMetricId}
                onChange={(event) => onYMetricChange(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-brand-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 sm:w-auto"
              >
                {metrics.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.displayLabel}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              X Metric
              <select
                value={xMetricId}
                onChange={(event) => onXMetricChange(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-brand-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 sm:w-auto"
              >
                {metrics.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.displayLabel}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <p className="text-xs text-slate-500">Hover for model details</p>
      </header>
      <div className="flex flex-col gap-4 flex-1 min-h-0">
        <div
          ref={chartContainerRef}
          className="relative w-full flex-1 overflow-hidden"
        >
          <Scatter
            ref={chartRef}
            data={chartData}
            options={chartOptions}
            className="h-full w-full"
            onClick={handleClick}
          />
        </div>
      </div>
    </section>
  );
}
