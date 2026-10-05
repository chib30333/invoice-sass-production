"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Field, Input, Logo } from "@/components/ui";

export default function ResetPasswordPage() { return <Suspense><Reset /></Suspense>; }

function Reset() {
  const params = useSearchParams(); const router = useRouter(); const { signIn } = useAuth();
  const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError("");
    try { const { access_token } = await api.auth.reset({ token: params.get("token") ?? "", password }); await signIn(access_token); router.push("/invoices"); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };
  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <form onSubmit={submit} className="card" style={{ width: "100%", maxWidth: 440, padding: 40, borderRadius: 28, boxShadow: "var(--sh-3)", display: "flex", flexDirection: "column", gap: 22 }}>
        <Logo />
        <h1 className="display" style={{ margin: 0, fontSize: 36 }}>Choose a new password.</h1>
        <Field label="New password" htmlFor="pw" help="At least 10 characters." warning={error}><Input id="pw" type="password" autoComplete="new-password" minLength={10} required value={password} onChange={(e) => setPassword(e.target.value)} style={{ height: 48 }} /></Field>
        <button className="btn btn-primary btn-lg" disabled={busy}>Save and sign in</button>
      </form>
    </main>
  );
}
