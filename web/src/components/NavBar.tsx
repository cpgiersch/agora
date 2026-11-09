"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavBarProps = {
  cartCount?: number;
};

function NavItem({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        padding: "8px 14px",
        borderRadius: 8,
        textDecoration: "none",
        color: active ? "rgb(var(--text))" : "rgb(var(--muted))",
        background: active ? "rgba(var(--border), 0.25)" : "transparent",
        fontWeight: 500,
        fontSize: 14,
        transition: "color 150ms ease, background 150ms ease",
      }}
    >
      {label}
    </Link>
  );
}

export function NavBar({ cartCount = 0 }: NavBarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        borderBottom: "1px solid rgba(var(--border), 0.4)",
        background: "rgba(var(--bg), 0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        marginBottom: 32,
      }}
    >
      <div
        className="agora-nav-inner"
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 24px",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        {/* Brand */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            color: "rgb(var(--text))",
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "rgb(var(--primary))",
              boxShadow: "0 0 16px rgba(99, 102, 241, 0.5)",
            }}
          />
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.01em" }}>Agora</span>
        </Link>

        {/* Links */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <NavItem href="/" label="Search" active={isActive("/")} />
          <NavItem href="/cart" label="Cart" active={isActive("/cart")} />
          <NavItem href="/checkout" label="Checkout" active={isActive("/checkout")} />
          <NavItem href="/orders" label="Orders" active={isActive("/orders")} />
        </div>

        {/* Cart icon */}
        <Link
          href="/cart"
          aria-label="Open cart"
          style={{
            position: "relative",
            width: 40,
            height: 40,
            borderRadius: 10,
            border: "1px solid rgba(var(--border), 0.55)",
            background: "rgba(var(--border), 0.12)",
            color: "rgb(var(--text))",
            display: "grid",
            placeItems: "center",
            textDecoration: "none",
          }}
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
          </svg>

          {cartCount > 0 && (
            <div
              style={{
                position: "absolute",
                top: -5,
                right: -5,
                minWidth: 18,
                height: 18,
                padding: "0 5px",
                borderRadius: 999,
                background: "rgb(var(--primary))",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {cartCount}
            </div>
          )}
        </Link>
      </div>
    </nav>
  );
}
