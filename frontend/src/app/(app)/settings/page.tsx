"use client";
import { useState } from "react";
import { SettingsSections, useSettingsForm } from "@/components/SettingsForm";
import { Skeleton } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";

const nav = [["business", "Business profile"], ["client", "Default client"], ["bank", "Bank details"], ["defaults", "Invoice defaults"], ["numbering", "Numbering"]] as const;

export default function SettingsPage() {
  const { form, set, save, dirty, clients, reload } = useSettingsForm();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const onSave = async () => {
    setBusy(true);
    try { await save(); toast.push({ kind: "success", text: "Settings saved" }); }
    catch (e) { toast.push({ kind: "error", text: (e as Error).message }); } finally { setBusy(false); }
  };
  return (
    <main className="main" style={{ paddingBottom: 120, position: "relative" }}>
      <div><h1 className="display" style={{ margin: 0, fontSize: 44 }}>Settings</h1><p style={{ margin: "8px 0 0", color: "var(--fg-3)" }}>The details that rarely change. Everything here is printed on every PDF.</p></div>
      <div style={{ display: "grid", gridTemplateColumns: "200px minmax(0, 1fr)", gap: 32, alignItems: "start" }}>
        <nav aria-label="Settings sections" style={{ display: "flex", flexDirection: "column", gap: 2, position: "sticky", top: 36 }}>
          {nav.map(([id, label]) => <a key={id} href={`#${id}`} style={{ padding: "8px 12px", borderRadius: 8, color: "var(--fg-2)", textDecoration: "none", fontSize: 13 }}>{label}</a>)}
        </nav>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 760 }}>
          {form ? <SettingsSections form={form} set={set} clients={clients} sections={["business", "client", "bank", "defaults", "numbering"]} />
            : [0, 1, 2].map((i) => <div key={i} className="card" style={{ padding: 24 }}><Skeleton w={180} h={24} /><div style={{ height: 12 }} /><Skeleton h={40} r={8} /><div style={{ height: 12 }} /><Skeleton h={40} r={8} /></div>)}
        </div>
      </div>
      <div className="glass" style={{ position: "fixed", left: 240, right: 0, bottom: 0, borderTop: "1px solid var(--line)", padding: "14px 40px", display: "flex", alignItems: "center", gap: 12, zIndex: 10 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--fg-3)", marginRight: "auto" }}>
          {dirty ? "Unsaved changes" : <><Icon name="check" size={14} strokeWidth={2} />All changes saved</>}
        </span>
        <button className="btn btn-ghost" onClick={reload} disabled={!dirty}>Discard</button>
        <button className="btn btn-primary" onClick={onSave} disabled={!dirty || busy}>Save settings</button>
      </div>
    </main>
  );
}
