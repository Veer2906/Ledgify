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
import type { InvoiceListProps, Invoice } from "./types";
import { propSchema } from "./types";
import { Button } from "@openai/apps-sdk-ui/components/Button";

export const widgetMetadata: WidgetMetadata = {
  description: "Display overdue invoices with send reminder actions",
  props: propSchema,
  exposeAsTool: false,
  metadata: {
    prefersBorder: false,
    invoking: "Loading overdue invoices...",
    invoked: "Overdue invoices loaded",
  },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function getUrgencyInfo(days: number) {
  if (days > 30) {
    return { label: "Critical", badgeClass: "bg-red-600 text-white dark:bg-red-500", barClass: "bg-red-500" };
  }
  if (days > 14) {
    return { label: "Overdue", badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300", barClass: "bg-red-400" };
  }
  if (days >= 7) {
    return { label: "Due Soon", badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300", barClass: "bg-amber-400" };
  }
  return { label: "Recent", badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300", barClass: "bg-emerald-400" };
}

function selectTone(days: number): string {
  if (days > 30) return "final-notice";
  if (days > 14) return "firm";
  return "friendly";
}

const InvoiceCard: React.FC<{ invoice: Invoice }> = ({ invoice }) => {
  const {
    callTool: sendFollowUp,
    isPending: isSending,
  } = useCallTool<{ connectionId: string; invoiceId: string; tone: string }>("send-followup-email");

  const urgency = getUrgencyInfo(invoice.days_overdue);

  return (
    <div className="group relative rounded-2xl border border-default bg-surface overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${urgency.barClass}`} />
      <div className="p-5 pl-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-default truncate text-base">{invoice.customer_name}</h3>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full shrink-0 ${urgency.badgeClass}`}>
                {urgency.label} &middot; {invoice.days_overdue}d
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm ml-10">
              <span className="font-bold text-lg text-default">{formatCurrency(invoice.amount)}</span>
              <span className="text-secondary flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Due {invoice.due_date}
              </span>
              <span className="text-xs text-secondary bg-surface-elevated px-2 py-0.5 rounded-md font-mono">{invoice.id}</span>
            </div>
          </div>
          <Button
            color="primary"
            size="md"
            variant="outline"
            disabled={isSending}
            onClick={() =>
              sendFollowUp({
                connectionId: "demo",
                invoiceId: invoice.id,
                tone: selectTone(invoice.days_overdue),
              })
            }
          >
            {isSending ? (
              <span className="flex items-center gap-1.5">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sending...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Remind
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

const InvoiceList: React.FC = () => {
  const { props, isPending } = useWidget<InvoiceListProps>();
  const [sortBy, setSortBy] = useState<"days" | "amount">("days");

  if (isPending) {
    return (
      <McpUseProvider>
        <div className="bg-surface-elevated border border-default rounded-3xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="h-4 w-32 rounded bg-default/10 animate-pulse mb-2" />
              <div className="h-6 w-48 rounded bg-default/10 animate-pulse" />
            </div>
            <div className="h-8 w-8 rounded-full bg-default/10 animate-pulse" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-default bg-surface p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-8 w-8 rounded-lg bg-default/10 animate-pulse" />
                  <div className="h-4 w-40 rounded bg-default/10 animate-pulse" />
                </div>
                <div className="h-3 w-24 rounded bg-default/10 animate-pulse ml-11" />
              </div>
            ))}
          </div>
        </div>
      </McpUseProvider>
    );
  }

  const { invoices } = props;

  const totalOverdue = invoices.reduce((sum: number, inv: Invoice) => sum + inv.amount, 0);
  const criticalCount = invoices.filter((inv: Invoice) => inv.days_overdue > 30).length;
  const avgDaysOverdue = invoices.length > 0
    ? Math.round(invoices.reduce((sum: number, inv: Invoice) => sum + inv.days_overdue, 0) / invoices.length)
    : 0;

  const sorted = [...invoices].sort((a: Invoice, b: Invoice) =>
    sortBy === "days" ? b.days_overdue - a.days_overdue : b.amount - a.amount
  );

  return (
    <McpUseProvider>
      <AppsSDKUIProvider linkComponent={Link}>
        <div className="bg-surface-elevated border border-default rounded-3xl overflow-hidden">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-red-500/10 via-orange-500/5 to-transparent dark:from-red-900/20 dark:via-orange-900/10 p-6 pb-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h5 className="text-secondary text-sm font-medium">Ledgify</h5>
                </div>
                <h2 className="text-xl font-bold text-default">Overdue Invoices</h2>
              </div>
              <span className="inline-flex items-center justify-center min-w-[2.5rem] h-10 px-3 rounded-2xl bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 text-lg font-bold">
                {invoices.length}
              </span>
            </div>
            {invoices.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/60 dark:bg-white/5 backdrop-blur-sm rounded-xl px-3 py-2.5 border border-white/40 dark:border-white/10">
                  <p className="text-[10px] uppercase tracking-wider text-secondary font-medium mb-0.5">Total Overdue</p>
                  <p className="text-sm font-bold text-red-600 dark:text-red-400">{formatCurrency(totalOverdue)}</p>
                </div>
                <div className="bg-white/60 dark:bg-white/5 backdrop-blur-sm rounded-xl px-3 py-2.5 border border-white/40 dark:border-white/10">
                  <p className="text-[10px] uppercase tracking-wider text-secondary font-medium mb-0.5">Critical</p>
                  <p className="text-sm font-bold text-default">{criticalCount} invoice{criticalCount !== 1 ? "s" : ""}</p>
                </div>
                <div className="bg-white/60 dark:bg-white/5 backdrop-blur-sm rounded-xl px-3 py-2.5 border border-white/40 dark:border-white/10">
                  <p className="text-[10px] uppercase tracking-wider text-secondary font-medium mb-0.5">Avg Overdue</p>
                  <p className="text-sm font-bold text-default">{avgDaysOverdue} days</p>
                </div>
              </div>
            )}
          </div>
          {/* Sort controls */}
          {invoices.length > 1 && (
            <div className="px-6 pt-4 pb-2 flex items-center gap-2">
              <span className="text-xs text-secondary font-medium">Sort:</span>
              <button
                onClick={() => setSortBy("days")}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  sortBy === "days"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                    : "text-secondary hover:bg-surface"
                }`}
              >
                Days Overdue
              </button>
              <button
                onClick={() => setSortBy("amount")}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  sortBy === "amount"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                    : "text-secondary hover:bg-surface"
                }`}
              >
                Amount
              </button>
            </div>
          )}
          {/* Invoice list */}
          <div className="p-6 pt-3 space-y-3">
            {sorted.map((invoice: Invoice) => (
              <InvoiceCard key={invoice.id} invoice={invoice} />
            ))}
          </div>
          {invoices.length === 0 && (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 mb-3">
                <svg className="w-7 h-7 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-default mb-1">All Clear!</h3>
              <p className="text-sm text-secondary">No overdue invoices found.</p>
            </div>
          )}
        </div>
      </AppsSDKUIProvider>
    </McpUseProvider>
  );
};

export default InvoiceList;
