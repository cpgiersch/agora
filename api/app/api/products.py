from datetime import datetime, timezone
from typing import Literal
from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel, Field
from app.integrations.channel3_client import search_products as c3_search, is_configured, Channel3Error
from app.product_policy import DEFAULT_BLOCKED_DOMAINS, POLICY_EXPLANATION, normalize_domain, select_product

router = APIRouter(tags=["products"])


class ProductSummary(BaseModel):
    id: str
    title: str
    brand: str | None = None
    price: float | None = None
    currency: str = "USD"
    image_url: str | None = None
    product_url: str
    retailer_domain: str
    availability: Literal["InStock"] = "InStock"
    stock_checked_at: str


class ProductSearchResponse(BaseModel):
    query: str
    limit: int
    results: list[ProductSummary]
    scanned_count: int
    excluded_retailer_count: int
    excluded_stock_count: int
    blocked_domains: list[str]
    checked_at: str
    next_page_token: str | None = None


class ProductPolicy(BaseModel):
    blocked_domains: list[str]
    explanation: str


@router.get("/products/policy", response_model=ProductPolicy)
async def product_policy():
    return ProductPolicy(blocked_domains=list(DEFAULT_BLOCKED_DOMAINS), explanation=POLICY_EXPLANATION)


@router.get("/products/search", response_model=ProductSearchResponse)
async def search_products(
    response: Response,
    q: str = Query(min_length=1, max_length=300),
    limit: int = Query(default=12, ge=1, le=30),
    exclude_domains: str = Query(default="", max_length=3000),
):
    response.headers["Cache-Control"] = "no-store"
    query = q.strip()
    if not query:
        raise HTTPException(status_code=422, detail="Type a search query first.")
    extras = [domain.strip() for domain in exclude_domains.split(",") if domain.strip()]
    if len(extras) > 30:
        raise HTTPException(status_code=422, detail="Add at most 30 extra retailer domains.")
    try:
        blocked = sorted(set(DEFAULT_BLOCKED_DOMAINS) | {normalize_domain(domain) for domain in extras})
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if not is_configured():
        raise HTTPException(status_code=503, detail="Live product search is not configured. No sample products are shown.")
    try:
        # One bounded upstream request per search. Filtering can leave fewer than limit.
        data = await c3_search(query, limit=30)
    except Channel3Error as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    checked_at = datetime.now(timezone.utc).isoformat()
    results = []
    retailers = stock = 0
    seen = set()
    for product in data["products"]:
        if not isinstance(product, dict):
            continue
        selected, reason = select_product(product, blocked, checked_at)
        if reason == "retailer":
            retailers += 1
        elif reason == "stock":
            stock += 1
        if selected and selected["id"] not in seen:
            results.append(selected)
            seen.add(selected["id"])
    return ProductSearchResponse(
        query=query, limit=limit, results=results[:limit],
        scanned_count=len(data["products"]), excluded_retailer_count=retailers,
        excluded_stock_count=stock, blocked_domains=blocked, checked_at=checked_at,
        # This endpoint currently exposes a single batch; don't imply usable pagination.
        next_page_token=None,
    )
