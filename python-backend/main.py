import os
from typing import List
from fastapi import FastAPI, Query
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from rapidfuzz import fuzz

load_dotenv()

from demo_data import (
    is_demo_mode,
    get_demo_reconciliation,
    get_demo_financial_analysis,
    get_demo_insights,
    get_demo_invoices,
    get_demo_transactions,
    get_demo_monthly_summary,
    get_demo_financial_periods,
    set_demo_invoices,
    set_demo_transactions,
    set_demo_monthly_summary,
    set_demo_financial_periods,
    reset_demo_data,
)
from data.accounting import get_overdue_invoices, get_invoice_by_id, get_monthly_stats
from data.messaging import send_email
from data.payments import get_recent_transactions
from agent import run_agent

app = FastAPI(title="Ledgify API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Pydantic models ---

class OverdueRequest(BaseModel):
    connection_id: str = "demo"
    min_days_overdue: int = 0


class FollowUpRequest(BaseModel):
    connection_id: str = "demo"
    invoice_id: str
    tone: str = "friendly"  # friendly, firm, final-notice


class ReconcileRequest(BaseModel):
    accounting_connection_id: str = "demo"
    payment_connection_id: str = "demo"


class ConfirmSendRequest(BaseModel):
    connection_id: str = "demo"
    invoice_id: str
    to: str
    subject: str
    body: str


class AgentRequest(BaseModel):
    connection_id: str = "demo"
    message: str


class FinancialAnalysisRequest(BaseModel):
    connection_id: str = "demo"
    timeframe: str = "monthly"  # monthly or quarterly
    year: int = 2026


class InsightsRequest(BaseModel):
    connection_id: str = "demo"


# --- Email generation ---

EMAIL_TEMPLATES = {
    "friendly": {
        "subject": "Friendly Reminder: Invoice {invoice_id} — ${amount:.2f} Past Due",
        "body": (
            "Hi {customer_name},\n\n"
            "I hope this message finds you well! I wanted to send a quick reminder that "
            "invoice {invoice_id} for ${amount:.2f} was due on {due_date} and is now "
            "{days_overdue} days past due.\n\n"
            "Could you please let me know when we can expect payment? If you've already "
            "sent it, please disregard this note.\n\n"
            "Thanks so much!\nBest regards"
        ),
    },
    "firm": {
        "subject": "Payment Required: Invoice {invoice_id} — ${amount:.2f} Overdue",
        "body": (
            "Dear {customer_name},\n\n"
            "This is a follow-up regarding invoice {invoice_id} for ${amount:.2f}, which "
            "was due on {due_date} and is now {days_overdue} days overdue.\n\n"
            "We kindly request immediate attention to this matter. Please arrange payment "
            "at your earliest convenience or contact us to discuss a payment plan.\n\n"
            "Thank you for your prompt attention.\nRegards"
        ),
    },
    "final-notice": {
        "subject": "FINAL NOTICE: Invoice {invoice_id} — ${amount:.2f} Severely Overdue",
        "body": (
            "Dear {customer_name},\n\n"
            "This is a final notice regarding invoice {invoice_id} for ${amount:.2f}, "
            "originally due on {due_date} ({days_overdue} days ago).\n\n"
            "Despite previous reminders, we have not received payment. If payment is not "
            "received within 7 business days, we may need to escalate this matter to our "
            "collections department.\n\n"
            "Please contact us immediately to resolve this.\nRegards"
        ),
    },
}


async def generate_email(invoice: dict, tone: str) -> dict:
    openai_key = os.getenv("OPENAI_API_KEY")

    if openai_key:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=openai_key)

            tone_instructions = {
                "friendly": "Write in a warm, friendly tone. Be understanding and non-confrontational.",
                "firm": "Write in a professional, firm tone. Be direct but respectful.",
                "final-notice": "Write in a serious, urgent tone. Mention potential escalation to collections.",
            }

            prompt = (
                f"Write a payment reminder email for an overdue invoice.\n"
                f"Customer: {invoice['customer_name']}\n"
                f"Invoice ID: {invoice['id']}\n"
                f"Amount: ${invoice['amount']:.2f}\n"
                f"Due date: {invoice['due_date']}\n"
                f"Days overdue: {invoice['days_overdue']}\n\n"
                f"Tone: {tone_instructions.get(tone, tone_instructions['friendly'])}\n\n"
                f"Return the email with a clear subject line on the first line (prefixed with 'Subject: '), "
                f"followed by a blank line and the body."
            )

            resp = await client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=500,
            )
            content = resp.choices[0].message.content or ""
            lines = content.strip().split("\n", 2)
            subject = lines[0].replace("Subject: ", "").strip()
            body = lines[2].strip() if len(lines) > 2 else content

            return {"subject": subject, "body": body}

        except Exception:
            pass

    template = EMAIL_TEMPLATES.get(tone, EMAIL_TEMPLATES["friendly"])
    fmt = {**invoice, "invoice_id": invoice.get("id", "")}
    return {
        "subject": template["subject"].format(**fmt),
        "body": template["body"].format(**fmt),
    }


# --- Reconciliation logic ---

def fuzzy_reconcile(invoices: list[dict], transactions: list[dict]) -> dict:
    matched = []
    unmatched_transactions = []
    matched_invoice_ids = set()

    for txn in transactions:
        best_match = None
        best_score = 0.0

        for inv in invoices:
            name_score = fuzz.ratio(
                txn.get("payer_name", "").lower(),
                inv.get("customer_name", "").lower(),
            ) / 100.0

            txn_amount = txn.get("amount", 0)
            inv_amount = inv.get("amount", 0)
            if inv_amount > 0:
                amount_diff = abs(txn_amount - inv_amount) / inv_amount
                amount_score = 1.0 if amount_diff <= 0.01 else max(0, 1.0 - amount_diff)
            else:
                amount_score = 0.0

            confidence = (name_score * 0.4) + (amount_score * 0.6)

            if confidence > best_score:
                best_score = confidence
                best_match = inv
                best_reason = []
                if amount_score >= 0.99:
                    best_reason.append("Amount exact match")
                elif amount_score > 0.8:
                    best_reason.append("Amount close match")
                if name_score > 0.6:
                    best_reason.append(
                        f"Name similarity ({inv.get('customer_name', '')} / {txn.get('payer_name', '')})"
                    )

        if best_match and best_score > 0.6:
            matched.append({
                "transaction": txn,
                "invoice": best_match,
                "confidence": round(best_score, 2),
                "match_reason": " + ".join(best_reason),
            })
            matched_invoice_ids.add(best_match.get("id"))
        else:
            unmatched_transactions.append({
                "transaction": txn,
                "reason": f"No invoice found matching amount ${txn.get('amount', 0):,.2f} "
                          f"or payer '{txn.get('payer_name', 'Unknown')}'",
            })

    unmatched_invoices = [
        {
            "invoice": inv,
            "reason": f"No payment received for {inv.get('customer_name', '')} "
                      f"(${inv.get('amount', 0):,.2f}, {inv.get('days_overdue', 0)} days overdue)",
        }
        for inv in invoices
        if inv.get("id") not in matched_invoice_ids
    ]

    return {
        "matched": matched,
        "unmatched_transactions": unmatched_transactions,
        "unmatched_invoices": unmatched_invoices,
    }


# --- Endpoints ---

@app.post("/invoices/overdue")
async def invoices_overdue(req: OverdueRequest):
    invoices = await get_overdue_invoices(req.connection_id, req.min_days_overdue)
    return {"invoices": invoices, "count": len(invoices)}


@app.post("/email/send-followup")
async def email_send_followup(req: FollowUpRequest):
    invoice = await get_invoice_by_id(req.connection_id, req.invoice_id)
    if not invoice:
        return {"status": "error", "message": f"Invoice {req.invoice_id} not found"}

    email = await generate_email(invoice, req.tone)
    return {
        "status": "draft",
        "message": "Email drafted — review and confirm to send",
        "email": email,
        "invoice": invoice,
    }


@app.post("/email/confirm")
async def email_confirm(req: ConfirmSendRequest):
    result = await send_email(
        req.connection_id,
        req.to,
        req.subject,
        req.body,
    )
    result["invoice_id"] = req.invoice_id
    return result


@app.post("/payments/reconcile")
async def payments_reconcile(req: ReconcileRequest):
    if is_demo_mode(req.accounting_connection_id) and is_demo_mode(req.payment_connection_id):
        return get_demo_reconciliation()

    invoices = await get_overdue_invoices(req.accounting_connection_id)
    transactions = await get_recent_transactions(req.payment_connection_id)
    return fuzzy_reconcile(invoices, transactions)


@app.get("/summary/monthly")
async def summary_monthly(
    connection_id: str = Query("demo"),
    month: str = Query("2026-02"),
):
    stats = await get_monthly_stats(connection_id, month)
    return stats


@app.post("/analysis/financial")
async def financial_analysis(req: FinancialAnalysisRequest):
    data = get_demo_financial_analysis(req.timeframe, req.year)
    return data


@app.post("/insights")
async def insights(req: InsightsRequest):
    data = get_demo_insights()
    return data


@app.post("/agent/run")
async def agent_run(req: AgentRequest):
    result = await run_agent(req.connection_id, req.message)
    return result


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "demo_mode": is_demo_mode(),
        "service": "ledgify",
    }


# --- Admin: Demo Data Management ---

class AdminInvoice(BaseModel):
    id: str
    customer_name: str
    customer_email: str
    amount: float
    currency: str = "USD"
    due_date: str
    days_overdue: int
    status: str = "overdue"

class AdminTransaction(BaseModel):
    id: str
    payer_name: str
    amount: float
    date: str
    reference: str

class AdminMonthlySummary(BaseModel):
    collected: float
    outstanding: float
    invoice_count: int
    avg_days_to_pay: int
    vs_last_month: dict

class AdminFinancialPeriod(BaseModel):
    month: str
    revenue: float
    expenses: float
    profit: float
    sales: int
    cogs: float
    operating_expenses: float


@app.get("/admin/data/invoices")
async def admin_get_invoices():
    return get_demo_invoices()

@app.put("/admin/data/invoices")
async def admin_set_invoices(invoices: List[AdminInvoice]):
    set_demo_invoices([inv.model_dump() for inv in invoices])
    return {"status": "ok", "count": len(invoices)}

@app.get("/admin/data/transactions")
async def admin_get_transactions():
    return get_demo_transactions()

@app.put("/admin/data/transactions")
async def admin_set_transactions(transactions: List[AdminTransaction]):
    set_demo_transactions([txn.model_dump() for txn in transactions])
    return {"status": "ok", "count": len(transactions)}

@app.get("/admin/data/monthly")
async def admin_get_monthly():
    return get_demo_monthly_summary("2026-02")

@app.put("/admin/data/monthly")
async def admin_set_monthly(summary: AdminMonthlySummary):
    set_demo_monthly_summary(summary.model_dump())
    return {"status": "ok"}

@app.get("/admin/data/financial")
async def admin_get_financial():
    return get_demo_financial_periods()

@app.put("/admin/data/financial")
async def admin_set_financial(periods: List[AdminFinancialPeriod]):
    set_demo_financial_periods([p.model_dump() for p in periods])
    return {"status": "ok", "count": len(periods)}

@app.post("/admin/data/reset")
async def admin_reset():
    reset_demo_data()
    return {"status": "ok", "message": "Demo data reset to defaults"}

@app.get("/admin", response_class=HTMLResponse)
async def admin_page():
    return ADMIN_HTML


ADMIN_HTML = r"""
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ledgify — Admin</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
         background: #0f172a; color: #e2e8f0; padding: 2rem; }
  h1 { font-size: 1.5rem; margin-bottom: .25rem; }
  .subtitle { color: #94a3b8; font-size: .875rem; margin-bottom: 2rem; }
  .tabs { display: flex; gap: .5rem; margin-bottom: 1.5rem; }
  .tab { padding: .5rem 1rem; border-radius: .5rem; border: 1px solid #334155;
         background: transparent; color: #94a3b8; cursor: pointer; font-size: .875rem; }
  .tab.active { background: #1e293b; color: #e2e8f0; border-color: #3b82f6; }
  .card { background: #1e293b; border: 1px solid #334155; border-radius: .75rem;
          padding: 1.5rem; margin-bottom: 1rem; }
  .card h3 { font-size: 1rem; margin-bottom: 1rem; }
  .row { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
         gap: .75rem; margin-bottom: .75rem; align-items: end; }
  label { display: block; font-size: .75rem; color: #94a3b8; margin-bottom: .25rem; }
  input, select { width: 100%; padding: .5rem .75rem; border-radius: .5rem;
                  border: 1px solid #334155; background: #0f172a; color: #e2e8f0;
                  font-size: .875rem; }
  input:focus, select:focus { outline: none; border-color: #3b82f6; }
  .btn { padding: .5rem 1rem; border-radius: .5rem; border: none; cursor: pointer;
         font-size: .875rem; font-weight: 500; }
  .btn-primary { background: #3b82f6; color: #fff; }
  .btn-primary:hover { background: #2563eb; }
  .btn-danger { background: #ef4444; color: #fff; }
  .btn-danger:hover { background: #dc2626; }
  .btn-outline { background: transparent; border: 1px solid #334155; color: #94a3b8; }
  .btn-outline:hover { border-color: #3b82f6; color: #e2e8f0; }
  .actions { display: flex; gap: .5rem; margin-top: 1rem; flex-wrap: wrap; }
  .toast { position: fixed; bottom: 1.5rem; right: 1.5rem; padding: .75rem 1.25rem;
           border-radius: .5rem; font-size: .875rem; opacity: 0;
           transition: opacity .3s; pointer-events: none; z-index: 50; }
  .toast.show { opacity: 1; }
  .toast.ok { background: #166534; color: #bbf7d0; }
  .toast.err { background: #7f1d1d; color: #fecaca; }
  .hidden { display: none; }
  .item-header { display: flex; justify-content: space-between; align-items: center;
                 margin-bottom: .75rem; }
</style>
</head>
<body>

<h1>Ledgify — Admin</h1>
<p class="subtitle">Edit demo data used by the MCP tools. Changes take effect immediately.</p>

<div class="tabs">
  <button class="tab active" onclick="switchTab('invoices')">Invoices</button>
  <button class="tab" onclick="switchTab('transactions')">Transactions</button>
  <button class="tab" onclick="switchTab('monthly')">Monthly Summary</button>
  <button class="tab" onclick="switchTab('financial')">Financial Analysis</button>
</div>

<div id="panel-invoices"></div>
<div id="panel-transactions" class="hidden"></div>
<div id="panel-monthly" class="hidden"></div>
<div id="panel-financial" class="hidden"></div>

<div class="actions">
  <button class="btn btn-primary" onclick="saveAll()">Save Changes</button>
  <button class="btn btn-danger" onclick="resetAll()">Reset to Defaults</button>
</div>

<div id="toast" class="toast"></div>

<script>
const API = '';
let state = { invoices: [], transactions: [], monthly: {}, financial: [] };
let activeTab = 'invoices';

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  ['invoices','transactions','monthly','financial'].forEach(t => {
    document.getElementById('panel-'+t).classList.toggle('hidden', t !== tab);
  });
}

function toast(msg, ok=true) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show ' + (ok ? 'ok' : 'err');
  setTimeout(() => el.className = 'toast', 2500);
}

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

// --- Invoices ---
function renderInvoices() {
  const panel = document.getElementById('panel-invoices');
  panel.innerHTML = state.invoices.map((inv, i) => `
    <div class="card">
      <div class="item-header">
        <h3>Invoice #${i+1}</h3>
        <button class="btn btn-outline" onclick="removeInvoice(${i})">&times; Remove</button>
      </div>
      <div class="row">
        <div><label>ID</label><input value="${esc(inv.id)}" onchange="state.invoices[${i}].id=this.value"></div>
        <div><label>Customer Name</label><input value="${esc(inv.customer_name)}" onchange="state.invoices[${i}].customer_name=this.value"></div>
        <div><label>Customer Email</label><input value="${esc(inv.customer_email)}" onchange="state.invoices[${i}].customer_email=this.value"></div>
      </div>
      <div class="row">
        <div><label>Amount ($)</label><input type="number" step="0.01" value="${inv.amount}" onchange="state.invoices[${i}].amount=+this.value"></div>
        <div><label>Currency</label><input value="${esc(inv.currency||'USD')}" onchange="state.invoices[${i}].currency=this.value"></div>
        <div><label>Due Date</label><input type="date" value="${inv.due_date}" onchange="state.invoices[${i}].due_date=this.value"></div>
      </div>
      <div class="row">
        <div><label>Days Overdue</label><input type="number" value="${inv.days_overdue}" onchange="state.invoices[${i}].days_overdue=+this.value"></div>
        <div><label>Status</label>
          <select onchange="state.invoices[${i}].status=this.value">
            <option value="overdue" ${inv.status==='overdue'?'selected':''}>overdue</option>
            <option value="paid" ${inv.status==='paid'?'selected':''}>paid</option>
            <option value="pending" ${inv.status==='pending'?'selected':''}>pending</option>
          </select>
        </div>
      </div>
    </div>
  `).join('') + '<button class="btn btn-outline" onclick="addInvoice()">+ Add Invoice</button>';
}

function addInvoice() {
  const n = state.invoices.length + 1;
  state.invoices.push({ id: 'inv_' + String(n).padStart(3,'0'), customer_name: '', customer_email: '',
    amount: 0, currency: 'USD', due_date: new Date().toISOString().slice(0,10), days_overdue: 0, status: 'overdue' });
  renderInvoices();
}
function removeInvoice(i) { state.invoices.splice(i, 1); renderInvoices(); }

// --- Transactions ---
function renderTransactions() {
  const panel = document.getElementById('panel-transactions');
  panel.innerHTML = state.transactions.map((txn, i) => `
    <div class="card">
      <div class="item-header">
        <h3>Transaction #${i+1}</h3>
        <button class="btn btn-outline" onclick="removeTransaction(${i})">&times; Remove</button>
      </div>
      <div class="row">
        <div><label>ID</label><input value="${esc(txn.id)}" onchange="state.transactions[${i}].id=this.value"></div>
        <div><label>Payer Name</label><input value="${esc(txn.payer_name)}" onchange="state.transactions[${i}].payer_name=this.value"></div>
        <div><label>Amount ($)</label><input type="number" step="0.01" value="${txn.amount}" onchange="state.transactions[${i}].amount=+this.value"></div>
      </div>
      <div class="row">
        <div><label>Date</label><input type="date" value="${txn.date}" onchange="state.transactions[${i}].date=this.value"></div>
        <div><label>Reference</label><input value="${esc(txn.reference)}" onchange="state.transactions[${i}].reference=this.value"></div>
      </div>
    </div>
  `).join('') + '<button class="btn btn-outline" onclick="addTransaction()">+ Add Transaction</button>';
}

function addTransaction() {
  const n = state.transactions.length + 1;
  state.transactions.push({ id: 'txn_' + String(n).padStart(3,'0'), payer_name: '',
    amount: 0, date: new Date().toISOString().slice(0,10), reference: '' });
  renderTransactions();
}
function removeTransaction(i) { state.transactions.splice(i, 1); renderTransactions(); }

// --- Monthly Summary ---
function renderMonthly() {
  const m = state.monthly;
  const vs = m.vs_last_month || {};
  document.getElementById('panel-monthly').innerHTML = `
    <div class="card">
      <h3>Monthly Summary</h3>
      <div class="row">
        <div><label>Collected ($)</label><input type="number" step="0.01" value="${m.collected||0}" onchange="state.monthly.collected=+this.value"></div>
        <div><label>Outstanding ($)</label><input type="number" step="0.01" value="${m.outstanding||0}" onchange="state.monthly.outstanding=+this.value"></div>
        <div><label>Invoice Count</label><input type="number" value="${m.invoice_count||0}" onchange="state.monthly.invoice_count=+this.value"></div>
        <div><label>Avg Days to Pay</label><input type="number" value="${m.avg_days_to_pay||0}" onchange="state.monthly.avg_days_to_pay=+this.value"></div>
      </div>
      <h3 style="margin-top:1rem">vs Last Month</h3>
      <div class="row">
        <div><label>Collected Change (%)</label><input type="number" step="0.1" value="${vs.collected_change||0}" onchange="state.monthly.vs_last_month.collected_change=+this.value"></div>
        <div><label>Outstanding Change (%)</label><input type="number" step="0.1" value="${vs.outstanding_change||0}" onchange="state.monthly.vs_last_month.outstanding_change=+this.value"></div>
        <div><label>Invoice Count Change</label><input type="number" value="${vs.invoice_count_change||0}" onchange="state.monthly.vs_last_month.invoice_count_change=+this.value"></div>
        <div><label>Avg Days Change</label><input type="number" value="${vs.avg_days_change||0}" onchange="state.monthly.vs_last_month.avg_days_change=+this.value"></div>
      </div>
    </div>
  `;
}

// --- Financial Analysis ---
function renderFinancial() {
  const panel = document.getElementById('panel-financial');
  panel.innerHTML = state.financial.map((p, i) => `
    <div class="card">
      <div class="item-header">
        <h3>${esc(p.month)}</h3>
        <button class="btn btn-outline" onclick="removeFinancial(${i})">&times; Remove</button>
      </div>
      <div class="row">
        <div><label>Month</label><input value="${esc(p.month)}" onchange="state.financial[${i}].month=this.value"></div>
        <div><label>Revenue ($)</label><input type="number" value="${p.revenue}" onchange="state.financial[${i}].revenue=+this.value"></div>
        <div><label>Expenses ($)</label><input type="number" value="${p.expenses}" onchange="state.financial[${i}].expenses=+this.value"></div>
      </div>
      <div class="row">
        <div><label>Profit ($)</label><input type="number" value="${p.profit}" onchange="state.financial[${i}].profit=+this.value"></div>
        <div><label>Sales</label><input type="number" value="${p.sales}" onchange="state.financial[${i}].sales=+this.value"></div>
        <div><label>COGS ($)</label><input type="number" value="${p.cogs}" onchange="state.financial[${i}].cogs=+this.value"></div>
        <div><label>Operating Exp ($)</label><input type="number" value="${p.operating_expenses}" onchange="state.financial[${i}].operating_expenses=+this.value"></div>
      </div>
    </div>
  `).join('') + '<button class="btn btn-outline" onclick="addFinancial()">+ Add Period</button>';
}

function addFinancial() {
  state.financial.push({ month: '', revenue: 0, expenses: 0, profit: 0, sales: 0, cogs: 0, operating_expenses: 0 });
  renderFinancial();
}
function removeFinancial(i) { state.financial.splice(i, 1); renderFinancial(); }

// --- Save / Reset ---
async function saveAll() {
  try {
    await fetch(API+'/admin/data/invoices', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(state.invoices) });
    await fetch(API+'/admin/data/transactions', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(state.transactions) });
    const { month, ...rest } = state.monthly;
    await fetch(API+'/admin/data/monthly', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(rest) });
    await fetch(API+'/admin/data/financial', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(state.financial) });
    toast('Saved!');
  } catch(e) { toast('Save failed: '+e.message, false); }
}

async function resetAll() {
  if (!confirm('Reset all demo data to defaults?')) return;
  try {
    await fetch(API+'/admin/data/reset', { method:'POST' });
    await loadAll();
    toast('Reset to defaults!');
  } catch(e) { toast('Reset failed: '+e.message, false); }
}

async function loadAll() {
  state.invoices = await (await fetch(API+'/admin/data/invoices')).json();
  state.transactions = await (await fetch(API+'/admin/data/transactions')).json();
  state.monthly = await (await fetch(API+'/admin/data/monthly')).json();
  state.financial = await (await fetch(API+'/admin/data/financial')).json();
  renderInvoices(); renderTransactions(); renderMonthly(); renderFinancial();
}

loadAll();
</script>
</body>
</html>
"""
