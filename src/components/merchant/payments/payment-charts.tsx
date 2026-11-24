"use client";

import * as React from "react";
import { formatPeso } from "@/lib/payments";
import type { DailyCollectionPointDTO, MethodBreakdownItemDTO } from "@/types/payments";

/* -------------------------------------------------- Daily Collections Chart */

interface DailyCollectionsBarChartProps {
  data: DailyCollectionPointDTO[];
  timeframe: "7" | "14" | "30";
  onTimeframeChange: (tf: "7" | "14" | "30") => void;
}

export function DailyCollectionsBarChart({
  data,
  timeframe,
  onTimeframeChange,
}: DailyCollectionsBarChartProps) {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  const maxGross = Math.max(...data.map((d) => d.grossCents), 10000);
  const chartHeight = 180;
  const barAreaHeight = 140;

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-[#EDECE8] bg-white p-5 shadow-sm">
      {/* Chart Header */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <h3 className="text-base font-semibold text-[#1E293B]">Daily Net Collections</h3>
          <p className="text-xs text-[#64748B]">Revenue trends across settled appointments</p>
        </div>
        <div className="relative">
          <select
            value={timeframe}
            onChange={(e) => onTimeframeChange(e.target.value as "7" | "14" | "30")}
            className="cursor-pointer rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#334155] shadow-xs hover:border-[#CBD5E1] focus:border-[#C35000] focus:ring-1 focus:ring-[#C35000] focus:outline-none"
            aria-label="Select timeframe for collections chart"
          >
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </div>
      </div>

      {/* SVG Bar Chart */}
      <div className="relative my-2 w-full">
        {/* Tooltip */}
        {hoveredIndex !== null && data[hoveredIndex] && (
          <div
            className="pointer-events-none absolute -top-12 z-20 -translate-x-1/2 rounded-lg bg-[#0F172A] px-3 py-1.5 text-xs text-white shadow-lg transition-all"
            style={{
              left: `${((hoveredIndex + 0.5) / data.length) * 100}%`,
            }}
          >
            <p className="font-semibold">{data[hoveredIndex].label}</p>
            <p className="text-emerald-400">Gross: {formatPeso(data[hoveredIndex].grossCents)}</p>
            <p className="text-neutral-300">Net: {formatPeso(data[hoveredIndex].netCents)}</p>
            <p className="text-[10px] text-neutral-400">
              {data[hoveredIndex].count} transaction{data[hoveredIndex].count === 1 ? "" : "s"}
            </p>
          </div>
        )}

        <div className="flex h-[180px] w-full items-end gap-1.5 sm:gap-3">
          {data.map((point, index) => {
            const heightPercent = Math.max((point.grossCents / maxGross) * 100, 3);
            const isHovered = hoveredIndex === index;

            return (
              <div
                key={point.dateKey}
                className="group relative flex flex-1 flex-col items-center justify-end h-full cursor-pointer"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Subtle vertical bar */}
                <div className="w-full flex justify-center items-end" style={{ height: `${barAreaHeight}px` }}>
                  <div
                    className={`w-full max-w-[28px] rounded-t-md transition-all duration-200 ${
                      isHovered
                        ? "bg-[#A73F00] shadow-md scale-y-105"
                        : point.grossCents > 0
                        ? "bg-[#C35000] hover:bg-[#B34500]"
                        : "bg-[#F1F5F9]"
                    }`}
                    style={{
                      height: point.grossCents > 0 ? `${heightPercent}%` : "4px",
                    }}
                  />
                </div>
                {/* Date Label */}
                <span className="mt-2 text-[10px] sm:text-[11px] font-medium text-[#64748B] truncate w-full text-center">
                  {point.label.split(" ")[1] || point.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Note */}
      <p className="border-t border-[#F1F5F9] pt-3 text-[11px] text-[#94A3B8]">
        Net collections reflect recorded payments in Philippine pesos (Asia/Manila) and feed into BIR quarterly sales summaries.
      </p>
    </div>
  );
}

/* ------------------------------------------------ Method Breakdown Donut */

interface MethodDonutChartProps {
  breakdown: MethodBreakdownItemDTO[];
}

const METHOD_COLORS = {
  cash: "#C35000", // Burnt orange
  ewallet: "#2B4C7E", // Deep slate blue
  card: "#0D9488", // Teal
};

export function MethodDonutChart({ breakdown }: MethodDonutChartProps) {
  const totalCents = breakdown.reduce((sum, item) => sum + item.amountCents, 0);

  // SVG Donut calculation
  const size = 160;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-[#EDECE8] bg-white p-5 shadow-sm">
      {/* Header */}
      <div>
        <h3 className="text-base font-semibold text-[#1E293B]">Collections by Method</h3>
        <p className="text-xs text-[#64748B]">Breakdown across settlement channels</p>
      </div>

      {/* Body: Donut on Left, Legend on Right */}
      <div className="my-auto flex flex-col items-center justify-center gap-6 sm:flex-row sm:justify-around py-2">
        {/* SVG Donut */}
        <div className="relative flex size-[160px] items-center justify-center">
          <svg className="size-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
            {/* Background ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#F1F5F9"
              strokeWidth={strokeWidth}
            />

            {/* Slices */}
            {totalCents > 0 ? (
              breakdown.map((item) => {
                const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
                const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
                accumulatedPercent += item.percentage;

                const color = METHOD_COLORS[item.method] || "#94A3B8";

                return (
                  <circle
                    key={item.method}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-300"
                  />
                );
              })
            ) : (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke="#E2E8F0"
                strokeWidth={strokeWidth}
              />
            )}
          </svg>

          {/* Central Total Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xs font-medium text-[#64748B]">Total</span>
            <span className="text-sm font-bold text-[#1E293B] max-w-[100px] truncate">
              {formatPeso(totalCents)}
            </span>
          </div>
        </div>

        {/* Legend List */}
        <div className="flex flex-col gap-2.5 min-w-[150px]">
          {breakdown.map((item) => {
            const color = METHOD_COLORS[item.method] || "#94A3B8";
            return (
              <div key={item.method} className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="size-3 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-medium text-[#334155]">{item.label}</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-[#1E293B] block">
                    {formatPeso(item.amountCents)}
                  </span>
                  <span className="text-[11px] text-[#64748B] block">
                    {item.percentage.toFixed(1)}% ({item.count})
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-[#F1F5F9] pt-3 text-[11px] text-[#94A3B8]">
        Updates automatically upon recording cash, e-wallet, or card transactions.
      </div>
    </div>
  );
}
