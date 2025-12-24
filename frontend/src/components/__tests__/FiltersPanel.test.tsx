import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { TeamFiltersBar } from "../FiltersPanel";
import { describe, expect, it, vi } from "vitest";

(globalThis as unknown as { React: typeof React }).React = React;

describe("TeamFiltersBar", () => {
  const mockOnToggleTeam = vi.fn();
  const mockOnToggleTeamCondition = vi.fn();

  const teamGroups = [
    {
      team: "Solo Model",
      label: "Solo Models",
      conditions: ["Advisor", "Advisor + Guardian"]
    },
    {
      team: "2-Agent Team",
      label: "2-Agent Teams",
      conditions: ["Advisor + Guardian", "Advisor + Steward"]
    }
  ];

  const selectedTeams = ["Solo Model"];
  const selectedTeamConditions = {
    "Solo Model": ["Advisor"]
  };

  const conditionColorMap = new Map<string, string>([
    ["Advisor", "#0f2350"],
    ["Advisor + Guardian", "#0f2350"]
  ]);

  it("renders team groups", () => {
    render(
      <TeamFiltersBar
        teamGroups={teamGroups}
        selectedTeams={selectedTeams}
        selectedTeamConditions={selectedTeamConditions}
        onToggleTeam={mockOnToggleTeam}
        onToggleTeamCondition={mockOnToggleTeamCondition}
        conditionColorMap={conditionColorMap}
      />
    );

    expect(screen.getByText("Solo Models")).toBeInTheDocument();
    expect(screen.getByText("2-Agent Teams")).toBeInTheDocument();
  });

  it("displays conditions for selected teams", () => {
    render(
      <TeamFiltersBar
        teamGroups={teamGroups}
        selectedTeams={selectedTeams}
        selectedTeamConditions={selectedTeamConditions}
        onToggleTeam={mockOnToggleTeam}
        onToggleTeamCondition={mockOnToggleTeamCondition}
        conditionColorMap={conditionColorMap}
      />
    );

    expect(screen.getByText("Advisor")).toBeInTheDocument();
  });

  it("calls onToggleTeam when team button is clicked", () => {
    render(
      <TeamFiltersBar
        teamGroups={teamGroups}
        selectedTeams={selectedTeams}
        selectedTeamConditions={selectedTeamConditions}
        onToggleTeam={mockOnToggleTeam}
        onToggleTeamCondition={mockOnToggleTeamCondition}
        conditionColorMap={conditionColorMap}
      />
    );

    const teamButton = screen.getByText("2-Agent Teams");
    fireEvent.click(teamButton);

    expect(mockOnToggleTeam).toHaveBeenCalledWith("2-Agent Team");
  });

  it("calls onToggleTeamCondition when condition button is clicked", () => {
    // Use 2-Agent Team with both conditions to test toggling
    const extendedSelectedTeams = ["Solo Model", "2-Agent Team"];
    const extendedSelectedConditions = {
      "Solo Model": ["Advisor"],
      "2-Agent Team": ["Advisor + Guardian"]
    };

    render(
      <TeamFiltersBar
        teamGroups={teamGroups}
        selectedTeams={extendedSelectedTeams}
        selectedTeamConditions={extendedSelectedConditions}
        onToggleTeam={mockOnToggleTeam}
        onToggleTeamCondition={mockOnToggleTeamCondition}
        conditionColorMap={conditionColorMap}
      />
    );

    // Click on the non-selected condition "Advisor + Steward" for 2-Agent Team
    const conditionButton = screen.getByText("Advisor + Steward");
    fireEvent.click(conditionButton);

    expect(mockOnToggleTeamCondition).toHaveBeenCalledWith("2-Agent Team", "Advisor + Steward");
  });

  it("highlights multi-agent teams with badge", () => {
    render(
      <TeamFiltersBar
        teamGroups={teamGroups}
        selectedTeams={["2-Agent Team"]}
        selectedTeamConditions={{}}
        onToggleTeam={mockOnToggleTeam}
        onToggleTeamCondition={mockOnToggleTeamCondition}
        conditionColorMap={conditionColorMap}
      />
    );

    expect(screen.getByText("2-Agent Teams")).toBeInTheDocument();
  });
});
