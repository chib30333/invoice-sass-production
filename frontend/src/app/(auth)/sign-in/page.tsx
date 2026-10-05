"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { AuthShell } from "@/components/AuthShell";
import { Field, Input } from "@/components/ui";
import { Icon } from "@/components/Icon";

export default function SignInPage() {
  return <Suspense><SignIn /></Suspense>;
}

function SignIn() {
  const router = useRouter();
  const params = useSearchParams();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const next = params.get("next") || "/invoices";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError("");
    try { const { access_token } = await api.auth.login({ email, password }); await signIn(access_token); router.push(next); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };
  const guest = async () => {
    setBusy(true);
    try { const { access_token } = await api.auth.guest(); await signIn(access_token); router.push("/onboarding"); } finally { setBusy(false); }
  };

  return (
    <AuthShell side="left" art="dark" mascot="/img/folio-key.svg" headline="Your drafts are waiting exactly where you left them."
      copy="Sign in to sync invoices and clients across devices. Working offline? The editor still runs without an account.">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div><h1 className="display" style={{ margin: 0, fontSize: 40 }}>Welcome back.</h1><p style={{ margin: "8px 0 0", color: "var(--fg-2)" }}>New here? <Link href="/sign-up" style={{ color: "var(--accent)", fontWeight: 600 }}>Create an account</Link> — it takes a minute.</p></div>
        <Field label="Email" htmlFor="email"><Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ height: 48 }} /></Field>
        <Field label="Password" htmlFor="password" right={<Link href="/forgot-password" style={{ color: "var(--accent)", fontSize: 13, fontWeight: 600 }}>Forgot it?</Link>} warning={error}>
          <div style={{ position: "relative" }}>
            <Input id="password" type={show ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} invalid={!!error} style={{ height: 48, paddingRight: 48 }} />
            <button type="button" className="btn btn-icon" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow(!show)} style={{ position: "absolute", right: 4, top: 4 }}><Icon name="eye" size={18} /></button>
          </div>
        </Field>
        <button className="btn btn-primary btn-lg" disabled={busy} style={{ height: 52, borderRadius: 14 }}>Sign in</button>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--fg-3)", fontSize: 13 }}><span style={{ flex: 1, height: 1, background: "var(--line)" }} />or<span style={{ flex: 1, height: 1, background: "var(--line)" }} /></div>
        <button type="button" className="btn btn-secondary btn-lg" onClick={guest} disabled={busy}>Continue without an account</button>
        <p className="help" style={{ margin: 0, textAlign: "center" }}>A guest session lives on this server only; create an account later to keep it.</p>
      </form>
    </AuthShell>
  );
}
