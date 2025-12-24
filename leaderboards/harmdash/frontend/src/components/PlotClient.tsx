'use client';

import dynamic from "next/dynamic";
import type { PlotParams } from "react-plotly.js";

const PlotComponent = dynamic<PlotParams>(() => import("react-plotly.js"), {
  ssr: false
});

export default PlotComponent;
