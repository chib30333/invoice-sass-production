"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Client, Settings } from "@/lib/types";
import { Field, Input, Textarea } from "./ui";

/* Shared by the Settings page and onboarding. `sections` picks which cards render. */
export type Section = "business" | "client" | "bank" | "defaults" | "numbering";

export function useSettingsForm() {
  const [form, setForm] = useState<Settings | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { api.settings.get().then(setForm); api.clients.list().then(setClients); }, []);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => { setForm((f) => f ? { ...f, [k]: v } : f); setDirty(true); };
  const save = async () => {
    if (!form) return;
    const { next_number_preview: _p, ...body } = form;
    const saved = await api.settings.update(body);
    setForm(saved); setDirty(false);
    return saved;
  };
  return { form, set, save, dirty, clients, reload: () => api.settings.get().then((s) => { setForm(s); setDirty(false); }) };
}

export function SettingsSections({ form, set, clients, sections }: { form: Settings; set: ReturnType<typeof useSettingsForm>["set"]; clients: Client[]; sections: Section[] }) {
  const has = (s: Section) => sections.includes(s);
  const card: React.CSSProperties = { padding: 24, display: "flex", flexDirection: "column", gap: 18 };
  const g2: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16 };
  return (
    <>
      {has("business") && (
        <section id="business" className="card" style={card}>
          <Head title="Business profile" sub="Your details, printed at the bottom left of each invoice, one line each." />
          <div style={g2}>
            <Field label="Name or business name" htmlFor="biz-name"><Input id="biz-name" value={form.business_name} onChange={(e) => set("business_name", e.target.value)} /></Field>
            <Field label="Email on invoices" htmlFor="biz-email"><Input id="biz-email" type="email" value={form.business_email} onChange={(e) => set("business_email", e.target.value)} /></Field>
            <div style={{ gridColumn: "1 / -1" }}><Field label="Address" htmlFor="biz-addr" help="One line per row, exactly as it should print."><Textarea id="biz-addr" rows={2} value={form.business_address} onChange={(e) => set("business_address", e.target.value)} /></Field></div>
            <Field label={<>Tax or registration ID <span style={{ fontWeight: 400, color: "var(--fg-3)" }}>· optional</span></>} htmlFor="biz-tax"><Input id="biz-tax" className="num" value={form.tax_id} onChange={(e) => set("tax_id", e.target.value)} /></Field>
          </div>
        </section>
      )}
      {has("client") && (
        <section id="client" className="card" style={card}>
          <Head title="Default client" sub="Pre-filled on every new invoice. Change it per invoice any time." />
          <Field label="Client" htmlFor="def-client">
            <select id="def-client" className="select" value={form.default_client_id ?? ""} onChange={(e) => set("default_client_id", e.target.value ? Number(e.target.value) : null)}>
              <option value="">None</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </section>
      )}
      {has("bank") && (
        <section id="bank" className="card" style={card}>
          <Head title="Bank details" sub="Printed as “Account details” next to your address. Empty fields are left off." />
          <div style={g2}>
            <Field label="Account holder" htmlFor="bank-holder"><Input id="bank-holder" value={form.account_holder} onChange={(e) => set("account_holder", e.target.value)} /></Field>
            <Field label="Bank" htmlFor="bank-name"><Input id="bank-name" value={form.bank_name} onChange={(e) => set("bank_name", e.target.value)} /></Field>
            <Field label="Account number" htmlFor="bank-number"><Input id="bank-number" className="num" value={form.account_number} onChange={(e) => set("account_number", e.target.value)} /></Field>
            <Field label="Routing number" htmlFor="bank-routing"><Input id="bank-routing" className="num" value={form.routing_number} onChange={(e) => set("routing_number", e.target.value)} /></Field>
            <Field label={<>IBAN <span style={{ fontWeight: 400, color: "var(--fg-3)" }}>· optional</span></>} htmlFor="bank-iban"><Input id="bank-iban" className="num" value={form.iban} onChange={(e) => set("iban", e.target.value)} /></Field>
            <Field label={<>SWIFT / BIC <span style={{ fontWeight: 400, color: "var(--fg-3)" }}>· optional</span></>} htmlFor="bank-bic"><Input id="bank-bic" className="num" value={form.bic} onChange={(e) => set("bic", e.target.value)} /></Field>
          </div>
        </section>
      )}
      {has("defaults") && (
        <section id="defaults" className="card" style={card}>
          <Head title="Invoice defaults" sub="Applied to new invoices; existing ones keep their values." />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
            <Field label="Currency" htmlFor="cur">
              <select id="cur" className="select" value={form.currency} onChange={(e) => set("currency", e.target.value)}>
                {["USD", "EUR", "GBP", "CHF", "CAD", "AUD"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Payment terms" htmlFor="terms" help="Due date = issued + this.">
              <div style={{ position: "relative" }}><Input id="terms" className="num" type="number" min={0} value={form.payment_terms_days} onChange={(e) => set("payment_terms_days", Number(e.target.value))} style={{ paddingRight: 52 }} /><span className="help" style={{ position: "absolute", right: 12, top: 11 }}>days</span></div>
            </Field>
            <Field label="Tax rate" htmlFor="tax" help="Printed per line and in the totals.">
              <div style={{ position: "relative" }}><Input id="tax" className="num" type="number" min={0} step={0.5} value={form.tax_rate} onChange={(e) => set("tax_rate", Number(e.target.value))} style={{ paddingRight: 36 }} /><span className="help" style={{ position: "absolute", right: 12, top: 11 }}>%</span></div>
            </Field>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, paddingTop: 6, borderTop: "1px solid var(--line)" }}>
            <div><div style={{ fontWeight: 600 }}>Show payment link</div><div className="help">Prints “Pay {total} via link: …” when an invoice has one.</div></div>
            <button type="button" className="toggle" role="switch" aria-checked={form.show_payment_link} aria-label="Show payment link" onClick={() => set("show_payment_link", !form.show_payment_link)} />
          </div>
        </section>
      )}
      {has("numbering") && (
        <section id="numbering" className="card" style={card}>
          <Head title="Numbering" sub="Numbers are assigned when an invoice is created and never reused." />
          <div style={g2}>
            <Field label="Format" htmlFor="fmt" help="{00000} pads to five digits · {YYYY} inserts the year."><Input id="fmt" className="num" value={form.number_format} onChange={(e) => set("number_format", e.target.value)} /></Field>
            <Field label="Next number" htmlFor="next"><Input id="next" className="num" type="number" min={1} value={form.next_number} onChange={(e) => set("next_number", Number(e.target.value))} /></Field>
          </div>
          <div className="help">Preview: <span className="num" style={{ fontWeight: 600, color: "var(--fg)" }}>{preview(form.number_format, form.next_number)}</span></div>
        </section>
      )}
    </>
  );
}

function Head({ title, sub }: { title: string; sub: string }) {
  return <div><h2 className="display" style={{ margin: 0, fontSize: 24 }}>{title}</h2><p className="help" style={{ margin: "4px 0 0" }}>{sub}</p></div>;
}

export function preview(fmt: string, n: number) {
  const out = fmt.replace("{YYYY}", String(new Date().getFullYear()));
  const m = out.match(/\{(0+)\}/);
  return m ? out.slice(0, m.index) + String(n).padStart(m[1].length, "0") + out.slice(m.index! + m[0].length) : `${out}${n}`;
}
