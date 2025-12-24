export class Chart<TType = string> {
  static register(..._items: unknown[]) {}

  getElementsAtEventForMode(
    _event: unknown,
    _mode: string,
    _options: Record<string, unknown>,
    _useFinalPosition: boolean
  ) {
    return [] as Array<{ datasetIndex: number; index: number }>;
  }
}

export const LinearScale = {};
export const PointElement = {};
export const Tooltip = {};
export const Legend = {};
export const Title = {};

export type LegendItem = { text: string; datasetIndex: number };
export type ScatterDataPoint = { x: number; y: number };
export type ChartData<TType = string, TData = ScatterDataPoint[]> = {
  datasets: Array<{ label?: string; data: TData }>;
};
export type ChartOptions<TType = string> = Record<string, unknown>;
export type TooltipItem<TType = string> = { raw: unknown };
