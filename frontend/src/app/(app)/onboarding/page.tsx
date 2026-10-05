"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { SettingsSections, useSettingsForm } from "@/components/SettingsForm";
import { Icon } from "@/components/Icon";
import { Logo, Skeleton } from "@/components/ui";
import { useToast } from "@/components/Toast";

const steps = [
  { title: "Business details", sub: "Name and address, printed on every invoice.", h: "Who is sending the invoice?", p: "Your name, address and email, printed at the bottom of every invoice. You can change them any time in Settings.", sections: ["business"] as const },
  { title: "Bank details", sub: "How clients pay you.", h: "How should clients pay you?", p: "Printed as “Account details” next to your address. Currency, terms and tax live here too.", sections: ["bank", "defaults"] as const },
  { title: "First invoice", sub: "Pick a number format and start billing.", h: "Your first invoice.", p: "Choose how invoices are numbered. The editor opens next with the PDF already taking shape.", sections: ["numbering"] as const },
];

export default function OnboardingPage() {
  const router = useRouter();
  const toast = useToast();
  const { refresh } = useAuth();
  const { form, set, save, clients } = useSettingsForm();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const s = steps[step];

  const next = async () => {
    setBusy(true);
    try {
      await save();
      if (step < 2) setStep(step + 1);
      else { await api.auth.onboarded(); await refresh(); const inv = await api.invoices.create(); router.push(`/invoices/${inv.id}`); }
    } catch (e) { toast.push({ kind: "error", text: (e as Error).message }); } finally { setBusy(false); }
  };

  return (
    <div className="shell" style={{ minHeight: "100vh" }}>
      <aside style={{ flex: "0 0 520px", background: "#15130F", color: "#F1EDE4", padding: "40px 44px", display: "flex", flexDirection: "column", gap: 40, position: "relative", overflow: "hidden" }}>
        <Logo dark />
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h1 className="display" style={{ margin: 0, fontSize: 40 }}>Set up once.<br /><span style={{ color: "rgba(241,237,228,.7)" }}>Bill in a minute, forever.</span></h1>
          <div style={{ height: 3, borderRadius: 2, background: "rgba(241,237,228,.18)", overflow: "hidden" }} aria-hidden="true"><span style={{ display: "block", height: "100%", width: `${((step + 1) / 3) * 100}%`, background: "#F1EDE4", transition: "width var(--d-3) var(--ease-out)" }} /></div>
          <span className="help" style={{ color: "rgba(241,237,228,.6)" }}>Step {step + 1} of 3</span>
        </div>
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 22 }}>
          {steps.map((st, i) => (
            <li key={st.title} style={{ display: "flex", gap: 14, alignItems: "flex-start", color: i === step ? "#F1EDE4" : "rgba(241,237,228,.55)" }}>
              <span className="num" style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid rgba(241,237,228,.3)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, flex: "0 0 28px", background: i === step ? "#F1EDE4" : i < step ? "rgba(241,237,228,.15)" : "transparent", color: i === step ? "#15130F" : "inherit" }}>{i < step ? "✓" : i + 1}</span>
              <div><div style={{ fontWeight: 600 }}>{st.title}</div><div className="help" style={{ color: "inherit", opacity: .7 }}>{st.sub}</div></div>
            </li>
          ))}
        </ol>
        <div style={{ flex: 1 }} />
        <img className="float" src="/img/folio-clock.svg" alt="" style={{ width: 300, alignSelf: "center", filter: "drop-shadow(0 30px 30px rgba(0,0,0,.5))" }} />
      </aside>
      <main style={{ flex: 1, minWidth: 0, padding: "64px 72px", display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 640, display: "flex", flexDirection: "column", gap: 28 }}>
          <div><h2 className="display" style={{ margin: 0, fontSize: 36 }}>{s.h}</h2><p style={{ margin: "10px 0 0", color: "var(--fg-2)", fontSize: 15 }}>{s.p}</p></div>
          {form ? <SettingsSections form={form} set={set} clients={clients} sections={[...s.sections]} /> : <Skeleton h={240} r={14} />}
          <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 8 }}>
            {step > 0 ? <button className="btn btn-ghost btn-lg" onClick={() => setStep(step - 1)}><Icon name="chevronLeft" strokeWidth={2} />Back</button> : <Link href="/invoices" className="btn btn-ghost btn-lg" style={{ color: "var(--fg-3)" }}>Skip for now</Link>}
            <div style={{ flex: 1 }} />
            <button className="btn btn-primary btn-lg" onClick={next} disabled={busy || !form}>{step < 2 ? "Continue" : "Create first invoice"}<Icon name="chevronRight" strokeWidth={2} /></button>
          </div>
        </div>
      </main>
    </div>
  );
}
