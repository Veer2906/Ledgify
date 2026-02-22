import { AppsSDKUIProvider } from "@openai/apps-sdk-ui/components/AppsSDKUIProvider";
import {
  McpUseProvider,
  useCallTool,
  useWidget,
  type WidgetMetadata,
} from "mcp-use/react";
import React, { useState } from "react";
import { Link } from "react-router";
import "../styles.css";
import type { FinancialChartsProps, PeriodData } from "./types";
import { propSchema } from "./types";

export const widgetMetadata: WidgetMetadata = {
  description: "Interactive financial analysis charts with revenue, profit, and sales data",
  props: propSchema,
  exposeAsTool: false,
  metadata: {
    prefersBorder: false,
    invoking: "Analyzing financial data...",
    invoked: "Financial analysis ready",
  },
};

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}k`;
  return `$${amount.toFixed(0)}`;
}

function formatFullCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

type ChartMode = "revenue-expenses" | "profit" | "sales";

// SVG Bar Chart component
function BarChart({ periods, mode }: { periods: PeriodData[]; mode: ChartMode }) {
  const chartWidth = 600;
  const chartHeight = 200;
  const barPadding = 4;
  const leftMargin = 50;
  const bottomMargin = 30;
  const topMargin = 10;
  const plotWidth = chartWidth - leftMargin;
  const plotHeight = chartHeight - bottomMargin - topMargin;

  let maxVal = 0;
  let minVal = 0;

  if (mode === "revenue-expenses") {
    maxVal = Math.max(...periods.map((p) => Math.max(p.revenue, p.expenses)));
  } else if (mode === "profit") {
    maxVal = Math.max(...periods.map((p) => p.profit));
    minVal = Math.min(...periods.map((p) => p.profit), 0);
  } else {
    maxVal = Math.max(...periods.map((p) => p.sales));
  }

  const range = maxVal - minVal;
  const barGroupWidth = plotWidth / periods.length;
  const gridLines = 4;

  function yPos(val: number): number {
    if (range === 0) return topMargin + plotHeight;
    return topMargin + plotHeight - ((val - minVal) / range) * plotHeight;
  }

  const zeroY = yPos(0);

  return (
    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {Array.from({ length: gridLines + 1 }).map((_, i) => {
        const val = minVal + (range * i) / gridLines;
        const y = yPos(val);
        return (
          <g key={i}>
            <line x1={leftMargin} y1={y} x2={chartWidth} y2={y} stroke="currentColor" strokeOpacity={0.08} strokeWidth={1} />
            <text x={leftMargin - 6} y={y + 4} textAnchor="end" className="fill-secondary" fontSize={9} fontFamily="system-ui">
              {mode === "sales" ? Math.round(val) : formatCurrency(val)}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {periods.map((period, i) => {
        const x = leftMargin + i * barGroupWidth;

        if (mode === "revenue-expenses") {
          const barW = (barGroupWidth - barPadding * 3) / 2;
          return (
            <g key={i}>
              {/* Revenue bar */}
              <rect
                x={x + barPadding}
                y={yPos(period.revenue)}
                width={barW}
                height={zeroY - yPos(period.revenue)}
                rx={3}
                className="fill-blue-500 dark:fill-blue-400"
                opacity={0.85}
              />
              {/* Expenses bar */}
              <rect
                x={x + barPadding * 2 + barW}
                y={yPos(period.expenses)}
                width={barW}
                height={zeroY - yPos(period.expenses)}
                rx={3}
                className="fill-red-400 dark:fill-red-500"
                opacity={0.65}
              />
              {/* Label */}
              <text
                x={x + barGroupWidth / 2}
                y={chartHeight - 8}
                textAnchor="middle"
                className="fill-secondary"
                fontSize={10}
                fontFamily="system-ui"
              >
                {period.period}
              </text>
            </g>
          );
        }

        if (mode === "profit") {
          const barW = barGroupWidth - barPadding * 2;
          const val = period.profit;
          const barY = val >= 0 ? yPos(val) : zeroY;
          const barH = Math.abs(yPos(val) - zeroY);
          return (
            <g key={i}>
              <rect
                x={x + barPadding}
                y={barY}
                width={barW}
                height={Math.max(barH, 1)}
                rx={3}
                className={val >= 0 ? "fill-emerald-500 dark:fill-emerald-400" : "fill-red-500 dark:fill-red-400"}
                opacity={0.8}
              />
              <text
                x={x + barGroupWidth / 2}
                y={chartHeight - 8}
                textAnchor="middle"
                className="fill-secondary"
                fontSize={10}
                fontFamily="system-ui"
              >
                {period.period}
              </text>
            </g>
          );
        }

        // Sales
        const barW = barGroupWidth - barPadding * 2;
        return (
          <g key={i}>
            <rect
              x={x + barPadding}
              y={yPos(period.sales)}
              width={barW}
              height={zeroY - yPos(period.sales)}
              rx={3}
              className="fill-violet-500 dark:fill-violet-400"
              opacity={0.8}
            />
            <text
              x={x + barGroupWidth / 2}
              y={chartHeight - 8}
              textAnchor="middle"
              className="fill-secondary"
              fontSize={10}
              fontFamily="system-ui"
            >
              {period.period}
            </text>
          </g>
        );
      })}

      {/* Zero line for profit chart */}
      {mode === "profit" && minVal < 0 && (
        <line x1={leftMargin} y1={zeroY} x2={chartWidth} y2={zeroY} stroke="currentColor" strokeOpacity={0.3} strokeWidth={1} strokeDasharray="4 2" />
      )}
    </svg>
  );
}

// Sparkline for summary section
function Sparkline({ values, color }: { values: number[]; color: string }) {
  const w = 80;
  const h = 24;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-20 h-6" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const FinancialCharts: React.FC = () => {
  const { props, isPending } = useWidget<FinancialChartsProps>();
  const [chartMode, setChartMode] = useState<ChartMode>("revenue-expenses");

  const {
    callTool: switchTimeframe,
    isPending: isSwitching,
  } = useCallTool<{ connectionId: string; timeframe: string; year: number }>("financial-analysis");

  if (isPending) {
    return (
      <McpUseProvider>
        <div className="bg-surface-elevated border border-default rounded-3xl p-8">
          <div className="h-6 w-48 rounded bg-default/10 animate-pulse mb-6" />
          <div className="h-48 w-full rounded-2xl bg-default/10 animate-pulse mb-6" />
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl border border-default bg-surface p-3">
                <div className="h-3 w-16 rounded bg-default/10 animate-pulse mb-2" />
                <div className="h-5 w-20 rounded bg-default/10 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </McpUseProvider>
    );
  }

  const { year, timeframe, periods, summary } = props;

  const chartModes: { key: ChartMode; label: string; icon: React.ReactNode }[] = [
    {
      key: "revenue-expenses",
      label: "Revenue vs Expenses",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      key: "profit",
      label: "Profit/Loss",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      key: "sales",
      label: "Sales Volume",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
    },
  ];

  const revenueValues = periods.map((p: PeriodData) => p.revenue);
  const profitValues = periods.map((p: PeriodData) => p.profit);

  return (
    <McpUseProvider>
      <AppsSDKUIProvider linkComponent={Link}>
        <div className="bg-surface-elevated border border-default rounded-3xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-violet-500/10 via-blue-500/5 to-transparent dark:from-violet-900/20 dark:via-blue-900/10 p-6 pb-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <h5 className="text-secondary text-sm font-medium">Ledgify</h5>
                </div>
                <h2 className="text-xl font-bold text-default">
                  Financial Analysis &mdash; {year}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => switchTimeframe({ connectionId: "demo", timeframe: "monthly", year })}
                  disabled={isSwitching}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    timeframe === "monthly"
                      ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                      : "text-secondary hover:bg-surface"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => switchTimeframe({ connectionId: "demo", timeframe: "quarterly", year })}
                  disabled={isSwitching}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    timeframe === "quarterly"
                      ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                      : "text-secondary hover:bg-surface"
                  }`}
                >
                  Quarterly
                </button>
              </div>
            </div>

            {/* Key metrics row */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-white/60 dark:bg-white/5 backdrop-blur-sm rounded-xl px-3 py-2.5 border border-white/40 dark:border-white/10">
                <p className="text-[10px] uppercase tracking-wider text-secondary font-medium mb-0.5">Revenue</p>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatCurrency(summary.total_revenue)}</p>
                  <Sparkline values={revenueValues} color="#3b82f6" />
                </div>
              </div>
              <div className="bg-white/60 dark:bg-white/5 backdrop-blur-sm rounded-xl px-3 py-2.5 border border-white/40 dark:border-white/10">
                <p className="text-[10px] uppercase tracking-wider text-secondary font-medium mb-0.5">Profit</p>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(summary.total_profit)}</p>
                  <Sparkline values={profitValues} color="#10b981" />
                </div>
              </div>
              <div className="bg-white/60 dark:bg-white/5 backdrop-blur-sm rounded-xl px-3 py-2.5 border border-white/40 dark:border-white/10">
                <p className="text-[10px] uppercase tracking-wider text-secondary font-medium mb-0.5">Margin</p>
                <p className="text-sm font-bold text-default">{summary.avg_profit_margin}%</p>
              </div>
              <div className="bg-white/60 dark:bg-white/5 backdrop-blur-sm rounded-xl px-3 py-2.5 border border-white/40 dark:border-white/10">
                <p className="text-[10px] uppercase tracking-wider text-secondary font-medium mb-0.5">Growth</p>
                <p className={`text-sm font-bold ${summary.revenue_growth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {summary.revenue_growth >= 0 ? "+" : ""}{summary.revenue_growth}%
                </p>
              </div>
            </div>
          </div>

          {/* Chart mode selector */}
          <div className="px-6 pt-5 flex gap-2">
            {chartModes.map((m) => (
              <button
                key={m.key}
                onClick={() => setChartMode(m.key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl transition-colors ${
                  chartMode === m.key
                    ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                    : "text-secondary hover:bg-surface border border-default"
                }`}
              >
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>

          {/* Legend */}
          <div className="px-6 pt-3 flex items-center gap-4">
            {chartMode === "revenue-expenses" && (
              <>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-blue-500 dark:bg-blue-400 opacity-85" />
                  <span className="text-xs text-secondary">Revenue</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-red-400 dark:bg-red-500 opacity-65" />
                  <span className="text-xs text-secondary">Expenses</span>
                </div>
              </>
            )}
            {chartMode === "profit" && (
              <>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                  <span className="text-xs text-secondary">Profit</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-red-500" />
                  <span className="text-xs text-secondary">Loss</span>
                </div>
              </>
            )}
            {chartMode === "sales" && (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-violet-500" />
                <span className="text-xs text-secondary">Sales Volume</span>
              </div>
            )}
          </div>

          {/* Chart */}
          <div className="px-6 py-4">
            <div className="rounded-2xl border border-default bg-surface p-4">
              <BarChart periods={periods} mode={chartMode} />
            </div>
          </div>

          {/* Summary cards */}
          <div className="px-6 pb-6">
            <p className="text-[10px] uppercase tracking-wider text-secondary font-medium mb-3">Highlights</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-default bg-surface p-4 transition-all hover:shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </div>
                  <span className="text-xs text-secondary font-medium">Best Month</span>
                </div>
                <p className="text-lg font-bold text-default">{summary.best_month}</p>
                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold">{formatFullCurrency(summary.best_month_revenue)}</p>
              </div>
              <div className="rounded-2xl border border-default bg-surface p-4 transition-all hover:shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <span className="text-xs text-secondary font-medium">Slowest Month</span>
                </div>
                <p className="text-lg font-bold text-default">{summary.worst_month}</p>
                <p className="text-sm text-amber-600 dark:text-amber-400 font-semibold">{formatFullCurrency(summary.worst_month_revenue)}</p>
              </div>
              <div className="rounded-2xl border border-default bg-surface p-4 transition-all hover:shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <span className="text-xs text-secondary font-medium">Total Sales</span>
                </div>
                <p className="text-lg font-bold text-default">{summary.total_sales.toLocaleString()}</p>
                <p className="text-sm text-secondary">transactions</p>
              </div>
              <div className="rounded-2xl border border-default bg-surface p-4 transition-all hover:shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-xs text-secondary font-medium">Total Expenses</span>
                </div>
                <p className="text-lg font-bold text-default">{formatFullCurrency(summary.total_expenses)}</p>
                <p className="text-sm text-secondary">for {year}</p>
              </div>
            </div>
          </div>
        </div>
      </AppsSDKUIProvider>
    </McpUseProvider>
  );
};

export default FinancialCharts;
