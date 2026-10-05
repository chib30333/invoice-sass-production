"use client";
import Link from "next/link";
import { Logo } from "./ui";

/* Split layout shared by sign-in / sign-up: artwork + mascot on one side, the form on the other. */
export function AuthShell({ side, art, mascot, headline, copy, children }: {
  side: "left" | "right"; art: "light" | "dark"; mascot: string; headline: string; copy: React.ReactNode; children: React.ReactNode;
}) {
  const dark = art === "dark";
  const panel = (
    <aside className="auth-art" style={{ background: dark ? "#0E0D0B" : "var(--sunken)", color: dark ? "#F1EDE4" : "#15130F" }}>
      <img src={`/img/desk-${art}.jpg`} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: dark ? .85 : 1 }} />
      <div style={{ position: "absolute", inset: 0, background: dark ? "linear-gradient(180deg, rgba(14,13,11,.2) 0%, rgba(14,13,11,.85) 100%)" : "linear-gradient(180deg, rgba(246,244,239,0) 30%, rgba(246,244,239,.92) 100%)" }} />
      {dark && <Link href="/" style={{ position: "absolute", top: 28, left: 36, textDecoration: "none" }}><Logo dark /></Link>}
      <img className="float" src={mascot} alt="" style={{ position: "absolute", left: "50%", bottom: 170, width: 300, marginLeft: -150, filter: `drop-shadow(0 30px 30px rgba(0,0,0,${dark ? .5 : .25}))` }} />
      <div style={{ position: "absolute", left: 36, right: 36, bottom: 40, display: "flex", flexDirection: "column", gap: 12, maxWidth: 440 }}>
        <h2 className="display" style={{ margin: 0, fontSize: 36 }}>{headline}</h2>
        <div style={{ color: dark ? "rgba(241,237,228,.72)" : "#5C5750", lineHeight: 1.5 }}>{copy}</div>
      </div>
    </aside>
  );
  const form = <main className="auth-form"><div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 22 }}>{!dark && <Link href="/" style={{ textDecoration: "none", alignSelf: "flex-start", marginBottom: 8 }}><Logo /></Link>}{children}</div></main>;
  return <div className="auth-split">{side === "left" ? <>{panel}{form}</> : <>{form}{panel}</>}</div>;
}
