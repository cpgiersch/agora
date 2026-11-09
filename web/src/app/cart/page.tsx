"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiDelete } from "@/lib/api";
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

function fmtMoney(price: number | null | undefined, currency?: string | null) {
  if (price == null) return "—";
  return `${price} ${currency ?? "USD"}`;
}

function getCartItemId(it: CartItem): string | null {
  return it.cart_item_id;
}

export default function CartPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    setSessionId(getGuestSessionId());
  }, []);

  async function loadCart(activeSessionId: string) {
    setLoading(true);
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
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!sessionId) return;
    loadCart(sessionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function removeItem(cartItemId: string) {
    if (!sessionId) return;

    setBusyItemId(cartItemId);
    setError(null);
    try {
      await apiDelete(`/cart/items/${encodeURIComponent(cartItemId)}`, {
        headers: { "x-session-id": sessionId },
      });
      await loadCart(sessionId);
    } catch (e: any) {
      setError(e?.message ?? "Remove failed.");
    } finally {
      setBusyItemId(null);
    }
  }

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
            Cart
          </h2>
          <div style={{ fontSize: 13, color: "rgb(var(--muted))" }}>
            Session:{" "}
            <code suppressHydrationWarning style={{ fontFamily: "var(--font-geist-mono)", fontSize: 12 }}>
              {sessionId ?? "loading..."}
            </code>
          </div>
        </div>

        <Button
          variant="ghost"
          onClick={() => sessionId && loadCart(sessionId)}
          disabled={!sessionId || loading}
        >
          Refresh
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

      <div className="cart-grid">
        {/* Items */}
        <Card style={{ padding: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgb(var(--muted))", marginBottom: 16 }}>
            Items
          </div>

          {!sessionId || loading ? (
            <div style={{ color: "rgb(var(--muted))", padding: "16px 0" }}>Loading…</div>
          ) : !cart || (cart.items?.length ?? 0) === 0 ? (
            <div style={{ color: "rgb(var(--muted))", padding: "16px 0" }}>
              Your cart is empty. Go search for something.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {cart.items.map((it) => {
                const cartItemId = getCartItemId(it);

                return (
                  <div
                    key={cartItemId ?? it.product_id}
                    style={{
                      display: "flex",
                      gap: 16,
                      padding: 16,
                      borderRadius: 12,
                      border: "1px solid rgba(var(--border), 0.5)",
                      background: "rgba(var(--border), 0.06)",
                    }}
                  >
                    {/* image */}
                    <div
                      style={{
                        width: 96,
                        height: 96,
                        borderRadius: 10,
                        border: "1px solid rgba(var(--border), 0.4)",
                        background: "rgba(0,0,0,0.3)",
                        display: "grid",
                        placeItems: "center",
                        overflow: "hidden",
                        flexShrink: 0,
                      }}
                    >
                      {it.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={it.image_url}
                          alt={it.title}
                          style={{ width: "100%", height: "100%", objectFit: "contain" }}
                        />
                      ) : (
                        <div style={{ opacity: 0.4, fontSize: 12, color: "rgb(var(--muted))" }}>No image</div>
                      )}
                    </div>

                    {/* details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, lineHeight: 1.35, fontSize: 15 }}>
                        {it.title}
                      </div>
                      <div style={{ marginTop: 6, fontSize: 13, color: "rgb(var(--muted))" }}>
                        {fmtMoney(it.price, it.currency)} &bull; Qty {it.quantity}
                      </div>
                      <a
                        href={it.product_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "inline-block",
                          marginTop: 8,
                          fontSize: 12,
                          color: "rgb(129, 140, 248)",
                        }}
                      >
                        View product →
                      </a>
                    </div>

                    {/* actions */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: 12,
                        flexShrink: 0,
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 15 }}>
                        {it.price != null
                          ? fmtMoney(it.price * it.quantity, it.currency)
                          : "—"}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (!cartItemId) {
                            setError(
                              "This cart item has no cart_item_id in the API response."
                            );
                            return;
                          }
                          removeItem(cartItemId);
                        }}
                        disabled={!cartItemId || busyItemId === cartItemId}
                      >
                        {busyItemId === cartItemId ? "Removing…" : "Remove"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Summary */}
        <Card style={{ padding: 24, height: "fit-content", position: "sticky", top: 80 }}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgb(var(--muted))", marginBottom: 20 }}>
            Order Summary
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
              {`${totals.subtotal.toFixed(2)} ${totals.currency}`}
            </div>
          </div>

          <Button
            onClick={() => (window.location.href = "/checkout")}
            disabled={!cart || (cart.items?.length ?? 0) === 0}
            style={{ width: "100%" }}
          >
            Proceed to Checkout
          </Button>
        </Card>
      </div>

      <style jsx>{`
        .cart-grid {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 20px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .cart-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
