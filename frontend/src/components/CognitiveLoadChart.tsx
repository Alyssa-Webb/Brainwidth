"use client";

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
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
  workStart = 7,
  workEnd = 21,
  height = 100
}: CognitiveLoadChartProps) {
  const peakThreshold = baseCapacity / 8;

  // Show work hours; recovery values (negative) shown as 0 in the chart area
  const data = hourlyLoad
    .map((val, i) => ({
      hour: `${i > 12 ? i - 12 : i}${i >= 12 ? "p" : "a"}`,
      load: Math.max(0, val),
      raw: val,
      index: i
    }))
    .filter(d => d.index >= workStart && d.index <= workEnd);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: -30, bottom: 0 }}>
        <defs>
          <linearGradient id="loadGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0.08} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="hour"
          tick={{ fontSize: 9, fill: "currentColor", opacity: 0.4 }}
          tickLine={false}
          axisLine={false}
          interval={2}
        />
        <YAxis hide domain={[0, peakThreshold * 2]} />
        <Tooltip
          contentStyle={{ fontSize: 11, borderRadius: 8 }}
          formatter={(val: any, _name: any, item: any) => {
            const raw = item?.payload?.raw ?? val;
            if (raw < 0) return [`${Math.abs(raw).toFixed(2)}τ recovery`, "Recovery"];
            return [`${Number(val).toFixed(2)}τ`, "Load"];
          }}
        />
        <Area
          type="monotone"
          dataKey="load"
          stroke="#6366f1"
          fill="url(#loadGradient)"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3, fill: "#ef4444" }}
          isAnimationActive={true}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
