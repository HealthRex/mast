import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import type { DataRow, MetricMetadata } from "@/types/dataset";
import { BarChartCard } from "../BarChartCard";
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

function buildRow(index: number, team = "Solo Model", mean = 0.5): DataRow {
  return {
    model: `Model ${index}`,
    team,
    condition: "Advisor",
    harm: "",
    metric: "Safety",
    trials: 3,
    mean,
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
    combinationId: `combo-${team}-${index}`,
    colorKey: "Advisor",
    provider: "Test Provider"
  };
}

describe("BarChartCard", () => {
  const metrics = [baseMetricMeta];
  const metadataMap = new Map<string, MetricMetadata>([
    ["Safety", baseMetricMeta]
  ]);
  const conditionColorMap = new Map<string, string>([
    ["Advisor", "#0f2350"]
  ]);

  it("renders bar chart with best and worst view by default", () => {
    const rows: DataRow[] = [
      buildRow(1, "Solo Model", 0.9),
      buildRow(2, "Solo Model", 0.8),
      buildRow(3, "Solo Model", 0.3),
      buildRow(4, "Solo Model", 0.2)
    ];

    render(
      <BarChartCard
        rows={rows}
        metricId="Safety"
        onMetricChange={() => {}}
        maxItems={2}
        metrics={metrics}
        metadataMap={metadataMap}
        conditionColorMap={conditionColorMap}
      />
    );

    expect(screen.getByText("Best and Worst")).toBeInTheDocument();
    expect(screen.getByText("Models")).toBeInTheDocument();
  });

  it("toggles between best/worst and all views", () => {
    const rows: DataRow[] = [
      buildRow(1, "Solo Model", 0.9),
      buildRow(2, "Solo Model", 0.8)
    ];

    render(
      <BarChartCard
        rows={rows}
        metricId="Safety"
        onMetricChange={() => {}}
        maxItems={2}
        metrics={metrics}
        metadataMap={metadataMap}
        conditionColorMap={conditionColorMap}
      />
    );

    const toggleButton = screen.getByRole("button", { name: "Best and Worst" });

    fireEvent.click(toggleButton);
    expect(screen.getByText("All")).toBeInTheDocument();
  });

  it("displays confidence intervals when enabled", () => {
    const rows: DataRow[] = [
      buildRow(1, "Solo Model", 0.9)
    ];

    render(
      <BarChartCard
        rows={rows}
        metricId="Safety"
        onMetricChange={() => {}}
        metrics={metrics}
        metadataMap={metadataMap}
        conditionColorMap={conditionColorMap}
      />
    );

    expect(screen.getByText(/CI:/)).toBeInTheDocument();
  });

  it("filters by selected models", () => {
    const rows: DataRow[] = [
      buildRow(1, "Solo Model", 0.9),
      buildRow(2, "Solo Model", 0.8),
      buildRow(3, "Solo Model", 0.7)
    ];

    render(
      <BarChartCard
        rows={rows}
        metricId="Safety"
        onMetricChange={() => {}}
        metrics={metrics}
        metadataMap={metadataMap}
        conditionColorMap={conditionColorMap}
      />
    );

    const filterButton = screen.getByText("Filter models");
    fireEvent.click(filterButton);

    expect(screen.getByPlaceholderText("Search models")).toBeInTheDocument();
  });

  it("handles bar click events", () => {
    const onBarClick = vi.fn();
    const rows: DataRow[] = [buildRow(1, "Solo Model", 0.9)];

    render(
      <BarChartCard
        rows={rows}
        metricId="Safety"
        onMetricChange={() => {}}
        onBarClick={onBarClick}
        metrics={metrics}
        metadataMap={metadataMap}
        conditionColorMap={conditionColorMap}
      />
    );

    const bars = screen.getAllByRole("button").filter(btn =>
      btn.getAttribute("data-combination-id")
    );
    fireEvent.click(bars[0]);

    expect(onBarClick).toHaveBeenCalledWith(rows[0]);
  });

  it("displays human entries separately", () => {
    const rows: DataRow[] = [
      buildRow(1, "Solo Model", 0.9),
      { ...buildRow(2, "Solo Model", 0.8), model: "Human", displayLabel: "Human Generalist Physicians" }
    ];

    render(
      <BarChartCard
        rows={rows}
        metricId="Safety"
        onMetricChange={() => {}}
        metrics={metrics}
        metadataMap={metadataMap}
        conditionColorMap={conditionColorMap}
      />
    );

    expect(screen.getByText("Human Generalist Physicians")).toBeInTheDocument();
  });

  it("changes metric when dropdown selection changes", () => {
    const onMetricChange = vi.fn();
    const secondMetric: MetricMetadata = {
      ...baseMetricMeta,
      id: "Accuracy",
      displayLabel: "Accuracy"
    };
    const allMetrics = [baseMetricMeta, secondMetric];
    const rows: DataRow[] = [buildRow(1, "Solo Model", 0.9)];

    render(
      <BarChartCard
        rows={rows}
        metricId="Safety"
        onMetricChange={onMetricChange}
        metrics={allMetrics}
        metadataMap={metadataMap}
        conditionColorMap={conditionColorMap}
      />
    );

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "Accuracy" } });

    expect(onMetricChange).toHaveBeenCalledWith("Accuracy");
  });
});
