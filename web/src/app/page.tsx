"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiGet, apiPost, Product, ProductPolicy, SearchResponse, formatCheckedAt } from "@/lib/api";
import { RetailerFilters, normalizeDomain } from "@/components/RetailerFilters";
import { getGuestSessionId } from "@/lib/session";
import { SearchBar } from "@/components/SearchBar";
import { ProductGrid } from "@/components/ProductGrid";
import { Card } from "@/components/ui/Card";
import { PreferenceExplorer } from "@/components/PreferenceExplorer";
import { BALANCED_PREFERENCES, PreferencePoint } from "@/lib/preferences";

type SortKey = "relevance" | "price-asc" | "price-desc" | "name" | "brand";
const EXTRA_KEY = "agora.excludedDomains";

function sortProducts(list: Product[], key: SortKey): Product[] {
  if (key === "relevance") return list;
  const arr = list.map((p, i) => ({ p, i }));
  const txt = (a?: string | null) => (a ?? "").trim();
  arr.sort((a, b) => {
    if (key === "name") return txt(a.p.title).localeCompare(txt(b.p.title), undefined, { sensitivity: "base" }) || a.i - b.i;
    if (key === "brand") {
      const x = txt(a.p.brand), y = txt(b.p.brand);
      if (!x && !y) return a.i - b.i;
      if (!x) return 1;
      if (!y) return -1;
      return x.localeCompare(y, undefined, { sensitivity: "base" }) || a.i - b.i;
    }
    const pa = a.p.price, pb = b.p.price;
    const na = pa == null || !Number.isFinite(pa), nb = pb == null || !Number.isFinite(pb);
    if (na && nb) return a.i - b.i;
    if (na) return 1;
    if (nb) return -1;
    const ca = (a.p.currency || "USD").toUpperCase(), cb = (b.p.currency || "USD").toUpperCase();
    if (ca !== cb) return ca.localeCompare(cb);
    return (key === "price-asc" ? pa! - pb! : pb! - pa!) || a.i - b.i;
  });
  return arr.map((x) => x.p);
}

type CartResponse = {
  id: string;
  user_id: string | null;
  guest_session_id: string | null;
  items: Array<{ quantity: number }>;
};


export default function HomePage() {
  const HERO_MAX_WIDTH = 720;
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(12);
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [meta, setMeta] = useState<SearchResponse | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("relevance");
  const [policy, setPolicy] = useState<ProductPolicy | null>(null);
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [extraDomains, setExtraDomainsState] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<PreferencePoint>(BALANCED_PREFERENCES);
  const [prefsOpen, setPrefsOpen] = useState(true);
  const requestId = useRef(0);

  const sorted = useMemo(() => sortProducts(results, sortKey), [results, sortKey]);
  const multiCurrency = useMemo(
    () => new Set(results.filter((p) => p.price != null).map((p) => (p.currency || "USD").toUpperCase())).size > 1,
    [results]
  );

  function setExtraDomains(d: string[]) {
    setExtraDomainsState(d);
    try {
      localStorage.setItem(EXTRA_KEY, JSON.stringify(d));
    } catch {}
  }

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(EXTRA_KEY) || "[]");
      if (Array.isArray(raw)) {
        setExtraDomainsState(raw.map((x) => normalizeDomain(String(x))).filter((x): x is string => !!x));
      }
    } catch {}
    apiGet<ProductPolicy>("/products/policy")
      .then(setPolicy)
      .catch((e: any) => setPolicyError(e?.message ?? "Policy unavailable"));
  }, []);


  useEffect(() => {
    const sid = getGuestSessionId();
    setSessionId(sid);
    refreshCartCount(sid);
  }, []);

  async function runSearch() {
    const trimmed = q.trim();
    if (!trimmed) {
      setError("Type a search query first.");
      return;
    }

    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    if (!hasSearched) setPrefsOpen(false);
    setHasSearched(true);

    const lim = Math.min(30, Math.max(1, limit));
    const ex = extraDomains.length ? `&exclude_domains=${encodeURIComponent(extraDomains.join(","))}` : "";
    try {
      const data = await apiGet<SearchResponse>(
        `/products/search?q=${encodeURIComponent(trimmed)}&limit=${lim}${ex}`
      );
      if (id !== requestId.current) return;
      setResults(data.results ?? []);
      setMeta(data);
    } catch (e: any) {
      if (id !== requestId.current) return;
      setError(e?.message ?? "Search failed");
      setResults([]);
      setMeta(null);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  async function addToCart(p: Product) {
    if (!sessionId) {
      setError("Session not initialized yet. Try again.");
      return;
    }

    try {
      await apiPost(
        "/cart/items",
        {
          product_id: p.id,
          product_url: p.product_url,
          title: p.title,
          price: p.price ?? null,
          currency: p.currency ?? "USD",
          image_url: p.image_url ?? null,
          quantity: 1,
        },
        { headers: { "x-session-id": sessionId } }
      );
      await refreshCartCount(sessionId);
      setNotice(`Added "${p.title}" to cart`);
    } catch (e: any) {
      setError(e?.message ?? "Add to cart failed");
    }
  }

  async function refreshCartCount(sid: string) {
    try {
      const cart = await apiGet<CartResponse>("/cart", {
        headers: { "x-session-id": sid },
      });
      const count = (cart.items ?? []).reduce((sum, it) => sum + (it.quantity ?? 0), 0);
      setCartCount(count);
    } catch {
      setCartCount(0);
    }
  }


  function clear() {
    requestId.current++;
    setLoading(false);
    setMeta(null);
    setQ("");
    setResults([]);
    setHasSearched(false);
    setError(null);
  }

  return (
    <div>
      {/* Hero / Search */}
      <div
        className="agora-search-hero"
        style={{
          paddingTop: hasSearched ? 16 : "12vh",
          paddingBottom: hasSearched ? 24 : 40,
          maxWidth: hasSearched ? "100%" : HERO_MAX_WIDTH,
          margin: "0 auto",
        }}
      >
        {!hasSearched && (
          <div style={{ marginBottom: 28, textAlign: "center" }}>
            <h1
              style={{
                fontSize: 36,
                fontWeight: 700,
                letterSpacing: "-0.03em",
                margin: "0 0 10px",
                color: "rgb(var(--text))",
                lineHeight: 1.2,
              }}
            >
              Find anything.
            </h1>
            <p style={{ fontSize: 16, color: "rgb(var(--muted))", margin: 0, lineHeight: 1.5 }}>
              Search products across the web. Listings from retailers you exclude, and anything
              not reported in stock, are filtered out before you see them.
            </p>
          </div>
        )}

        <SearchBar
          q={q}
          setQ={setQ}
          limit={limit}
          setLimit={setLimit}
          loading={loading}
          onSearch={runSearch}
          onClear={clear}
          error={error}
        />
        <RetailerFilters
          policyDomains={policy?.blocked_domains ?? meta?.blocked_domains ?? []}
          policyExplanation={policy?.explanation ?? null}
          policyError={policyError}
          extraDomains={extraDomains}
          setExtraDomains={setExtraDomains}
        />
        <div role="status" aria-live="polite" className="sr-only">
          {loading ? "Searching" : notice ?? ""}
        </div>
        {notice && (
          <div style={{ marginTop: 10, fontSize: 13, color: "rgb(var(--accent))" }} data-testid="status-cart-notice">
            {notice} · cart has {cartCount} item{cartCount !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      <div style={{ maxWidth: hasSearched ? "100%" : HERO_MAX_WIDTH, margin: "0 auto" }}>
        <PreferenceExplorer value={prefs} onChange={setPrefs} open={prefsOpen} onOpenChange={setPrefsOpen} />
      </div>

      {/* Results */}
      {hasSearched && (
        <div>
          {loading && results.length === 0 ? (
            <div className="product-skeletons" aria-busy="true" aria-label="Loading results"
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="agora-skeleton" />)}
            </div>
          ) : error && results.length === 0 ? (
            <Card style={{ padding: "28px 24px" }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>Search did not complete.</div>
              <div style={{ fontSize: 14, color: "rgb(var(--muted))", marginBottom: 14 }}>
                The product service returned an error. Your filters were not changed.
              </div>
              <button type="button" className="agora-select" onClick={runSearch} data-testid="button-retry-search" style={{ cursor: "pointer" }}>
                Try again
              </button>
            </Card>
          ) : results.length === 0 ? (
            <Card style={{ padding: "28px 24px" }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>No matching in-stock products.</div>
              <div style={{ fontSize: 14, color: "rgb(var(--muted))", lineHeight: 1.5 }}>
                {meta && meta.scanned_count > 0
                  ? `We checked ${meta.scanned_count} product${meta.scanned_count !== 1 ? "s" : ""}: ${meta.excluded_retailer_count} removed by retailer exclusions, ${meta.excluded_stock_count} not reported in stock. `
                  : ""}
                Try a broader query, increase the limit, or review your own excluded retailers.
              </div>
            </Card>
          ) : (
            <>
              <div className="agora-toolbar" style={{ opacity: loading ? 0.6 : 1 }}>
                <div style={{ fontSize: 13, color: "rgb(var(--muted))", lineHeight: 1.6 }} data-testid="text-result-summary">
                  <span style={{ color: "rgb(var(--text))", fontWeight: 600 }}>
                    {results.length} in-stock result{results.length !== 1 ? "s" : ""}
                  </span>
                  {meta && (
                    <>
                      {" "}from {meta.scanned_count} checked · {meta.excluded_retailer_count} excluded by retailer ·{" "}
                      {meta.excluded_stock_count} not in stock
                      {formatCheckedAt(meta.checked_at) ? ` · checked ${formatCheckedAt(meta.checked_at)}` : ""}
                    </>
                  )}
                  {loading && " · updating"}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                    <span className="agora-chip agora-chip--ok">In stock only</span>
                    <span className="agora-chip agora-chip--block">
                      {(meta?.blocked_domains.length ?? 0)} retailers excluded
                    </span>
                  </div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgb(var(--muted))" }}>
                  Sort these results
                  <select
                    className="agora-select"
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                    data-testid="select-sort"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="price-asc">Price: low to high</option>
                    <option value="price-desc">Price: high to low</option>
                    <option value="name">Product name A-Z</option>
                    <option value="brand">Brand A-Z</option>
                  </select>
                </label>
              </div>
              {multiCurrency && sortKey.startsWith("price") && (
                <div style={{ fontSize: 12, color: "rgb(var(--muted))", marginBottom: 12 }}>
                  Results use several currencies, so prices are sorted within each currency group.
                </div>
              )}
              <div style={{ fontSize: 12, color: "rgb(var(--muted))", marginBottom: 14 }}>
                Stock reflects the latest catalog check and may differ at checkout. Exclusions remove any product with an
                indexed offer from an excluded retailer; they are not a quality guarantee.
              </div>
              <ProductGrid products={sorted} onAdd={addToCart} addDisabled={!sessionId} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
