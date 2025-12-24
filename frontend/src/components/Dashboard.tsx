'use client';

import { BarChartCard } from "@/components/BarChartCard";
import { TeamFiltersBar } from "@/components/FiltersPanel";
import { ModelInfoDrawer as ModelProfileCard } from "@/components/ModelInfoDrawer";
import { PageHeader } from "@/components/PageHeader";
import { ScatterChartCard } from "@/components/ScatterChartCard";
import { NoharmInfoCard } from "@/components/NoharmInfoCard";
import { StudyAuthorsCard } from "@/components/StudyAuthorsCard";
import type {
  CombinationEntry,
  DataRow,
  DatasetArtifact,
  MetricMetadata
} from "@/types/dataset";
import { CONDITION_COLORS, TEAM_COLORS } from "@/config/colors";
import { HUMAN_DISPLAY_LABEL, isHumanLabel } from "@/config/humans";
import {
  groupRowsByCombination,
  normalizeHarmValue,
  pickRowsForMetric,
  sortRowsForMetric
} from "@/utils/data";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface DashboardProps {
  dataset: DatasetArtifact;
}

const DEFAULT_X_METRIC_ID = "Completeness";
const DEFAULT_Y_METRIC_ID = "Safety";

function resolvePreferredMetricId(
  metricIds: string[],
  preferredId: string
): string | undefined {
  const normalizedPreferred = preferredId.trim().toLowerCase();
  return metricIds.find(
    (candidate) => candidate.trim().toLowerCase() === normalizedPreferred
  );
}

function findMetricIdByDisplayLabel(
  metrics: MetricMetadata[],
  displayLabel: string
): string | undefined {
  const normalizedLabel = displayLabel.trim().toLowerCase();
  return metrics.find(
    (meta) => meta.displayLabel.trim().toLowerCase() === normalizedLabel
  )?.id;
}

const ALWAYS_ON_CONDITION_NAMES = new Set([
  "human",
  HUMAN_DISPLAY_LABEL.toLowerCase(),
  "control"
]);

const escapeRegExp = (value: string): string =>
  value.replace(/[-/\^$*+?.()|[\]{}]/g, "\\$&");

interface SuggestionCandidate {
  entry: CombinationEntry;
  score: number;
  order: number;
}

const TEAM_DISPLAY_PRIORITIES: Record<string, number> = {
  "solo model": 0,
  "solo models": 0,
  "solo": 0,
  "1 agent": 0,
  "1-agent team": 0,
  "1 agent team": 0,
  "1-agent teams": 0,
  "1 agent teams": 0,
  "solo team": 0,
  "2-agent team": 1,
  "2-agent teams": 1,
  "2 agents": 1,
  "2 agent team": 1,
  "2 agent teams": 1,
  "3-agent team": 2,
  "3-agent teams": 2,
  "3 agents": 2,
  "3 agent team": 2,
  "3 agent teams": 2
};
const DEFAULT_RANKING_METRIC_ID = "OverallScore3";
const DEFAULT_RANKING_METRIC_LABEL = "Overall Score";
const FALLBACK_RANKING_METRIC_ID = "nnh_cumulative";
const DEFAULT_PRIMARY_MODEL_RANK = 1;

function toggleWithMinimumSelected(
  current: string[],
  value: string,
  minimum = 1
): string[] {
  if (current.includes(value)) {
    if (current.length <= minimum) {
      return current;
    }
    return current.filter((item) => item !== value);
  }

  return [...current, value];
}

const matchesDifficulty = (
  grading: string | null | undefined,
  difficulty: "Unanimous" | "Majority"
): boolean => {
  const normalized = (grading ?? "").trim().toLowerCase();
  if (difficulty === "Unanimous") {
    return normalized === "unanimous" || normalized === "";
  }
  return normalized === "majority";
};

const SOLO_TEAM_IDENTIFIERS = new Set([
  "solo",
  "solo model",
  "solo models",
  "solo team",
  "solo teams",
  "1 agent",
  "1 agents",
  "1-agent team",
  "1-agent teams",
  "1 agent team",
  "1 agent teams"
]);

const isSoloTeamLabel = (value: string): boolean => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  if (SOLO_TEAM_IDENTIFIERS.has(normalized)) {
    return true;
  }

  if (normalized.includes("solo")) {
    return true;
  }

  if (normalized.includes("1-agent") || normalized.includes("1 agent")) {
    return true;
  }

  return false;
};

const determineDefaultTeams = (
  groups: { team: string; label: string }[]
): string[] => {
  const soloTeams = groups
    .filter(
      (group) => isSoloTeamLabel(group.team) || isSoloTeamLabel(group.label)
    )
    .map((group) => group.team);

  if (soloTeams.length > 0) {
    return soloTeams;
  }

  return groups.map((group) => group.team);
};

export function Dashboard({ dataset }: DashboardProps) {
  const metrics = useMemo(() => dataset.metadata, [dataset.metadata]);
  const metricIds = useMemo(() => metrics.map((meta) => meta.id), [metrics]);
  const preferredXMetricId = useMemo(
    () => resolvePreferredMetricId(metricIds, DEFAULT_X_METRIC_ID),
    [metricIds]
  );
  const preferredYMetricId = useMemo(
    () => resolvePreferredMetricId(metricIds, DEFAULT_Y_METRIC_ID),
    [metricIds]
  );
  const preferredRankingMetricId = useMemo(
    () =>
      findMetricIdByDisplayLabel(metrics, DEFAULT_RANKING_METRIC_LABEL) ??
      resolvePreferredMetricId(metricIds, DEFAULT_RANKING_METRIC_ID) ??
      resolvePreferredMetricId(metricIds, FALLBACK_RANKING_METRIC_ID),
    [metrics, metricIds]
  );
  const metadataMap = useMemo(
    () => new Map<string, MetricMetadata>(metrics.map((meta) => [meta.id, meta])),
    [metrics]
  );
  const allCombinations = useMemo(
    () => groupRowsByCombination(dataset.rows),
    [dataset.rows]
  );
  const unanimousCombinations = useMemo(
    () =>
      allCombinations.filter((entry) => matchesDifficulty(entry.grading, "Unanimous")),
    [allCombinations]
  );

  const { teamGroups, alwaysOnConditions } = useMemo(() => {
    const teamMap = new Map<string, Set<string>>();
    const allTeams = new Set<string>();
    const always = new Set<string>();

    dataset.rows.forEach((row) => {
      const team = (row.team ?? "").trim();
      const condition = (row.condition ?? "").trim();
      if (!team) {
        return;
      }
      allTeams.add(team);
      if (!condition) {
        return;
      }
      if (ALWAYS_ON_CONDITION_NAMES.has(condition.toLowerCase())) {
        always.add(condition);
        return;
      }
      if (!teamMap.has(team)) {
        teamMap.set(team, new Set<string>());
      }
      teamMap.get(team)!.add(condition);
    });

    const groups = Array.from(allTeams)
      .map((team) => {
        const conditions = Array.from(teamMap.get(team) ?? new Set<string>()).sort((a, b) =>
          a.localeCompare(b)
        );
        return {
          team,
          label: team ? team : "Unspecified Team",
          conditions
        };
      })
      .sort((a, b) => {
        const normalize = (value: string) => value.trim().toLowerCase();
        const aTeam = normalize(a.team);
        const bTeam = normalize(b.team);
        const aLabel = normalize(a.label);
        const bLabel = normalize(b.label);
        const aPriority =
          TEAM_DISPLAY_PRIORITIES[aTeam] ?? TEAM_DISPLAY_PRIORITIES[aLabel] ?? Infinity;
        const bPriority =
          TEAM_DISPLAY_PRIORITIES[bTeam] ?? TEAM_DISPLAY_PRIORITIES[bLabel] ?? Infinity;

        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }

        return a.label.localeCompare(b.label);
      });

    const alwaysList = Array.from(always).sort((a, b) => a.localeCompare(b));

    return {
      teamGroups: groups,
      alwaysOnConditions: alwaysList
    };
  }, [dataset.rows]);

  const [barMetricId, setBarMetricId] = useState<string>(() => metricIds[0] ?? "");
  const [xMetricId, setXMetricId] = useState<string>(() => {
    const preferred = resolvePreferredMetricId(metricIds, DEFAULT_X_METRIC_ID);
    return preferred ?? metricIds[0] ?? "";
  });
  const [yMetricId, setYMetricId] = useState<string>(() => {
    const preferred = resolvePreferredMetricId(metricIds, DEFAULT_Y_METRIC_ID);
    if (preferred) {
      return preferred;
    }
    if (metricIds.length > 1) {
      return metricIds[1];
    }
    return metricIds[0] ?? "";
  });
  const [selectedTeams, setSelectedTeams] = useState<string[]>(() =>
    determineDefaultTeams(teamGroups)
  );
  const [selectedTeamConditions, setSelectedTeamConditions] = useState<
    Record<string, string[]>
  >(() => {
    const initial: Record<string, string[]> = {};
    teamGroups.forEach((group) => {
      initial[group.team] = [...group.conditions];
    });
    return initial;
  });
  const [selection, setSelection] = useState<CombinationEntry | null>(null);
  const [comparisonSelection, setComparisonSelection] =
    useState<CombinationEntry | null>(null);
  const [modelSearch, setModelSearch] = useState<string>("");
  const [comparisonSearch, setComparisonSearch] = useState<string>("");
  const [activeSelectionTarget, setActiveSelectionTarget] =
    useState<"primary" | "comparison" | null>(null);
  const searchSelectionRef = useRef(false);
  const comparisonSearchSelectionRef = useRef(false);
  const hasInitializedDefaultsRef = useRef(false);

  useEffect(() => {
    if (teamGroups.length === 0) {
      setSelectedTeams([]);
      setSelectedTeamConditions({});
      return;
    }

    setSelectedTeams((prev) => {
      const valid = prev.filter((team) =>
        teamGroups.some((group) => group.team === team)
      );
      if (valid.length === prev.length && valid.length !== 0) {
        return prev;
      }
      if (valid.length) {
        return valid;
      }
      return determineDefaultTeams(teamGroups);
    });

    setSelectedTeamConditions((prev) => {
      const next: Record<string, string[]> = {};
      let changed = false;

      teamGroups.forEach((group) => {
        const allowed = group.conditions;
        const previous = prev[group.team] ?? allowed;
        const filtered = previous.filter((value) => allowed.includes(value));
        const finalValues =
          filtered.length > 0 || allowed.length === 0
            ? filtered.length > 0
              ? filtered
              : allowed
            : [];
        next[group.team] = finalValues;
        if (!changed) {
          if (
            previous.length !== finalValues.length ||
            !previous.every((value, index) => value === finalValues[index])
          ) {
            changed = true;
          }
        }
      });

      const prevKeys = Object.keys(prev);
      if (!changed && prevKeys.length === Object.keys(next).length) {
        const same = prevKeys.every((team) => {
          const prevValues = prev[team];
          const currentValues = next[team];
          return (
            prevValues &&
            currentValues &&
            prevValues.length === currentValues.length &&
            prevValues.every((value, index) => value === currentValues[index])
          );
        });
        if (same) {
          return prev;
        }
      }

      return next;
    });
  }, [teamGroups]);

  const alwaysOnConditionSet = useMemo(
    () => new Set(alwaysOnConditions.map((condition) => condition.toLowerCase())),
    [alwaysOnConditions]
  );

  const conditionColorMap = useMemo(() => {
    const map = new Map<string, string>();
    teamGroups.forEach((group) => {
      const teamColor = TEAM_COLORS[group.team] ?? TEAM_COLORS.default;
      group.conditions.forEach((condition) => {
        const color = CONDITION_COLORS[condition] ?? teamColor;
        map.set(condition, color);
      });
    });

    alwaysOnConditions.forEach((condition) => {
      const normalized = condition.trim();
      if (!normalized) {
        return;
      }
      if (!map.has(normalized)) {
        map.set(normalized, CONDITION_COLORS[normalized] ?? TEAM_COLORS.default);
      }
    });

    return map;
  }, [teamGroups, alwaysOnConditions]);

  const teamConditionLookup = useMemo(() => {
    const lookup = new Map<string, Set<string>>();
    Object.entries(selectedTeamConditions).forEach(([team, conditions]) => {
      lookup.set(team, new Set(conditions));
    });
    return lookup;
  }, [selectedTeamConditions]);

  const filteredRows = useMemo(() => {
    return dataset.rows.filter((row) => {
      const harmValue = normalizeHarmValue(row.harm);
      const isHarmScopedMetric = harmValue !== "";
      const harmMatch = !isHarmScopedMetric
        ? true
        : harmValue.toLowerCase() === "severe";
      const teamValue = (row.team ?? "").trim();
      const teamMatch =
        selectedTeams.length === 0
          ? true
          : selectedTeams.includes(teamValue);
      const conditionValue = (row.condition ?? "").trim();
      const conditionMatch = (() => {
        if (alwaysOnConditionSet.has(conditionValue.toLowerCase())) {
          return true;
        }
        const allowed = teamConditionLookup.get(teamValue);
        if (!allowed || allowed.size === 0) {
          return true;
        }
        return allowed.has(conditionValue);
      })();
      const gradingMatch = matchesDifficulty(row.grading, "Unanimous");
      return (
        harmMatch &&
        teamMatch &&
        conditionMatch &&
        gradingMatch
      );
    });
  }, [
    dataset.rows,
    selectedTeams,
    teamConditionLookup,
    alwaysOnConditionSet
  ]);

  const combinations = useMemo(
    () => groupRowsByCombination(filteredRows),
    [filteredRows]
  );

  useEffect(() => {
    if (hasInitializedDefaultsRef.current) {
      return;
    }
    if (selection || comparisonSelection) {
      hasInitializedDefaultsRef.current = true;
      return;
    }

    const rankingMetricCandidates = [
      preferredRankingMetricId,
      resolvePreferredMetricId(metricIds, FALLBACK_RANKING_METRIC_ID),
      preferredXMetricId,
      metricIds[0]
    ]
      .filter((candidate): candidate is string => Boolean(candidate))
      .filter((candidate, index, array) => array.indexOf(candidate) === index);

    let rankingMetricId: string | null = null;
    let rankingRows: DataRow[] = [];
    let higherIsBetter = true;

    for (const candidate of rankingMetricCandidates) {
      const rows = pickRowsForMetric(filteredRows, candidate).filter(
        (row) => row.mean !== null && Number.isFinite(row.mean)
      );
      if (rows.length === 0) {
        continue;
      }
      rankingMetricId = candidate;
      rankingRows = rows;
      higherIsBetter =
        metadataMap.get(candidate)?.betterDirection !== "lower";
      break;
    }

    if (!rankingMetricId || rankingRows.length === 0) {
      return;
    }

    const bestRows = sortRowsForMetric(rankingRows, higherIsBetter);

    const bestRowIndex = Math.max(0, DEFAULT_PRIMARY_MODEL_RANK - 1);
    const bestRow = bestRows[bestRowIndex] ?? bestRows[0] ?? null;
    const humanRow = rankingRows.find((row) => isHumanLabel(row.model));

    const findEntryByCombinationId = (combinationId: string) =>
      combinations.find((entry) => entry.combinationId === combinationId) ??
      allCombinations.find((entry) => entry.combinationId === combinationId) ??
      null;

    let applied = false;

    if (bestRow) {
      const entry = findEntryByCombinationId(bestRow.combinationId);
      if (entry) {
        setSelection(entry);
        setModelSearch(entry.displayLabel || entry.model || "");
        applied = true;
      }
    }

    const findHumanEntry = () => {
      const row = humanRow;
      if (row) {
        return findEntryByCombinationId(row.combinationId);
      }
      return (
        combinations.find((entry) => isHumanLabel(entry.model)) ??
        allCombinations.find((entry) => isHumanLabel(entry.model)) ??
        null
      );
    };

    const humanEntry = findHumanEntry();

    if (humanEntry) {
      setComparisonSelection(humanEntry);
      setComparisonSearch(humanEntry.displayLabel || humanEntry.model || "");
      applied = true;
    }

    if (applied) {
      hasInitializedDefaultsRef.current = true;
    }
  }, [
    filteredRows,
    combinations,
    allCombinations,
    selection,
    comparisonSelection,
    metricIds,
    metadataMap,
    preferredXMetricId,
    preferredRankingMetricId
  ]);

  useEffect(() => {
    if (!selection) {
      return;
    }
    const stillVisible = combinations.some(
      (entry) => entry.combinationId === selection.combinationId
    );
    if (!stillVisible) {
      setSelection(null);
      setModelSearch("");
    }
  }, [selection, combinations]);

  useEffect(() => {
    if (!comparisonSelection) {
      return;
    }
    const stillVisible = combinations.some(
      (entry) => entry.combinationId === comparisonSelection.combinationId
    );
    if (!stillVisible) {
      setComparisonSelection(null);
      setComparisonSearch("");
    }
  }, [comparisonSelection, combinations]);

  useEffect(() => {
    if (metricIds.length === 0) {
      return;
    }

    setBarMetricId((prev) => (metricIds.includes(prev) ? prev : metricIds[0]));
    setXMetricId((prev) => {
      if (metricIds.includes(prev)) {
        return prev;
      }
      if (preferredXMetricId) {
        return preferredXMetricId;
      }
      return metricIds[0] ?? prev;
    });
    setYMetricId((prev) => {
      if (metricIds.includes(prev)) {
        return prev;
      }
      if (preferredYMetricId) {
        return preferredYMetricId;
      }
      return metricIds[1] ?? metricIds[0];
    });
  }, [metricIds, preferredXMetricId, preferredYMetricId]);

  const ensureMetricExists = useCallback(
    (metricId: string, preferred?: string) => {
      if (metricIds.includes(metricId)) {
        return metricId;
      }
      if (preferred && metricIds.includes(preferred)) {
        return preferred;
      }
      return metricIds[0] ?? metricId;
    },
    [metricIds]
  );

  const safeBarMetric = ensureMetricExists(barMetricId);
  const safeXMetric = ensureMetricExists(xMetricId, preferredXMetricId);
  const safeYMetric = ensureMetricExists(yMetricId, preferredYMetricId);

  const normalizeSearch = useCallback((value: string) => value.trim().toLowerCase(), []);

  const normalizedSearch = normalizeSearch(modelSearch);
  const normalizedComparisonSearch = normalizeSearch(comparisonSearch);

  const buildSuggestions = useCallback(
    (normalized: string) => {
      if (!normalized) {
        return [];
      }

      const escaped = escapeRegExp(normalized);
      const boundaryRegex = new RegExp(`\\b${escaped}`);
      const candidates = new Map<string, SuggestionCandidate>();

      unanimousCombinations.forEach((entry, index) => {
        const label = (entry.displayLabel || entry.model || "").trim();
        if (!label) {
          return;
        }

        const labelLower = label.toLowerCase();
        const modelLower = (entry.model ?? "").trim().toLowerCase();
        const searchable = `${label} ${entry.team ?? ""} ${entry.condition ?? ""}`.toLowerCase();

        if (!searchable.includes(normalized)) {
          return;
        }

        let score = 0;

        if (labelLower === normalized) {
          score += 1_000_000;
        }

        if (modelLower === normalized) {
          score += 1_000_000;
        }

        if (labelLower.startsWith(normalized)) {
          score += 10_000;
        }

        if (modelLower.startsWith(normalized)) {
          score += 5_000;
        }

        boundaryRegex.lastIndex = 0;
        if (boundaryRegex.test(labelLower)) {
          score += 2_000;
        }

        const labelIndex = labelLower.indexOf(normalized);
        if (labelIndex >= 0) {
          score += Math.max(0, 1_000 - labelIndex);
        }

        const searchableIndex = searchable.indexOf(normalized);
        if (searchableIndex >= 0) {
          score += Math.max(0, 500 - searchableIndex);
        }

        const plusPenalty = (label.match(/\+/g) ?? []).length * 100;
        score -= plusPenalty;

        score -= label.length;

        const key = labelLower;
        const existing = candidates.get(key);

        if (!existing || score > existing.score || (score === existing.score && index < existing.order)) {
          candidates.set(key, {
            entry,
            score,
            order: index
          });
        }
      });

      return Array.from(candidates.values())
        .sort((a, b) => {
          if (a.score !== b.score) {
            return b.score - a.score;
          }
          const aLabel = (a.entry.displayLabel || a.entry.model || "").trim();
          const bLabel = (b.entry.displayLabel || b.entry.model || "").trim();
          if (aLabel && bLabel) {
            const labelComparison = aLabel.localeCompare(bLabel);
            if (labelComparison !== 0) {
              return labelComparison;
            }
          }
          return a.order - b.order;
        })
        .slice(0, 8)
        .map((candidate) => candidate.entry);
    },
    [unanimousCombinations]
  );

  const modelSuggestions = useMemo(
    () => buildSuggestions(normalizedSearch),
    [buildSuggestions, normalizedSearch]
  );

  const comparisonSuggestions = useMemo(
    () => buildSuggestions(normalizedComparisonSearch),
    [buildSuggestions, normalizedComparisonSearch]
  );

  useEffect(() => {
    if (!normalizedSearch) {
      return;
    }
    if (searchSelectionRef.current) {
      return;
    }
    const exactMatch = modelSuggestions.find((entry) => {
      const label = (entry.displayLabel || entry.model || "").trim().toLowerCase();
      return label !== "" && label === normalizedSearch;
    });
    if (!exactMatch) {
      return;
    }
    if (exactMatch.combinationId === selection?.combinationId) {
      return;
    }
    searchSelectionRef.current = true;
    setSelection(exactMatch);
  }, [normalizedSearch, modelSuggestions, selection]);

  useEffect(() => {
    if (!selection) {
      return;
    }
    if (searchSelectionRef.current) {
      searchSelectionRef.current = false;
      return;
    }
    const label = selection.displayLabel || selection.model || "";
    if (label) {
      setModelSearch(label);
    }
  }, [selection]);

  useEffect(() => {
    if (!normalizedComparisonSearch) {
      return;
    }
    if (comparisonSearchSelectionRef.current) {
      return;
    }
    const exactMatch = comparisonSuggestions.find((entry) => {
      const label = (entry.displayLabel || entry.model || "").trim().toLowerCase();
      return label !== "" && label === normalizedComparisonSearch;
    });
    if (!exactMatch) {
      return;
    }
    if (exactMatch.combinationId === comparisonSelection?.combinationId) {
      return;
    }
    comparisonSearchSelectionRef.current = true;
    setComparisonSelection(exactMatch);
  }, [normalizedComparisonSearch, comparisonSuggestions, comparisonSelection]);

  useEffect(() => {
    if (!comparisonSelection) {
      return;
    }
    if (comparisonSearchSelectionRef.current) {
      comparisonSearchSelectionRef.current = false;
      return;
    }
    const label = comparisonSelection.displayLabel || comparisonSelection.model || "";
    if (label) {
      setComparisonSearch(label);
    }
  }, [comparisonSelection]);

  const assignSelection = useCallback(
    (entry: CombinationEntry) => {
      if (activeSelectionTarget === "comparison") {
        comparisonSearchSelectionRef.current = true;
        setComparisonSelection(entry);
        setComparisonSearch(entry.displayLabel || entry.model || "");
        return;
      }

      searchSelectionRef.current = true;
      setSelection(entry);
      setModelSearch(entry.displayLabel || entry.model || "");
    },
    [
      activeSelectionTarget,
      setComparisonSelection,
      setComparisonSearch,
      setSelection,
      setModelSearch
    ]
  );

  const handleBarClick = (row: DataRow) => {
    const target = combinations.find(
      (entry) => entry.combinationId === row.combinationId
    );
    if (target) {
      assignSelection(target);
    }
  };

  const handleHighlightAssign = useCallback(
    (target: "primary" | "comparison", row: DataRow) => {
      const match = combinations.find(
        (entry) => entry.combinationId === row.combinationId
      );
      if (!match) {
        return;
      }

      if (target === "comparison") {
        comparisonSearchSelectionRef.current = true;
        setComparisonSelection(match);
        setComparisonSearch(match.displayLabel || match.model || "");
        return;
      }

      searchSelectionRef.current = true;
      setSelection(match);
      setModelSearch(match.displayLabel || match.model || "");
    },
    [
      combinations,
      setComparisonSelection,
      setComparisonSearch,
      setSelection,
      setModelSearch
    ]
  );

  const handlePointClick = (entry: CombinationEntry) => {
    assignSelection(entry);
  };

  const handleClearSelection = () => {
    setSelection(null);
    setModelSearch("");
  };

  const handleClearComparison = () => {
    setComparisonSelection(null);
    setComparisonSearch("");
  };

  const handleToggleTeam = useCallback((team: string) => {
    setSelectedTeams((prev) => toggleWithMinimumSelected(prev, team));
  }, []);

  const addTeamInDisplayOrder = useCallback(
    (teams: string[], teamToAdd: string) => {
      if (teams.includes(teamToAdd)) {
        return teams;
      }

      const ordering = teamGroups.map((group) => group.team);
      const insertionIndex = ordering.indexOf(teamToAdd);
      if (insertionIndex === -1) {
        return [...teams, teamToAdd];
      }

      const next = [...teams];
      let targetIndex = next.length;
      for (let index = 0; index < next.length; index += 1) {
        const existing = next[index];
        const existingOrderIndex = ordering.indexOf(existing);
        if (existingOrderIndex !== -1 && existingOrderIndex > insertionIndex) {
          targetIndex = index;
          break;
        }
      }

      next.splice(targetIndex, 0, teamToAdd);
      return next;
    },
    [teamGroups]
  );

  const handleToggleTeamCondition = useCallback(
    (team: string, condition: string) => {
      const allowed = teamGroups.find((group) => group.team === team)?.conditions ?? [];
      if (allowed.length === 0) {
        return;
      }

      const current =
        team in selectedTeamConditions ? selectedTeamConditions[team] : allowed;
      const has = current.includes(condition);
      const toggledValues = has
        ? current.filter((value) => value !== condition)
        : [...current, condition];

      const normalized = allowed.filter((value) => toggledValues.includes(value));

      if (normalized.length === 0) {
        const nextTeams = toggleWithMinimumSelected(selectedTeams, team);
        if (nextTeams.length === selectedTeams.length) {
          return;
        }

        setSelectedTeams(nextTeams);
        setSelectedTeamConditions((prev) => {
          const previousValues = team in prev ? prev[team] : allowed;
          if (previousValues.length === 0) {
            return prev;
          }
          return {
            ...prev,
            [team]: []
          };
        });
        return;
      }

      const previous = selectedTeamConditions[team] ?? allowed;
      const unchanged =
        previous.length === normalized.length &&
        previous.every((value, index) => value === normalized[index]);

      if (!selectedTeams.includes(team)) {
        const nextTeams = addTeamInDisplayOrder(selectedTeams, team);
        if (nextTeams.length !== selectedTeams.length) {
          setSelectedTeams(nextTeams);
        }
      }

      if (unchanged) {
        return;
      }

      setSelectedTeamConditions((prev) => ({
        ...prev,
        [team]: normalized
      }));
    },
    [
      teamGroups,
      selectedTeamConditions,
      selectedTeams,
      addTeamInDisplayOrder
    ]
  );

  return (
    <div className="flex flex-col gap-1 pb-12">
      <PageHeader />
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1.7fr)_minmax(360px,1fr)] lg:items-start lg:gap-6">
          <BarChartCard
            rows={filteredRows}
            metricId={safeBarMetric}
            onMetricChange={setBarMetricId}
            onBarClick={handleBarClick}
            onHighlightAssign={handleHighlightAssign}
            highlightedCombinationId={selection?.combinationId}
            comparisonCombinationId={comparisonSelection?.combinationId}
            metrics={metrics}
            metadataMap={metadataMap}
            conditionColorMap={conditionColorMap}
          />
          <div className="flex flex-col h-full justify-between">
            <ModelProfileCard
              selection={selection}
              comparison={comparisonSelection}
              onClear={handleClearSelection}
              onClearComparison={handleClearComparison}
              metrics={metrics}
              modelQuery={modelSearch}
              onModelSearchChange={setModelSearch}
              suggestions={modelSuggestions}
              comparisonQuery={comparisonSearch}
              onComparisonSearchChange={setComparisonSearch}
              comparisonSuggestions={comparisonSuggestions}
              onSuggestionSelect={(entry) => {
                const match =
                  unanimousCombinations.find(
                    (candidate) => candidate.combinationId === entry.combinationId
                  ) ??
                  allCombinations.find(
                    (candidate) => candidate.combinationId === entry.combinationId
                  );
                if (match) {
                  searchSelectionRef.current = true;
                  setSelection(match);
                  setModelSearch(match.displayLabel || match.model || "");
                }
              }}
              onComparisonSuggestionSelect={(entry) => {
                const match =
                  unanimousCombinations.find(
                    (candidate) => candidate.combinationId === entry.combinationId
                  ) ??
                  allCombinations.find(
                    (candidate) => candidate.combinationId === entry.combinationId
                  );
                if (match) {
                  comparisonSearchSelectionRef.current = true;
                  setComparisonSelection(match);
                  setComparisonSearch(match.displayLabel || match.model || "");
                }
              }}
              onActiveTargetChange={setActiveSelectionTarget}
            />
            <TeamFiltersBar
              teamGroups={teamGroups}
              selectedTeams={selectedTeams}
              selectedTeamConditions={selectedTeamConditions}
              onToggleTeam={handleToggleTeam}
              onToggleTeamCondition={handleToggleTeamCondition}
              conditionColorMap={conditionColorMap}
            />
          </div>
        </div>
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1.7fr)_minmax(360px,1fr)] lg:items-start lg:gap-6">
          <ScatterChartCard
            combinations={combinations}
            xMetricId={safeXMetric}
            yMetricId={safeYMetric}
            onXMetricChange={setXMetricId}
            onYMetricChange={setYMetricId}
            onPointClick={handlePointClick}
            highlightedCombinationId={selection?.combinationId}
            metrics={metrics}
            metadataMap={metadataMap}
          />
          <NoharmInfoCard />
        </div>
      </div>
      <StudyAuthorsCard />
    </div>
  );
}
