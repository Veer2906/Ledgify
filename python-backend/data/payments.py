import os
import httpx
from demo_data import is_demo_mode, get_demo_transactions


UNIFIED_API_KEY = os.getenv("UNIFIED_API_KEY", "")
UNIFIED_BASE_URL = "https://api.unified.to"


async def get_recent_transactions(connection_id: str, days: int = 30) -> list[dict]:
    if is_demo_mode(connection_id):
        return get_demo_transactions()

    from datetime import date, timedelta
    since = (date.today() - timedelta(days=days)).isoformat()

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{UNIFIED_BASE_URL}/payment/{connection_id}/payment",
            headers={"Authorization": f"Bearer {UNIFIED_API_KEY}"},
            params={"updated_gte": f"{since}T00:00:00Z"},
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()
