"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { getGuestSessionId } from "@/lib/session";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type CartItem = {
  cart_item_id: string;
  product_id: string;
  title: string;
  product_url: string;
  image_url?: string | null;
  price?: number | null;
  currency?: string | null;
  quantity: number;
};

type CartResponse = {
  id: string;
  user_id: string | null;
  guest_session_id: string | null;
  items: CartItem[];
};

type CheckoutPreviewResponse = {
  subtotal?: number;
  total?: number;
  currency?: string;
  line_items?: Array<{
    title?: string;
    quantity?: number;
    unit_price?: number;
    line_total?: number;
  }>;
  warnings?: string[];
};

type CheckoutSubmitResponse = {
  order_id?: string;
  status?: string;
  message?: string;
};

function money(n: number | null | undefined, currency: string) {
  if (n == null) return "—";
  return `${n.toFixed(2)} ${currency}`;
}

export default function CheckoutPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [cart, setCart] = useState<CartResponse | null>(null);
  const [preview, setPreview] = useState<CheckoutPreviewResponse | null>(null);
  const [submitResult, setSubmitResult] = useState<CheckoutSubmitResponse | null>(null);

  const [loadingCart, setLoadingCart] = useState(true);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSessionId(getGuestSessionId());
  }, []);

  async function loadCart(activeSessionId: string) {
    setLoadingCart(true);
    setError(null);
    try {
      const data = await apiGet<CartResponse>("/cart", {
        headers: { "x-session-id": activeSessionId },
      });
      setCart(data);
    } catch (e: any) {
      setCart(null);
      setError(e?.message ?? "Failed to load cart");
    } finally {
      setLoadingCart(false);
    }
  }

  useEffect(() => {
    if (!sessionId) return;
    loadCart(sessionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const totals = useMemo(() => {
    const items = cart?.items ?? [];
    const count = items.reduce((sum, it) => sum + (it.quantity ?? 0), 0);
    const subtotal = items.reduce((sum, it) => {
      const p = it.price ?? 0;
      const q = it.quantity ?? 0;
      return sum + p * q;
    }, 0);
    const currency = items.find((x) => x.currency)?.currency ?? "USD";
    return { count, subtotal, currency };
  }, [cart]);

  async function runPreview() {
    if (!sessionId) return;
    setLoadingPreview(true);
    setError(null);
    setSubmitResult(null);

    try {
      const data = await apiPost<CheckoutPreviewResponse>(
        "/checkout/preview",
        {},
        { headers: { "x-session-id": sessionId } }
      );
      setPreview(data);
    } catch (e: any) {
      setPreview(null);
      setError(e?.message ?? "Checkout preview failed");
    } finally {
      setLoadingPreview(false);
    }
  }

  async function submitCheckout() {
    if (!sessionId) return;
    setSubmitting(true);
    setError(null);

    try {
      const data = await apiPost<CheckoutSubmitResponse>(
        "/checkout/submit",
        {},
        { headers: { "x-session-id": sessionId } }
      );
      setSubmitResult(data);
    } catch (e: any) {
      setSubmitResult(null);
      setError(e?.message ?? "Checkout submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  const hasItems = (cart?.items?.length ?? 0) > 0;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 28,
        }}
      >
        <div>
          <h2 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>
            Checkout
          </h2>
          <div style={{ fontSize: 13, color: "rgb(var(--muted))" }}>
            Review your order and confirm.
          </div>
        </div>

        <Button
          variant="ghost"
          onClick={() => sessionId && loadCart(sessionId)}
          disabled={!sessionId || loadingCart}
        >
          Refresh cart
        </Button>
      </div>

      {error && (
        <div
          style={{
            marginBottom: 20,
            padding: "14px 16px",
            borderRadius: 10,
            border: "1px solid rgba(var(--danger), 0.4)",
            background: "rgba(var(--danger), 0.08)",
            color: "rgb(255, 200, 200)",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {submitResult ? (
        <Card style={{ padding: 32 }}>
          <div style={{ fontSize: 20, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Order submitted!</div>
          <div style={{ fontSize: 14, color: "rgb(var(--muted))", display: "flex", flexDirection: "column", gap: 8 }}>
            {submitResult.order_id && (
              <div>
                <span style={{ color: "rgb(var(--text))", fontWeight: 500 }}>Order ID:</span>{" "}
                <code style={{ fontFamily: "var(--font-geist-mono)" }}>{submitResult.order_id}</code>
              </div>
            )}
            {submitResult.status && (
              <div>
                <span style={{ color: "rgb(var(--text))", fontWeight: 500 }}>Status:</span>{" "}
                {submitResult.status}
              </div>
            )}
            {submitResult.message && (
              <div>
                <span style={{ color: "rgb(var(--text))", fontWeight: 500 }}>Message:</span>{" "}
                {submitResult.message}
              </div>
            )}
          </div>
        </Card>
      ) : (
        <div className="checkout-grid">
          {/* Review */}
          <Card style={{ padding: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgb(var(--muted))", marginBottom: 16 }}>
              Order Review
            </div>

            {loadingCart ? (
              <div style={{ color: "rgb(var(--muted))", padding: "16px 0" }}>Loading…</div>
            ) : !hasItems ? (
              <div style={{ color: "rgb(var(--muted))", padding: "16px 0" }}>Your cart is empty.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {cart!.items.map((it) => (
                  <div
                    key={it.cart_item_id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 16,
                      padding: 14,
                      borderRadius: 10,
                      border: "1px solid rgba(var(--border), 0.5)",
                      background: "rgba(var(--border), 0.06)",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, lineHeight: 1.35 }}>{it.title}</div>
                      <div style={{ marginTop: 6, fontSize: 13, color: "rgb(var(--muted))" }}>
                        {it.quantity} &times; {it.price ?? "—"} {it.currency ?? "USD"}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>
                      {it.price != null
                        ? `${(it.price * it.quantity).toFixed(2)} ${it.currency ?? "USD"}`
                        : "—"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Summary + Actions */}
          <Card style={{ padding: 24, height: "fit-content", position: "sticky", top: 80 }}>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgb(var(--muted))", marginBottom: 20 }}>
              Summary
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ color: "rgb(var(--muted))", fontSize: 14 }}>Items</div>
              <div style={{ fontWeight: 600 }}>{totals.count}</div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                paddingTop: 14,
                borderTop: "1px solid rgba(var(--border), 0.4)",
                marginBottom: 20,
              }}
            >
              <div style={{ color: "rgb(var(--muted))", fontSize: 14 }}>Subtotal</div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>
                {money(totals.subtotal, totals.currency)}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Button
                onClick={runPreview}
                variant="ghost"
                disabled={!hasItems || loadingPreview || submitting || !sessionId}
                style={{ width: "100%" }}
              >
                {loadingPreview ? "Previewing…" : "Preview checkout"}
              </Button>

              <Button
                onClick={submitCheckout}
                disabled={!hasItems || submitting || !sessionId}
                style={{ width: "100%" }}
              >
                {submitting ? "Submitting…" : "Submit order"}
              </Button>
            </div>

            {preview && (
              <div
                style={{
                  marginTop: 20,
                  paddingTop: 16,
                  borderTop: "1px solid rgba(var(--border), 0.4)",
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 12, color: "rgb(var(--muted))", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 11 }}>
                  Preview
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ color: "rgb(var(--muted))" }}>Subtotal</div>
                  <div style={{ fontWeight: 600 }}>
                    {money(preview.subtotal ?? totals.subtotal, preview.currency ?? totals.currency)}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ color: "rgb(var(--muted))" }}>Total</div>
                  <div style={{ fontWeight: 700 }}>
                    {money(preview.total ?? totals.subtotal, preview.currency ?? totals.currency)}
                  </div>
                </div>

                {preview.warnings?.length ? (
                  <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(var(--danger), 0.08)", border: "1px solid rgba(var(--danger), 0.3)" }}>
                    <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 12, color: "rgb(255, 200, 200)" }}>Warnings</div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "rgb(255, 180, 180)" }}>
                      {preview.warnings.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </Card>
        </div>
      )}

      <style jsx>{`
        .checkout-grid {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 20px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .checkout-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
