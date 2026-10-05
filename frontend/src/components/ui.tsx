"use client";
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { Icon } from "./Icon";

export function Field({ label, htmlFor, help, warning, children, right }: { label: ReactNode; htmlFor: string; help?: ReactNode; warning?: string | false; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="field">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <label className="lbl" htmlFor={htmlFor}>{label}</label>
        {right}
      </div>
      {children}
      {warning && <div className="warn"><Icon name="warning" size={14} style={{ flex: "0 0 14px", marginTop: 1 }} strokeWidth={2} /><span>{warning}</span></div>}
      {!warning && help && <span className="help">{help}</span>}
    </div>
  );
}

export function Input({ invalid, className = "", ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={`input ${invalid ? "err" : ""} ${className}`} {...rest} />;
}

export function Textarea({ invalid, className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea className={`textarea ${invalid ? "err" : ""} ${className}`} {...rest} />;
}

export function Badge({ status }: { status: "draft" | "sent" | "paid" | "overdue" }) {
  const label = { draft: "Draft", sent: "Sent", paid: "Paid", overdue: "Overdue" }[status];
  return <span className={`badge badge-${status}`}>{label}</span>;
}

export function Logo({ dark }: { dark?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10, color: dark ? "#F1EDE4" : "var(--fg)" }}>
      <span style={{ width: 28, height: 28, borderRadius: 8, background: dark ? "#F1EDE4" : "var(--fg)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: dark ? "#0E0D0B" : "var(--bg)" }}>
        <Icon name="invoice" size={16} strokeWidth={2} />
      </span>
      <span className="display" style={{ fontSize: 20, letterSpacing: "-.01em" }}>Invoice Studio</span>
    </span>
  );
}

export function Skeleton({ w = "100%", h = 14, r = 6, style }: { w?: number | string; h?: number; r?: number; style?: React.CSSProperties }) {
  return <span className="sk" style={{ width: w, height: h, borderRadius: r, ...style }} aria-hidden="true" />;
}

export function Dialog({ title, children, onClose, actions }: { title: string; children: ReactNode; onClose: () => void; actions: ReactNode }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h3 className="display" style={{ margin: 0, fontSize: 26 }}>{title}</h3>
        <p style={{ margin: 0, color: "var(--fg-2)", lineHeight: 1.5 }}>{children}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>{actions}</div>
      </div>
    </div>
  );
}
