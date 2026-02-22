# Ledgify - AI-Powered AR/AP Automation for Small Businesses

> **MCP Apps Hackathon 2026 @ Y Combinator by Manufact**

Ledgify is an AI-powered accounts receivable / accounts payable (AR/AP) automation app built as an MCP App for ChatGPT. Small business owners manage overdue invoices, send payment reminders, reconcile payments, analyze financials, and export data — all through natural language conversation.

---

## The Problem

Small businesses lose an average of **$50,000+ per year** to late payments. Managing AR/AP manually is painful:

- Tracking overdue invoices requires logging into accounting software, filtering, and cross-referencing dates
- Sending payment reminders is tedious — writing emails, choosing the right tone, following up repeatedly
- Cash flow visibility requires pulling reports from multiple systems and manual calculations
- No easy way to export formatted reports for stakeholders or audits

Most small businesses lack dedicated AR/AP staff and rely on the owner or a part-time bookkeeper juggling dozens of other tasks.

## The Solution

Ledgify brings AR/AP automation directly into ChatGPT as a conversational agent with rich interactive widgets. Users connect their accounting systems once, then manage everything through natural language:

> *"Show me overdue invoices"*
> *"Send a friendly reminder to Acme Corp"*
> *"Reconcile this month's payments"*
> *"What's my cash flow summary for February?"*
> *"Give me business insights"*
> *"Export my financial analysis as Excel"*

---

## Tools & Widgets

### Tool 1: Check Overdue Invoices
Ask ChatGPT to show all overdue invoices. A rich widget renders with color-coded urgency badges (green/yellow/red), amounts, customer names, and one-click **"Remind"** buttons that jump straight into the email drafting workflow.

### Tool 2: Send Follow-Up Email
Draft a payment reminder email for any invoice. Choose a tone (friendly, firm, or final-notice). The widget shows a full email preview with editable subject and body fields. Click **"Send"** to confirm, or edit first — all within the widget.

### Tool 3: Reconcile Payments
Fuzzy-match recent bank transactions against outstanding invoices. The reconciliation dashboard shows matched pairs with confidence scores, unmatched transactions, and unmatched invoices — each with action buttons.

### Tool 4: Monthly Cash Flow Summary
Get a visual dashboard for any month showing collected vs. outstanding amounts, invoice counts, average days to pay, and month-over-month trend indicators with percentage changes.

### Tool 5: Financial Analysis
Full-year financial analysis with interactive bar and line charts for revenue, expenses, profit/loss, and margins. Toggle between monthly and quarterly views. Summary KPIs include total revenue, profit, margin %, and YoY growth.

### Tool 6: Business Insights
An aggregated insights dashboard that pulls data from all sources and provides:
- Summary KPI cards with sparkline mini-charts
- Actionable insights sorted by severity (critical, warning, success, info)
- Revenue vs. Expenses bar chart and Profit trend line chart
- Top overdue customers with one-click remind buttons
- Quick action buttons to jump to other tools

### Tool 7: Export Data
Export any data type (invoices, transactions, financial analysis, monthly summary, reconciliation) as a formatted **Excel (.xlsx)** or **CSV** file. The widget shows a preview table with file metadata and a download button. Switch between formats with one click.

---

## :)

Ledgify is not a generic chatbot wrapper around an API. It's a **full-featured financial operations platform** built entirely as an MCP App:

- **Multi-step workflows inside widgets**: A user can view overdue invoices, click "Remind" on one, edit the drafted email, and send it — all without leaving the ChatGPT conversation. The widget-to-tool chaining creates a seamless workflow that feels like a native application.
- **Fuzzy reconciliation engine**: Real-world payment reconciliation is hard because payer names rarely match exactly. Our Python backend uses a custom fuzzy matching algorithm combining string similarity, amount matching, and date proximity to auto-reconcile with confidence scores — something typically found only in enterprise accounting software.
- **Interactive financial charts in ChatGPT**: Full bar charts, line charts, and sparklines rendered as React widgets inside the ChatGPT iframe — not just text summaries. Users can toggle between monthly/quarterly views and drill into specific metrics.
- **AI-powered insights aggregation**: The insights tool doesn't just display data — it cross-references overdue invoices, cash flow trends, and reconciliation status to generate actionable business recommendations with severity levels.
- **File export from a chat interface**: Users can export any data slice as a professionally formatted Excel file (with styled headers, alternating row colors, and currency formatting) or CSV — directly downloadable from the widget.

### 2. Real-World Usefulness 


**Yes — AR/AP management is a $10B+ market pain point for SMBs.**

- **68% of small businesses** have issues with late payments (Quickbooks study). Ledgify automates the follow-up process with tone-appropriate emails drafted in seconds.
- **Manual reconciliation** takes bookkeepers 5-10 hours per month. Our fuzzy matching engine does it in seconds with confidence scoring, surfacing only the ambiguous matches for human review.
- **Cash flow visibility** is the #1 reason small businesses fail. Ledgify provides instant financial dashboards, trend analysis, and proactive warnings (e.g., "3 invoices totaling $45K are 60+ days overdue") without the user needing to open a single spreadsheet.
- **Export functionality** enables stakeholders and auditors to get formatted reports without learning new software — just ask ChatGPT.

The entire workflow — from identifying overdue invoices to sending reminders to reconciling payments to analyzing trends — happens in one conversation.

---

## Architecture

```
ChatGPT / Claude
    |
    | MCP Protocol
    |
MCP Server (TypeScript / mcp-use SDK)
    |  - Defines 7 tools with Zod schemas
    |  - Returns widget props for rich UI
    |  - Handles tool-to-tool chaining
    |
    |  REST API
    |
Python Backend (FastAPI)
    |  - Business logic (fuzzy matching, email generation, data analysis)
    |  - Demo data + admin panel
    |  - Unified API integration for live accounting data
    |  - Export engine (openpyxl for Excel, csv module for CSV)
    |
    v
Accounting / Payment Systems (via Unified API)
```

**Tech Stack:**
- **MCP Server**: TypeScript, mcp-use SDK, Zod schemas
- **Widgets**: React 19, Tailwind CSS 4, OpenAI Apps SDK UI
- **Backend**: Python 3.11+, FastAPI, openpyxl
- **Deployment**: Manufact Cloud

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+

### Install & Run

```bash
# Install MCP server dependencies
npm install

# Install Python backend dependencies
cd python-backend
pip install -r requirements.txt

# Start the Python backend (in one terminal)
uvicorn main:app --reload --port 8000

# Start the MCP server (in another terminal)
cd ..
npm run dev
```

Open [http://localhost:3000/inspector](http://localhost:3000/inspector) to test tools and see widgets live.

### Connect to ChatGPT

```bash
# Start with tunnel for a public HTTPS URL
npm run dev -- --tunnel
```

Add the printed tunnel URL as a remote MCP server in ChatGPT:
**Settings -> Connectors -> Add MCP server -> paste URL**

### Deploy to Manufact Cloud

```bash
npm run deploy
```

Or connect your GitHub repo at [manufact.com](https://manufact.com) for auto-deploy on push.

---

## Team

Built by **Veer Mehta** at the MCP Apps Hackathon 2026 @ Y Combinator, San Francisco.

---

## Resources

- [mcp-use Documentation](https://mcp-use.com/docs/typescript/getting-started/quickstart)
- [MCP Apps / UI Widgets](https://mcp-use.com/docs/typescript/server/mcp-apps)
- [Manufact Cloud Deployment](https://mcp-use.com/docs/typescript/server/deployment/mcp-use)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [MCP Apps Hackathon](https://events.ycombinator.com/manufact-hackathon26)


