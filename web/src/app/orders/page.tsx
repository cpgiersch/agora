"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { getGuestSessionId } from "@/lib/session";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type Order = {
  id?: string;
  order_id?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  total?: number;
  subtotal?: number;
  currency?: string;
  items?: Array<{
    title?: string;
    quantity?: number;
    unit_price?: number;
    line_total?: number;
  }>;
};

type OrdersResponse =
  | { orders: Order[] }
  | Order[];

function normalizeOrders(resp: OrdersResponse): Order[] {
  if (Array.isArray(resp)) return resp;
  return resp.orders ?? [];
}

function prettyDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function money(n?: number, currency?: string) {
  if (n == null) return "—";
  return `${n.toFixed(2)} ${currency ?? "USD"}`;
}

export default function OrdersPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSessionId(getGuestSessionId());
  }, []);

  async function loadOrders(activeSessionId: string) {
    setLoading(true);
    setError(null);
    try {
      const resp = await apiGet<OrdersResponse>("/orders", {
        headers: { "x-session-id": activeSessionId },
      });
      setOrders(normalizeOrders(resp));
    } catch (e: any) {
      setOrders([]);
      setError(e?.message ?? "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!sessionId) return;
    loadOrders(sessionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

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
            Orders
          </h2>
          <div style={{ fontSize: 13, color: "rgb(var(--muted))" }}>
            Order history for your current session.
          </div>
        </div>

        <Button
          variant="ghost"
          onClick={() => sessionId && loadOrders(sessionId)}
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

      <div style={{ marginTop: 4 }}>
        {loading ? (
          <Card style={{ padding: 24 }}>
            <div style={{ color: "rgb(var(--muted))" }}>Loading…</div>
          </Card>
        ) : orders.length === 0 ? (
          <Card style={{ padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📦</div>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>No orders yet</div>
            <div style={{ color: "rgb(var(--muted))", fontSize: 14 }}>
              Place an order from Checkout and it will appear here.
            </div>
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {orders.map((o, idx) => {
              const oid = o.order_id ?? o.id ?? `order-${idx}`;
              const currency = o.currency ?? "USD";

              return (
                <Card key={oid} style={{ padding: 24 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 16,
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      marginBottom: o.items?.length ? 20 : 0,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>
                        Order{" "}
                        <code style={{ fontFamily: "var(--font-geist-mono)", fontSize: 13 }}>{oid}</code>
                      </div>
                      <div style={{ marginTop: 8, fontSize: 13, color: "rgb(var(--muted))", display: "flex", gap: 16, flexWrap: "wrap" }}>
                        <span>
                          Status:{" "}
                          <span
                            style={{
                              color: o.status === "completed" ? "rgb(var(--accent))" : "rgb(var(--text))",
                              fontWeight: 500,
                            }}
                          >
                            {o.status ?? "—"}
                          </span>
                        </span>
                        <span>Created: {prettyDate(o.created_at)}</span>
                      </div>
                    </div>

                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 18 }}>
                        {o.total != null ? money(o.total, currency) : money(o.subtotal, currency)}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 12, color: "rgb(var(--muted))" }}>
                        {o.total != null ? "Total" : "Subtotal"}
                      </div>
                    </div>
                  </div>

                  {o.items?.length ? (
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: "rgb(var(--muted))",
                          marginBottom: 12,
                        }}
                      >
                        Items
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {o.items.slice(0, 5).map((it, i) => (
                          <div
                            key={i}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 16,
                              padding: "12px 14px",
                              borderRadius: 10,
                              border: "1px solid rgba(var(--border), 0.45)",
                              background: "rgba(var(--border), 0.06)",
                              fontSize: 13,
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 500 }}>{it.title ?? "Item"}</div>
                              <div style={{ marginTop: 4, color: "rgb(var(--muted))" }}>
                                Qty {it.quantity ?? "—"}
                              </div>
                            </div>
                            <div style={{ fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
                              {it.line_total != null
                                ? money(it.line_total, currency)
                                : it.unit_price != null
                                ? money(it.unit_price, currency)
                                : "—"}
                            </div>
                          </div>
                        ))}
                        {o.items.length > 5 && (
                          <div style={{ fontSize: 12, color: "rgb(var(--muted))", paddingLeft: 2 }}>
                            +{o.items.length - 5} more items
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: "rgb(var(--muted))" }}>
                      No item details available for this order.
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
