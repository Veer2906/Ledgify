import os
import json
from pathlib import Path
from datetime import date, timedelta

OVERRIDES_PATH = Path(__file__).parent / "demo_overrides.json"


def _load_overrides() -> dict:
    if OVERRIDES_PATH.exists():
        return json.loads(OVERRIDES_PATH.read_text())
    return {}


def _save_overrides(data: dict) -> None:
    OVERRIDES_PATH.write_text(json.dumps(data, indent=2))


def is_demo_mode(connection_id: str | None = None) -> bool:
    if connection_id == "demo":
        return True
    return not os.getenv("UNIFIED_API_KEY")


def get_demo_invoices() -> list[dict]:
    overrides = _load_overrides()
    if "invoices" in overrides:
        return overrides["invoices"]

    today = date.today()
    return [
        {
            "id": "inv_001",
            "customer_name": "Acme Corp",
            "customer_email": "billing@acmecorp.com",
            "amount": 12500.00,
            "currency": "USD",
            "due_date": (today - timedelta(days=21)).isoformat(),
            "days_overdue": 21,
            "status": "overdue",
        },
        {
            "id": "inv_002",
            "customer_name": "GlobalTech Solutions",
            "customer_email": "ap@globaltech.io",
            "amount": 8750.00,
            "currency": "USD",
            "due_date": (today - timedelta(days=8)).isoformat(),
            "days_overdue": 8,
            "status": "overdue",
        },
        {
            "id": "inv_003",
            "customer_name": "StartupXYZ",
            "customer_email": "finance@startupxyz.com",
            "amount": 3200.00,
            "currency": "USD",
            "due_date": (today - timedelta(days=45)).isoformat(),
            "days_overdue": 45,
            "status": "overdue",
        },
        {
            "id": "inv_004",
            "customer_name": "MediCo Health",
            "customer_email": "accounts@medico.health",
            "amount": 7050.00,
            "currency": "USD",
            "due_date": (today - timedelta(days=3)).isoformat(),
            "days_overdue": 3,
            "status": "overdue",
        },
    ]


def get_demo_invoice_by_id(invoice_id: str) -> dict | None:
    for inv in get_demo_invoices():
        if inv["id"] == invoice_id:
            return inv
    return None


def get_demo_monthly_summary(month: str) -> dict:
    overrides = _load_overrides()
    if "monthly" in overrides:
        summary = dict(overrides["monthly"])
        summary["month"] = month
        return summary

    return {
        "month": month,
        "collected": 94200.00,
        "outstanding": 31500.00,
        "invoice_count": 47,
        "avg_days_to_pay": 16,
        "vs_last_month": {
            "collected_change": 12.5,
            "outstanding_change": -8.3,
            "invoice_count_change": 5,
            "avg_days_change": -2,
        },
    }


def get_demo_transactions() -> list[dict]:
    overrides = _load_overrides()
    if "transactions" in overrides:
        return overrides["transactions"]

    today = date.today()
    return [
        {
            "id": "txn_001",
            "payer_name": "Acme Corporation",
            "amount": 12500.00,
            "date": (today - timedelta(days=2)).isoformat(),
            "reference": "INV-001-PAY",
        },
        {
            "id": "txn_002",
            "payer_name": "GlobalTech",
            "amount": 8750.00,
            "date": (today - timedelta(days=5)).isoformat(),
            "reference": "GT-PAY-2026",
        },
        {
            "id": "txn_003",
            "payer_name": "MediCo",
            "amount": 7050.00,
            "date": (today - timedelta(days=1)).isoformat(),
            "reference": "MC-HEALTH-PAY",
        },
        {
            "id": "txn_004",
            "payer_name": "Unknown Sender",
            "amount": 4300.00,
            "date": (today - timedelta(days=3)).isoformat(),
            "reference": "WIRE-REF-9921",
        },
    ]


def set_demo_invoices(data: list[dict]) -> None:
    overrides = _load_overrides()
    overrides["invoices"] = data
    _save_overrides(overrides)


def set_demo_transactions(data: list[dict]) -> None:
    overrides = _load_overrides()
    overrides["transactions"] = data
    _save_overrides(overrides)


def set_demo_monthly_summary(data: dict) -> None:
    overrides = _load_overrides()
    overrides["monthly"] = data
    _save_overrides(overrides)


def reset_demo_data() -> None:
    if OVERRIDES_PATH.exists():
        OVERRIDES_PATH.unlink()


def get_demo_reconciliation() -> dict:
    invoices = get_demo_invoices()
    transactions = get_demo_transactions()
    return {
        "matched": [
            {
                "transaction": transactions[0],
                "invoice": invoices[0],
                "confidence": 0.95,
                "match_reason": "Amount exact match + name similarity (Acme Corp / Acme Corporation)",
            },
            {
                "transaction": transactions[1],
                "invoice": invoices[1],
                "confidence": 0.88,
                "match_reason": "Amount exact match + partial name match (GlobalTech Solutions / GlobalTech)",
            },
            {
                "transaction": transactions[2],
                "invoice": invoices[3],
                "confidence": 0.82,
                "match_reason": "Amount exact match + partial name match (MediCo Health / MediCo)",
            },
        ],
        "unmatched_transactions": [
            {
                "transaction": transactions[3],
                "reason": "No invoice found matching amount $4,300.00 or payer 'Unknown Sender'",
            },
        ],
        "unmatched_invoices": [
            {
                "invoice": invoices[2],
                "reason": "No payment received for StartupXYZ ($3,200.00, 45 days overdue)",
            },
        ],
    }


def set_demo_financial_periods(data: list[dict]) -> None:
    overrides = _load_overrides()
    overrides["financial_periods"] = data
    _save_overrides(overrides)


def get_demo_financial_periods() -> list[dict]:
    overrides = _load_overrides()
    if "financial_periods" in overrides:
        return overrides["financial_periods"]
    return _default_financial_periods()


def _default_financial_periods() -> list[dict]:
    return [
        {"month": "Jan", "revenue": 142000, "expenses": 98000, "profit": 44000, "sales": 312, "cogs": 71400, "operating_expenses": 26600},
        {"month": "Feb", "revenue": 158000, "expenses": 105000, "profit": 53000, "sales": 347, "cogs": 79200, "operating_expenses": 25800},
        {"month": "Mar", "revenue": 175000, "expenses": 112000, "profit": 63000, "sales": 389, "cogs": 84000, "operating_expenses": 28000},
        {"month": "Apr", "revenue": 163000, "expenses": 108000, "profit": 55000, "sales": 358, "cogs": 81600, "operating_expenses": 26400},
        {"month": "May", "revenue": 189000, "expenses": 119000, "profit": 70000, "sales": 421, "cogs": 90000, "operating_expenses": 29000},
        {"month": "Jun", "revenue": 201000, "expenses": 125000, "profit": 76000, "sales": 452, "cogs": 96000, "operating_expenses": 29000},
        {"month": "Jul", "revenue": 195000, "expenses": 121000, "profit": 74000, "sales": 438, "cogs": 93000, "operating_expenses": 28000},
        {"month": "Aug", "revenue": 210000, "expenses": 128000, "profit": 82000, "sales": 476, "cogs": 99000, "operating_expenses": 29000},
        {"month": "Sep", "revenue": 224000, "expenses": 135000, "profit": 89000, "sales": 501, "cogs": 105000, "operating_expenses": 30000},
        {"month": "Oct", "revenue": 218000, "expenses": 132000, "profit": 86000, "sales": 489, "cogs": 102000, "operating_expenses": 30000},
        {"month": "Nov", "revenue": 235000, "expenses": 140000, "profit": 95000, "sales": 528, "cogs": 108000, "operating_expenses": 32000},
        {"month": "Dec", "revenue": 252000, "expenses": 148000, "profit": 104000, "sales": 567, "cogs": 115000, "operating_expenses": 33000},
    ]


def get_demo_insights() -> dict:
    """Aggregate all data sources and generate actionable insights."""
    invoices = get_demo_invoices()
    monthly = get_demo_monthly_summary("2026-02")
    financial = _default_financial_periods()
    reconciliation = get_demo_reconciliation()

    total_overdue = sum(inv["amount"] for inv in invoices)
    avg_days_overdue = round(sum(inv["days_overdue"] for inv in invoices) / len(invoices)) if invoices else 0
    critically_overdue = [inv for inv in invoices if inv["days_overdue"] > 30]
    total_revenue = sum(m["revenue"] for m in financial)
    total_profit = sum(m["profit"] for m in financial)
    total_expenses = sum(m["expenses"] for m in financial)
    avg_margin = round((total_profit / total_revenue) * 100, 1) if total_revenue else 0
    revenue_trend = [m["revenue"] for m in financial]
    profit_trend = [m["profit"] for m in financial]
    expense_trend = [m["expenses"] for m in financial]
    months = [m["month"] for m in financial]

    # Revenue growth rate (last 3 months vs prior 3 months)
    recent_rev = sum(revenue_trend[-3:])
    prior_rev = sum(revenue_trend[-6:-3]) if len(revenue_trend) >= 6 else sum(revenue_trend[:3])
    rev_growth = round(((recent_rev - prior_rev) / prior_rev) * 100, 1) if prior_rev else 0

    # Expense ratio trend
    expense_ratios = [round((m["expenses"] / m["revenue"]) * 100, 1) if m["revenue"] else 0 for m in financial]

    # Top overdue customers
    top_overdue = sorted(invoices, key=lambda x: x["amount"], reverse=True)[:5]

    # Generate insights
    insights = []

    # Cash collection insight
    collection_rate = round((monthly["collected"] / (monthly["collected"] + monthly["outstanding"])) * 100, 1) if (monthly["collected"] + monthly["outstanding"]) > 0 else 0
    insights.append({
        "type": "metric",
        "severity": "info" if collection_rate > 70 else "warning",
        "title": "Cash Collection Rate",
        "value": f"{collection_rate}%",
        "description": f"You collected ${monthly['collected']:,.0f} out of ${monthly['collected'] + monthly['outstanding']:,.0f} total receivables this month.",
        "suggestion": "Consider automated payment reminders for outstanding invoices." if collection_rate < 80 else "Strong collection rate. Keep it up!",
    })

    # Overdue risk
    if critically_overdue:
        insights.append({
            "type": "warning",
            "severity": "critical",
            "title": "Critical Overdue Invoices",
            "value": f"{len(critically_overdue)} invoices",
            "description": f"${sum(i['amount'] for i in critically_overdue):,.0f} is severely overdue (30+ days). Customers: {', '.join(i['customer_name'] for i in critically_overdue)}.",
            "suggestion": "Send final-notice emails immediately and consider escalating to collections.",
        })

    # Revenue growth insight
    insights.append({
        "type": "trend",
        "severity": "success" if rev_growth > 0 else "warning",
        "title": "Revenue Growth Trend",
        "value": f"{'+' if rev_growth > 0 else ''}{rev_growth}%",
        "description": f"Recent 3-month revenue (${recent_rev:,.0f}) vs prior 3-month (${prior_rev:,.0f}).",
        "suggestion": "Revenue is accelerating — invest in scaling operations." if rev_growth > 10 else "Revenue growth is slowing. Review pricing strategy and lead generation." if rev_growth < 5 else "Steady growth. Monitor for seasonal patterns.",
    })

    # Profit margin insight
    insights.append({
        "type": "metric",
        "severity": "success" if avg_margin > 35 else "warning" if avg_margin > 20 else "critical",
        "title": "Average Profit Margin",
        "value": f"{avg_margin}%",
        "description": f"Full-year profit of ${total_profit:,.0f} on ${total_revenue:,.0f} revenue.",
        "suggestion": "Healthy margins. Consider reinvesting in growth." if avg_margin > 35 else "Margins are thin. Look for cost optimization opportunities.",
    })

    # Expense management
    recent_expense_ratio = expense_ratios[-1] if expense_ratios else 0
    early_expense_ratio = expense_ratios[0] if expense_ratios else 0
    expense_trend_direction = "increasing" if recent_expense_ratio > early_expense_ratio else "decreasing"
    insights.append({
        "type": "trend",
        "severity": "warning" if expense_trend_direction == "increasing" else "success",
        "title": "Expense Ratio Trend",
        "value": f"{recent_expense_ratio}%",
        "description": f"Expenses as % of revenue moved from {early_expense_ratio}% to {recent_expense_ratio}% over the year.",
        "suggestion": "Expense ratio is creeping up. Review line items for cost savings." if expense_trend_direction == "increasing" else "Good cost management — expenses are growing slower than revenue.",
    })

    # Reconciliation insight
    matched_count = len(reconciliation.get("matched", []))
    unmatched_txn = len(reconciliation.get("unmatched_transactions", []))
    unmatched_inv = len(reconciliation.get("unmatched_invoices", []))
    total_recon = matched_count + unmatched_txn + unmatched_inv
    match_rate = round((matched_count / total_recon) * 100) if total_recon else 0
    insights.append({
        "type": "metric",
        "severity": "success" if match_rate > 80 else "warning",
        "title": "Payment Match Rate",
        "value": f"{match_rate}%",
        "description": f"{matched_count} of {total_recon} items matched. {unmatched_txn} unmatched payments, {unmatched_inv} unmatched invoices.",
        "suggestion": "Review unmatched items to ensure all payments are accounted for." if match_rate < 100 else "Perfect match rate!",
    })

    # Best/worst months
    best = max(financial, key=lambda m: m["profit"])
    worst = min(financial, key=lambda m: m["profit"])
    insights.append({
        "type": "tip",
        "severity": "info",
        "title": "Peak Performance Month",
        "value": best["month"],
        "description": f"Best: {best['month']} (${best['profit']:,.0f} profit). Worst: {worst['month']} (${worst['profit']:,.0f} profit).",
        "suggestion": f"Analyze what drove {best['month']}'s success and replicate those strategies.",
    })

    # Days to pay insight
    insights.append({
        "type": "metric",
        "severity": "success" if monthly["avg_days_to_pay"] < 20 else "warning",
        "title": "Average Days to Pay",
        "value": f"{monthly['avg_days_to_pay']} days",
        "description": f"Customers take an average of {monthly['avg_days_to_pay']} days to pay invoices.",
        "suggestion": "Consider offering early payment discounts to reduce DSO." if monthly["avg_days_to_pay"] > 15 else "Excellent payment velocity!",
    })

    return {
        "summary": {
            "total_revenue": total_revenue,
            "total_profit": total_profit,
            "total_expenses": total_expenses,
            "avg_margin": avg_margin,
            "total_overdue": total_overdue,
            "overdue_count": len(invoices),
            "avg_days_overdue": avg_days_overdue,
            "collection_rate": collection_rate,
            "revenue_growth": rev_growth,
        },
        "insights": insights,
        "top_overdue_customers": [
            {
                "name": inv["customer_name"],
                "amount": inv["amount"],
                "days_overdue": inv["days_overdue"],
                "invoice_id": inv["id"],
            }
            for inv in top_overdue
        ],
        "charts": {
            "months": months,
            "revenue": revenue_trend,
            "profit": profit_trend,
            "expenses": expense_trend,
            "expense_ratios": expense_ratios,
        },
    }


def get_demo_financial_analysis(timeframe: str = "monthly", year: int = 2026) -> dict:
    """Full year of realistic mock financial data for graphing."""
    monthly_data = get_demo_financial_periods()
    if not monthly_data:
        monthly_data = _default_financial_periods()

    total_revenue = sum(m["revenue"] for m in monthly_data)
    total_expenses = sum(m["expenses"] for m in monthly_data)
    total_profit = sum(m["profit"] for m in monthly_data)
    total_sales = sum(m["sales"] for m in monthly_data)

    if timeframe == "quarterly":
        quarterly_data = []
        quarters = [("Q1", 0, 3), ("Q2", 3, 6), ("Q3", 6, 9), ("Q4", 9, 12)]
        for label, start, end in quarters:
            q_months = monthly_data[start:end]
            quarterly_data.append({
                "period": label,
                "revenue": sum(m["revenue"] for m in q_months),
                "expenses": sum(m["expenses"] for m in q_months),
                "profit": sum(m["profit"] for m in q_months),
                "sales": sum(m["sales"] for m in q_months),
                "cogs": sum(m["cogs"] for m in q_months),
                "operating_expenses": sum(m["operating_expenses"] for m in q_months),
            })
        period_data = quarterly_data
    else:
        period_data = [
            {**m, "period": m["month"]} for m in monthly_data
        ]

    best_month = max(monthly_data, key=lambda m: m["revenue"])
    worst_month = min(monthly_data, key=lambda m: m["revenue"])
    avg_margin = round((total_profit / total_revenue) * 100, 1) if total_revenue else 0

    return {
        "year": year,
        "timeframe": timeframe,
        "periods": period_data,
        "summary": {
            "total_revenue": total_revenue,
            "total_expenses": total_expenses,
            "total_profit": total_profit,
            "total_sales": total_sales,
            "avg_profit_margin": avg_margin,
            "best_month": best_month["month"],
            "best_month_revenue": best_month["revenue"],
            "worst_month": worst_month["month"],
            "worst_month_revenue": worst_month["revenue"],
            "revenue_growth": round(
                ((monthly_data[-1]["revenue"] - monthly_data[0]["revenue"]) / monthly_data[0]["revenue"]) * 100, 1
            ),
        },
    }
