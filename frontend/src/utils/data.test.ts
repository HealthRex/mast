import { describe, expect, it } from "vitest";
import type { DataRow } from "@/types/dataset";
import {
  formatMetricValue,
  getCombinationBaseKeyFromId,
  getCombinationBaseKeyFromRow,
  groupRowsByCombination
} from "@/utils/data";
import type { MetricMetadata } from "@/types/dataset";

describe("formatMetricValue", () => {
  const percentMeta: MetricMetadata = {
    id: "percentMetric",
    order: 1,
    range: "percent",
    displayLabel: "Percent Metric",
    description: "A percent metric",
    betterDirection: "higher",
    axisMin: null,
    axisMax: null
  };

  const absoluteMeta: MetricMetadata = {
    id: "absoluteMetric",
    order: 2,
    range: "absolute",
    displayLabel: "Absolute Metric",
    description: "An absolute metric",
    betterDirection: "higher",
    axisMin: null,
    axisMax: null
  };

  it("formats percent metrics with a percent sign", () => {
    expect(
      formatMetricValue(0.87456, { metadata: percentMeta, digits: 1 })
    ).toBe("87.5%");
  });

  it("formats absolute metrics with default digits", () => {
    expect(formatMetricValue(3.14159, { metadata: absoluteMeta })).toBe("3.14");
  });

  it("returns NA for null values", () => {
    expect(formatMetricValue(null)).toBe("NA");
  });

  it("omits the percent symbol when requested", () => {
    expect(
      formatMetricValue(0.5, {
        metadata: percentMeta,
        includeSymbol: false
      })
    ).toBe("50.0");
  });
});

describe("groupRowsByCombination", () => {
  const baseRows: DataRow[] = [
    {
      model: "Model A",
      team: "Team A",
      condition: "Solo",
      harm: "All",
      metric: "Accuracy",
      trials: 10,
      mean: 90,
      sd: null,
      se: null,
      ci: null,
      order1: null,
      order2: null,
      format: null,
      cases: "HumanCases",
      grading: "Unanimous",
      type: "AllHarm",
      provider: "Org A",
      label: null,
      displayLabel: "Model A",
      combinationId:
        "Model A::Team A::Solo::All::AllHarm::HumanCases::Unanimous"
    },
    {
      model: "Model A",
      team: "Team A",
      condition: "Solo",
      harm: "All",
      metric: "Safety",
      trials: 10,
      mean: 95,
      sd: null,
      se: null,
      ci: null,
      order1: null,
      order2: null,
      format: null,
      cases: "HumanCases",
      grading: "Unanimous",
      type: "AllHarm",
      provider: "Org A",
      label: null,
      displayLabel: "Model A",
      combinationId:
        "Model A::Team A::Solo::All::AllHarm::HumanCases::Unanimous"
    }
  ];

  it("groups rows under the same combination id", () => {
    const rows = [...baseRows];
    const grouped = groupRowsByCombination(rows);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].metrics.Accuracy.mean).toBe(90);
    expect(grouped[0].metrics.Safety.mean).toBe(95);
  });

  it("shares harm-agnostic metrics across harm-scoped combinations", () => {
    const rows: DataRow[] = [
      {
        model: "Model B",
        team: "Team A",
        condition: "Guardian",
        harm: "",
        metric: "Accuracy",
        trials: 10,
        mean: 85,
        sd: null,
        se: null,
        ci: null,
        order1: null,
        order2: null,
        format: null,
        cases: "AllCases",
        grading: "Unanimous",
        type: "AllHarm",
        provider: "Org B",
        label: null,
        displayLabel: "Model B",
        combinationId:
          "Model B::Team A::Guardian::::AllHarm::AllCases::Unanimous"
      },
      {
        model: "Model B",
        team: "Team A",
        condition: "Guardian",
        harm: "Severe",
        metric: "normalized",
        trials: 10,
        mean: 20,
        sd: null,
        se: null,
        ci: null,
        order1: null,
        order2: null,
        format: null,
        cases: "AllCases",
        grading: "Unanimous",
        type: "AllHarm",
        provider: "Org B",
        label: null,
        displayLabel: "Model B",
        combinationId:
          "Model B::Team A::Guardian::Severe::AllHarm::AllCases::Unanimous"
      }
    ];

    const grouped = groupRowsByCombination(rows);
    expect(grouped).toHaveLength(2);
    const severeEntry = grouped.find(
      (entry) => entry.harm === "Severe" && entry.condition === "Guardian"
    );
    expect(severeEntry?.metrics.Accuracy?.mean).toBe(85);
  });

  it("treats descriptive harm labels like 'All' as harm-agnostic", () => {
    const rows: DataRow[] = [
      {
        model: "Model C",
        team: "Team B",
        condition: "Advisor",
        harm: "All",
        metric: "Accuracy",
        trials: 8,
        mean: 75,
        sd: null,
        se: null,
        ci: null,
        order1: null,
        order2: null,
        format: null,
        cases: "AllCases",
        grading: "Majority",
        type: "AllHarm",
        provider: "Org C",
        label: null,
        displayLabel: "Model C",
        combinationId:
          "Model C::Team B::Advisor::All::AllHarm::AllCases::Majority"
      },
      {
        model: "Model C",
        team: "Team B",
        condition: "Advisor",
        harm: "Severe",
        metric: "nnh",
        trials: 8,
        mean: 4.2,
        sd: null,
        se: null,
        ci: null,
        order1: null,
        order2: null,
        format: null,
        cases: "AllCases",
        grading: "Majority",
        type: "AllHarm",
        provider: "Org C",
        label: null,
        displayLabel: "Model C",
        combinationId:
          "Model C::Team B::Advisor::Severe::AllHarm::AllCases::Majority"
      }
    ];

    const grouped = groupRowsByCombination(rows);
    const severeEntry = grouped.find(
      (entry) => entry.harm === "Severe" && entry.condition === "Advisor"
    );
    expect(severeEntry?.metrics.Accuracy?.mean).toBe(75);
  });
});

describe("combination base key helpers", () => {
  it("normalizes combination ids by removing harm details", () => {
    const withHarm =
      "Model X::Team Y::Advisor::Severe::AllHarm::AllCases::Unanimous";
    const withoutHarm =
      "Model X::Team Y::Advisor::::AllHarm::AllCases::Unanimous";
    expect(getCombinationBaseKeyFromId(withHarm)).toBe(
      getCombinationBaseKeyFromId(withoutHarm)
    );
  });

  it("matches base key generated from data rows", () => {
    const row: DataRow = {
      model: "Model Z",
      team: "Team Z",
      condition: "Guardian",
      harm: "Severe",
      metric: "nnh",
      trials: 5,
      mean: 4.2,
      sd: null,
      se: null,
      ci: null,
      order1: null,
      order2: null,
      format: null,
      cases: "AllCases",
      grading: "Unanimous",
      type: "AllHarm",
      provider: "Org Z",
      label: null,
      displayLabel: "Model Z",
      combinationId:
        "Model Z::Team Z::Guardian::Severe::AllHarm::AllCases::Unanimous"
    };

    expect(getCombinationBaseKeyFromRow(row)).toBe(
      getCombinationBaseKeyFromId(row.combinationId)
    );
  });
});
