import { z } from "zod";

const matchedItemSchema = z.object({
  invoice_id: z.string().describe("Invoice ID"),
  transaction_id: z.string().describe("Transaction ID"),
  invoice_amount: z.number().describe("Invoice amount"),
  transaction_amount: z.number().describe("Transaction amount"),
  customer_name: z.string().describe("Customer name"),
  confidence: z.number().describe("Match confidence (0-1)"),
});

const unmatchedTransactionSchema = z.object({
  id: z.string().describe("Transaction ID"),
  amount: z.number().describe("Transaction amount"),
  date: z.string().describe("Transaction date"),
  description: z.string().describe("Transaction description"),
});

const unmatchedInvoiceSchema = z.object({
  id: z.string().describe("Invoice ID"),
  amount: z.number().describe("Invoice amount"),
  customer_name: z.string().describe("Customer name"),
  due_date: z.string().describe("Due date"),
});

export const propSchema = z.object({
  matched: z.array(matchedItemSchema).describe("Matched payment-invoice pairs"),
  unmatchedTransactions: z.array(unmatchedTransactionSchema).describe("Unmatched transactions"),
  unmatchedInvoices: z.array(unmatchedInvoiceSchema).describe("Unmatched invoices"),
});

export type ReconciliationProps = z.infer<typeof propSchema>;
export type MatchedItem = z.infer<typeof matchedItemSchema>;
export type UnmatchedTransaction = z.infer<typeof unmatchedTransactionSchema>;
export type UnmatchedInvoice = z.infer<typeof unmatchedInvoiceSchema>;
