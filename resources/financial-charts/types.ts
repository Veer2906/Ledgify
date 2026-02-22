import { z } from "zod";

const periodSchema = z.object({
  period: z.string().describe("Period label (month name or quarter)"),
  revenue: z.number().describe("Revenue for the period"),
  expenses: z.number().describe("Total expenses"),
  profit: z.number().describe("Profit (revenue - expenses)"),
  sales: z.number().describe("Number of sales"),
  cogs: z.number().describe("Cost of goods sold"),
  operating_expenses: z.number().describe("Operating expenses"),
});

const summarySchema = z.object({
  total_revenue: z.number().describe("Total revenue for the year"),
  total_expenses: z.number().describe("Total expenses for the year"),
  total_profit: z.number().describe("Total profit for the year"),
  total_sales: z.number().describe("Total number of sales"),
  avg_profit_margin: z.number().describe("Average profit margin percentage"),
  best_month: z.string().describe("Best performing month"),
  best_month_revenue: z.number().describe("Best month revenue"),
  worst_month: z.string().describe("Worst performing month"),
  worst_month_revenue: z.number().describe("Worst month revenue"),
  revenue_growth: z.number().describe("Year-over-year revenue growth percentage"),
});

export const propSchema = z.object({
  year: z.number().describe("Year being analyzed"),
  timeframe: z.string().describe("Timeframe (monthly or quarterly)"),
  periods: z.array(periodSchema).describe("Financial data by period"),
  summary: summarySchema.describe("Summary statistics"),
});

export type FinancialChartsProps = z.infer<typeof propSchema>;
export type PeriodData = z.infer<typeof periodSchema>;
export type SummaryData = z.infer<typeof summarySchema>;
