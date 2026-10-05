"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Client } from "@/lib/types";
import { money } from "@/lib/invoice";
import { Icon } from "@/components/Icon";
import { Field, Input, Skeleton, Textarea } from "@/components/ui";
import { useToast } from "@/components/Toast";

type Form = Pick<Client, "name" | "attention" | "address" | "email">;
const empty: Form = { name: "", attention: "", address: "", email: "" };

export default function ClientsPage() {
  const toast = useToast();
  const [clients, setClients] = useState<Client[] | null>(null);
  const [sel, setSel] = useState<Client | "new" | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [busy, setBusy] = useState(false);

  const load = () => api.clients.list().then(setClients).catch((e) => toast.push({ kind: "error", text: e.message }));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const open = (c: Client | "new") => { setSel(c); setForm(c === "new" ? empty : { name: c.name, attention: c.attention, address: c.address, email: c.email }); };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      if (sel === "new") await api.clients.create(form); else if (sel) await api.clients.update(sel.id, form);
      toast.push({ kind: "success", text: sel === "new" ? "Client added" : "Client saved" });
      setSel(null); await load();
    } catch (err) { toast.push({ kind: "error", text: (err as Error).message }); } finally { setBusy(false); }
  };
  const archive = async () => {
    if (!sel || sel === "new") return;
    await api.clients.archive(sel.id); toast.push({ kind: "info", text: `${sel.name} archived` }); setSel(null); await load();
  };

  return (
    <main className="main">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div><h1 className="display" style={{ margin: 0, fontSize: 44 }}>Clients</h1><p style={{ margin: "8px 0 0", color: "var(--fg-3)" }}>{clients ? `${clients.length} client${clients.length === 1 ? "" : "s"}` : "…"} · billed to on the PDF, exactly as written here</p></div>
        <button className="btn btn-primary" onClick={() => open("new")}><Icon name="plus" strokeWidth={2} />New client</button>
      </div>
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div className="card" style={{ flex: "1 1 520px", minWidth: 0, overflow: "hidden" }}>
          <div className="row" style={{ gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1.2fr) 90px 130px", height: 40, borderTop: 0, fontSize: 12, color: "var(--fg-3)", fontWeight: 600 }}>
            <span>Client</span><span className="hide-m">Contact</span><span className="hide-m" style={{ textAlign: "right" }}>Invoices</span><span style={{ textAlign: "right" }}>Outstanding</span>
          </div>
          {!clients && [0, 1, 2].map((i) => <div key={i} className="row" style={{ gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1.2fr) 90px 130px" }}><Skeleton w="60%" /><Skeleton w="50%" /><Skeleton w={30} style={{ justifySelf: "end" }} /><Skeleton w={80} style={{ justifySelf: "end" }} /></div>)}
          {clients?.map((c) => (
            <button key={c.id} className="row" onClick={() => open(c)} aria-pressed={sel !== "new" && sel?.id === c.id}
              style={{ gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1.2fr) 90px 130px", height: 60, width: "100%", textAlign: "left", background: sel !== "new" && sel?.id === c.id ? "var(--accent-soft)" : undefined, border: 0, borderTop: "1px solid var(--line)", cursor: "pointer" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <span style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--sunken)", color: "var(--fg-2)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flex: "0 0 32px" }}>{c.name.charAt(0)}</span>
                <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}><span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span><span className="help" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.address.split("\n").pop()}</span></span>
              </span>
              <span className="hide-m" style={{ color: "var(--fg-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.attention || c.email || "—"}</span>
              <span className="num hide-m" style={{ textAlign: "right", color: "var(--fg-2)" }}>{c.invoice_count}</span>
              <span className="num" style={{ textAlign: "right", fontWeight: 600 }}>{money(c.outstanding)}</span>
            </button>
          ))}
          {clients && clients.length === 0 && <div className="help" style={{ padding: 32, textAlign: "center" }}>No clients yet. Add the first one and it becomes the default for new invoices.</div>}
        </div>

        {sel && (
          <form onSubmit={submit} className="card" aria-label="Client details" style={{ flex: "0 0 400px", borderRadius: 16, boxShadow: "var(--sh-2)", padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <h2 className="display" style={{ margin: 0, fontSize: 24 }}>{sel === "new" ? "New client" : sel.name}</h2>
              <button type="button" className="btn btn-icon" aria-label="Close details" onClick={() => setSel(null)}><Icon name="close" strokeWidth={2} /></button>
            </div>
            {sel !== "new" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                <div style={{ background: "var(--sunken)", borderRadius: 10, padding: "12px 14px" }}><span className="help">Outstanding</span><div className="num" style={{ fontSize: 18, fontWeight: 600 }}>{money(sel.outstanding)}</div></div>
                <div style={{ background: "var(--sunken)", borderRadius: 10, padding: "12px 14px" }}><span className="help">Invoices</span><div className="num" style={{ fontSize: 18, fontWeight: 600 }}>{sel.invoice_count}</div></div>
              </div>
            )}
            <Field label="Company name" htmlFor="c-name"><Input id="c-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label={<>Attention line <span style={{ fontWeight: 400, color: "var(--fg-3)" }}>· optional</span></>} htmlFor="c-attn"><Input id="c-attn" value={form.attention} onChange={(e) => setForm({ ...form, attention: e.target.value })} /></Field>
            <Field label="Address" htmlFor="c-addr" help="Printed under the name, one line per row, exactly as written. Add the email here too if it should print."><Textarea id="c-addr" rows={4} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
            <Field label={<>Email <span style={{ fontWeight: 400, color: "var(--fg-3)" }}>· for your records</span></>} htmlFor="c-email"><Input id="c-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, paddingTop: 8, borderTop: "1px solid var(--line)" }}>
              {sel !== "new" ? <button type="button" className="btn btn-danger" onClick={archive}>Archive</button> : <span />}
              <div style={{ display: "flex", gap: 10 }}><button type="button" className="btn btn-ghost" onClick={() => setSel(null)}>Cancel</button><button className="btn btn-primary" disabled={busy}>{sel === "new" ? "Add client" : "Save client"}</button></div>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
