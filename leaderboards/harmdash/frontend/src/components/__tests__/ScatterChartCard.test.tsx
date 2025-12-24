import React from "react";
import { render, screen } from "@testing-library/react";
import type { CombinationEntry, MetricMetadata } from "@/types/dataset";
import { ScatterChartCard } from "../ScatterChartCard";
import { describe, expect, it } from "vitest";

(globalThis as unknown as { React: typeof React }).React = React;

const baseMetricMeta: MetricMetadata = {
  id: "Accuracy",
  order: 0,
  radarOrder: 0,
  range: "percent",
  displayLabel: "Accuracy",
  description: "",
  betterDirection: "higher",
  axisMin: 0,
  axisMax: 1,
  includeInRadar: true
};

const safetyMeta: MetricMetadata = {
  ...baseMetricMeta,
  id: "Safety",
  displayLabel: "Safety"
};

const accuracyMeta: MetricMetadata = {
  ...baseMetricMeta,
  id: "Accuracy",
  displayLabel: "Accuracy"
};

function buildEntry(index: number, team = "Solo Models"): CombinationEntry {
  return {
    combinationId: `combo-${team}-${index}`,
    model: `Model ${index}`,
    team,
    condition: "Advisor",
    harm: "",
    cases: null,
    grading: null,
    type: null,
    displayLabel: `Model ${index}`,
    metrics: {
      Safety: {
        model: `Model ${index}`,
        team,
        condition: "Advisor",
        harm: "",
        metric: "Safety",
        trials: 3,
        mean: 0.5 + index * 0.001,
        sd: null,
        se: null,
        ci: null,
        order1: null,
        order2: null,
        format: null,
        cases: null,
        grading: null,
        type: null,
        label: `Model ${index}`,
        displayLabel: `Model ${index}`,
        combinationId: `combo-${team}-${index}`,
        colorKey: "Advisor"
      },
      Accuracy: {
        model: `Model ${index}`,
        team,
        condition: "Advisor",
        harm: "",
        metric: "Accuracy",
        trials: 3,
        mean: 0.4 + index * 0.001,
        sd: null,
        se: null,
        ci: null,
        order1: null,
        order2: null,
        format: null,
        cases: null,
        grading: null,
        type: null,
        label: `Model ${index}`,
        displayLabel: `Model ${index}`,
        combinationId: `combo-${team}-${index}`,
        colorKey: "Advisor"
      }
    }
  };
}

describe("ScatterChartCard trace selection", () => {
  const metrics = [safetyMeta, accuracyMeta];
  const metadataMap = new Map<string, MetricMetadata>([
    ["Safety", safetyMeta],
    ["Accuracy", accuracyMeta]
  ]);

  it("groups entries by team and adds a human dataset", () => {
    const combinations: CombinationEntry[] = [
      buildEntry(0),
      buildEntry(1),
      {
        ...buildEntry(2),
        model: "Human Generalist Physicians",
        displayLabel: "Human Generalist Physicians"
      }
    ];

    render(
      <ScatterChartCard
        combinations={combinations}
        xMetricId="Safety"
        yMetricId="Accuracy"
        onXMetricChange={() => {}}
        onYMetricChange={() => {}}
        metrics={metrics}
        metadataMap={metadataMap}
      />
    );

    const chart = screen.getByTestId("chartjs-stub");
    const datasets = JSON.parse(chart.getAttribute("data-datasets") ?? "[]");
    const labels = datasets.map((dataset: any) => dataset.label);
    expect(labels).toContain("Solo Models");
    expect(labels).toContain("Human Generalist Physicians");
    const soloDataset = datasets.find((dataset: any) => dataset.label === "Solo Models");
    expect(soloDataset?.data).toHaveLength(2);
  });

  it("adds a Pearson correlation title to the chart", () => {
    const combinations: CombinationEntry[] = [
      buildEntry(0),
      buildEntry(1),
      buildEntry(2)
    ];

    render(
      <ScatterChartCard
        combinations={combinations}
        xMetricId="Safety"
        yMetricId="Accuracy"
        onXMetricChange={() => {}}
        onYMetricChange={() => {}}
        metrics={metrics}
        metadataMap={metadataMap}
      />
    );

    const chart = screen.getByTestId("chartjs-stub");
    const options = JSON.parse(chart.getAttribute("data-options") ?? "{}");
    expect(options.plugins?.title?.text).toContain("Pearson's R = 1.00");
  });

  it("scales percent metrics to percentages", () => {
    const percentMetric: MetricMetadata = {
      ...baseMetricMeta,
      id: "Percent",
      displayLabel: "Percent",
      range: "percent"
    };

    const percentEntry: CombinationEntry = {
      ...buildEntry(0),
      metrics: {
        ...buildEntry(0).metrics,
        Percent: {
          ...buildEntry(0).metrics.Accuracy!,
          metric: "Percent",
          mean: 0.52
        }
      }
    };

    const percentMap = new Map<string, MetricMetadata>([
      ["Percent", percentMetric],
      ["Accuracy", accuracyMeta]
    ]);

    render(
      <ScatterChartCard
        combinations={[percentEntry]}
        xMetricId="Percent"
        yMetricId="Accuracy"
        onXMetricChange={() => {}}
        onYMetricChange={() => {}}
        metrics={[percentMetric, accuracyMeta]}
        metadataMap={percentMap}
      />
    );

    const chart = screen.getByTestId("chartjs-stub");
    const datasets = JSON.parse(chart.getAttribute("data-datasets") ?? "[]");
    const point = datasets[0].data[0];
    expect(point.x).toBeCloseTo(52);
  });
});
