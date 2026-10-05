"use client";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { Client, Settings } from "@/lib/types";
import { bankLines, fmtDate, fmtPeriod, fmtPlain, moneyPlain, totals, type Draft, URL_RE } from "@/lib/invoice";

/* The live preview: the original INV-00017 layout in PDF points (1px = 1pt), scaled down to the sheet.
   Every measurement matches backend/app/pdf.py, which renders the PDF you download. */
const PAGE_W = 595.28, PAGE_H = 841.89, SHEET_W = 480, K = SHEET_W / PAGE_W;
const INK = "#252526", FILL = "#F5F5F5", HEAD_RULE = "#DCDCDC", RULE = "#E6E6E6", LINK = "#287CCF";
const COLS = { num: 19, desc: 179, period: 84, qty: 42, price: 66, amount: 74, taxPct: 34, taxAmt: 65 };
const DESC_TEXT_W = COLS.desc - 4 + 8; // may run 8pt into the empty side of "Work period", like the original

/* A text box. CSS centres glyphs in the line box while the PDF puts the first baseline at Selawik's ascent
   (2026/2048 em; ascent + descent = 1.1997 em), so shift by the half-leading to land on the same baseline. */
const txt = (size: number, lh = 1.333, bold = false, extra?: CSSProperties): CSSProperties =>
  ({ fontSize: size, lineHeight: lh, fontWeight: bold ? 700 : 400, transform: `translateY(${((1.1997 - lh) / 2).toFixed(4)}em)`, ...extra });

function Cell({ w, align = "center", head, children }: { w: number; align?: "left" | "center"; head?: boolean; children: ReactNode }) {
  return (
    <div style={{ flex: `0 0 ${w}px`, paddingLeft: align === "left" ? 4 : 0, paddingTop: head ? 4.1 : 0, textAlign: align }}>
      <div style={head ? txt(9, 1.333, true) : txt(9.75, 1.2308)}>{children}</div>
    </div>
  );
}

export function PdfSheet({ draft, settings, client, updating, highlight, flying, tilt }: {
  draft: Draft; settings: Settings | null; client: Client | null; updating: boolean; highlight: string; flying: boolean; tilt: { rx: number; ry: number; rz: number };
}) {
  const page = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(PAGE_H);
  useEffect(() => {
    const el = page.current; if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight)); // offsetHeight ignores the scale transform
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cur = draft.currency;
  const t = totals(draft.items, draft.tax_rate);
  const m = (v: number) => moneyPlain(v, cur);
  const showLink = !!draft.payment_link && URL_RE.test(draft.payment_link) && (settings?.show_payment_link ?? true);
  const clientLines = client ? [client.attention, ...client.address.split("\n")].map((l) => l.trim()).filter(Boolean) : [];
  const seller = settings ? [settings.business_name, ...settings.business_address.split("\n"), settings.business_email, settings.tax_id].map((l) => l.trim()).filter(Boolean) : [];
  const bank = bankLines(settings);
  const pages = Math.max(1, Math.ceil((height - 0.5) / PAGE_H)); // the PDF repeats the table header per page; close enough for a label
  const hl = (region: string) => (highlight === region ? "hl" : "");
  const cls = `sheet ${updating ? "updating" : ""} ${flying ? "fly" : ""}`;
  const line = txt(11.62, 1.394);

  return (
    <div className={cls} tabIndex={0} aria-label={`Invoice PDF, ${pages} page${pages === 1 ? "" : "s"}`}
      style={{ height: height * K, transform: `perspective(1400px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) rotateZ(${tilt.rz}deg) translateZ(30px)` }}>
      <div ref={page} className="pdf-page" style={{ width: PAGE_W, minHeight: PAGE_H, transform: `scale(${K})` }}>
        <div className={hl("header")}>
          <div style={txt(18.75, 1.333, true, { marginLeft: 20 })}>Invoice #{draft.number}</div>
          <div style={{ display: "flex", marginTop: 36.2 }}>
            <div style={{ marginLeft: 16, width: 308.4, height: 24.2, background: FILL, padding: "5.2px 0 0 4px" }}><div style={txt(9.75, 1.333, true)}>To</div></div>
            <div style={{ marginLeft: 29.6, width: 225.6, height: 24.2, background: FILL, padding: "5.2px 0 0 3.4px" }}><div style={txt(9.75, 1.333, true)}>Payment terms</div></div>
          </div>
          <div style={{ display: "flex", marginTop: 1.6 }}>
            <div style={{ marginLeft: 20, width: 334 }}>
              {client ? <div style={txt(12, 1.333, true)}>{client.name}</div> : <div style={txt(12, 1.333, false, { color: "#6F6961" })}>[No client selected]</div>}
              {clientLines.map((l, i) => <div key={i} style={txt(12)}>{l}</div>)}
            </div>
            <div style={{ marginLeft: 3.4, width: 222 }}>
              <div style={txt(12)}>Net {settings?.payment_terms_days ?? 7} days</div>
              <div style={txt(12)}>Date issued: {fmtDate(draft.issued_on)}</div>
              <div style={txt(12)}>Due date: {fmtDate(draft.due_on)}</div>
            </div>
          </div>
        </div>

        <div className={hl("items")} style={{ marginTop: 36, marginLeft: 17, width: 563 }}>
          <div style={{ display: "flex", background: FILL, borderBottom: `1px solid ${HEAD_RULE}`, height: 21.2 }}>
            <Cell head w={COLS.num} align="left">#</Cell><Cell head w={COLS.desc} align="left">Item description</Cell>
            <Cell head w={COLS.period}>Work period</Cell><Cell head w={COLS.qty}>Quantity</Cell><Cell head w={COLS.price}>Price</Cell>
            <Cell head w={COLS.amount}>Amount</Cell><Cell head w={COLS.taxPct}>Tax %</Cell><Cell head w={COLS.taxAmt} align="left">Tax amount</Cell>
          </div>
          {draft.items.map((it, i) => (
            <div key={it.key} style={{ display: "flex", borderBottom: `1px solid ${RULE}`, padding: "4.3px 0 5.6px" }}>
              <Cell w={COLS.num} align="left">{i + 1}</Cell>
              <div style={{ flex: `0 0 ${COLS.desc}px`, paddingLeft: 4 }}>
                <div style={txt(9.75, 1.2308, false, { width: DESC_TEXT_W, whiteSpace: "pre-wrap", overflowWrap: "anywhere" })}>{it.description}</div>
              </div>
              <Cell w={COLS.period}>{fmtPeriod(it.work_from, it.work_to)}</Cell>
              <Cell w={COLS.qty}>{fmtPlain(Number(it.quantity) || 0)}</Cell>
              <Cell w={COLS.price}>{m(Number(it.unit_price) || 0)}</Cell>
              <Cell w={COLS.amount}>{m(t.amounts[i])}</Cell>
              <Cell w={COLS.taxPct}>{fmtPlain(draft.tax_rate)}%</Cell>
              <Cell w={COLS.taxAmt} align="left">{m(t.taxes[i])}</Cell>
            </div>
          ))}
        </div>

        <div className={hl("totals")} style={{ marginTop: 24.1, marginLeft: 397, width: 182.7 }}>
          <TotalRow label="Subtotal" value={m(t.subtotal)} rule />
          <TotalRow label={`Total tax (${fmtPlain(draft.tax_rate)}%)`} value={m(t.tax)} />
          <div style={{ borderTop: `1px solid ${RULE}` }}>
            <div style={{ display: "flex", background: FILL, height: 31, paddingTop: 3.4 }}>
              <div style={txt(9, 1.333, true, { width: 92, paddingLeft: 4 })}>Total payment</div>
              <div style={txt(9, 1.333, true, { width: 90.7, paddingRight: 4.7, textAlign: "right" })}>{m(t.total)}</div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div className={hl("pay")} style={{ marginLeft: 18, width: 558, borderTop: `1px solid ${RULE}`, color: "#000" }}>
          <div style={{ display: "flex" }}>
            <div style={{ marginLeft: 3, width: 269, paddingTop: 13.15 }}>
              {seller.length ? seller.map((l, i) => <div key={i} style={line}>{l}</div>) : <div style={{ ...line, color: "#6F6961" }}>[Your details from Settings]</div>}
            </div>
            <div style={{ flex: 1, paddingTop: 17 }}>
              <div style={txt(13.5, 1.333, true, { marginBottom: 1.65 })}>Account details</div>
              {bank.map((l, i) => <div key={i} style={line}>{l}</div>)}
            </div>
          </div>
          {showLink && (
            <div style={txt(10.5, 1.333, false, { marginTop: 3.35, marginLeft: 4, color: INK, overflowWrap: "anywhere" })}>
              Pay {m(t.total)} via link: <span style={{ color: LINK, textDecoration: "underline" }}>{draft.payment_link}</span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", margin: "8.61px 18px 0 17px" }}>
          <div style={txt(11.25, 1.333, false, { color: "#666" })}>1/{pages} for invoice #{draft.number}</div>
          <div style={{ flex: 1, marginLeft: 11.5, marginTop: 9, borderTop: `1px solid ${RULE}` }} />
        </div>
      </div>
    </div>
  );
}

function TotalRow({ label, value, rule }: { label: string; value: string; rule?: boolean }) {
  return (
    <div style={{ display: "flex", padding: "6px 0 5px", borderBottom: rule ? `1px solid ${RULE}` : undefined }}>
      <div style={txt(10.5, 1.333, false, { width: 92, paddingLeft: 4 })}>{label}</div>
      <div style={txt(10.5, 1.333, false, { width: 90.7, paddingRight: 4.7, textAlign: "right" })}>{value}</div>
    </div>
  );
}

/* Parallax desk: the sheet rests in a sculptural pose and leans toward the pointer. */
export function Desk({ children, pose = 1 }: { children: (tilt: { rx: number; ry: number; rz: number }) => React.ReactNode; pose?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState({ x: 0, y: 0 });
  const base = { rx: 9 * pose, ry: -12 * pose, rz: -1.5 * pose };
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const move = (e: MouseEvent) => {
      if (reduced) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      const clamp = (v: number) => Math.max(-6, Math.min(6, v));
      setT({ x: clamp(x * 12), y: clamp(-y * 12) });
    };
    const leave = () => setT({ x: 0, y: 0 });
    el.addEventListener("mousemove", move); el.addEventListener("mouseleave", leave);
    return () => { el.removeEventListener("mousemove", move); el.removeEventListener("mouseleave", leave); };
  }, []);
  return (
    <section ref={ref} className="desk" aria-label="Live PDF preview">
      <div className="ground" aria-hidden="true" />
      {children({ rx: +(base.rx + t.y).toFixed(2), ry: +(base.ry + t.x).toFixed(2), rz: base.rz })}
    </section>
  );
}
