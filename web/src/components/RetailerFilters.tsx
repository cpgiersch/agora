"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";

const DOMAIN_RE = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/;

export function normalizeDomain(raw: string): string | null {
  let v = raw.trim().toLowerCase();
  if (!v) return null;
  v = v.replace(/^[a-z]+:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0];
  return DOMAIN_RE.test(v) ? v : null;
}

export function RetailerFilters({
  policyDomains,
  policyExplanation,
  policyError,
  extraDomains,
  setExtraDomains,
}: {
  policyDomains: string[];
  policyExplanation: string | null;
  policyError: string | null;
  extraDomains: string[];
  setExtraDomains: (d: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const panelId = useId();
  const inputId = useId();

  function add() {
    if (extraDomains.length >= 30) {
      setMsg("You can add up to 30 extra retailer domains.");
      return;
    }
    const d = normalizeDomain(draft);
    if (!d) {
      setMsg("Enter a domain like example.com");
      return;
    }
    if (policyDomains.includes(d) || extraDomains.includes(d)) {
      setMsg(`${d} is already excluded`);
      return;
    }
    setExtraDomains([...extraDomains, d]);
    setDraft("");
    setMsg(`${d} added. It applies to your next search.`);
  }

  return (
    <div
      style={{
        marginTop: 12,
        border: "1px solid rgba(var(--border), 0.45)",
        borderRadius: 12,
        background: "rgba(var(--panel), 0.6)",
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        data-testid="button-toggle-retailer-filters"
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          padding: "10px 14px",
          background: "none",
          border: "none",
          color: "rgb(var(--text))",
          cursor: "pointer",
          fontSize: 13,
          textAlign: "left",
          borderRadius: 12,
        }}
      >
        <span>
          <strong style={{ fontWeight: 600 }}>Retailer exclusions</strong>
          <span style={{ color: "rgb(var(--muted))" }}>
            {" "}
            · {policyDomains.length} default{extraDomains.length ? ` + ${extraDomains.length} yours` : ""} · in-stock only
          </span>
        </span>
        <span aria-hidden style={{ transition: "transform 200ms", transform: open ? "rotate(180deg)" : "none" }}>
          ▾
        </span>
      </button>

      {open && (
        <div id={panelId} style={{ padding: "4px 14px 14px", fontSize: 13 }}>
          <p style={{ margin: "0 0 10px", color: "rgb(var(--muted))", lineHeight: 1.5 }}>
            {policyExplanation ??
              "Products with any indexed offer from an excluded retailer are removed entirely, and only listings reported in stock are shown."}{" "}
            These filters always apply and cannot be turned off.
          </p>
          {policyError && (
            <p role="status" style={{ margin: "0 0 10px", color: "rgb(255, 200, 200)" }}>
              Could not load the default policy. The server still enforces it.
            </p>
          )}

          <div style={{ fontSize: 12, color: "rgb(var(--muted))", marginBottom: 6 }}>Always excluded</div>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px", display: "flex", flexWrap: "wrap", gap: 6 }}>
            {policyDomains.map((d) => (
              <li key={d} className="agora-chip agora-chip--block">{d}</li>
            ))}
          </ul>

          <div style={{ fontSize: 12, color: "rgb(var(--muted))", marginBottom: 6 }}>Your exclusions (saved on this device)</div>
          {extraDomains.length === 0 ? (
            <div style={{ marginBottom: 10, color: "rgb(var(--muted))" }}>None yet.</div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 10px", display: "flex", flexWrap: "wrap", gap: 6 }}>
              {extraDomains.map((d) => (
                <li key={d} className="agora-chip agora-chip--block">
                  {d}
                  <button
                    type="button"
                    aria-label={`Remove ${d} from exclusions`}
                    data-testid={`button-remove-domain-${d}`}
                    onClick={() => {
                      setExtraDomains(extraDomains.filter((x) => x !== d));
                      setMsg(`${d} removed. It applies to your next search.`);
                    }}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
            style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
          >
            <label htmlFor={inputId} className="sr-only">Retailer domain to exclude</label>
            <input
              id={inputId}
              className="agora-text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="example.com"
              data-testid="input-exclude-domain"
              style={{ flex: "1 1 180px" }}
            />
            <Button type="submit" size="sm" variant="ghost" data-testid="button-add-domain">
              Exclude retailer
            </Button>
          </form>
          <div role="status" aria-live="polite" style={{ marginTop: 8, fontSize: 12, color: "rgb(var(--muted))", minHeight: 16 }}>
            {msg}
          </div>
        </div>
      )}
    </div>
  );
}
