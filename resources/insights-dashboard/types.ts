import { z } from "zod";

const insightSchema = z.object({
  type: z.string().describe("Insight type: metric, warning, trend, or tip"),
  severity: z.string().describe("Severity: success, info, warning, or critical"),
  title: z.string().describe("Short insight title"),
  value: z.string().describe("Key metric value"),
  description: z.string().describe("Detailed description"),
  suggestion: z.string().describe("Actionable suggestion"),
});

const overdueCustomerSchema = z.object({
  name: z.string().describe("Customer name"),
  amount: z.number().describe("Overdue amount"),
  days_overdue: z.number().describe("Days overdue"),
  invoice_id: z.string().describe("Invoice ID"),
});

const summarySchema = z.object({
  total_revenue: z.number().describe("Total annual revenue"),
  total_profit: z.number().describe("Total annual profit"),
  total_expenses: z.number().describe("Total annual expenses"),
  avg_margin: z.number().describe("Average profit margin %"),
  total_overdue: z.number().describe("Total overdue amount"),
  overdue_count: z.number().describe("Number of overdue invoices"),
  avg_days_overdue: z.number().describe("Average days overdue"),
  collection_rate: z.number().describe("Cash collection rate %"),
  revenue_growth: z.number().describe("Revenue growth %"),
});

const chartsSchema = z.object({
  months: z.array(z.string()).describe("Month labels"),
  revenue: z.array(z.number()).describe("Monthly revenue values"),
  profit: z.array(z.number()).describe("Monthly profit values"),
  expenses: z.array(z.number()).describe("Monthly expense values"),
  expense_ratios: z.array(z.number()).describe("Monthly expense ratio %"),
});

export const propSchema = z.object({
  summary: summarySchema.describe("Summary metrics"),
  insights: z.array(insightSchema).describe("Actionable insights"),
  top_overdue_customers: z.array(overdueCustomerSchema).describe("Top overdue customers"),
  charts: chartsSchema.describe("Chart data"),
});

export type InsightsProps = z.infer<typeof propSchema>;
export type Insight = z.infer<typeof insightSchema>;
export type OverdueCustomer = z.infer<typeof overdueCustomerSchema>;
export type ChartData = z.infer<typeof chartsSchema>;
export type SummaryMetrics = z.infer<typeof summarySchema>;
