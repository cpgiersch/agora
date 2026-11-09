"""Channel3 v1 search; credentials remain on the server."""
import os
import httpx


class Channel3Error(RuntimeError):
    pass


def is_configured() -> bool:
    return bool(os.getenv("CHANNEL3_API_KEY"))


async def search_products(query: str, limit: int = 30) -> dict:
    key = os.getenv("CHANNEL3_API_KEY")
    if not key:
        raise Channel3Error("Live product search is not configured.")
    base_url = os.getenv("CHANNEL3_API_URL", "https://api.trychannel3.com").rstrip("/")
    # Search results contain ALL offers, even ones not matching this stock filter.
    # The product policy must still check every offer before selecting one to display.
    payload = {
        "query": query,
        "limit": max(1, min(limit, 30)),
        "filters": {"availability": ["InStock"]},
        "config": {"country": "US", "currency": "USD", "offer_refresh_timeout_ms": 5000},
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{base_url}/v1/search",
                json=payload,
                headers={"x-api-key": key},
            )
    except httpx.TimeoutException as exc:
        raise Channel3Error("Product search timed out. Please try again.") from exc
    except httpx.HTTPError as exc:
        raise Channel3Error("Could not reach the product search provider.") from exc
    if response.status_code >= 400:
        # Never forward raw upstream bodies: they may contain credential/debug data.
        messages = {
            401: "The product search credential was rejected.",
            402: "The product search provider requires additional credits.",
            403: "The product search provider denied access.",
            429: "Product search is temporarily rate limited. Please try again shortly.",
        }
        raise Channel3Error(messages.get(response.status_code, "The product search provider returned an error."))
    try:
        data = response.json()
    except ValueError as exc:
        raise Channel3Error("The product search provider returned invalid data.") from exc
    if not isinstance(data, dict) or not isinstance(data.get("products"), list):
        raise Channel3Error("Unexpected product search response format.")
    return data
