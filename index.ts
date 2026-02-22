import { MCPServer, object, text, widget } from "mcp-use/server";
import { z } from "zod";

const PYTHON_API = process.env.PYTHON_API || "http://localhost:8000";

const server = new MCPServer({
  name: "ledgify",
  title: "Ledgify",
  version: "1.0.0",
  description: "AR/AP automation MCP app — manage overdue invoices, send payment reminders, reconcile payments, and view cash flow summaries",
  baseUrl: process.env.MCP_URL || "http://localhost:3000",
  favicon: "favicon.ico",
  websiteUrl: "https://mcp-use.com",
  icons: [
    {
      src: "icon.svg",
      mimeType: "image/svg+xml",
      sizes: ["512x512"],
    },
  ],
});

async function apiCall<T>(path: string, options?: RequestInit): Promise<T> {
  const resp = await fetch(`${PYTHON_API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!resp.ok) {
    throw new Error(`API error ${resp.status}: ${await resp.text()}`);
  }
  return resp.json() as Promise<T>;
}

// --- Tool 1: Check Overdue Invoices ---
server.tool(
  {
    name: "check-overdue-invoices",
    description: "Fetch overdue invoices and display them in a visual list. Use this when the user asks about unpaid or overdue invoices.",
    schema: z.object({
      connectionId: z.string().default("demo").describe("Accounting connection ID"),
      minDaysOverdue: z.number().default(0).describe("Minimum days overdue to filter by"),
    }),
    widget: {
      name: "invoice-list",
      invoking: "Fetching overdue invoices...",
      invoked: "Overdue invoices loaded",
    },
  },
  async ({ connectionId, minDaysOverdue }) => {
    const data = await apiCall<{ invoices: any[]; count: number }>("/invoices/overdue", {
      method: "POST",
      body: JSON.stringify({
        connection_id: connectionId,
        min_days_overdue: minDaysOverdue,
      }),
    });

    const invoiceDetails = data.invoices
      .map(
        (inv: any) =>
          `- Invoice ${inv.id}: ${inv.customer_name}, $${inv.amount?.toFixed(2)}, ${inv.days_overdue} days overdue (due ${inv.due_date})`
      )
      .join("\n");

    return widget({
      props: { invoices: data.invoices },
      output: text(
        `Found ${data.count} overdue invoice(s):\n${invoiceDetails}`
      ),
    });
  }
);

// --- Tool 2: Send Follow-Up Email (drafts email and shows preview widget) ---
server.tool(
  {
    name: "send-followup-email",
    description: "Draft a payment reminder email for a specific invoice and show a preview widget where the user can edit and confirm before sending. Supports friendly, firm, and final-notice tones.",
    schema: z.object({
      connectionId: z.string().default("demo").describe("Connection ID"),
      invoiceId: z.string().describe("The invoice ID to follow up on"),
      tone: z.enum(["friendly", "firm", "final-notice"]).default("friendly").describe("Email tone"),
    }),
    widget: {
      name: "email-preview",
      invoking: "Drafting email...",
      invoked: "Email draft ready — review and edit before sending",
    },
  },
  async ({ connectionId, invoiceId, tone }) => {
    const data = await apiCall<any>("/email/send-followup", {
      method: "POST",
      body: JSON.stringify({
        connection_id: connectionId,
        invoice_id: invoiceId,
        tone,
      }),
    });

    if (data.status === "error") {
      return widget({
        props: {
          invoiceId,
          customerName: "",
          customerEmail: "",
          amount: 0,
          subject: "",
          body: "",
          tone,
          connectionId,
        },
        output: text(`Error: ${data.message}`),
      });
    }

    const invoice = data.invoice || {};
    const email = data.email || {};

    return widget({
      props: {
        invoiceId: invoice.id || invoiceId,
        customerName: invoice.customer_name || "",
        customerEmail: invoice.customer_email || "",
        amount: invoice.amount || 0,
        subject: email.subject || "",
        body: email.body || "",
        tone,
        connectionId,
      },
      output: text(
        `Drafted ${tone} email for invoice ${invoice.id || invoiceId} (${invoice.customer_name}, $${invoice.amount?.toFixed(2)}). The user can review, edit, and send from the preview widget.`
      ),
    });
  }
);

// --- Tool 2b: Confirm Send Email (called by the email-preview widget) ---
server.tool(
  {
    name: "confirm-send-email",
    description: "Send a previously drafted (and possibly edited) follow-up email. This is called from the email preview widget after the user reviews the draft.",
    schema: z.object({
      connectionId: z.string().default("demo").describe("Connection ID"),
      invoiceId: z.string().describe("Invoice ID"),
      to: z.string().describe("Recipient email address"),
      subject: z.string().describe("Email subject"),
      body: z.string().describe("Email body"),
    }),
    outputSchema: z.object({
      status: z.string(),
      message: z.string().optional(),
      invoice_id: z.string().optional(),
    }),
  },
  async ({ connectionId, invoiceId, to, subject, body }) => {
    const data = await apiCall<any>("/email/confirm", {
      method: "POST",
      body: JSON.stringify({
        connection_id: connectionId,
        invoice_id: invoiceId,
        to,
        subject,
        body,
      }),
    });

    return object({
      status: data.status,
      message: data.message,
      invoice_id: data.invoice_id,
    });
  }
);

// --- Tool 3: Reconcile Payments ---
server.tool(
  {
    name: "reconcile-payments",
    description: "Fuzzy match recent payments against outstanding invoices to identify matched and unmatched transactions. Shows an interactive reconciliation dashboard.",
    schema: z.object({
      accountingConnectionId: z.string().default("demo").describe("Accounting connection ID"),
      paymentConnectionId: z.string().default("demo").describe("Payment connection ID"),
    }),
    widget: {
      name: "reconciliation-dashboard",
      invoking: "Reconciling payments...",
      invoked: "Reconciliation complete",
    },
  },
  async ({ accountingConnectionId, paymentConnectionId }) => {
    const data = await apiCall<any>("/payments/reconcile", {
      method: "POST",
      body: JSON.stringify({
        accounting_connection_id: accountingConnectionId,
        payment_connection_id: paymentConnectionId,
      }),
    });

    // Map backend reconciliation data to the flat widget prop shapes
    const matched = (data.matched || []).map((m: any) => ({
      invoice_id: m.invoice?.id || "",
      transaction_id: m.transaction?.id || "",
      invoice_amount: m.invoice?.amount || 0,
      transaction_amount: m.transaction?.amount || 0,
      customer_name: m.invoice?.customer_name || m.transaction?.payer_name || "",
      confidence: m.confidence || 0,
    }));
    const unmatchedTransactions = (data.unmatched_transactions || []).map((u: any) => ({
      id: u.transaction?.id || "",
      amount: u.transaction?.amount || 0,
      date: u.transaction?.date || "",
      description: u.transaction?.payer_name || u.reason || "",
    }));
    const unmatchedInvoices = (data.unmatched_invoices || []).map((u: any) => ({
      id: u.invoice?.id || "",
      amount: u.invoice?.amount || 0,
      customer_name: u.invoice?.customer_name || "",
      due_date: u.invoice?.due_date || "",
    }));

    const matchedCount = matched.length;
    const unmatchedTxnCount = unmatchedTransactions.length;
    const unmatchedInvCount = unmatchedInvoices.length;

    return widget({
      props: {
        matched,
        unmatchedTransactions,
        unmatchedInvoices,
      },
      output: text(
        `Reconciliation complete: ${matchedCount} matched, ${unmatchedTxnCount} unmatched transactions, ${unmatchedInvCount} unmatched invoices`
      ),
    });
  }
);

// --- Tool 4: Get Monthly Summary ---
server.tool(
  {
    name: "get-monthly-summary",
    description: "Get a cash flow summary for a specific month, including collected/outstanding amounts, invoice count, and average days to pay.",
    schema: z.object({
      connectionId: z.string().default("demo").describe("Connection ID"),
      month: z.string().default("2026-02").describe("Month in YYYY-MM format"),
    }),
    widget: {
      name: "cashflow-dashboard",
      invoking: "Loading cash flow summary...",
      invoked: "Cash flow summary loaded",
    },
  },
  async ({ connectionId, month }) => {
    const data = await apiCall<any>(`/summary/monthly?connection_id=${encodeURIComponent(connectionId)}&month=${encodeURIComponent(month)}`);

    return widget({
      props: {
        collected: data.collected,
        outstanding: data.outstanding,
        invoiceCount: data.invoice_count,
        avgDaysToPay: data.avg_days_to_pay,
        month: data.month,
        vsLastMonth: {
          collectedChange: data.vs_last_month?.collected_change ?? 0,
          outstandingChange: data.vs_last_month?.outstanding_change ?? 0,
          invoiceCountChange: data.vs_last_month?.invoice_count_change ?? 0,
          avgDaysChange: data.vs_last_month?.avg_days_change ?? 0,
        },
      },
      output: text(
        `Cash flow for ${month}: $${data.collected?.toLocaleString()} collected, $${data.outstanding?.toLocaleString()} outstanding, ${data.invoice_count} invoices`
      ),
    });
  }
);

// --- Tool 5: Financial Analysis ---
server.tool(
  {
    name: "financial-analysis",
    description: "Generate a comprehensive financial analysis with interactive charts showing revenue, expenses, profit/loss, and sales data over time. Supports monthly and quarterly views with full-year data.",
    schema: z.object({
      connectionId: z.string().default("demo").describe("Connection ID"),
      timeframe: z.enum(["monthly", "quarterly"]).default("monthly").describe("Time period grouping"),
      year: z.number().default(2026).describe("Year to analyze"),
    }),
    widget: {
      name: "financial-charts",
      invoking: "Analyzing financial data...",
      invoked: "Financial analysis ready",
    },
  },
  async ({ connectionId, timeframe, year }) => {
    const data = await apiCall<any>("/analysis/financial", {
      method: "POST",
      body: JSON.stringify({
        connection_id: connectionId,
        timeframe,
        year,
      }),
    });

    return widget({
      props: {
        year: data.year,
        timeframe: data.timeframe,
        periods: data.periods,
        summary: data.summary,
      },
      output: text(
        `Financial Analysis ${year} (${timeframe}): $${data.summary.total_revenue?.toLocaleString()} revenue, $${data.summary.total_profit?.toLocaleString()} profit, ${data.summary.avg_profit_margin}% margin, ${data.summary.revenue_growth}% YoY growth`
      ),
    });
  }
);

// --- Tool 6: Insights ---
server.tool(
  {
    name: "insights",
    description: "Generate a comprehensive business insights dashboard aggregating all data — overdue invoices, cash flow, financial trends, and reconciliation. Provides actionable suggestions, warnings, tips, and visual charts to help the user make better decisions.",
    schema: z.object({
      connectionId: z.string().default("demo").describe("Connection ID"),
    }),
    widget: {
      name: "insights-dashboard",
      invoking: "Analyzing your business data...",
      invoked: "Insights ready",
    },
  },
  async ({ connectionId }) => {
    const data = await apiCall<any>("/insights", {
      method: "POST",
      body: JSON.stringify({ connection_id: connectionId }),
    });

    const criticalCount = data.insights?.filter((i: any) => i.severity === "critical").length ?? 0;
    const warningCount = data.insights?.filter((i: any) => i.severity === "warning").length ?? 0;

    return widget({
      props: {
        summary: data.summary,
        insights: data.insights,
        top_overdue_customers: data.top_overdue_customers,
        charts: data.charts,
      },
      output: text(
        `Business Insights: ${data.insights?.length ?? 0} insights generated (${criticalCount} critical, ${warningCount} warnings). Revenue: $${data.summary?.total_revenue?.toLocaleString()}, Profit margin: ${data.summary?.avg_margin}%, Overdue: $${data.summary?.total_overdue?.toLocaleString()} across ${data.summary?.overdue_count} invoices.`
      ),
    });
  }
);

server.listen().then(() => {
  console.log("Ledgify MCP server running");
});
