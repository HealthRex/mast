'use client';

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import clsx from "clsx";
import { TEAM_COLORS } from "@/config/colors";

interface TeamConditionGroup {
  team: string;
  label: string;
  conditions: string[];
}

const TEAM_AGENT_COUNT_MAP: Record<string, number> = {
  "1 agent": 1,
  "1-agent team": 1,
  "1 agent team": 1,
  solo: 1,
  "solo model": 1,
  "solo models": 1,
  "2 agents": 2,
  "2 agent team": 2,
  "2 agent teams": 2,
  "2-agent team": 2,
  "2-agent teams": 2,
  "3 agents": 3,
  "3 agent team": 3,
  "3 agent teams": 3,
  "3-agent team": 3,
  "3-agent teams": 3
};

interface TeamFiltersBarProps {
  teamGroups: TeamConditionGroup[];
  selectedTeams: string[];
  selectedTeamConditions: Record<string, string[]>;
  onToggleTeam: (team: string) => void;
  onToggleTeamCondition: (team: string, condition: string) => void;
  conditionColorMap: Map<string, string>;
  className?: string;
}

export function TeamFiltersBar({
  teamGroups,
  selectedTeams,
  selectedTeamConditions,
  onToggleTeam,
  onToggleTeamCondition,
  conditionColorMap,
  className
}: TeamFiltersBarProps) {
  const inferAgentCount = useCallback((group: TeamConditionGroup) => {
    const normalizedLabel = group.label.trim().toLowerCase();
    const normalizedTeam = group.team.trim().toLowerCase();

    const directMatch = TEAM_AGENT_COUNT_MAP[normalizedTeam];
    if (directMatch) {
      return directMatch;
    }

    const labelMatch = group.label.match(/(\d+)/);
    if (labelMatch) {
      const parsed = Number.parseInt(labelMatch[1], 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }

    const labelLookup = TEAM_AGENT_COUNT_MAP[normalizedLabel];
    if (labelLookup) {
      return labelLookup;
    }

    const fromConditions = group.conditions.reduce((max, condition) => {
      const count = condition
        .split("+")
        .map((part) => part.trim())
        .filter(Boolean).length;
      return Math.max(max, count || 0);
    }, 0);

    return Math.max(fromConditions, 1);
  }, []);

  const [showMultiAgentHighlight, setShowMultiAgentHighlight] = useState(true);
  const [showTeamInfo, setShowTeamInfo] = useState(false);

  useEffect(() => {
    if (!showMultiAgentHighlight) {
      return;
    }

    const hasMultiAgentGroup = teamGroups.some(
      (group) => inferAgentCount(group) >= 2
    );

    if (!hasMultiAgentGroup) {
      setShowMultiAgentHighlight(false);
      return;
    }

    const multiAgentSelected = teamGroups.some((group) => {
      if (inferAgentCount(group) < 2) {
        return false;
      }
      return selectedTeams.includes(group.team);
    });

    if (multiAgentSelected) {
      setShowMultiAgentHighlight(false);
    }
  }, [
    inferAgentCount,
    selectedTeams,
    showMultiAgentHighlight,
    teamGroups
  ]);

  const getTeamCardSizing = (
    group: TeamConditionGroup,
    agentCount: number
  ): CSSProperties => {
    const baseSizing =
      agentCount >= 3
        ? { minWidth: 320, flexGrow: 1.25 }
        : agentCount === 2
        ? { minWidth: 225, flexGrow: 1.05 }
        : { minWidth: 170, flexGrow: 0.78 };

    const charWidth = agentCount >= 3 ? 7.2 : 6.2;
    const basePadding = agentCount >= 3 ? 34 : 30;

    const longestConditionLength = group.conditions.reduce(
      (max, condition) => Math.max(max, condition.trim().length),
      group.label.length
    );

    const estimatedButtonWidth = Math.max(
      agentCount >= 3 ? 170 : 135,
      Math.round(longestConditionLength * charWidth + basePadding)
    );

    const buttonCount = Math.max(group.conditions.length, 1);
    const maxPerRow = agentCount >= 3 ? 3 : 2;
    const buttonsPerRow = Math.min(buttonCount, maxPerRow);
    const estimatedRowWidth =
      estimatedButtonWidth * buttonsPerRow + (buttonsPerRow - 1) * 8;

    const minWidth = Math.min(
      560,
      Math.max(baseSizing.minWidth, estimatedRowWidth)
    );
    const flexGrow = Math.min(2, Math.max(baseSizing.flexGrow, minWidth / 280));
    const roundedWidth = Math.round(minWidth);
    const responsiveBasis = `min(${roundedWidth}px, 100%)`;

    return {
      flexGrow: Number(flexGrow.toFixed(2)),
      flexShrink: 1,
      flexBasis: responsiveBasis,
      minWidth: responsiveBasis,
      maxWidth: "100%"
    };
  };

  return (
    <section
      className={clsx(
        "flex flex-col gap-2.5 rounded-2xl bg-[#f4f4f5] p-3 min-h-[280px] transition-all duration-[600ms] ease-[cubic-bezier(0.33,1,0.68,1)]",
        className
      )}
    >
      <header className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            MULTI-AGENT CONFIGURATION
          </h2>
          <div
            className="relative"
            onMouseLeave={() => {
              setShowTeamInfo(false);
            }}
          >
            <button
              type="button"
              onClick={() => {
                setShowTeamInfo((previous) => !previous);
              }}
              onBlur={() => {
                setShowTeamInfo(false);
              }}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-white text-[11px] font-semibold text-slate-500 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1"
              aria-label="Team configuration info"
              aria-pressed={showTeamInfo}
            >
              i
            </button>
            {showTeamInfo ? (
              <div className="absolute left-1/2 bottom-full z-10 mb-2 w-96 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 text-xs font-medium text-slate-600 shadow-lg">
                View performance of multi-agent teams, where models can review and update the output of other models, as if providing a 2nd opinion
              </div>
            ) : null}
          </div>
        </div>
      </header>
      <div className="flex flex-wrap items-stretch justify-center gap-3 md:gap-4">
        {teamGroups.map((group) => {
          const isSelected = selectedTeams.includes(group.team);
          const selectedConditionsForTeam =
            selectedTeamConditions[group.team] ?? group.conditions;
          const hasClearedConditions =
            Array.isArray(selectedTeamConditions[group.team]) &&
            selectedTeamConditions[group.team].length === 0;
          const teamColor = TEAM_COLORS[group.team] ?? TEAM_COLORS.default;
          const agentCount = inferAgentCount(group);
          const isMultiAgentGroup = agentCount >= 2;
          const shouldHighlight = showMultiAgentHighlight && isMultiAgentGroup;
          const normalizedTeam = group.team.trim().toLowerCase();
          const normalizedLabel = group.label.trim().toLowerCase();
          const isSoloModelsGroup =
            normalizedTeam === "solo model" ||
            normalizedTeam === "solo models" ||
            normalizedLabel === "solo model" ||
            normalizedLabel === "solo models";

          return (
            <div
              key={group.team || "unspecified-team"}
              className={clsx(
                "flex w-full flex-col items-center gap-2.5 rounded-xl border p-3 text-center transition-all duration-[650ms] ease-[cubic-bezier(0.33,1,0.68,1)] sm:w-auto",
                isSelected
                  ? "border-brand-200 bg-white shadow-sm"
                  : "border-slate-200 bg-white"
              )}
              style={getTeamCardSizing(group, agentCount)}
            >
              <button
                type="button"
                onClick={() => {
                  if (isMultiAgentGroup && showMultiAgentHighlight) {
                    setShowMultiAgentHighlight(false);
                  }
                  onToggleTeam(group.team);
                }}
                className={clsx(
                  "mx-auto inline-flex min-w-[152px] max-w-[172px] items-center justify-center rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-all duration-[550ms] ease-[cubic-bezier(0.33,1,0.68,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                  isSelected
                    ? "text-white shadow-sm focus-visible:ring-brand-500"
                    : "bg-white text-slate-600 hover:border-brand-200 focus-visible:ring-brand-500"
                )}
                style={
                  isSelected
                    ? {
                        backgroundColor: teamColor,
                        borderColor: teamColor,
                        width: "min(100%, 176px)"
                      }
                    : {
                        borderColor: teamColor,
                        color: teamColor,
                        width: "min(100%, 176px)"
                      }
                }
              >
                <span className="truncate">{group.label}</span>
              </button>
              {group.conditions.length ? (
                <div
                  className={clsx(
                    "flex flex-wrap justify-center gap-2 transition-all duration-500 ease-out",
                    isSelected ? "" : "opacity-60"
                  )}
                >
                  {group.conditions.map((condition) => {
                    const normalizedCondition = condition.trim().toLowerCase();
                    const syncsWithSoloModels =
                      isSoloModelsGroup && normalizedCondition === "advisor";
                    const isActive = syncsWithSoloModels
                      ? isSelected
                      : selectedConditionsForTeam.includes(condition);
                    const disabled = syncsWithSoloModels
                      ? false
                      : (!isSelected && !hasClearedConditions) ||
                        group.conditions.length <= 1;
                    const color =
                      conditionColorMap.get(condition) ?? teamColor;

                    return (
                      <button
                        key={condition}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          if (isMultiAgentGroup && showMultiAgentHighlight) {
                            setShowMultiAgentHighlight(false);
                          }
                          if (syncsWithSoloModels) {
                            onToggleTeam(group.team);
                          } else {
                            onToggleTeamCondition(group.team, condition);
                          }
                        }}
                        className={clsx(
                          "flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
                          isActive
                            ? "text-white shadow-sm"
                            : "bg-white opacity-80 hover:opacity-100",
                          disabled
                            ? "cursor-not-allowed opacity-60 hover:border-slate-200"
                            : null
                        )}
                        style={
                          isActive
                            ? {
                                backgroundColor: color,
                                borderColor: color
                              }
                            : {
                                backgroundColor: "#ffffff",
                                borderColor: color,
                                color
                              }
                        }
                      >
                        <span className="truncate">{condition}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  No additional configurations.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
