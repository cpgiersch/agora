"use client";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Props = {
  q: string;
  setQ: (v: string) => void;
  limit: number;
  setLimit: (v: number) => void;
  loading: boolean;
  onSearch: () => void;
  onClear: () => void;
  error: string | null;
};

export function SearchBar({
  q,
  setQ,
  limit,
  setLimit,
  loading,
  onSearch,
  onClear,
  error,
}: Props) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "stretch",
        }}
      >
        {/* Search input */}
        <div style={{ flex: 1, position: "relative" }}>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSearch();
            }}
            placeholder='Search products (e.g. "running shoes")'
            aria-label="Search products"
            style={{ paddingRight: 52 }}
          />

          {/* Search icon button */}
          <button
            onClick={onSearch}
            disabled={loading}
            aria-label="Search"
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              width: 36,
              height: 36,
              borderRadius: 8,
              border: "none",
              background: "rgb(var(--primary))",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              transition: "background 150ms ease",
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>

        {/* Limit */}
        <div style={{ width: 110, flexShrink: 0 }}>
          <Input
            type="number"
            aria-label="Number of results (1 to 30)"
            min={1}
            max={30}
            value={limit}
            onChange={(e) => setLimit(Math.min(30, Math.max(1, Number(e.target.value) || 12)))}
          />
        </div>

        {/* Clear */}
        <Button variant="ghost" onClick={onClear} style={{ flexShrink: 0 }}>
          Clear
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            marginTop: 12,
            padding: "12px 16px",
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
    </div>
  );
}
