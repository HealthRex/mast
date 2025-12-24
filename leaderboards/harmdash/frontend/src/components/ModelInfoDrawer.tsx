'use client';

import Plot from "@/components/PlotClient";
import type { CombinationEntry, MetricMetadata } from "@/types/dataset";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Layout, PlotData } from "plotly.js";
import type { PlotParams } from "react-plotly.js";
import { formatMetricValue } from "@/utils/data";

const PRIMARY_SELECTION_COLOR = "#0ea5e9";
const COMPARISON_SELECTION_COLOR = "#f97316";

const MAX_RADAR_VALUE = 1.05;

const bouncyProgress = (progress: number): number => {
  if (progress <= 0) {
    return 0;
  }
  if (progress >= 1) {
    return 1;
  }

  const eased = 1 - Math.pow(1 - progress, 3);
  const bounce = Math.sin(progress * Math.PI) * (1 - progress) * 0.2;
  return Math.min(Math.max(eased + bounce, 0), 1.08);
};

interface ModelInfoDrawerProps {
  selection: CombinationEntry | null;
  comparison: CombinationEntry | null;
  onClear: () => void;
  onClearComparison: () => void;
  metrics: MetricMetadata[];
  className?: string;
  modelQuery: string;
  onModelSearchChange: (value: string) => void;
  suggestions: CombinationEntry[];
  comparisonQuery: string;
  onComparisonSearchChange: (value: string) => void;
  comparisonSuggestions: CombinationEntry[];
  onSuggestionSelect: (entry: CombinationEntry) => void;
  onComparisonSuggestionSelect: (entry: CombinationEntry) => void;
  onActiveTargetChange: (target: "primary" | "comparison" | null) => void;
}

function computeNormalizedMetricValue(
  value: number | null | undefined,
  meta: MetricMetadata
): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  if (meta.range === "percent") {
    const clamped = Math.min(Math.max(value, 0), 1);
    const normalized =
      meta.betterDirection === "lower" ? 1 - clamped : clamped;
    return Math.min(Math.max(normalized, 0), 1);
  }

  const axisMax = meta.axisMax ?? null;
  let denominator =
    axisMax && Number.isFinite(axisMax) && axisMax > 0
      ? axisMax
      : Math.max(Math.abs(value), 1);
  let ratio = value / denominator;
  if (!Number.isFinite(ratio)) {
    ratio = 0;
  }
  ratio = Math.min(Math.max(ratio, 0), 1);
  return meta.betterDirection === "lower" ? 1 - ratio : ratio;
}

export function ModelInfoDrawer({
  selection,
  comparison,
  onClear,
  onClearComparison,
  metrics,
  className,
  modelQuery,
  onModelSearchChange,
  suggestions,
  comparisonQuery,
  onComparisonSearchChange,
  comparisonSuggestions,
  onSuggestionSelect,
  onComparisonSuggestionSelect,
  onActiveTargetChange
}: ModelInfoDrawerProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isComparisonFocused, setIsComparisonFocused] = useState(false);
  const [primaryHighlightIndex, setPrimaryHighlightIndex] = useState<number>(-1);
  const [comparisonHighlightIndex, setComparisonHighlightIndex] =
    useState<number>(-1);
  const [animatedTraces, setAnimatedTraces] = useState<PlotData[] | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastAnimatedValuesRef = useRef<Record<string, number[]>>({});
  const primarySearchRef = useRef<HTMLInputElement | null>(null);
  const comparisonSearchRef = useRef<HTMLInputElement | null>(null);
  const trimmedQuery = modelQuery.trim();
  const trimmedComparisonQuery = comparisonQuery.trim();
  const showSuggestions = isFocused && trimmedQuery !== "" && suggestions.length > 0;
  const showComparisonSuggestions =
    isComparisonFocused &&
    trimmedComparisonQuery !== "" &&
    comparisonSuggestions.length > 0;

  useEffect(() => {
    if (!showSuggestions) {
      setPrimaryHighlightIndex(-1);
      return;
    }

    setPrimaryHighlightIndex((prev) => {
      if (prev < 0) {
        return 0;
      }
      if (prev >= suggestions.length) {
        return Math.max(0, suggestions.length - 1);
      }
      return prev;
    });
  }, [showSuggestions, suggestions]);

  useEffect(() => {
    if (!showComparisonSuggestions) {
      setComparisonHighlightIndex(-1);
      return;
    }

    setComparisonHighlightIndex((prev) => {
      if (prev < 0) {
        return 0;
      }
      if (prev >= comparisonSuggestions.length) {
        return Math.max(0, comparisonSuggestions.length - 1);
      }
      return prev;
    });
  }, [showComparisonSuggestions, comparisonSuggestions]);

  const description = selection
    ? comparison
      ? "Compare the models across key metrics"
      : "Detailed metrics for the selected model."
    : comparison
    ? "Comparison metrics for the selected model."
    : "Click on data point to view model performance.";

  const handlePrimarySelect = useCallback(
    (entry: CombinationEntry) => {
      onSuggestionSelect(entry);
      onModelSearchChange(entry.displayLabel || entry.model || "");
      setPrimaryHighlightIndex(-1);
      setIsFocused(false);
      onActiveTargetChange(null);
    },
    [onActiveTargetChange, onModelSearchChange, onSuggestionSelect]
  );

  const handleComparisonSelect = useCallback(
    (entry: CombinationEntry) => {
      onComparisonSuggestionSelect(entry);
      onComparisonSearchChange(entry.displayLabel || entry.model || "");
      setComparisonHighlightIndex(-1);
      setIsComparisonFocused(false);
      onActiveTargetChange(null);
    },
    [onActiveTargetChange, onComparisonSearchChange, onComparisonSuggestionSelect]
  );

  useEffect(() => {
    const input = comparisonSearchRef.current;
    if (!input) {
      return;
    }

    input.focus({ preventScroll: true });
    requestAnimationFrame(() => {
      const activeInput = comparisonSearchRef.current;
      if (!activeInput) {
        return;
      }

      const length = activeInput.value.length;
      if (typeof activeInput.setSelectionRange === "function") {
        activeInput.setSelectionRange(0, length);
      }
    });
  }, []);

  const radarData = useMemo(() => {
    if (!selection && !comparison) {
      return null;
    }

    type RadarPoint = {
      meta: MetricMetadata;
      primaryMetric: CombinationEntry["metrics"][string] | undefined;
      primaryValue: number | null;
      comparisonMetric: CombinationEntry["metrics"][string] | undefined;
      comparisonValue: number | null;
    };

    const rawPoints: RadarPoint[] = metrics
      .filter((meta) => meta.includeInRadar)
      .map((meta) => {
        const primaryMetric = selection?.metrics[meta.id];
        const comparisonMetric = comparison?.metrics[meta.id];
        const primaryValue = selection
          ? computeNormalizedMetricValue(primaryMetric?.mean ?? null, meta)
          : null;
        const comparisonValue = comparison
          ? computeNormalizedMetricValue(comparisonMetric?.mean ?? null, meta)
          : null;
        return {
          meta,
          primaryMetric,
          primaryValue,
          comparisonMetric,
          comparisonValue
        };
      })
      .filter((entry) => entry.primaryValue !== null || entry.comparisonValue !== null);

    if (rawPoints.length === 0) {
      return null;
    }

    const points = rawPoints
      .map((point, index) => ({ point, index }))
      .sort((a, b) => {
        const aOrder = Number.isFinite(a.point.meta.radarOrder)
          ? a.point.meta.radarOrder
          : Number.MAX_SAFE_INTEGER;
        const bOrder = Number.isFinite(b.point.meta.radarOrder)
          ? b.point.meta.radarOrder
          : Number.MAX_SAFE_INTEGER;

        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }

        return a.index - b.index;
      })
      .map((entry) => entry.point);

    const formatAxisLabel = (label: string) => {
      const words = label.split(" ").filter(Boolean);
      if (words.length <= 1) {
        return label;
      }
      return `${words[0]}<br>${words.slice(1).join(" ")}`;
    };

    const buildTrace = (
      entry: CombinationEntry | null,
      getValue: (point: RadarPoint) => number | null,
      getMetric: (point: RadarPoint) => CombinationEntry["metrics"][string] | undefined,
      styles: { fill: string; line: string; marker: string; opacity: number },
      traceId: string
    ): PlotData | null => {
      if (!entry) {
        return null;
      }

      const values = points.map((point) => {
        const value = getValue(point);
        return value === null ? 0 : value;
      });
      const hovers = points.map((point) => {
        const metric = getMetric(point);
        const value = getValue(point);
        if (!metric || value === null) {
          return `${point.meta.displayLabel}: No data`;
        }
        return `${point.meta.displayLabel}: ${formatMetricValue(metric.mean ?? null, {
          metadata: point.meta
        })}`;
      });
      if (values.every((value) => value === 0)) {
        return null;
      }

      const closedValues = [...values, values[0]];
      const formattedLabels = points.map((point) => formatAxisLabel(point.meta.displayLabel));
      const closedLabels = [...formattedLabels, formattedLabels[0]];
      const closedHover = [...hovers, hovers[0]];

      const label = entry.displayLabel || entry.model || "Metric profile";

      return {
        type: "scatterpolar",
        r: closedValues,
        theta: closedLabels,
        fill: "toself",
        name: label,
        hoverinfo: "text",
        hovertext: closedHover,
        marker: {
          color: styles.marker,
          size: 6
        },
        line: {
          color: styles.line,
          width: 2
        },
        opacity: styles.opacity,
        fillcolor: styles.fill,
        uid: traceId
      } as PlotData;
    };

    const traces: PlotData[] = [];

    const primaryTrace = buildTrace(
      selection,
      (point) => point.primaryValue,
      (point) => point.primaryMetric,
      {
        fill: "rgba(14, 165, 233, 0.25)",
        line: PRIMARY_SELECTION_COLOR,
        marker: PRIMARY_SELECTION_COLOR,
        opacity: 0.75
      },
      "primary-trace"
    );
    if (primaryTrace) {
      traces.push(primaryTrace);
    }

    const comparisonTrace = buildTrace(
      comparison,
      (point) => point.comparisonValue,
      (point) => point.comparisonMetric,
      {
        fill: "rgba(249, 115, 22, 0.2)",
        line: COMPARISON_SELECTION_COLOR,
        marker: COMPARISON_SELECTION_COLOR,
        opacity: 0.6
      },
      "comparison-trace"
    );
    if (comparisonTrace) {
      traces.push(comparisonTrace);
    }

    if (traces.length === 0) {
      return null;
    }

    const layout: Partial<Layout> = {
      margin: { l: 20, r: 20, t: 30, b: 20 },
      polar: {
        radialaxis: {
          range: [0, MAX_RADAR_VALUE],
          showgrid: true,
          gridcolor: "#cbd5f5",
          showline: false,
          tickvals: [0, 0.25, 0.5, 0.75, 1],
          showticklabels: false,
          ticks: ""
        },
        angularaxis: {
          tickfont: {
            size: 12,
            color: "#1f2937"
          },
          rotation: 90,
          gridcolor: "#e2e8f0",
          linecolor: "#94a3b8",
          showticklabels: true
        }
      },
      showlegend: false,
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: {
        family: "Inter, sans-serif",
        color: "#0f172a"
      },
      uirevision: "model-radar"
    };

    return { data: traces, layout };
  }, [comparison, metrics, selection]);

  const plotConfig = useMemo<NonNullable<PlotParams["config"]>>(
    () => ({
      displayModeBar: false,
      responsive: true
    }),
    []
  );

  useEffect(() => {
    if (!radarData) {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      lastAnimatedValuesRef.current = {};
      setAnimatedTraces(null);
      return;
    }

    const targetTraces = Array.isArray(radarData.data) ? radarData.data : [];

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const snapshots = targetTraces.map((trace, index) => {
      const uid =
        typeof trace.uid === "string" && trace.uid.length > 0
          ? trace.uid
          : `trace-${index}`;
      const rawTarget = Array.isArray(trace.r) ? trace.r : [];
      const targetValues = rawTarget.map((value) =>
        typeof value === "number" && Number.isFinite(value) ? value : 0
      );
      const previousValues = lastAnimatedValuesRef.current[uid];
      const startValues =
        previousValues && previousValues.length === targetValues.length
          ? [...previousValues]
          : targetValues.map(() => 0);

      return { trace, uid, startValues, targetValues };
    });

    const activeUids = new Set(snapshots.map((snapshot) => snapshot.uid));
    Object.keys(lastAnimatedValuesRef.current).forEach((uid) => {
      if (!activeUids.has(uid)) {
        delete lastAnimatedValuesRef.current[uid];
      }
    });

    const initialFrame = snapshots.map(({ trace, startValues, uid }) => {
      const starting = startValues.map((value) =>
        Math.min(Math.max(value, 0), MAX_RADAR_VALUE)
      );
      lastAnimatedValuesRef.current[uid] = [...starting];
      return {
        ...trace,
        r: starting
      } as PlotData;
    });

    setAnimatedTraces(initialFrame);

    if (snapshots.length === 0) {
      return;
    }

    const duration = 900;
    const startTime = performance.now();

    const step = (timestamp: number) => {
      const elapsed = timestamp - startTime;
      const progress = Math.min(Math.max(elapsed / duration, 0), 1);
      const easedProgress = bouncyProgress(progress);

      const frameTraces = snapshots.map(({ trace, startValues, targetValues, uid }) => {
        const interpolated = targetValues.map((targetValue, valueIndex) => {
          const fromValue = startValues[valueIndex] ?? 0;
          const raw = fromValue + (targetValue - fromValue) * easedProgress;
          return Math.min(Math.max(raw, 0), MAX_RADAR_VALUE);
        });
        lastAnimatedValuesRef.current[uid] = [...interpolated];
        return {
          ...trace,
          r: interpolated
        } as PlotData;
      });

      setAnimatedTraces(frameTraces);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(step);
      } else {
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [radarData]);

  return (
    <aside
      className={clsx(
        "flex w-full max-w-full flex-col gap-4 rounded-2xl bg-[#f4f4f5] p-6 transition",
        selection ? "opacity-100" : "opacity-75",
        className
      )}
    >
      <header className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Model Profiles
            </h3>
            <p className="text-sm text-slate-500">
              {description}
            </p>
          </div>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="model-search">
              Primary Model
            </label>
            <div className="relative">
              <input
                id="model-search"
                type="search"
                placeholder="Search models"
                ref={primarySearchRef}
                value={modelQuery}
                onFocus={() => {
                  setIsFocused(true);
                  onActiveTargetChange("primary");
                  if (primarySearchRef.current) {
                    requestAnimationFrame(() => {
                      const input = primarySearchRef.current;
                      if (!input) {
                        return;
                      }

                      const length = input.value.length;
                      if (typeof input.setSelectionRange === "function") {
                        input.setSelectionRange(0, length);
                      }
                    });
                  }
                }}
                onBlur={() =>
                  setTimeout(() => {
                    setIsFocused(false);
                    onActiveTargetChange(null);
                  }, 120)
                }
                onChange={(event) => {
                  setIsFocused(true);
                  const value = event.target.value;
                  onModelSearchChange(value);
                  setPrimaryHighlightIndex(-1);
                  if (value === "") {
                    onClear();
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    if (suggestions.length > 0) {
                      setPrimaryHighlightIndex((prev) => {
                        if (prev < 0) {
                          return 0;
                        }
                        return (prev + 1) % suggestions.length;
                      });
                    }
                    return;
                  }
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    if (suggestions.length > 0) {
                      setPrimaryHighlightIndex((prev) => {
                        if (prev < 0) {
                          return suggestions.length - 1;
                        }
                        return (prev - 1 + suggestions.length) % suggestions.length;
                      });
                    }
                    return;
                  }
                  if (event.key === "Enter") {
                    event.preventDefault();
                    const index =
                      primaryHighlightIndex >= 0
                        ? primaryHighlightIndex
                        : suggestions.length > 0
                        ? 0
                        : -1;
                    if (index >= 0) {
                      const suggestion = suggestions[index];
                      if (suggestion) {
                        handlePrimarySelect(suggestion);
                      }
                    }
                  }
                }}
                className="w-full rounded-lg border-2 border-[#0ea5e9] bg-[#0ea5e9]/10 px-3 py-2 text-sm font-medium text-slate-900 shadow-sm ring-1 ring-inset ring-[#0ea5e9]/25 transition focus:border-[#0ea5e9] focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]/50"
              />
              {showSuggestions ? (
                <ul
                  className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg"
                  role="listbox"
                >
                  {suggestions.length ? (
                    suggestions.map((entry, index) => {
                      const label = entry.displayLabel || entry.model;
                      const subtitle = [entry.team, entry.condition].filter(Boolean).join(" · ");
                      const selected = selection?.combinationId === entry.combinationId;
                      const isActive = index === primaryHighlightIndex;
                      return (
                        <li key={entry.combinationId}>
                          <button
                            type="button"
                            onClick={() => {
                              handlePrimarySelect(entry);
                            }}
                            onMouseEnter={() => {
                              setPrimaryHighlightIndex(index);
                            }}
                            className={clsx(
                              "flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm",
                              selected
                                ? "bg-[#0ea5e9]/10 text-slate-900"
                                : isActive
                                ? "bg-slate-100 text-slate-900"
                                : "text-slate-700 hover:bg-slate-100"
                            )}
                            role="option"
                            aria-selected={selected || isActive}
                          >
                            <span className="font-medium">{label}</span>
                            {subtitle ? (
                              <span className="text-xs text-slate-500">{subtitle}</span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })
                  ) : (
                    <li className="px-3 py-2 text-xs text-slate-500">No matches found</li>
                  )}
                </ul>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label
              className="text-xs font-semibold uppercase tracking-wide text-slate-500"
              htmlFor="comparison-search"
            >
              Compare With
            </label>
            <div className="relative">
              <input
                id="comparison-search"
                type="search"
                placeholder="Search comparison model"
                ref={comparisonSearchRef}
                value={comparisonQuery}
                onFocus={() => {
                  setIsComparisonFocused(true);
                  onActiveTargetChange("comparison");
                  if (comparisonSearchRef.current) {
                    requestAnimationFrame(() => {
                      const input = comparisonSearchRef.current;
                      if (!input) {
                        return;
                      }

                      const length = input.value.length;
                      if (typeof input.setSelectionRange === "function") {
                        input.setSelectionRange(0, length);
                      }
                    });
                  }
                }}
                onBlur={() =>
                  setTimeout(() => {
                    setIsComparisonFocused(false);
                    onActiveTargetChange(null);
                  }, 120)
                }
                onChange={(event) => {
                  setIsComparisonFocused(true);
                  const value = event.target.value;
                  onComparisonSearchChange(value);
                  setComparisonHighlightIndex(-1);
                  if (value === "") {
                    onClearComparison();
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    if (comparisonSuggestions.length > 0) {
                      setComparisonHighlightIndex((prev) => {
                        if (prev < 0) {
                          return 0;
                        }
                        return (prev + 1) % comparisonSuggestions.length;
                      });
                    }
                    return;
                  }
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    if (comparisonSuggestions.length > 0) {
                      setComparisonHighlightIndex((prev) => {
                        if (prev < 0) {
                          return comparisonSuggestions.length - 1;
                        }
                        return (
                          (prev - 1 + comparisonSuggestions.length) %
                          comparisonSuggestions.length
                        );
                      });
                    }
                    return;
                  }
                  if (event.key === "Enter") {
                    event.preventDefault();
                    const index =
                      comparisonHighlightIndex >= 0
                        ? comparisonHighlightIndex
                        : comparisonSuggestions.length > 0
                        ? 0
                        : -1;
                    if (index >= 0) {
                      const suggestion = comparisonSuggestions[index];
                      if (suggestion) {
                        handleComparisonSelect(suggestion);
                      }
                    }
                  }
                }}
                className="w-full rounded-lg border-2 border-[#f97316] bg-[#f97316]/10 px-3 py-2 text-sm font-medium text-slate-900 shadow-sm ring-1 ring-inset ring-[#f97316]/25 transition focus:border-[#f97316] focus:outline-none focus:ring-2 focus:ring-[#f97316]/50"
              />
              {showComparisonSuggestions ? (
                <ul
                  className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg"
                  role="listbox"
                >
                  {comparisonSuggestions.length ? (
                    comparisonSuggestions.map((entry, index) => {
                      const label = entry.displayLabel || entry.model;
                      const subtitle = [entry.team, entry.condition].filter(Boolean).join(" · ");
                      const selected = comparison?.combinationId === entry.combinationId;
                      const isActive = index === comparisonHighlightIndex;
                      return (
                        <li key={entry.combinationId}>
                          <button
                            type="button"
                            onClick={() => {
                              handleComparisonSelect(entry);
                            }}
                            onMouseEnter={() => {
                              setComparisonHighlightIndex(index);
                            }}
                            className={clsx(
                              "flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm",
                              selected
                                ? "bg-[#f97316]/10 text-slate-900"
                                : isActive
                                ? "bg-slate-100 text-slate-900"
                                : "text-slate-700 hover:bg-slate-100"
                            )}
                            role="option"
                            aria-selected={selected || isActive}
                          >
                            <span className="font-medium">{label}</span>
                            {subtitle ? (
                              <span className="text-xs text-slate-500">{subtitle}</span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })
                  ) : (
                    <li className="px-3 py-2 text-xs text-slate-500">No matches found</li>
                  )}
                </ul>
              ) : null}
            </div>
          </div>
        </div>
        {radarData ? (
          <>
            <div className="flex h-[320px] w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50/80 p-2">
              <Plot
                data={animatedTraces ?? radarData.data}
                layout={radarData.layout}
                config={plotConfig}
                style={{ width: "100%", height: "100%" }}
                useResizeHandler
              />
            </div>
          </>
        ) : (
          <div className="flex h-[320px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center text-sm text-slate-500">
            Interact with the charts or use the search boxes to surface up to two models for comparison.
          </div>
        )}
      </div>
    </aside>
  );
}
