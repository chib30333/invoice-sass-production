"use client";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Field, Input, Logo } from "@/components/ui";
import { Icon } from "@/components/Icon";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); try { await api.auth.forgot(email); setSent(true); } finally { setBusy(false); } };
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <img src="/img/paper-texture.jpg" alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: .7, pointerEvents: "none" }} />
      <header style={{ position: "relative", padding: "28px 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" style={{ textDecoration: "none" }}><Logo /></Link>
        <Link href="/sign-in" className="btn btn-ghost"><Icon name="chevronLeft" strokeWidth={2} />Back to sign in</Link>
      </header>
      <main style={{ position: "relative", flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 40px 80px" }}>
        <div style={{ position: "relative", width: "100%", maxWidth: 480 }}>
          <img src="/img/folio-clock.svg" alt="" className="hide-m" style={{ position: "absolute", right: -210, bottom: -30, width: 260, filter: "drop-shadow(0 24px 24px rgba(20,18,14,.2))" }} />
          {!sent ? (
            <form onSubmit={submit} className="card" style={{ padding: 40, borderRadius: 28, boxShadow: "var(--sh-3)", display: "flex", flexDirection: "column", gap: 22, position: "relative" }}>
              <span style={{ display: "inline-flex", width: 52, height: 52, borderRadius: 16, background: "var(--accent-soft)", color: "var(--accent)", alignItems: "center", justifyContent: "center" }}><Icon name="lock" size={24} /></span>
              <div><h1 className="display" style={{ margin: 0, fontSize: 38 }}>Reset your password.</h1><p style={{ margin: "8px 0 0", color: "var(--fg-2)" }}>Enter the email you signed up with and we’ll send a link that works for 30 minutes.</p></div>
              <Field label="Email" htmlFor="email"><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ height: 48 }} /></Field>
              <button className="btn btn-primary btn-lg" disabled={busy} style={{ height: 52, borderRadius: 14 }}>Send reset link</button>
            </form>
          ) : (
            <div className="card" role="status" style={{ padding: 40, borderRadius: 28, boxShadow: "var(--sh-3)", display: "flex", flexDirection: "column", gap: 22, position: "relative" }}>
              <span style={{ display: "inline-flex", width: 52, height: 52, borderRadius: 16, background: "var(--paid-soft)", color: "var(--paid)", alignItems: "center", justifyContent: "center" }}><Icon name="check" size={24} strokeWidth={2.2} /></span>
              <div><h1 className="display" style={{ margin: 0, fontSize: 38 }}>Check your inbox.</h1><p style={{ margin: "8px 0 0", color: "var(--fg-2)" }}>If <strong style={{ color: "var(--fg)" }}>{email}</strong> has an account, a reset link is on its way. It expires in 30 minutes.</p></div>
              <div style={{ background: "var(--sunken)", borderRadius: 14, padding: "14px 16px", fontSize: 14, color: "var(--fg-2)" }}><strong style={{ color: "var(--fg)" }}>Nothing there?</strong> Look in spam, or wait a minute and resend. The newest link always wins.</div>
              <div style={{ display: "flex", gap: 10 }}><button className="btn btn-secondary btn-lg" style={{ flex: 1 }} onClick={() => setSent(false)}>Use another email</button><Link href="/sign-in" className="btn btn-primary btn-lg" style={{ flex: 1 }}>Back to sign in</Link></div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
