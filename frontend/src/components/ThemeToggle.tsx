"use client";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";

const KEY = "invoice-studio:theme";

/* Runs before paint so the first frame already has the right theme. */
export function ThemeScript() {
  const code = `try{var t=localStorage.getItem("${KEY}")||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.dataset.theme=t}catch(e){}`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => { setTheme((document.documentElement.dataset.theme as "light" | "dark") || "light"); }, []);
  const flip = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(KEY, next); } catch {}
    setTheme(next);
  };
  return (
    <button className="btn btn-icon" onClick={flip} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} title="Theme">
      <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
    </button>
  );
}
