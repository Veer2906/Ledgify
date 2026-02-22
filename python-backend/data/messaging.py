import os
import httpx
from demo_data import is_demo_mode


UNIFIED_API_KEY = os.getenv("UNIFIED_API_KEY", "")
UNIFIED_BASE_URL = "https://api.unified.to"


async def send_email(connection_id: str, to: str, subject: str, body: str) -> dict:
    if is_demo_mode(connection_id):
        return {
            "status": "demo_preview",
            "message": "Email not sent (demo mode)",
            "preview": {
                "to": to,
                "subject": subject,
                "body": body,
            },
        }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{UNIFIED_BASE_URL}/messaging/{connection_id}/message",
            headers={"Authorization": f"Bearer {UNIFIED_API_KEY}"},
            json={
                "to": [{"email": to}],
                "subject": subject,
                "body": body,
            },
            timeout=30,
        )
        resp.raise_for_status()
        return {"status": "sent", "message": "Email sent successfully", "response": resp.json()}
