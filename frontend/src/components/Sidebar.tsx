"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Icon } from "./Icon";
import { Logo } from "./ui";
import { ThemeToggle } from "./ThemeToggle";

const items = [
  { href: "/invoices", label: "Invoices", icon: "invoice" },
  { href: "/clients", label: "Clients", icon: "clients" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export function Sidebar() {
  const path = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const initial = (user?.name || "G").charAt(0).toUpperCase();
  return (
    <aside className="side">
      <Link href="/invoices" style={{ textDecoration: "none", padding: "4px 8px" }}><Logo /></Link>
      <nav className="nav" aria-label="Main">
        {items.map((it) => {
          const active = path.startsWith(it.href);
          return (
            <Link key={it.href} href={it.href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
              <Icon name={it.icon} size={18} />{it.label}
            </Link>
          );
        })}
      </nav>
      <div style={{ flex: 1 }} />
      <div className="sidefoot" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button className="btn btn-secondary" style={{ justifyContent: "space-between", fontWeight: 400, color: "var(--fg-2)", width: "100%", padding: "0 12px" }}
          onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Icon name="search" />Search or jump to</span>
          <span style={{ display: "inline-flex", gap: 4 }}><span className="kbd">⌘</span><span className="kbd">K</span></span>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", fontSize: 13, color: "var(--fg-3)" }}>
          <span style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--accent-soft)", color: "var(--accent)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11 }}>{initial}</span>
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.is_guest ? "Guest · not synced" : user?.name}</span>
          <ThemeToggle />
          <button className="btn btn-icon" aria-label="Sign out" title="Sign out" onClick={() => { signOut(); router.push("/"); }}><Icon name="logout" size={16} /></button>
        </div>
      </div>
    </aside>
  );
}
