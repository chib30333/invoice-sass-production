"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Icon } from "./Icon";

interface Toast { id: number; text: string; kind: "success" | "error" | "info"; action?: { label: string; onClick: () => void }; ttl: number }
interface ToastApi { push: (t: Omit<Toast, "id" | "ttl"> & { ttl?: number }) => void }

const Ctx = createContext<ToastApi>({ push: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback<ToastApi["push"]>((t) => {
    const id = ++seq.current;
    const ttl = t.ttl ?? (t.kind === "error" ? 0 : t.action ? 5000 : 4000);
    setToasts((prev) => [...prev.slice(-2), { ...t, id, ttl }]);
    if (ttl) setTimeout(() => dismiss(id), ttl);
  }, [dismiss]);

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast glass ${t.kind}`} role={t.kind === "error" ? "alert" : "status"}>
            {t.kind === "success" && <Icon name="check" size={16} style={{ color: "var(--paid)" }} />}
            {t.kind === "error" && <Icon name="warning" size={16} style={{ color: "var(--overdue)" }} />}
            <span>{t.text}</span>
            {t.action && <button className="btn-link" onClick={() => { t.action!.onClick(); dismiss(t.id); }}>{t.action.label}</button>}
            <button className="btn btn-icon" style={{ width: 32, height: 32 }} aria-label="Dismiss" onClick={() => dismiss(t.id)}><Icon name="close" size={14} /></button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
