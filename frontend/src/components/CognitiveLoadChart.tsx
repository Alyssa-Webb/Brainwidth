"use client";

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";

interface CognitiveLoadChartProps {
  hourlyLoad: number[];
  baseCapacity?: number;
  workStart?: number;
  workEnd?: number;
  height?: number;
}

export default function CognitiveLoadChart({
  hourlyLoad,
  baseCapacity = 8.0,
  workStart = 8,
  workEnd = 20,
  height = 100
}: CognitiveLoadChartProps) {
  const peakThreshold = baseCapacity / 8;

  // Only show work hours
  const data = hourlyLoad
    .map((val, i) => ({ hour: `${i}:00`, load: val, index: i }))
    .filter(d => d.index >= workStart && d.index <= workEnd);

  const formatTooltip = (value: number) =>
    [`${value.toFixed(2)} τ`, "Cognitive Load"];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: -30, bottom: 0 }}>
        <defs>
          <linearGradient id="loadGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="hour"
          tick={{ fontSize: 9, fill: "currentColor", opacity: 0.5 }}
          tickLine={false}
          axisLine={false}
          interval={2}
        />
        <YAxis hide domain={[0, peakThreshold * 2]} />
        <Tooltip formatter={formatTooltip} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
        <ReferenceLine y={peakThreshold} stroke="#f97316" strokeDasharray="3 3" strokeWidth={1} />
        <Area
          type="monotone"
          dataKey="load"
          stroke="url(#strokeGradient)"
          fill="url(#loadGradient)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "#ef4444" }}
          // Dynamically color: red above threshold, green below
          isAnimationActive={true}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
