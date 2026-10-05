"use client";
import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";

const slides = [
  { title: "A live preview you never have to open", body: "The PDF sits on the desk beside the form and re-renders as you type: the region you changed glows for half a second, then settles. Hover to flatten it.", img: "/img/folio-hero.svg", icon: "invoice" },
  { title: "Line items that move the way you think", body: "Multi-line descriptions, work periods, quantities and rates. Drag the handle and the other items flow around it; remove one and an undo waits five seconds.", img: "/img/folio-download.svg", icon: "grip" },
  { title: "Set the boring parts once", body: "Sender block, bank details, currency, terms, tax rate and numbering format live in Settings. Due dates follow your terms until you change one by hand.", img: "/img/folio-clock.svg", icon: "settings" },
  { title: "Calm validation, never a red wall", body: "An empty number, a due date before the issue date, a work period that ends before it starts, a link that isn’t one — each gets a quiet line under the field.", img: "/img/folio-key.svg", icon: "shield" },
];

const features = [
  { title: "Tabular everything", body: "Every amount, date and ID is set in a mono with tabular figures, so columns align on the decimal and totals never jitter.", icon: "invoice" },
  { title: "Due date that follows", body: "Issued plus your terms, shown as a link under the field. Edit it by hand and it unlinks; one click relinks it.", icon: "link" },
  { title: "Pay-by-link, optional", body: "Paste a payment URL and the PDF prints a “Pay via link” line. Leave it empty and the line disappears.", icon: "arrowRight" },
  { title: "Draft autosave", body: "Every change is saved 1.4 seconds after you stop typing. A quiet “Saved” tells you so; nothing nags.", icon: "check" },
  { title: "Command palette", body: "Press ⌘K from anywhere: new invoice, download, jump to a client or a setting. Two keystrokes to anything.", icon: "command" },
  { title: "Reduced motion, honoured", body: "Every animation has a fallback that keeps the state change and drops the movement. Hit targets 44px on touch.", icon: "shield" },
];

const steps = [
  { img: "/img/folio-wave.svg", title: "Set up once", body: "Your business, bank and default client live in Settings. They print on every invoice and never need retyping." },
  { img: "/img/folio-clock.svg", title: "Fill in a few fields", body: "Add line items, drag to reorder, and watch the sheet re-render as you type. Due dates follow your terms until you say otherwise." },
  { img: "/img/folio-download.svg", title: "Download the PDF", body: "One press. A progress pill, a checkmark, and the sheet folds off the desk. Send it however you like." },
];

export default function Landing() {
  const [i, setI] = useState(0);
  const s = slides[i];
  return (
    <div style={{ fontSize: 16, lineHeight: 1.5 }}>
      <header className="glass" style={{ position: "sticky", top: 0, zIndex: 10, borderBottom: "1px solid var(--line)" }}>
        <div className="wrap" style={{ height: 68, display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/" style={{ textDecoration: "none" }}><Logo /></Link>
          <nav aria-label="Site" style={{ display: "flex", gap: 2, marginLeft: 24 }} className="hide-m"><a href="#product" className="navlink">Product</a><a href="#how" className="navlink">How it works</a><a href="#pricing" className="navlink">Pricing</a></nav>
          <div style={{ flex: 1 }} />
          <ThemeToggle />
          <Link href="/sign-in" className="btn btn-ghost">Sign in</Link>
          <Link href="/sign-up" className="btn btn-primary">Start free</Link>
        </div>
      </header>

      <section className="wrap" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 1fr)", gap: 48, alignItems: "center", paddingTop: 88, paddingBottom: 72 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 28, maxWidth: 560 }}>
          <span className="pill" style={{ alignSelf: "flex-start", height: 30, padding: "0 12px 0 8px", border: "1px solid var(--line-2)", background: "var(--surface)", fontSize: 13, color: "var(--fg-2)" }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--paid)" }} />Free while in beta · no account needed</span>
          <h1 className="display" style={{ margin: 0, fontSize: 76, lineHeight: .98, letterSpacing: "-.03em" }}>Bill like you <span style={{ color: "var(--accent)" }}>design.</span></h1>
          <p style={{ margin: 0, fontSize: 19, color: "var(--fg-2)" }}>Fill in a few fields and watch the PDF take shape beside you. Confident numbers, bold typography, and a download in under a minute — the invoice a studio is proud to be billed from.</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/sign-up" className="btn btn-primary btn-lg" style={{ height: 52, borderRadius: 14, fontSize: 16 }}>Start your first invoice<Icon name="chevronRight" strokeWidth={2} /></Link>
            <Link href="/sign-in" className="btn btn-secondary btn-lg" style={{ height: 52, borderRadius: 14, fontSize: 16 }}><Icon name="play" strokeWidth={2} />Try it as a guest</Link>
          </div>
        </div>
        <div style={{ position: "relative", height: 560, minWidth: 0 }}>
          <img src="/img/desk-light.jpg" alt="Three invoice sheets fanned on a warm desk beside a dark coin" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", borderRadius: 24, boxShadow: "var(--sh-3)", transform: "perspective(1200px) rotateX(4deg) rotateY(-6deg)" }} />
          <img className="float" src="/img/folio-hero.svg" alt="" style={{ position: "absolute", right: -24, bottom: -28, width: 300, filter: "drop-shadow(0 24px 30px rgba(20,18,14,.25))" }} />
          <div className="glass" style={{ position: "absolute", left: 24, bottom: 28, display: "flex", flexDirection: "column", gap: 2, padding: "12px 16px", borderRadius: 14, border: "1px solid var(--line)", boxShadow: "var(--sh-2)" }}><span className="help">Total due</span><span className="num display" style={{ fontSize: 30 }}>$12,480.00</span></div>
        </div>
      </section>

      <section id="product" style={{ background: "var(--surface)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", padding: "80px 0" }}>
        <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
            <div style={{ maxWidth: 560 }}><Eyebrow>The product</Eyebrow><h2 className="display" style={{ margin: 0, fontSize: 48 }}>Everything on one screen, nothing behind a click.</h2></div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button className="btn btn-secondary btn-icon" style={{ borderRadius: "50%", width: 44, height: 44 }} aria-label="Previous slide" onClick={() => setI((i + slides.length - 1) % slides.length)}><Icon name="chevronLeft" size={18} strokeWidth={2} /></button>
              <span className="num help" style={{ minWidth: 44, textAlign: "center" }}>{i + 1} / {slides.length}</span>
              <button className="btn btn-secondary btn-icon" style={{ borderRadius: "50%", width: 44, height: 44 }} aria-label="Next slide" onClick={() => setI((i + 1) % slides.length)}><Icon name="chevronRight" size={18} strokeWidth={2} /></button>
            </div>
          </div>
          <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0, .9fr) minmax(0, 1.1fr)", gap: 40, alignItems: "center", minHeight: 420 }}>
            <div className="slide" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <span style={{ display: "inline-flex", width: 48, height: 48, borderRadius: 14, background: "var(--accent-soft)", color: "var(--accent)", alignItems: "center", justifyContent: "center" }}><Icon name={s.icon} size={22} /></span>
              <h3 className="display" style={{ margin: 0, fontSize: 36 }}>{s.title}</h3>
              <p style={{ margin: 0, fontSize: 17, color: "var(--fg-2)" }}>{s.body}</p>
            </div>
            <div className="slide" style={{ background: "var(--sunken)", borderRadius: 24, minHeight: 420, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}><img src={s.img} alt="" style={{ width: "100%", maxWidth: 420 }} /></div>
          </div>
          <div role="tablist" aria-label="Product slides" style={{ display: "flex", gap: 8, justifyContent: "center" }}>{slides.map((sl, k) => <button key={sl.title} role="tab" aria-selected={k === i} aria-label={sl.title} className={`dotbtn ${k === i ? "on" : ""}`} onClick={() => setI(k)} />)}</div>
        </div>
      </section>

      <section id="how" className="wrap" style={{ paddingTop: 96, paddingBottom: 96, display: "flex", flexDirection: "column", gap: 48 }}>
        <div style={{ maxWidth: 640 }}><Eyebrow>How it works</Eyebrow><h2 className="display" style={{ margin: 0, fontSize: 48 }}>Three steps. The third one is a download.</h2></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", gap: 24 }}>
          {steps.map((st, k) => (
            <article key={st.title} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div className="card" style={{ borderRadius: 24, height: 280, display: "flex", alignItems: "flex-end", justifyContent: "center", overflow: "hidden", padding: "24px 24px 0" }}><img src={st.img} alt="" style={{ width: 260 }} /></div>
              <div style={{ display: "flex", gap: 14 }}><span className="num" style={{ flex: "0 0 36px", height: 36, borderRadius: "50%", background: "var(--fg)", color: "var(--bg)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}>{k + 1}</span><div><h3 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700 }}>{st.title}</h3><p style={{ margin: 0, color: "var(--fg-2)" }}>{st.body}</p></div></div>
            </article>
          ))}
        </div>
      </section>

      <section style={{ position: "relative", minHeight: 520, display: "flex", alignItems: "center", overflow: "hidden", background: "#0E0D0B", color: "#F1EDE4" }}>
        <img src="/img/desk-dark.jpg" alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: .9 }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(14,13,11,.92) 0%, rgba(14,13,11,.55) 55%, rgba(14,13,11,.1) 100%)" }} />
        <div className="wrap" style={{ position: "relative", display: "flex", flexDirection: "column", gap: 20, paddingTop: 80, paddingBottom: 80 }}>
          <Eyebrow color="#8A9CFF">Finance meets editorial</Eyebrow>
          <h2 className="display" style={{ margin: 0, fontSize: 60, maxWidth: 640 }}>The total is the hero. Everything else gets out of its way.</h2>
          <p style={{ margin: 0, maxWidth: 520, fontSize: 17, color: "rgba(241,237,228,.75)" }}>Tabular figures that align on the decimal. A bold rounded display face on the number that matters. A dark theme tuned by hand, not inverted.</p>
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}><Link href="/sign-in" className="btn btn-lg" style={{ background: "#F1EDE4", color: "#0E0D0B" }}>Open the editor</Link><a href="#pricing" className="btn btn-lg" style={{ borderColor: "rgba(241,237,228,.3)", color: "#F1EDE4" }}>See pricing</a></div>
        </div>
      </section>

      <section className="wrap" style={{ paddingTop: 96, paddingBottom: 96, display: "flex", flexDirection: "column", gap: 40 }}>
        <div style={{ maxWidth: 640 }}><Eyebrow>Details</Eyebrow><h2 className="display" style={{ margin: 0, fontSize: 48 }}>Small things, done properly.</h2></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", gap: 20 }}>
          {features.map((f) => (
            <article key={f.title} className="card feature">
              <span style={{ display: "inline-flex", width: 44, height: 44, borderRadius: 12, background: "var(--sunken)", alignItems: "center", justifyContent: "center" }}><Icon name={f.icon} size={20} /></span>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{f.title}</h3>
              <p style={{ margin: 0, color: "var(--fg-2)", fontSize: 15 }}>{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" style={{ background: "var(--surface)", borderTop: "1px solid var(--line)", padding: "96px 0" }}>
        <div className="wrap" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(420px, 100%), 1fr))", gap: 48, alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <Eyebrow>Pricing</Eyebrow>
            <h2 className="display" style={{ margin: 0, fontSize: 48 }}>One plan. Every invoice you’ll ever send.</h2>
            <p style={{ margin: 0, fontSize: 17, color: "var(--fg-2)", maxWidth: 480 }}>No per-seat tiers, no watermark, no “pro” PDF. Start free today; the paid plan arrives with cloud sync and team clients.</p>
            <img src="/img/folio-team.svg" alt="" style={{ width: 320 }} />
          </div>
          <div className="card" style={{ background: "var(--bg)", borderRadius: 28, padding: 36, display: "flex", flexDirection: "column", gap: 24, boxShadow: "var(--sh-2)", position: "relative" }}>
            <span className="pill" style={{ position: "absolute", top: 24, right: 24, background: "var(--paid-soft)", color: "var(--paid)" }}>Free while in beta</span>
            <div><div style={{ fontWeight: 600, color: "var(--fg-2)" }}>Studio</div><div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}><span className="num display" style={{ fontSize: 56 }}>[YOUR PRICE]</span><span className="help">/ month, after beta</span></div></div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12, fontSize: 15 }}>
              {["Unlimited invoices and clients", "Live PDF preview and fullscreen review", "Payment links, tax and numbering rules", "Light and dark themes, keyboard-complete"].map((t) => <li key={t} style={{ display: "flex", gap: 10 }}><Icon name="check" size={18} strokeWidth={2.2} style={{ color: "var(--paid)", flex: "0 0 18px", marginTop: 2 }} />{t}</li>)}
            </ul>
            <Link href="/sign-up" className="btn btn-primary btn-lg" style={{ height: 52, borderRadius: 14, fontSize: 16 }}>Create your account</Link>
            <span className="help" style={{ textAlign: "center" }}>No card. Guest sessions work without signing up.</span>
          </div>
        </div>
      </section>

      <footer style={{ borderTop: "1px solid var(--line)", padding: "48px 0 40px" }}>
        <div className="wrap" style={{ display: "flex", justifyContent: "space-between", gap: 24, flexWrap: "wrap", fontSize: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 320 }}><Logo /><p style={{ margin: 0, color: "var(--fg-3)" }}>A premium invoice builder for freelancers and small studios.</p></div>
          <div style={{ display: "flex", gap: 40 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><strong>Product</strong><a href="#product" className="help">Features</a><a href="#pricing" className="help">Pricing</a></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><strong>Account</strong><Link href="/sign-in" className="help">Sign in</Link><Link href="/sign-up" className="help">Create account</Link><Link href="/forgot-password" className="help">Reset password</Link></div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Eyebrow({ children, color }: { children: React.ReactNode; color?: string }) {
  return <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600, color: color ?? "var(--accent)", letterSpacing: ".04em", textTransform: "uppercase" }}>{children}</p>;
}
