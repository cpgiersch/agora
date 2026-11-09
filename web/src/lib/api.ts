const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export type Tokens = {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  access_expires_in_seconds: number;
};

export type Product = {
  id: string;
  title: string;
  brand?: string | null;
  price?: number | null;
  currency?: string | null;
  image_url?: string | null;
  product_url: string;
  retailer_domain?: string | null;
  availability?: "InStock" | string | null;
  stock_checked_at?: string | null;
};

export type SearchResponse = {
  query: string;
  limit: number;
  results: Product[];
  scanned_count: number;
  excluded_retailer_count: number;
  excluded_stock_count: number;
  blocked_domains: string[];
  checked_at: string;
  next_page_token: string | null;
};

export type ProductPolicy = {
  blocked_domains: string[];
  explanation: string;
};

export function formatPrice(price?: number | null, currency?: string | null): string {
  if (price == null || !Number.isFinite(price)) return "Price unavailable";
  const cur = (currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: cur }).format(price);
  } catch {
    return `${price.toFixed(2)} ${cur}`;
  }
}

export function formatCheckedAt(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export async function apiGet<T>(
  path: string,
  opts?: { token?: string; headers?: Record<string, string> }
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: {
      accept: "application/json",
      ...(opts?.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      ...(opts?.headers || {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${path} failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  opts?: { token?: string; headers?: Record<string, string> }
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      ...(opts?.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      ...(opts?.headers || {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function apiDelete<T>(
  path: string,
  opts?: { token?: string; headers?: Record<string, string> }
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: {
      accept: "application/json",
      ...(opts?.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      ...(opts?.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DELETE ${path} failed: ${res.status} ${text}`);
  }

  // Some DELETE endpoints return empty responses; handle both safely
  const text = await res.text();
  return (text ? (JSON.parse(text) as T) : ({} as T));
}
