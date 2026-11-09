"use client";

import { Product, formatPrice, formatCheckedAt } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { useState } from "react";

export function ProductCard({
  product,
  onAdd,
  disabled,
}: {
  product: Product;
  onAdd: (p: Product) => void;
  disabled?: boolean;
}) {
  const p = product;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        border: `1px solid rgba(var(--border), ${hovered ? "0.9" : "0.55"})`,
        background: hovered ? "rgb(var(--panel-alt))" : "rgb(var(--panel))",
        borderRadius: 14,
        overflow: "hidden",
        transition: "transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease, background 200ms ease",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hovered ? "0 16px 40px rgba(0,0,0,0.5)" : "0 2px 12px rgba(0,0,0,0.3)",
      }}
    >
      {/* Image */}
      <div
        style={{
          background: "rgba(0,0,0,0.3)",
          height: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {p.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.image_url}
            alt={p.title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              transition: "transform 300ms ease",
              transform: hovered ? "scale(1.04)" : "scale(1)",
            }}
          />
        ) : (
          <div style={{ opacity: 0.4, fontSize: 13, color: "rgb(var(--muted))" }}>No image</div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.4, color: "rgb(var(--text))" }}>
            {p.title}
          </div>
          {p.brand && (
            <div style={{ fontSize: 12, color: "rgb(var(--muted))", marginTop: 4 }}>{p.brand}</div>
          )}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {p.retailer_domain && (
            <span className="agora-chip" title="Retailer for this listing">{p.retailer_domain}</span>
          )}
          {p.availability === "InStock" && (
            <span
              className="agora-chip agora-chip--ok"
              title="Based on the latest catalog response, not live checkout inventory"
            >
              In stock{formatCheckedAt(p.stock_checked_at) ? ` as of ${formatCheckedAt(p.stock_checked_at)}` : ""}
            </span>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "rgb(var(--text))" }}>
            {formatPrice(p.price, p.currency)}
          </div>
          <Button onClick={() => onAdd(p)} disabled={!!disabled} size="sm" aria-label={`Add ${p.title} to cart`}>
            Add to cart
          </Button>
        </div>

        <a
          href={p.product_url}
          target="_blank"
          rel="noreferrer"
          aria-label={`View ${p.title} on ${p.retailer_domain ?? "retailer site"} (opens in new tab)`}
          style={{
            fontSize: 12,
            color: "rgb(var(--primary-light, 129 140 248))",
            borderTop: "1px solid rgba(var(--border), 0.35)",
            paddingTop: 12,
            display: "inline-block",
          }}
        >
          View product →
        </a>
      </div>
    </div>
  );
}
