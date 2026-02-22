import { z } from "zod";

export const propSchema = z.object({
  invoiceId: z.string().describe("Invoice ID this email is for"),
  customerName: z.string().describe("Customer name"),
  customerEmail: z.string().describe("Customer email address"),
  amount: z.number().describe("Invoice amount in USD"),
  subject: z.string().describe("Email subject line"),
  body: z.string().describe("Email body text"),
  tone: z.string().describe("Email tone used (friendly, firm, final-notice)"),
  connectionId: z.string().describe("Connection ID for sending"),
});

export type EmailPreviewProps = z.infer<typeof propSchema>;
