"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, type InvoiceSaveBody } from "@/lib/api";
import type { Client, Invoice, LineItem, Settings } from "@/lib/types";
import { addDays, money, newKey, num, toIso, totals, validate, withKeys, type Draft } from "@/lib/invoice";
import { Icon } from "@/components/Icon";
import { Badge, Dialog, Field, Input, Skeleton } from "@/components/ui";
import { LineItems } from "@/components/LineItems";
import { Desk, PdfSheet } from "@/components/PdfSheet";
import { CommandPalette } from "@/components/CommandPalette";
import { useCountUp } from "@/components/CountUp";
import { useToast } from "@/components/Toast";
import { ThemeToggle } from "@/components/ThemeToggle";

const DEBOUNCE = 500;   // preview re-render
const AUTOSAVE = 1400;  // PUT to the API after the last keystroke

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [saved, setSaved] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [hl, setHl] = useState("");
  const [dl, setDl] = useState<"idle" | "prep" | "done">("idle");
  const [pct, setPct] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const timers = useRef<{ preview?: number; save?: number }>({});
  const latest = useRef<Draft | null>(null);
  latest.current = draft;

  useEffect(() => {
    Promise.all([api.invoices.get(Number(id)), api.settings.get(), api.clients.list()])
      .then(([inv, s, cs]) => { setDraft(withKeys(inv)); setSettings(s); setClients(cs); })
      .catch((e) => { toast.push({ kind: "error", text: e.message }); router.replace("/invoices"); });
  }, [id, router, toast]);

  /* ---- persistence ------------------------------------------------------ */
  const save = useCallback(async () => {
    const d = latest.current; if (!d) return;
    const body: InvoiceSaveBody = {
      number: d.number, client_id: d.client_id, status: d.status, issued_on: d.issued_on, due_on: d.due_on, due_is_manual: d.due_is_manual,
      payment_link: d.payment_link, tax_rate: d.tax_rate, notes: d.notes,
      items: d.items.map(({ key: _k, ...it }) => ({ ...it, quantity: num(it.quantity), unit_price: num(it.unit_price) })),
    };
    try {
      const inv = await api.invoices.save(d.id, body);
      // keep the user's keys, adopt server ids so later saves update rather than recreate
      setDraft((cur) => cur ? { ...cur, items: cur.items.map((it, i) => ({ ...it, id: inv.items[i]?.id ?? it.id })) } : cur);
      setSaved(true);
    } catch (e) {
      toast.push({ kind: "error", text: `Couldn't save the draft — ${(e as Error).message}`, action: { label: "Retry", onClick: save } });
    }
  }, [toast]);

  const touch = useCallback((region: string) => {
    setUpdating(true); setSaved(false); setHl(region);
    window.clearTimeout(timers.current.preview); window.clearTimeout(timers.current.save);
    timers.current.preview = window.setTimeout(() => { setUpdating(false); setHl(""); }, DEBOUNCE);
    timers.current.save = window.setTimeout(save, AUTOSAVE);
  }, [save]);

  const patch = useCallback((p: Partial<Draft> | ((d: Draft) => Partial<Draft>), region = "header") => {
    setDraft((d) => d ? { ...d, ...(typeof p === "function" ? p(d) : p) } : d);
    touch(region);
  }, [touch]);

  /* ---- items ------------------------------------------------------------ */
  const changeItem = (key: string, p: Partial<LineItem>, region = "items") => patch((d) => ({ items: d.items.map((it) => it.key === key ? { ...it, ...p } : it) }), region);
  const addItem = () => patch((d) => ({ items: [...d.items, { key: newKey(), description: "", work_from: d.issued_on, work_to: d.issued_on, quantity: 1, unit_price: 0 }] }), "items");
  const removeItem = (key: string) => {
    const d = latest.current!; const idx = d.items.findIndex((i) => i.key === key); const item = d.items[idx];
    patch({ items: d.items.filter((i) => i.key !== key) }, "items");
    toast.push({ kind: "info", text: "Line item removed", action: { label: "Undo", onClick: () => patch((cur) => { const items = cur.items.slice(); items.splice(Math.min(idx, items.length), 0, item); return { items }; }, "items") } });
  };

  /* ---- download --------------------------------------------------------- */
  const download = useCallback(async () => {
    const d = latest.current; if (!d || dl !== "idle") return;
    setDl("prep"); setPct(0);
    await save();
    const tick = window.setInterval(() => setPct((p) => Math.min(90, p + 9)), 80);
    try {
      const blob = await api.invoices.pdf(d.id);
      window.clearInterval(tick); setPct(100);
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), { href: url, download: `${d.number || "invoice"}.pdf` });
      a.click(); URL.revokeObjectURL(url);
      setDl("done");
      toast.push({ kind: "success", text: `${d.number}.pdf downloaded` });
      window.setTimeout(() => { setDl("idle"); setPct(0); }, 1600);
    } catch (e) {
      window.clearInterval(tick); setDl("idle"); setPct(0);
      toast.push({ kind: "error", text: `Couldn't build the PDF — ${(e as Error).message}` });
    }
  }, [dl, save, toast]);

  /* Opens the real PDF in a new tab (fetched with the token, so the API route stays protected). */
  const openPdf = useCallback(async () => {
    const d = latest.current; if (!d) return;
    const w = window.open("", "_blank");
    try {
      await save();
      const url = URL.createObjectURL(await api.invoices.pdf(d.id, true));
      if (w) w.location.href = url; else window.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      w?.close();
      toast.push({ kind: "error", text: `Couldn't build the PDF — ${(e as Error).message}` });
    }
  }, [save, toast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") { e.preventDefault(); download(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [download]);

  const newInvoice = async () => {
    setConfirm(false);
    await save();
    const inv = await api.invoices.create();
    router.push(`/invoices/${inv.id}`);
    setDraft(withKeys(inv));
  };

  /* ---- derived ---------------------------------------------------------- */
  const v = useMemo(() => draft ? validate(draft) : null, [draft]);
  const t = useMemo(() => draft ? totals(draft.items, draft.tax_rate) : { subtotal: 0, tax: 0, total: 0 }, [draft]);
  const shownTotal = useCountUp(t.total);
  const client = useMemo(() => clients.find((c) => c.id === draft?.client_id) ?? null, [clients, draft?.client_id]);
  const terms = settings?.payment_terms_days ?? 7;

  if (!draft || !v) {
    return (
      <div className="editor">
        <header className="editor-top"><Skeleton w={40} h={40} r={8} /><Skeleton w={120} h={20} /><div style={{ flex: 1 }} /><Skeleton w={110} h={40} r={10} /><Skeleton w={156} h={40} r={10} /></header>
        <div className="editor-body"><section className="panel"><div className="panel-scroll"><Skeleton w={120} h={28} /><Skeleton h={40} r={8} /><Skeleton h={160} r={14} /><Skeleton h={160} r={14} /></div></section><section className="desk"><Skeleton w={480} h={679} r={3} /></section></div>
      </div>
    );
  }

  return (
    <div className="editor">
      <CommandPalette onDownload={download} />
      <header className="editor-top">
        <Link href="/invoices" className="btn btn-icon" aria-label="Back to invoices"><Icon name="chevronLeft" size={18} /></Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <span className="num" style={{ fontSize: 18, fontWeight: 600 }}>{draft.number || "Untitled"}</span>
          <select className="select" aria-label="Status" value={draft.status} style={{ width: "auto", height: 28, padding: "0 8px", fontSize: 12, borderRadius: 999 }}
            onChange={async (e) => { const inv = await api.invoices.setStatus(draft.id, e.target.value); setDraft((d) => d ? { ...d, status: inv.status } : d); }}>
            {(["draft", "sent", "paid", "overdue"] as const).map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--fg-3)" }}>
          {saved ? <><Icon name="check" size={14} strokeWidth={2} />Saved</> : <><span className="dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--fg-3)" }} />Saving…</>}
        </div>
        <ThemeToggle />
        <button className="btn btn-secondary" onClick={() => setConfirm(true)}>New invoice</button>
        <button className="btn btn-primary" onClick={download} aria-live="polite" style={{ minWidth: 156, position: "relative", overflow: "hidden", padding: "0 18px" }}>
          {dl === "idle" && <><Icon name="download" strokeWidth={2} /><span>Download PDF</span></>}
          {dl === "prep" && <><span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: "rgba(255,255,255,.26)", transition: "width 90ms linear" }} /><span className="num" style={{ position: "relative" }}>Preparing… {pct}%</span></>}
          {dl === "done" && <><Icon name="check" strokeWidth={2.2} /><span>Downloaded</span></>}
        </button>
      </header>

      <div className="editor-body">
        <section className="panel" aria-label="Invoice fields">
          <div className="panel-scroll">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <h2>Invoice</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14, alignItems: "start" }}>
                <Field label="Invoice number" htmlFor="inv-no" warning={v.numberEmpty && "Add a number so this invoice can be filed."}>
                  <Input id="inv-no" className="num" invalid={v.numberEmpty} value={draft.number} onChange={(e) => patch({ number: e.target.value })} autoComplete="off" />
                </Field>
                <Field label="Date issued" htmlFor="inv-issued">
                  <Input id="inv-issued" className="num" type="date" value={draft.issued_on} onChange={(e) => patch((d) => ({ issued_on: e.target.value, due_on: d.due_is_manual ? d.due_on : addDays(e.target.value, terms) }))} />
                </Field>
                <Field label="Due date" htmlFor="inv-due" warning={v.dueBefore && "Due date is before the issue date."}
                  help={draft.due_is_manual
                    ? <span style={{ display: "inline-flex", gap: 6 }}>Set by hand · <button className="btn-link" style={{ fontSize: 12 }} onClick={() => patch((d) => ({ due_on: addDays(d.issued_on, terms), due_is_manual: false }))}>Follow issue date</button></span>
                    : <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="link" size={14} strokeWidth={2} />Issued + {terms} days</span>}>
                  <Input id="inv-due" className="num" type="date" invalid={v.dueBefore} value={draft.due_on} onChange={(e) => patch({ due_on: e.target.value, due_is_manual: true })} />
                </Field>
              </div>
              <Field label="Client" htmlFor="inv-client" help={<>Printed under “To”. <Link href="/clients" style={{ color: "var(--accent)" }}>Manage clients</Link></>}>
                <select id="inv-client" className="select" value={draft.client_id ?? ""} onChange={(e) => patch({ client_id: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">No client</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                <h2>Line items</h2><span className="help">Drag the handle to reorder</span>
              </div>
              <LineItems items={draft.items} currency={draft.currency} periodErr={v.periodErr} onChange={changeItem} onRemove={removeItem} onReorder={(items) => patch({ items }, "items")} />
              <button className="btn btn-ghost" onClick={addItem} style={{ alignSelf: "flex-start", padding: "0 12px", marginLeft: -12 }}><Icon name="plus" strokeWidth={2} />Add line item</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <h2>Payment</h2>
              <Field label={<>Payment link <span style={{ fontWeight: 400, color: "var(--fg-3)" }}>· optional</span></>} htmlFor="pay-link"
                warning={v.linkInvalid && "This doesn’t look like a link. It needs to start with https://"} help="Printed as “Pay {total} via link: …”. Leave empty to hide the line.">
                <Input id="pay-link" type="url" className="num" invalid={v.linkInvalid} value={draft.payment_link} placeholder="https://" onChange={(e) => patch({ payment_link: e.target.value }, "pay")} style={{ fontSize: 13 }} />
              </Field>
              <span className="help">Currency, terms, tax and bank details come from <Link href="/settings" style={{ color: "var(--accent)" }}>Settings</Link>.</span>
            </div>
          </div>

          <div className="totals-bar glass">
            <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "var(--fg-2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", width: 200 }}><span>Subtotal</span><span className="num">{money(t.subtotal, draft.currency)}</span></div>
              {draft.tax_rate > 0
                ? <div style={{ display: "flex", justifyContent: "space-between", width: 200 }}><span>Tax {draft.tax_rate}%</span><span className="num">{money(t.tax, draft.currency)}</span></div>
                : <div style={{ width: 200, color: "var(--fg-3)" }}>Tax 0%</div>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
              <span className="lbl">Total payment</span>
              <div className={`num display ${updating ? "pulse" : ""}`} style={{ fontSize: 36, transformOrigin: "right center" }}>{money(shownTotal, draft.currency)}</div>
            </div>
          </div>
        </section>

        <Desk>
          {(tilt) => (
            <>
              <div style={{ position: "absolute", top: 20, left: 24, right: 24, display: "flex", justifyContent: "space-between", alignItems: "center", pointerEvents: "none" }}>
                <div className="glass pill" style={{ height: 28, padding: "0 12px", border: "1px solid var(--line)", color: "var(--fg-2)", boxShadow: "var(--sh-1)" }}>
                  <span className={updating ? "dot" : ""} style={{ width: 7, height: 7, borderRadius: "50%", background: updating ? "var(--accent)" : "var(--paid)" }} />{updating ? "Updating…" : "Live preview"}
                </div>
                <a className="btn btn-secondary glass" style={{ height: 36, fontSize: 13, pointerEvents: "auto" }} href={`/api/invoices/${draft.id}/pdf?inline=true`} target="_blank" rel="noreferrer" onClick={(e) => { e.preventDefault(); openPdf(); }}><Icon name="fullscreen" size={15} strokeWidth={2} />Open PDF</a>
              </div>
              <PdfSheet draft={draft} settings={settings} client={client} updating={updating} highlight={hl} flying={dl === "done"} tilt={tilt} />
            </>
          )}
        </Desk>
      </div>

      {confirm && (
        <Dialog title="Start a new invoice?" onClose={() => setConfirm(false)} actions={<><button className="btn btn-ghost" autoFocus onClick={() => setConfirm(false)}>Cancel</button><button className="btn btn-primary" onClick={newInvoice}>New invoice</button></>}>
          This draft is saved as it is and the next number will be assigned. Nothing is sent.
        </Dialog>
      )}
    </div>
  );
}
