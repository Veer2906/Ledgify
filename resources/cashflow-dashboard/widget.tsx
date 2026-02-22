import { AppsSDKUIProvider } from "@openai/apps-sdk-ui/components/AppsSDKUIProvider";
import {
  McpUseProvider,
  useCallTool,
  useWidget,
  type WidgetMetadata,
} from "mcp-use/react";
import React from "react";
import { Link } from "react-router";
import "../styles.css";
import type { CashFlowDashboardProps } from "./types";
import { propSchema } from "./types";

export const widgetMetadata: WidgetMetadata = {
  description: "Display cash flow summary dashboard with key metrics",
  props: propSchema,
  exposeAsTool: false,
  metadata: {
    prefersBorder: false,
    invoking: "Loading cash flow summary...",
    invoked: "Cash flow summary loaded",
  },
};

function formatCurrency(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }
  return `$${amount.toFixed(0)}`;
}

function formatMonth(month: string): string {
  const [year, m] = month.split("-");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[parseInt(m, 10) - 1]} ${year}`;
}

const ChangeIndicator: React.FC<{
  value: number;
  suffix?: string;
  inverted?: boolean;
}> = ({ value, suffix = "%", inverted = false }) => {
  if (value === 0) return <span className="text-xs text-secondary">&mdash;</span>;

  const isPositive = value > 0;
  const isGood = inverted ? !isPositive : isPositive;

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
        isGood
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-red-600 dark:text-red-400"
      }`}
    >
      {isPositive ? (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
        </svg>
      ) : (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
        </svg>
      )}
      {Math.abs(value)}{suffix}
    </span>
  );
};

interface MetricCardProps {
  label: string;
  value: string;
  change: number;
  changeSuffix?: string;
  inverted?: boolean;
  icon: React.ReactNode;
  colorClass: string;
  progressPercent?: number;
  progressColorClass?: string;
}

function MetricCard({ label, value, change, changeSuffix = "%", inverted, icon, colorClass, progressPercent, progressColorClass }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-default bg-surface p-4 transition-all duration-200 hover:shadow-md">
      <div className="flex items-center justify-between mb-3">
        <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${colorClass}`}>
          {icon}
        </div>
        <ChangeIndicator value={change} suffix={changeSuffix} inverted={inverted} />
      </div>
      <p className="text-[11px] uppercase tracking-wider text-secondary font-medium mb-1">{label}</p>
      <p className="text-2xl font-bold text-default">{value}</p>
      {progressPercent !== undefined && (
        <div className="mt-3">
          <div className="h-1.5 bg-default/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${progressColorClass || "bg-blue-500"}`}
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const CashFlowDashboard: React.FC = () => {
  const { props, isPending } = useWidget<CashFlowDashboardProps>();

  const {
    callTool: checkOverdue,
    isPending: isCheckingOverdue,
  } = useCallTool<{ connectionId: string }>("check-overdue-invoices");

  const {
    callTool: reconcile,
    isPending: isReconciling,
  } = useCallTool<{ accountingConnectionId: string; paymentConnectionId: string }>("reconcile-payments");

  if (isPending) {
    return (
      <McpUseProvider>
        <div className="bg-surface-elevated border border-default rounded-3xl p-8">
          <div className="h-6 w-48 rounded bg-default/10 animate-pulse mb-6" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl border border-default bg-surface p-4">
                <div className="h-10 w-10 rounded-xl bg-default/10 animate-pulse mb-3" />
                <div className="h-3 w-20 rounded bg-default/10 animate-pulse mb-2" />
                <div className="h-6 w-28 rounded bg-default/10 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </McpUseProvider>
    );
  }

  const { collected, outstanding, invoiceCount, avgDaysToPay, month, vsLastMonth } = props;
  const total = collected + outstanding;
  const collectionRate = total > 0 ? Math.round((collected / total) * 100) : 0;

  return (
    <McpUseProvider>
      <AppsSDKUIProvider linkComponent={Link}>
        <div className="bg-surface-elevated border border-default rounded-3xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent dark:from-blue-900/20 dark:via-indigo-900/10 p-6 pb-5">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h5 className="text-secondary text-sm font-medium">Ledgify</h5>
            </div>
            <h2 className="text-xl font-bold text-default">
              Cash Flow Summary &mdash; {formatMonth(month)}
            </h2>

            {/* Collection rate bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-secondary font-medium">Collection Rate</span>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{collectionRate}%</span>
              </div>
              <div className="h-2 bg-white/40 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-700"
                  style={{ width: `${collectionRate}%` }}
                />
              </div>
            </div>
          </div>

          {/* Metric cards */}
          <div className="p-6 grid grid-cols-2 gap-4">
            <MetricCard
              label="Collected"
              value={formatCurrency(collected)}
              change={vsLastMonth.collectedChange}
              colorClass="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              progressPercent={collectionRate}
              progressColorClass="bg-emerald-500"
            />
            <MetricCard
              label="Outstanding"
              value={formatCurrency(outstanding)}
              change={vsLastMonth.outstandingChange}
              inverted
              colorClass="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <MetricCard
              label="Invoices"
              value={String(invoiceCount)}
              change={vsLastMonth.invoiceCountChange}
              changeSuffix=""
              colorClass="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            />
            <MetricCard
              label="Avg Days to Pay"
              value={`${avgDaysToPay} days`}
              change={vsLastMonth.avgDaysChange}
              changeSuffix="d"
              inverted
              colorClass="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              }
            />
          </div>

          {/* Quick actions */}
          <div className="px-6 pb-6">
            <p className="text-[10px] uppercase tracking-wider text-secondary font-medium mb-3">Quick Actions</p>
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                View Overdue
              </button>
              <button
                onClick={() => reconcile({ accountingConnectionId: "demo", paymentConnectionId: "demo" })}
                disabled={isReconciling}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-default bg-surface text-sm font-medium text-default transition-all hover:bg-emerald-50 hover:border-emerald-200 dark:hover:bg-emerald-900/20 dark:hover:border-emerald-800 disabled:opacity-50"
              >
                {isReconciling ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                )}
                Reconcile
              </button>
            </div>
          </div>
        </div>
      </AppsSDKUIProvider>
    </McpUseProvider>
  );
};

export default CashFlowDashboard;
