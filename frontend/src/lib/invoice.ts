/* Pure invoice maths and validation, shared by the editor and the live preview.
   The backend recomputes everything; this keeps the preview instant. */
import type { Invoice, LineItem, Settings } from "./types";

export const URL_RE = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

export function money(n: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: "narrowSymbol" }).format(n || 0);
}

export function moneyPlain(n: number, currency = "USD"): string {
  return `${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* Same formats as the PDF (backend/app/pdf.py): "2026-09-23" -> "23 Sep 2026", short -> "23 Sep". */
export function fmtDate(iso: string | null | undefined, style: "long" | "short" = "long"): string {
  const [y, m, d] = (iso ?? "").split("-").map(Number);
  if (!y || !m || !d) return "—";
  return style === "long" ? `${d} ${MONTHS[m - 1]} ${y}` : `${d} ${MONTHS[m - 1]}`;
}

/* Work period as printed: "09/01 – 09/15", or a single date if only one is set. */
export function fmtPeriod(from: string | null, to: string | null): string {
  const md = (iso: string | null) => (iso ? `${iso.slice(5, 7)}/${iso.slice(8, 10)}` : "");
  return from && to ? `${md(from)} – ${md(to)}` : md(from || to);
}

/* 60 -> "60", 7.5 -> "7.5" */
export const fmtPlain = (n: number) => String(n);

/* The "Account details" lines; empty fields are left off (same order as the PDF). */
export function bankLines(s: Settings | null): string[] {
  if (!s) return [];
  const pairs: Array<[string, string]> = [["Account holder", s.account_holder], ["Account number", s.account_number], ["Routing number", s.routing_number], ["IBAN", s.iban], ["SWIFT/BIC", s.bic], ["Bank", s.bank_name]];
  return pairs.filter(([, v]) => v?.trim()).map(([k, v]) => `${k}: ${v.trim()}`);
}

export function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  d.setDate(d.getDate() + n);
  return toIso(d);
}

export const num = (v: number | string) => (typeof v === "number" ? v : parseFloat(v) || 0);

/* Money in whole cents with tax per line, like the original invoice and backend/app/money.py. */
const amountCents = (it: LineItem) => Math.round(num(it.quantity) * num(it.unit_price) * 100);
export const amount = (it: LineItem) => amountCents(it) / 100;

export function totals(items: LineItem[], taxRate: number) {
  const amounts = items.map(amountCents);
  const taxes = amounts.map((a) => Math.round((a * taxRate) / 100));
  const subtotal = amounts.reduce((s, a) => s + a, 0), tax = taxes.reduce((s, t) => s + t, 0);
  return { amounts: amounts.map((a) => a / 100), taxes: taxes.map((t) => t / 100), subtotal: subtotal / 100, tax: tax / 100, total: (subtotal + tax) / 100 };
}

export interface Draft extends Omit<Invoice, "subtotal" | "tax" | "total" | "warnings" | "updated_at"> {}

export function validate(d: Draft) {
  return {
    numberEmpty: !d.number.trim(),
    dueBefore: !!(d.due_on && d.issued_on && d.due_on < d.issued_on),
    linkInvalid: !!d.payment_link && !URL_RE.test(d.payment_link),
    periodErr: Object.fromEntries(d.items.map((it) => [it.key, !!(it.work_from && it.work_to && it.work_to < it.work_from)])) as Record<string, boolean>,
  };
}

let seq = 0;
export const newKey = () => `k${Date.now().toString(36)}${(seq++).toString(36)}`;

export function withKeys(inv: Invoice): Draft {
  return { ...inv, items: inv.items.map((it) => ({ ...it, key: it.key ?? newKey() })) };
}
