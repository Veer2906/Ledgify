import { z } from "zod";

export const propSchema = z.object({
  collected: z.number().describe("Total collected amount"),
  outstanding: z.number().describe("Total outstanding amount"),
  invoiceCount: z.number().describe("Number of invoices"),
  avgDaysToPay: z.number().describe("Average days to pay"),
  month: z.string().describe("Month label (e.g. 2026-02)"),
  vsLastMonth: z.object({
    collectedChange: z.number().describe("Collected % change vs last month"),
    outstandingChange: z.number().describe("Outstanding % change vs last month"),
    invoiceCountChange: z.number().describe("Invoice count delta"),
    avgDaysChange: z.number().describe("Avg days to pay delta"),
  }),
});

export type CashFlowDashboardProps = z.infer<typeof propSchema>;
