import { z } from "zod";

export const propSchema = z.object({
  invoices: z.array(
    z.object({
      id: z.string().describe("Invoice ID"),
      customer_name: z.string().describe("Customer name"),
      customer_email: z.string().describe("Customer email"),
      amount: z.number().describe("Invoice amount in USD"),
      due_date: z.string().describe("Due date (ISO format)"),
      days_overdue: z.number().describe("Number of days overdue"),
    })
  ),
});

export type InvoiceListProps = z.infer<typeof propSchema>;
export type Invoice = InvoiceListProps["invoices"][number];
