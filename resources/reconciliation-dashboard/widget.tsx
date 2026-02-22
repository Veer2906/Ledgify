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
import type { ReconciliationProps, MatchedItem, UnmatchedTransaction, UnmatchedInvoice } from "./types";
import { propSchema } from "./types";

export const widgetMetadata: WidgetMetadata = {
  description: "Display payment reconciliation results with matched and unmatched items",
  props: propSchema,
  exposeAsTool: false,
  metadata: {
    prefersBorder: false,
    invoking: "Reconciling payments...",
    invoked: "Reconciliation complete",
  },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function confidenceColor(confidence: number): string {
  if (confidence >= 0.9) return "text-emerald-600 dark:text-emerald-400";
  if (confidence >= 0.7) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function confidenceBg(confidence: number): string {
  if (confidence >= 0.9) return "bg-emerald-500";
  if (confidence >= 0.7) return "bg-amber-500";
  return "bg-red-500";
}

type TabKey = "matched" | "unmatched-txn" | "unmatched-inv";

const MatchedRow: React.FC<{ item: MatchedItem }> = ({ item }) => (
  <div className="rounded-2xl border border-default bg-surface p-4 transition-all duration-200 hover:shadow-md">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span className="font-semibold text-default">{item.customer_name}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-16 bg-default/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${confidenceBg(item.confidence)}`}
            style={{ width: `${item.confidence * 100}%` }}
          />
        </div>
        <span className={`text-xs font-bold ${confidenceColor(item.confidence)}`}>
          {Math.round(item.confidence * 100)}%
        </span>
      </div>
    </div>
    <div className="flex items-center gap-3 text-sm">
      <div className="flex-1 bg-surface-elevated rounded-xl px-3 py-2 border border-default">
        <p className="text-[10px] uppercase tracking-wider text-secondary font-medium mb-0.5">Invoice</p>
        <p className="font-mono text-xs text-default">{item.invoice_id}</p>
        <p className="font-bold text-default">{formatCurrency(item.invoice_amount)}</p>
      </div>
      <svg className="w-5 h-5 text-secondary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
      </svg>
      <div className="flex-1 bg-surface-elevated rounded-xl px-3 py-2 border border-default">
        <p className="text-[10px] uppercase tracking-wider text-secondary font-medium mb-0.5">Payment</p>
        <p className="font-mono text-xs text-default">{item.transaction_id}</p>
        <p className="font-bold text-default">{formatCurrency(item.transaction_amount)}</p>
      </div>
    </div>
  </div>
);

const UnmatchedTxnRow: React.FC<{ item: UnmatchedTransaction }> = ({ item }) => (
  <div className="rounded-2xl border border-default bg-surface p-4 transition-all duration-200 hover:shadow-md">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-default text-sm">{item.description}</p>
          <div className="flex items-center gap-2 text-xs text-secondary">
            <span className="font-mono">{item.id}</span>
            <span>&middot;</span>
            <span>{item.date}</span>
          </div>
        </div>
      </div>
      <span className="text-lg font-bold text-default">{formatCurrency(item.amount)}</span>
    </div>
  </div>
);

const UnmatchedInvRow: React.FC<{ item: UnmatchedInvoice }> = ({ item }) => {
  const {
    callTool: sendReminder,
    isPending: isSending,
  } = useCallTool<{ connectionId: string; invoiceId: string; tone: string }>("send-followup-email");

  return (
    <div className="rounded-2xl border border-default bg-surface p-4 transition-all duration-200 hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-default text-sm">{item.customer_name}</p>
            <div className="flex items-center gap-2 text-xs text-secondary">
              <span className="font-mono">{item.id}</span>
              <span>&middot;</span>
              <span>Due {item.due_date}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-default">{formatCurrency(item.amount)}</span>
          <button
            onClick={() => sendReminder({ connectionId: "demo", invoiceId: item.id, tone: "firm" })}
            disabled={isSending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
          >
            {isSending ? (
              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            )}
            {isSending ? "Sending..." : "Remind"}
          </button>
        </div>
      </div>
    </div>
  );
};

const ReconciliationDashboard: React.FC = () => {
  const { props, isPending } = useWidget<ReconciliationProps>();
  const [activeTab, setActiveTab] = useState<TabKey>("matched");

  if (isPending) {
    return (
      <McpUseProvider>
        <div className="bg-surface-elevated border border-default rounded-3xl p-8">
          <div className="h-6 w-48 rounded bg-default/10 animate-pulse mb-6" />
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-default bg-surface p-4">
                <div className="h-8 w-8 rounded-lg bg-default/10 animate-pulse mb-2" />
                <div className="h-3 w-16 rounded bg-default/10 animate-pulse mb-1" />
                <div className="h-6 w-10 rounded bg-default/10 animate-pulse" />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-2xl border border-default bg-surface p-4">
                <div className="h-4 w-40 rounded bg-default/10 animate-pulse mb-2" />
                <div className="h-3 w-24 rounded bg-default/10 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </McpUseProvider>
    );
  }

  const { matched, unmatchedTransactions, unmatchedInvoices } = props;
  const totalMatched = matched.reduce((s: number, m: MatchedItem) => s + m.transaction_amount, 0);
  const totalUnmatchedTxn = unmatchedTransactions.reduce((s: number, t: UnmatchedTransaction) => s + t.amount, 0);
  const totalUnmatchedInv = unmatchedInvoices.reduce((s: number, inv: UnmatchedInvoice) => s + inv.amount, 0);
  const totalItems = matched.length + unmatchedTransactions.length + unmatchedInvoices.length;
  const matchRate = totalItems > 0 ? Math.round((matched.length / totalItems) * 100) : 0;

  const tabs: { key: TabKey; label: string; count: number; color: string }[] = [
    { key: "matched", label: "Matched", count: matched.length, color: "emerald" },
    { key: "unmatched-txn", label: "Unmatched Payments", count: unmatchedTransactions.length, color: "amber" },
    { key: "unmatched-inv", label: "Unmatched Invoices", count: unmatchedInvoices.length, color: "red" },
  ];

  return (
    <McpUseProvider>
      <AppsSDKUIProvider linkComponent={Link}>
        <div className="bg-surface-elevated border border-default rounded-3xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent dark:from-indigo-900/20 dark:via-purple-900/10 p-6 pb-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <h5 className="text-secondary text-sm font-medium">Ledgify</h5>
                </div>
                <h2 className="text-xl font-bold text-default">Payment Reconciliation</h2>
              </div>
              <div className="text-right">
                <p className="text-xs text-secondary font-medium mb-0.5">Match Rate</p>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{matchRate}%</p>
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/60 dark:bg-white/5 backdrop-blur-sm rounded-xl px-3 py-2.5 border border-white/40 dark:border-white/10">
                <p className="text-[10px] uppercase tracking-wider text-secondary font-medium mb-0.5">Matched</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalMatched)}</p>
                <p className="text-[10px] text-secondary">{matched.length} pairs</p>
              </div>
              <div className="bg-white/60 dark:bg-white/5 backdrop-blur-sm rounded-xl px-3 py-2.5 border border-white/40 dark:border-white/10">
                <p className="text-[10px] uppercase tracking-wider text-secondary font-medium mb-0.5">Unmatched Pay</p>
                <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{formatCurrency(totalUnmatchedTxn)}</p>
                <p className="text-[10px] text-secondary">{unmatchedTransactions.length} items</p>
              </div>
              <div className="bg-white/60 dark:bg-white/5 backdrop-blur-sm rounded-xl px-3 py-2.5 border border-white/40 dark:border-white/10">
                <p className="text-[10px] uppercase tracking-wider text-secondary font-medium mb-0.5">Unmatched Inv</p>
                <p className="text-sm font-bold text-red-600 dark:text-red-400">{formatCurrency(totalUnmatchedInv)}</p>
                <p className="text-[10px] text-secondary">{unmatchedInvoices.length} items</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-6 pt-5 flex gap-2 border-b border-default">
            {tabs.map((tab) => {
              const activeTabStyles: Record<string, string> = {
                emerald: "border-emerald-500 text-default bg-surface",
                amber: "border-amber-500 text-default bg-surface",
                red: "border-red-500 text-default bg-surface",
              };
              const activeBadgeStyles: Record<string, string> = {
                emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
                amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
                red: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
              };
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-xl transition-colors border-b-2 -mb-px ${
                    activeTab === tab.key
                      ? activeTabStyles[tab.color] || ""
                      : "border-transparent text-secondary hover:text-default"
                  }`}
                >
                  {tab.label}
                  <span className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-bold ${
                    activeTab === tab.key
                      ? activeBadgeStyles[tab.color] || ""
                      : "bg-default/10 text-secondary"
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="p-6 space-y-3">
            {activeTab === "matched" && (
              matched.length > 0 ? (
                matched.map((item: MatchedItem, i: number) => <MatchedRow key={i} item={item} />)
              ) : (
                <p className="text-center text-secondary py-8">No matched items found.</p>
              )
            )}
            {activeTab === "unmatched-txn" && (
              unmatchedTransactions.length > 0 ? (
                unmatchedTransactions.map((item: UnmatchedTransaction, i: number) => <UnmatchedTxnRow key={i} item={item} />)
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 mb-3">
                    <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-secondary">All payments matched!</p>
                </div>
              )
            )}
            {activeTab === "unmatched-inv" && (
              unmatchedInvoices.length > 0 ? (
                unmatchedInvoices.map((item: UnmatchedInvoice, i: number) => <UnmatchedInvRow key={i} item={item} />)
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 mb-3">
                    <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-secondary">All invoices matched!</p>
                </div>
              )
            )}
          </div>
        </div>
      </AppsSDKUIProvider>
    </McpUseProvider>
  );
};

export default ReconciliationDashboard;
