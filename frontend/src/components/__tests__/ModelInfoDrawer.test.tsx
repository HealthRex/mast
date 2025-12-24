import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import type { CombinationEntry, MetricMetadata } from "@/types/dataset";
import { ModelInfoDrawer } from "../ModelInfoDrawer";
import { describe, expect, it, vi } from "vitest";

(globalThis as unknown as { React: typeof React }).React = React;

const baseMetricMeta: MetricMetadata = {
  id: "Safety",
  order: 0,
  radarOrder: 0,
  range: "percent",
  displayLabel: "Safety",
  description: "Safety metric",
  betterDirection: "higher",
  axisMin: 0,
  axisMax: 1,
  includeInRadar: true
};

function buildEntry(index: number): CombinationEntry {
  return {
    combinationId: `combo-${index}`,
    model: `Model ${index}`,
    team: "Solo Model",
    condition: "Advisor",
    harm: "",
    cases: null,
    grading: null,
    type: null,
    displayLabel: `Model ${index}`,
    metrics: {
      Safety: {
        model: `Model ${index}`,
        team: "Solo Model",
        condition: "Advisor",
        harm: "",
        metric: "Safety",
        trials: 3,
        mean: 0.5 + index * 0.1,
        sd: null,
        se: null,
        ci: 0.05,
        order1: null,
        order2: null,
        format: null,
        cases: null,
        grading: null,
        type: null,
        label: `Model ${index}`,
        displayLabel: `Model ${index}`,
        combinationId: `combo-${index}`,
        colorKey: "Advisor"
      }
    }
  };
}

describe("ModelInfoDrawer", () => {
  const metrics = [baseMetricMeta];
  const mockOnClear = vi.fn();
  const mockOnClearComparison = vi.fn();
  const mockOnModelSearchChange = vi.fn();
  const mockOnComparisonSearchChange = vi.fn();
  const mockOnSuggestionSelect = vi.fn();
  const mockOnComparisonSuggestionSelect = vi.fn();
  const mockOnActiveTargetChange = vi.fn();

  it("renders model profiles header", () => {
    render(
      <ModelInfoDrawer
        selection={null}
        comparison={null}
        onClear={mockOnClear}
        onClearComparison={mockOnClearComparison}
        metrics={metrics}
        modelQuery=""
        onModelSearchChange={mockOnModelSearchChange}
        suggestions={[]}
        comparisonQuery=""
        onComparisonSearchChange={mockOnComparisonSearchChange}
        comparisonSuggestions={[]}
        onSuggestionSelect={mockOnSuggestionSelect}
        onComparisonSuggestionSelect={mockOnComparisonSuggestionSelect}
        onActiveTargetChange={mockOnActiveTargetChange}
      />
    );

    expect(screen.getByText("Model Profiles")).toBeInTheDocument();
  });

  it("displays primary model search input", () => {
    render(
      <ModelInfoDrawer
        selection={null}
        comparison={null}
        onClear={mockOnClear}
        onClearComparison={mockOnClearComparison}
        metrics={metrics}
        modelQuery=""
        onModelSearchChange={mockOnModelSearchChange}
        suggestions={[]}
        comparisonQuery=""
        onComparisonSearchChange={mockOnComparisonSearchChange}
        comparisonSuggestions={[]}
        onSuggestionSelect={mockOnSuggestionSelect}
        onComparisonSuggestionSelect={mockOnComparisonSuggestionSelect}
        onActiveTargetChange={mockOnActiveTargetChange}
      />
    );

    expect(screen.getByLabelText("Primary Model")).toBeInTheDocument();
  });

  it("displays comparison model search input", () => {
    render(
      <ModelInfoDrawer
        selection={null}
        comparison={null}
        onClear={mockOnClear}
        onClearComparison={mockOnClearComparison}
        metrics={metrics}
        modelQuery=""
        onModelSearchChange={mockOnModelSearchChange}
        suggestions={[]}
        comparisonQuery=""
        onComparisonSearchChange={mockOnComparisonSearchChange}
        comparisonSuggestions={[]}
        onSuggestionSelect={mockOnSuggestionSelect}
        onComparisonSuggestionSelect={mockOnComparisonSuggestionSelect}
        onActiveTargetChange={mockOnActiveTargetChange}
      />
    );

    expect(screen.getByText(/Compare With/i)).toBeInTheDocument();
  });

  it("shows suggestions when typing in search", () => {
    const suggestions = [buildEntry(1), buildEntry(2)];

    render(
      <ModelInfoDrawer
        selection={null}
        comparison={null}
        onClear={mockOnClear}
        onClearComparison={mockOnClearComparison}
        metrics={metrics}
        modelQuery="Model"
        onModelSearchChange={mockOnModelSearchChange}
        suggestions={suggestions}
        comparisonQuery=""
        onComparisonSearchChange={mockOnComparisonSearchChange}
        comparisonSuggestions={[]}
        onSuggestionSelect={mockOnSuggestionSelect}
        onComparisonSuggestionSelect={mockOnComparisonSuggestionSelect}
        onActiveTargetChange={mockOnActiveTargetChange}
      />
    );

    const searchInput = screen.getByLabelText("Primary Model");
    fireEvent.focus(searchInput);

    // Verify suggestions are displayed (check for list container)
    const suggestionList = screen.getByRole("listbox");
    expect(suggestionList).toBeInTheDocument();
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);
  });

  it("calls onSuggestionSelect when clicking a suggestion", () => {
    const suggestions = [buildEntry(1)];

    render(
      <ModelInfoDrawer
        selection={null}
        comparison={null}
        onClear={mockOnClear}
        onClearComparison={mockOnClearComparison}
        metrics={metrics}
        modelQuery="Model"
        onModelSearchChange={mockOnModelSearchChange}
        suggestions={suggestions}
        comparisonQuery=""
        onComparisonSearchChange={mockOnComparisonSearchChange}
        comparisonSuggestions={[]}
        onSuggestionSelect={mockOnSuggestionSelect}
        onComparisonSuggestionSelect={mockOnComparisonSuggestionSelect}
        onActiveTargetChange={mockOnActiveTargetChange}
      />
    );

    const searchInput = screen.getByLabelText("Primary Model");
    fireEvent.focus(searchInput);

    const options = screen.getAllByRole("option");
    fireEvent.click(options[0]);

    expect(mockOnSuggestionSelect).toHaveBeenCalledWith(suggestions[0]);
  });

  it("displays selected model information", () => {
    const selection = buildEntry(1);

    render(
      <ModelInfoDrawer
        selection={selection}
        comparison={null}
        onClear={mockOnClear}
        onClearComparison={mockOnClearComparison}
        metrics={metrics}
        modelQuery={selection.displayLabel}
        onModelSearchChange={mockOnModelSearchChange}
        suggestions={[]}
        comparisonQuery=""
        onComparisonSearchChange={mockOnComparisonSearchChange}
        comparisonSuggestions={[]}
        onSuggestionSelect={mockOnSuggestionSelect}
        onComparisonSuggestionSelect={mockOnComparisonSuggestionSelect}
        onActiveTargetChange={mockOnActiveTargetChange}
      />
    );

    expect(screen.getByDisplayValue(selection.displayLabel)).toBeInTheDocument();
  });

  it("calls onClear when clearing selection", () => {
    const selection = buildEntry(1);

    render(
      <ModelInfoDrawer
        selection={selection}
        comparison={null}
        onClear={mockOnClear}
        onClearComparison={mockOnClearComparison}
        metrics={metrics}
        modelQuery={selection.displayLabel}
        onModelSearchChange={mockOnModelSearchChange}
        suggestions={[]}
        comparisonQuery=""
        onComparisonSearchChange={mockOnComparisonSearchChange}
        comparisonSuggestions={[]}
        onSuggestionSelect={mockOnSuggestionSelect}
        onComparisonSuggestionSelect={mockOnComparisonSuggestionSelect}
        onActiveTargetChange={mockOnActiveTargetChange}
      />
    );

    const searchInput = screen.getByLabelText("Primary Model");
    fireEvent.change(searchInput, { target: { value: "" } });

    expect(mockOnClear).toHaveBeenCalled();
  });

  it("renders with AI model selection", () => {
    const selection = buildEntry(1);

    render(
      <ModelInfoDrawer
        selection={selection}
        comparison={null}
        onClear={mockOnClear}
        onClearComparison={mockOnClearComparison}
        metrics={metrics}
        modelQuery={selection.displayLabel}
        onModelSearchChange={mockOnModelSearchChange}
        suggestions={[]}
        comparisonQuery=""
        onComparisonSearchChange={mockOnComparisonSearchChange}
        comparisonSuggestions={[]}
        onSuggestionSelect={mockOnSuggestionSelect}
        onComparisonSuggestionSelect={mockOnComparisonSuggestionSelect}
        onActiveTargetChange={mockOnActiveTargetChange}
      />
    );

    const input = screen.getByLabelText("Primary Model") as HTMLInputElement;

    // Verify the input renders with the correct value
    expect(input).toBeInTheDocument();
    expect(input.value).toBe(selection.displayLabel);
  });

  it("renders with Human model selection", () => {
    const humanEntry = {
      ...buildEntry(1),
      model: "Human",
      displayLabel: "Human Generalist Physicians"
    };

    render(
      <ModelInfoDrawer
        selection={humanEntry}
        comparison={null}
        onClear={mockOnClear}
        onClearComparison={mockOnClearComparison}
        metrics={metrics}
        modelQuery={humanEntry.model}
        onModelSearchChange={mockOnModelSearchChange}
        suggestions={[]}
        comparisonQuery=""
        onComparisonSearchChange={mockOnComparisonSearchChange}
        comparisonSuggestions={[]}
        onSuggestionSelect={mockOnSuggestionSelect}
        onComparisonSuggestionSelect={mockOnComparisonSuggestionSelect}
        onActiveTargetChange={mockOnActiveTargetChange}
      />
    );

    const input = screen.getByLabelText("Primary Model") as HTMLInputElement;

    // Verify the input renders with the correct value
    expect(input).toBeInTheDocument();
    expect(input.value).toBe(humanEntry.model);
  });
});
