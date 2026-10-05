"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { InvoiceSummary } from "@/lib/types";
import { money } from "@/lib/invoice";
import { Icon } from "./Icon";

interface Cmd { id: string; label: string; icon: string; kbd?: string; run: () => void; group: "Actions" | "Invoices" }

/* ⌘K from anywhere in the app. Lists actions first, then invoices matched by number or client. */
export function CommandPalette({ onDownload }: { onDownload?: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQ(""); setSel(0);
    api.invoices.list().then((d) => setInvoices(d.invoices)).catch(() => {});
  }, [open]);

  const cmds = useMemo<Cmd[]>(() => {
    const go = (p: string) => () => { setOpen(false); router.push(p); };
    const actions: Cmd[] = [
      { id: "new", label: "New invoice", icon: "plus", kbd: "N", group: "Actions", run: async () => { setOpen(false); const inv = await api.invoices.create(); router.push(`/invoices/${inv.id}`); } },
      { id: "clients", label: "Go to Clients", icon: "clients", kbd: "G C", group: "Actions", run: go("/clients") },
      { id: "settings", label: "Go to Settings", icon: "settings", kbd: "G S", group: "Actions", run: go("/settings") },
      { id: "home", label: "Go to Invoices", icon: "invoice", kbd: "G I", group: "Actions", run: go("/invoices") },
    ];
    if (onDownload) actions.splice(1, 0, { id: "dl", label: "Download current PDF", icon: "download", kbd: "⌘ D", group: "Actions", run: () => { setOpen(false); onDownload(); } });
    const rows: Cmd[] = invoices.map((i) => ({ id: `inv${i.id}`, label: `${i.number} · ${i.client_name ?? "No client"} · ${money(i.total, i.currency)}`, icon: "invoice", group: "Invoices", run: go(`/invoices/${i.id}`) }));
    const ql = q.trim().toLowerCase();
    return [...actions, ...rows].filter((c) => !ql || c.label.toLowerCase().includes(ql));
  }, [q, invoices, router, onDownload]);

  if (!open) return null;
  const run = (i: number) => cmds[i]?.run();
  return (
    <div className="overlay" onClick={() => setOpen(false)} style={{ alignItems: "flex-start" }}>
      <div className="palette glass" role="dialog" aria-label="Command palette" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, height: 52, padding: "0 16px", borderBottom: "1px solid var(--line)" }}>
          <Icon name="search" size={16} style={{ color: "var(--fg-3)" }} />
          <label className="sr-only" htmlFor="cmdk">Search commands and invoices</label>
          <input id="cmdk" autoFocus value={q} onChange={(e) => { setQ(e.target.value); setSel(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, cmds.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
              if (e.key === "Enter") run(sel);
            }}
            placeholder="Type a command, number or client" style={{ flex: 1, background: "none", border: 0, outline: "none", fontSize: 15 }} />
          <span className="kbd">Esc</span>
        </div>
        <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 2, maxHeight: 360, overflow: "auto" }}>
          {(["Actions", "Invoices"] as const).map((g) => {
            const items = cmds.filter((c) => c.group === g);
            if (!items.length) return null;
            return (
              <div key={g}>
                <span className="help" style={{ display: "block", padding: "6px 10px 4px", fontWeight: 600 }}>{g}</span>
                {items.map((c) => {
                  const i = cmds.indexOf(c);
                  return (
                    <button key={c.id} className={`palette-item ${i === sel ? "on" : ""}`} onMouseEnter={() => setSel(i)} onClick={() => run(i)}>
                      <Icon name={c.icon} size={16} /><span style={{ flex: 1 }}>{c.label}</span>
                      {c.kbd && <span style={{ display: "inline-flex", gap: 4 }}>{c.kbd.split(" ").map((k) => <span key={k} className="kbd">{k}</span>)}</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
          {!cmds.length && <div className="help" style={{ padding: 16, textAlign: "center" }}>Nothing matches “{q}”.</div>}
        </div>
        <div style={{ display: "flex", gap: 14, padding: "10px 16px", borderTop: "1px solid var(--line)", fontSize: 12, color: "var(--fg-3)" }}>
          <span><span className="kbd">↑</span> <span className="kbd">↓</span> move</span><span><span className="kbd">↵</span> run</span>
        </div>
      </div>
    </div>
  );
}
