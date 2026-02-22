import os
import httpx
from demo_data import is_demo_mode, get_demo_invoices, get_demo_invoice_by_id, get_demo_monthly_summary


UNIFIED_API_KEY = os.getenv("UNIFIED_API_KEY", "")
UNIFIED_BASE_URL = "https://api.unified.to"


async def get_overdue_invoices(connection_id: str, min_days_overdue: int = 0) -> list[dict]:
    if is_demo_mode(connection_id):
        invoices = get_demo_invoices()
        return [inv for inv in invoices if inv["days_overdue"] >= min_days_overdue]

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{UNIFIED_BASE_URL}/accounting/{connection_id}/invoice",
            headers={"Authorization": f"Bearer {UNIFIED_API_KEY}"},
            params={"status": "overdue"},
            timeout=30,
        )
        resp.raise_for_status()
        invoices = resp.json()

    from datetime import date
    today = date.today()
    results = []
    for inv in invoices:
        due = inv.get("due_date", "")
        if due:
            days = (today - date.fromisoformat(due[:10])).days
            if days >= min_days_overdue:
                inv["days_overdue"] = days
                results.append(inv)
    return results


async def get_invoice_by_id(connection_id: str, invoice_id: str) -> dict | None:
    if is_demo_mode(connection_id):
        return get_demo_invoice_by_id(invoice_id)

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{UNIFIED_BASE_URL}/accounting/{connection_id}/invoice/{invoice_id}",
            headers={"Authorization": f"Bearer {UNIFIED_API_KEY}"},
            timeout=30,
        )
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json()


async def get_monthly_stats(connection_id: str, month: str) -> dict:
    if is_demo_mode(connection_id):
        return get_demo_monthly_summary(month)

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{UNIFIED_BASE_URL}/accounting/{connection_id}/invoice",
            headers={"Authorization": f"Bearer {UNIFIED_API_KEY}"},
            params={"updated_gte": f"{month}-01T00:00:00Z"},
            timeout=30,
        )
        resp.raise_for_status()
        invoices = resp.json()

    collected = sum(inv.get("amount", 0) for inv in invoices if inv.get("status") == "paid")
    outstanding = sum(inv.get("amount", 0) for inv in invoices if inv.get("status") != "paid")
    days_list = [inv.get("days_to_pay", 0) for inv in invoices if inv.get("days_to_pay")]
    avg_days = int(sum(days_list) / len(days_list)) if days_list else 0

    return {
        "month": month,
        "collected": collected,
        "outstanding": outstanding,
        "invoice_count": len(invoices),
        "avg_days_to_pay": avg_days,
        "vs_last_month": {
            "collected_change": 0,
            "outstanding_change": 0,
            "invoice_count_change": 0,
            "avg_days_change": 0,
        },
    }
