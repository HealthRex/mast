declare module "chart.js" {
  export type ChartType = "scatter";
  export interface ScatterDataPoint {
    x: number;
    y: number;
  }

  export interface ScriptableContext<TType extends ChartType = ChartType> {
    active: boolean;
    chart: Chart;
    dataIndex: number;
    datasetIndex: number;
    parsed: unknown;
    raw: unknown;
  }

  export type Scriptable<T, TContext> = T | ((ctx: TContext) => T);

  export interface ChartDataset<TType extends ChartType = ChartType, TData = ScatterDataPoint[]> {
    label?: string;
    data: TData;
    order?: number;
    backgroundColor?: Scriptable<string, ScriptableContext<TType>>;
    borderColor?: string;
    pointRadius?: Scriptable<number, ScriptableContext<TType>>;
    pointBorderWidth?: Scriptable<number, ScriptableContext<TType>>;
  }

  export interface ChartData<TType extends ChartType = ChartType, TData = ScatterDataPoint[]> {
    datasets: ChartDataset<TType, TData>[];
  }

  export interface LegendItem {
    text: string;
    datasetIndex: number;
  }

  export interface TooltipItem<TType extends ChartType = ChartType> {
    raw: unknown;
    datasetIndex: number;
    dataIndex: number;
    label?: string;
  }

  export interface ScaleOptions {
    title?: {
      display?: boolean;
      text?: string;
      font?: Record<string, unknown>;
    };
    min?: number;
    max?: number;
    ticks?: Record<string, unknown>;
    grid?: Record<string, unknown>;
    border?: Record<string, unknown>;
  }

  export interface ChartOptions<TType extends ChartType = ChartType> {
    responsive?: boolean;
    maintainAspectRatio?: boolean;
    plugins?: Record<string, unknown>;
    scales?: Record<string, ScaleOptions>;
    onClick?: unknown;
  }

  export class Chart<TType extends ChartType = ChartType> {
    static register(...items: unknown[]): void;
    getElementsAtEventForMode(
      event: unknown,
      mode: string,
      options: Record<string, unknown>,
      useFinalPosition: boolean
    ): Array<{ datasetIndex: number; index: number }>;
  }

  export const LinearScale: unknown;
  export const PointElement: unknown;
  export const Tooltip: unknown;
  export const Legend: unknown;
  export const Title: unknown;
}

declare module "react-chartjs-2" {
  import type { ChartData, ChartOptions, Chart } from "chart.js";
  import type { ForwardedRef } from "react";

  export interface ScatterProps {
    data: ChartData<"scatter">;
    options?: ChartOptions<"scatter">;
    onClick?: (event: any) => void;
    ref?: ForwardedRef<Chart<"scatter"> | null>;
    className?: string;
  }

  export const Scatter: (props: ScatterProps) => JSX.Element;
}
