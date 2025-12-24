import React from "react";
import type { Chart, ChartData, ChartOptions } from "./chartjs-mock";

type ScatterProps = {
  data: ChartData<"scatter">;
  options?: ChartOptions<"scatter">;
  onClick?: (event: any) => void;
  className?: string;
};

export const Scatter = React.forwardRef<Chart<"scatter"> | null, ScatterProps>(
  function ScatterComponent({ data, options, onClick, className }, _ref) {
    return (
      <div
        data-testid="chartjs-stub"
        data-options={JSON.stringify(options ?? {})}
        data-datasets={JSON.stringify(data?.datasets ?? [])}
        className={className}
        onClick={onClick as any}
      />
    );
  }
);
