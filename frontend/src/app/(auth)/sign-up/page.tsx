"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { AuthShell } from "@/components/AuthShell";
import { Field, Input } from "@/components/ui";
import { Icon } from "@/components/Icon";

function strength(p: string) { let s = 0; if (p.length >= 10) s++; if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++; if (/\d/.test(p)) s++; if (/[^\w]/.test(p)) s++; return s; }

export default function SignUpPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [f, setF] = useState({ name: "", business_name: "", email: "", password: "" });
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const s = strength(f.password);
  const labels = ["", "Weak", "Okay", "Strong", "Excellent"];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError("");
    try { const { access_token } = await api.auth.register(f); await signIn(access_token); router.push("/onboarding"); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };

  return (
    <AuthShell side="right" art="light" mascot="/img/folio-wave.svg" headline="Set up once. Bill in a minute, forever."
      copy={<ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6, fontSize: 14 }}>
        {["Invoices and clients synced across your devices", "Free while in beta, no card required", "Export everything as PDF any time"].map((t) => <li key={t} style={{ display: "flex", gap: 8, alignItems: "center" }}><Icon name="check" strokeWidth={2.2} style={{ color: "#1D7A4F" }} />{t}</li>)}
      </ul>}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div><h1 className="display" style={{ margin: 0, fontSize: 40 }}>Create your account.</h1><p style={{ margin: "8px 0 0", color: "var(--fg-2)" }}>Already have one? <Link href="/sign-in" style={{ color: "var(--accent)", fontWeight: 600 }}>Sign in</Link>.</p></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
          <Field label="Your name" htmlFor="name"><Input id="name" autoComplete="name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} style={{ height: 48 }} /></Field>
          <Field label="Studio or business" htmlFor="biz"><Input id="biz" autoComplete="organization" value={f.business_name} onChange={(e) => setF({ ...f, business_name: e.target.value })} style={{ height: 48 }} /></Field>
        </div>
        <Field label="Email" htmlFor="email" warning={error}><Input id="email" type="email" autoComplete="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} invalid={!!error} style={{ height: 48 }} /></Field>
        <Field label="Password" htmlFor="password" help={f.password ? `${labels[s] || "Too short"} · at least 10 characters${s < 4 ? "; mix cases, a number and a symbol" : ""}` : "At least 10 characters."}>
          <Input id="password" type="password" autoComplete="new-password" required minLength={10} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} style={{ height: 48 }} />
          <div style={{ display: "flex", gap: 4 }} aria-hidden="true">{[1, 2, 3, 4].map((i) => <span key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= s ? "var(--paid)" : "var(--line)", transition: "background var(--d-2)" }} />)}</div>
        </Field>
        <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "var(--fg-2)", cursor: "pointer", lineHeight: 1.45 }}><input type="checkbox" className="chk" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 1 }} />I agree to the <span style={{ color: "var(--accent)" }}>[Terms]</span> and <span style={{ color: "var(--accent)" }}>[Privacy policy]</span>.</label>
        <button className="btn btn-primary btn-lg" disabled={busy || !agree} style={{ height: 52, borderRadius: 14 }}>Create account<Icon name="chevronRight" strokeWidth={2} /></button>
      </form>
    </AuthShell>
  );
}
