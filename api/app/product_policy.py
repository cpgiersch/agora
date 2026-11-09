"""Deterministic retailer and availability policy, independent of HTTP/UI."""
import math
import re
from urllib.parse import urlsplit

DEFAULT_BLOCKED_DOMAINS = (
    "shein.com", "temu.com", "aliexpress.com", "dhgate.com", "wish.com",
    "shein.co.uk", "shein.com.au", "shein.com.br", "shein.com.mx",
    "shein.fr", "shein.de", "shein.es", "shein.it", "shein.jp",
)

POLICY_EXPLANATION = (
    "Products with any known offer on an excluded retailer are hidden. "
    "Only offers explicitly marked InStock by Channel3 are displayed; unknown "
    "availability is excluded. Exclusions use indexed retailer domains, not an "
    "automatic quality or dropshipping assessment. Unlinked copies and offers "
    "outside Channel3's indexed locale cannot be detected. Stock is provider-reported "
    "at search time and can change before checkout."
)


def normalize_domain(value: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError("Enter a retailer domain such as example.com.")
    raw = value.strip().lower()
    parsed = urlsplit(raw if "://" in raw else "//" + raw)
    if parsed.scheme not in ("", "http", "https") or parsed.username or parsed.password:
        raise ValueError("Enter a valid retailer domain.")
    host = (parsed.hostname or "").rstrip(".")
    host = host.removeprefix("www.")
    try:
        host = host.encode("idna").decode("ascii")
    except UnicodeError as exc:
        raise ValueError("Enter a valid retailer domain.") from exc
    if len(host) > 253 or not re.fullmatch(
        r"(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}", host
    ):
        raise ValueError("Enter a valid retailer domain such as example.com.")
    return host


def is_blocked(domain: str, blocked_domains: list[str]) -> bool:
    return any(domain == blocked or domain.endswith("." + blocked) for blocked in blocked_domains)


def safe_url(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    try:
        url = urlsplit(value)
        return value if url.scheme == "https" and url.hostname and not url.username and not url.password else None
    except ValueError:
        return None


def offer_domains(offer: dict) -> list[str]:
    domains = []
    # Check BOTH reported domain and URL: attributed URLs may be Channel3 links.
    for value in (offer.get("domain"), offer.get("url")):
        try:
            domains.append(normalize_domain(value))
        except (ValueError, TypeError):
            pass
    return domains


def select_product(product: dict, blocked_domains: list[str], checked_at: str) -> tuple[dict | None, str | None]:
    offers = product.get("offers")
    offers = [offer for offer in offers if isinstance(offer, dict)] if isinstance(offers, list) else []
    brands = product.get("brands") or []
    brand_names = [brand.get("name", "") for brand in brands if isinstance(brand, dict)]
    # A blocked offer disqualifies the entire canonical product, including allowed retailers.
    if any(is_blocked(domain, blocked_domains) for offer in offers for domain in offer_domains(offer)):
        return None, "retailer"
    if any(name.casefold().strip() in {"shein", "temu"} for name in brand_names if isinstance(name, str)):
        return None, "retailer"

    candidates = []
    for offer in offers:
        # Do not infer availability from a missing field, price, or the upstream filter.
        if offer.get("availability") != "InStock":
            continue
        url = safe_url(offer.get("url"))
        try:
            domain = normalize_domain(offer.get("domain"))
        except (ValueError, TypeError):
            continue
        price = offer.get("price") or {}
        # Current v1 responses use price.price; some documentation examples use amount.
        amount = price.get("price", price.get("amount")) if isinstance(price, dict) else None
        if isinstance(amount, bool) or not isinstance(amount, (int, float)) or not math.isfinite(amount) or amount < 0:
            amount = None
        currency = price.get("currency") if isinstance(price, dict) else None
        # This search requests USD; don't silently compare different currencies.
        if currency != "USD" or not url:
            continue
        candidates.append((amount is None, amount if amount is not None else 0, domain, url, amount))
    if not candidates:
        return None, "stock"
    _, _, domain, product_url, amount = min(candidates, key=lambda candidate: candidate[:3])
    images = product.get("images") or []
    image_url = next(
        (image_url for image in images if isinstance(image, dict) and (image_url := safe_url(image.get("url")))),
        None,
    )
    product_id = product.get("id")
    title = product.get("title")
    if not isinstance(product_id, str) or not product_id or not isinstance(title, str) or not title:
        return None, "invalid"
    return {
        "id": product_id,
        "title": title,
        "brand": next((name for name in brand_names if isinstance(name, str) and name), None),
        "price": amount,
        "currency": "USD",
        "image_url": image_url,
        "product_url": product_url,
        "retailer_domain": domain,
        "availability": "InStock",
        "stock_checked_at": checked_at,
    }, None
