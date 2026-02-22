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
import type { InsightsProps, Insight, OverdueCustomer, ChartData } from "./types";
import { propSchema } from "./types";

export const widgetMetadata: WidgetMetadata = {
  description: "Comprehensive business insights dashboard with actionable recommendations and charts",
  props: propSchema,
  exposeAsTool: false,
  metadata: {
    prefersBorder: false,
    invoking: "Analyzing your business data...",
    invoked: "Insights ready",
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

function getSeverityStyles(severity: string) {
  switch (severity) {
    case "critical":
      return {
        bg: "bg-red-50 dark:bg-red-900/20",
        border: "border-red-200 dark:border-red-800",
        icon: "text-red-500",
        badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
        valueBg: "bg-red-100 dark:bg-red-900/30",
        valueText: "text-red-700 dark:text-red-300",
      };
    case "warning":
      return {
        bg: "bg-amber-50 dark:bg-amber-900/20",
        border: "border-amber-200 dark:border-amber-800",
        icon: "text-amber-500",
        badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
        valueBg: "bg-amber-100 dark:bg-amber-900/30",
        valueText: "text-amber-700 dark:text-amber-300",
      };
    case "success":
      return {
        bg: "bg-emerald-50 dark:bg-emerald-900/20",
        border: "border-emerald-200 dark:border-emerald-800",
        icon: "text-emerald-500",
        badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
        valueBg: "bg-emerald-100 dark:bg-emerald-900/30",
        valueText: "text-emerald-700 dark:text-emerald-300",
      };
    default:
      return {
        bg: "bg-blue-50 dark:bg-blue-900/20",
        border: "border-blue-200 dark:border-blue-800",
        icon: "text-blue-500",
        badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
        valueBg: "bg-blue-100 dark:bg-blue-900/30",
        valueText: "text-blue-700 dark:text-blue-300",
      };
  }
}

function getSeverityIcon(severity: string) {
  switch (severity) {
    case "critical":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      );
    case "warning":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "success":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case "warning":
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      );
    case "trend":
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      );
    case "tip":
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      );
    default:
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
  }
}

// Mini area chart for the header
function MiniAreaChart({ values, color, height = 40 }: { values: number[]; color: string; height?: number }) {
  const w = 120;
  const h = height;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`)
    .join(" ");

  const fillPoints = `0,${h} ${points} ${w},${h}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <polygon points={fillPoints} fill={color} opacity={0.15} />
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

// Revenue vs Expenses bar chart
function RevenueExpenseChart({ charts }: { charts: ChartData }) {
  const chartWidth = 600;
  const chartHeight = 180;
  const leftMargin = 50;
  const bottomMargin = 28;
  const topMargin = 8;
  const plotWidth = chartWidth - leftMargin;
  const plotHeight = chartHeight - bottomMargin - topMargin;
  const barPadding = 3;

  const maxVal = Math.max(...charts.revenue, ...charts.expenses);
  const barGroupWidth = plotWidth / charts.months.length;

  function yPos(val: number): number {
    if (maxVal === 0) return topMargin + plotHeight;
    return topMargin + plotHeight - (val / maxVal) * plotHeight;
  }

  const gridLines = 4;

  return (
    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Grid */}
      {Array.from({ length: gridLines + 1 }).map((_, i) => {
        const val = (maxVal * i) / gridLines;
        const y = yPos(val);
        return (
          <g key={i}>
            <line x1={leftMargin} y1={y} x2={chartWidth} y2={y} stroke="currentColor" strokeOpacity={0.06} strokeWidth={1} />
            <text x={leftMargin - 6} y={y + 4} textAnchor="end" className="fill-secondary" fontSize={8} fontFamily="system-ui">
              {formatCurrency(val)}
            </text>
          </g>
        );
      })}
      {/* Bars */}
      {charts.months.map((month, i) => {
        const x = leftMargin + i * barGroupWidth;
        const barW = (barGroupWidth - barPadding * 3) / 2;
        return (
          <g key={i}>
            <rect x={x + barPadding} y={yPos(charts.revenue[i])} width={barW} height={topMargin + plotHeight - yPos(charts.revenue[i])} rx={2} className="fill-blue-500 dark:fill-blue-400" opacity={0.8} />
            <rect x={x + barPadding * 2 + barW} y={yPos(charts.expenses[i])} width={barW} height={topMargin + plotHeight - yPos(charts.expenses[i])} rx={2} className="fill-red-400 dark:fill-red-500" opacity={0.6} />
            <text x={x + barGroupWidth / 2} y={chartHeight - 6} textAnchor="middle" className="fill-secondary" fontSize={9} fontFamily="system-ui">
              {month}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Profit trend line chart
function ProfitTrendChart({ charts }: { charts: ChartData }) {
  const chartWidth = 600;
  const chartHeight = 160;
  const leftMargin = 50;
  const bottomMargin = 28;
  const topMargin = 8;
  const plotWidth = chartWidth - leftMargin;
  const plotHeight = chartHeight - bottomMargin - topMargin;

  const maxVal = Math.max(...charts.profit);
  const minVal = Math.min(...charts.profit, 0);
  const range = maxVal - minVal || 1;

  function yPos(val: number): number {
    return topMargin + plotHeight - ((val - minVal) / range) * plotHeight;
  }

  const points = charts.profit
    .map((v, i) => `${leftMargin + (i / (charts.profit.length - 1)) * plotWidth},${yPos(v)}`)
    .join(" ");

  const fillPoints = `${leftMargin},${yPos(0)} ${points} ${leftMargin + plotWidth},${yPos(0)}`;
  const gridLines = 4;

  return (
    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Grid */}
      {Array.from({ length: gridLines + 1 }).map((_, i) => {
        const val = minVal + (range * i) / gridLines;
        const y = yPos(val);
        return (
          <g key={i}>
            <line x1={leftMargin} y1={y} x2={chartWidth} y2={y} stroke="currentColor" strokeOpacity={0.06} strokeWidth={1} />
            <text x={leftMargin - 6} y={y + 4} textAnchor="end" className="fill-secondary" fontSize={8} fontFamily="system-ui">
              {formatCurrency(val)}
            </text>
          </g>
        );
      })}
      {/* Area fill */}
      <polygon points={fillPoints} className="fill-emerald-500 dark:fill-emerald-400" opacity={0.1} />
      {/* Line */}
      <polyline points={points} fill="none" className="stroke-emerald-500 dark:stroke-emerald-400" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots */}
      {charts.profit.map((v, i) => (
        <circle
          key={i}
          cx={leftMargin + (i / (charts.profit.length - 1)) * plotWidth}
          cy={yPos(v)}
          r={3}
          className="fill-emerald-500 dark:fill-emerald-400"
        />
      ))}
      {/* Labels */}
      {charts.months.map((month, i) => (
        <text
          key={i}
          x={leftMargin + (i / (charts.months.length - 1)) * plotWidth}
          y={chartHeight - 6}
          textAnchor="middle"
          className="fill-secondary"
          fontSize={9}
          fontFamily="system-ui"
        >
          {month}
        </text>
      ))}
    </svg>
  );
}

// Insight card
const InsightCard: React.FC<{ insight: Insight }> = ({ insight }) => {
  const styles = getSeverityStyles(insight.severity);

  return (
    <div className={`rounded-2xl border ${styles.border} ${styles.bg} p-4 transition-all duration-200 hover:shadow-md`}>
      <div className="flex items-start gap-3">
        <div className={`flex items-center justify-center w-9 h-9 rounded-xl ${styles.valueBg} ${styles.icon} shrink-0 mt-0.5`}>
          {getTypeIcon(insight.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="font-semibold text-default text-sm">{insight.title}</h4>
            <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-bold rounded-full ${styles.badge} shrink-0`}>
              {insight.value}
            </span>
          </div>
          <p className="text-xs text-secondary leading-relaxed mb-2">{insight.description}</p>
          <div className="flex items-start gap-1.5 bg-white/60 dark:bg-white/5 rounded-lg px-3 py-2 border border-white/40 dark:border-white/10">
            <svg className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <p className="text-xs text-default leading-relaxed">{insight.suggestion}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Overdue customer row
const OverdueRow: React.FC<{ customer: OverdueCustomer }> = ({ customer }) => {
  const {
    callTool: sendReminder,
    isPending: isSending,
  } = useCallTool<{ connectionId: string; invoiceId: string; tone: string }>("send-followup-email");

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-default last:border-0">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-500 text-xs font-bold">
          {customer.days_overdue}d
        </div>
        <div>
          <p className="text-sm font-medium text-default">{customer.name}</p>
          <p className="text-xs text-secondary font-mono">{customer.invoice_id}</p>
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <span className="text-sm font-bold text-default">{formatFullCurrency(customer.amount)}</span>
        <button
          onClick={() =>
            sendReminder({
              connectionId: "demo",
              invoiceId: customer.invoice_id,
              tone: customer.days_overdue > 30 ? "final-notice" : customer.days_overdue > 14 ? "firm" : "friendly",
            })
          }
          disabled={isSending}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
        >
          {isSending ? (
            <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          )}
          {isSending ? "..." : "Remind"}
        </button>
      </div>
    </div>
  );
};

type TabKey = "insights" | "charts" | "overdue";

const InsightsDashboard: React.FC = () => {
  const { props, isPending } = useWidget<InsightsProps>();
  const [activeTab, setActiveTab] = useState<TabKey>("insights");
  const [chartView, setChartView] = useState<"revenue" | "profit">("revenue");

  const {
    callTool: checkOverdue,
    isPending: isCheckingOverdue,
  } = useCallTool<{ connectionId: string }>("check-overdue-invoices");

  const {
    callTool: runAnalysis,
    isPending: isAnalyzing,
  } = useCallTool<{ connectionId: string; timeframe: string; year: number }>("financial-analysis");

  if (isPending) {
    return (
      <McpUseProvider>
        <div className="bg-surface-elevated border border-default rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-default/10 animate-pulse" />
            <div>
              <div className="h-3 w-24 rounded bg-default/10 animate-pulse mb-1.5" />
              <div className="h-5 w-40 rounded bg-default/10 animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl bg-default/5 p-4">
                <div className="h-3 w-16 rounded bg-default/10 animate-pulse mb-2" />
                <div className="h-6 w-20 rounded bg-default/10 animate-pulse" />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl bg-default/5 p-5">
                <div className="h-4 w-32 rounded bg-default/10 animate-pulse mb-2" />
                <div className="h-3 w-full rounded bg-default/10 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </McpUseProvider>
    );
  }

  const { summary, insights, top_overdue_customers, charts } = props;

  const criticalInsights = insights.filter((i: Insight) => i.severity === "critical");
  const warningInsights = insights.filter((i: Insight) => i.severity === "warning");
  const successInsights = insights.filter((i: Insight) => i.severity === "success");
  const infoInsights = insights.filter((i: Insight) => i.severity === "info");

  // Sort: critical first, then warnings, then info, then success
  const sortedInsights = [...criticalInsights, ...warningInsights, ...infoInsights, ...successInsights];

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    {
      key: "insights",
      label: `Insights (${insights.length})`,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
    },
    {
      key: "charts",
      label: "Charts",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      key: "overdue",
      label: `At Risk (${top_overdue_customers.length})`,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
    },
  ];

  return (
    <McpUseProvider>
      <AppsSDKUIProvider linkComponent={Link}>
        <div className="bg-surface-elevated border border-default rounded-3xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-purple-500/5 dark:from-cyan-900/20 dark:via-blue-900/10 dark:to-purple-900/10 p-6 pb-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h5 className="text-secondary text-sm font-medium">Ledgify</h5>
                  <h2 className="text-xl font-bold text-default">Business Insights</h2>
                </div>
              </div>
              {/* Health score */}
              <div className="text-right">
                <p className="text-xs text-secondary font-medium mb-0.5">Health Score</p>
                <div className="flex items-center gap-1.5">
                  {getSeverityIcon(
                    criticalInsights.length > 0 ? "critical" : warningInsights.length > 2 ? "warning" : "success"
                  )}
                  <span className={`text-2xl font-bold ${
                    criticalInsights.length > 0
                      ? "text-red-600 dark:text-red-400"
                      : warningInsights.length > 2
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-emerald-600 dark:text-emerald-400"
                  }`}>
                    {criticalInsights.length > 0 ? "Needs Attention" : warningInsights.length > 2 ? "Fair" : "Good"}
                  </span>
                </div>
              </div>
            </div>

            {/* Summary KPI row */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-white/60 dark:bg-white/5 backdrop-blur-sm rounded-xl px-3 py-2.5 border border-white/40 dark:border-white/10">
                <p className="text-[10px] uppercase tracking-wider text-secondary font-medium mb-0.5">Revenue</p>
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatCurrency(summary.total_revenue)}</p>
                <div className="mt-1">
                  <MiniAreaChart values={charts.revenue} color="#3b82f6" height={24} />
                </div>
              </div>
              <div className="bg-white/60 dark:bg-white/5 backdrop-blur-sm rounded-xl px-3 py-2.5 border border-white/40 dark:border-white/10">
                <p className="text-[10px] uppercase tracking-wider text-secondary font-medium mb-0.5">Profit</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(summary.total_profit)}</p>
                <div className="mt-1">
                  <MiniAreaChart values={charts.profit} color="#10b981" height={24} />
                </div>
              </div>
              <div className="bg-white/60 dark:bg-white/5 backdrop-blur-sm rounded-xl px-3 py-2.5 border border-white/40 dark:border-white/10">
                <p className="text-[10px] uppercase tracking-wider text-secondary font-medium mb-0.5">Margin</p>
                <p className="text-sm font-bold text-default">{summary.avg_margin}%</p>
                <p className={`text-xs ${summary.revenue_growth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {summary.revenue_growth >= 0 ? "+" : ""}{summary.revenue_growth}% growth
                </p>
              </div>
              <div className="bg-white/60 dark:bg-white/5 backdrop-blur-sm rounded-xl px-3 py-2.5 border border-white/40 dark:border-white/10">
                <p className="text-[10px] uppercase tracking-wider text-secondary font-medium mb-0.5">At Risk</p>
                <p className="text-sm font-bold text-red-600 dark:text-red-400">{formatCurrency(summary.total_overdue)}</p>
                <p className="text-xs text-secondary">{summary.overdue_count} invoices &middot; {summary.avg_days_overdue}d avg</p>
              </div>
            </div>
          </div>

          {/* Tab bar */}
          <div className="px-6 pt-4 flex gap-2 border-b border-default">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-xl transition-colors border-b-2 -mb-px ${
                  activeTab === tab.key
                    ? "border-cyan-500 text-default bg-surface"
                    : "border-transparent text-secondary hover:text-default"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-6">
            {/* Insights tab */}
            {activeTab === "insights" && (
              <div className="space-y-3">
                {sortedInsights.map((insight: Insight, i: number) => (
                  <InsightCard key={i} insight={insight} />
                ))}
              </div>
            )}

            {/* Charts tab */}
            {activeTab === "charts" && (
              <div>
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setChartView("revenue")}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl transition-colors ${
                      chartView === "revenue"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                        : "text-secondary hover:bg-surface border border-default"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Revenue vs Expenses
                  </button>
                  <button
                    onClick={() => setChartView("profit")}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl transition-colors ${
                      chartView === "profit"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : "text-secondary hover:bg-surface border border-default"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    Profit Trend
                  </button>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mb-3">
                  {chartView === "revenue" ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm bg-blue-500 dark:bg-blue-400 opacity-80" />
                        <span className="text-xs text-secondary">Revenue</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm bg-red-400 dark:bg-red-500 opacity-60" />
                        <span className="text-xs text-secondary">Expenses</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-emerald-500 dark:bg-emerald-400" />
                      <span className="text-xs text-secondary">Net Profit</span>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-default bg-surface p-4">
                  {chartView === "revenue" ? (
                    <RevenueExpenseChart charts={charts} />
                  ) : (
                    <ProfitTrendChart charts={charts} />
                  )}
                </div>
              </div>
            )}

            {/* Overdue tab */}
            {activeTab === "overdue" && (
              <div>
                <div className="rounded-2xl border border-default bg-surface p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-default">Top Overdue Customers</h4>
                    <span className="text-xs text-secondary">{top_overdue_customers.length} customers</span>
                  </div>
                  {top_overdue_customers.map((customer: OverdueCustomer, i: number) => (
                    <OverdueRow key={i} customer={customer} />
                  ))}
                </div>

                {/* Quick actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => checkOverdue({ connectionId: "demo" })}
                    disabled={isCheckingOverdue}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-default bg-surface text-sm font-medium text-default transition-all hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-900/20 dark:hover:border-blue-800 disabled:opacity-50"
                  >
                    {isCheckingOverdue ? (
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                    View All Overdue
                  </button>
                  <button
                    onClick={() => runAnalysis({ connectionId: "demo", timeframe: "monthly", year: 2026 })}
                    disabled={isAnalyzing}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-default bg-surface text-sm font-medium text-default transition-all hover:bg-violet-50 hover:border-violet-200 dark:hover:bg-violet-900/20 dark:hover:border-violet-800 disabled:opacity-50"
                  >
                    {isAnalyzing ? (
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    )}
                    Full Analysis
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </AppsSDKUIProvider>
    </McpUseProvider>
  );
};

export default InsightsDashboard;
