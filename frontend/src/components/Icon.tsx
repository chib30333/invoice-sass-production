/* The icon set from the design: 24px grid, 1.8px stroke, round caps, coloured by currentColor. */
import type { CSSProperties } from "react";

const paths: Record<string, string> = {
  invoice: "M6 3h9l4 4v14H6zM9 12h7M9 16h5",
  clients: "M9 4.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM2.5 20a6.5 6.5 0 0113 0M16 4.5a3.5 3.5 0 010 7M21.5 20a6.5 6.5 0 00-4-6",
  settings: "M12 9a3 3 0 100 6 3 3 0 000-6zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1",
  search: "M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-3.5-3.5",
  plus: "M12 5v14M5 12h14",
  download: "M12 4v11m0 0l-4-4m4 4l4-4M5 20h14",
  check: "M5 12.5l4.5 4.5L19 7.5",
  close: "M6 6l12 12M18 6L6 18",
  chevronLeft: "M15 6l-6 6 6 6",
  chevronRight: "M9 6l6 6-6 6",
  chevronDown: "M6 9l6 6 6-6",
  arrowRight: "M5 12h14m-5-5l5 5-5 5",
  link: "M10 14a4 4 0 010-5.7l2.3-2.3a4 4 0 115.7 5.7L17 12.7M14 10a4 4 0 010 5.7l-2.3 2.3a4 4 0 11-5.7-5.7L7 11.3",
  warning: "M12 3a9 9 0 100 18 9 9 0 000-18zM12 8v5m0 3v.5",
  clock: "M12 3a9 9 0 100 18 9 9 0 000-18zM12 8v4l2.5 2.5",
  fullscreen: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
  command: "M4 8h16M4 16h16M9 4l-3 16M18 4l-3 16",
  shield: "M12 3l8 4v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V7zM9 12l2 2 4-4",
  key: "M9 4a5 5 0 100 10 5 5 0 000-10zM13 13l7 7M17 17l2-2M14 20l2-2",
  eye: "M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6zM12 9a3 3 0 100 6 3 3 0 000-6z",
  lock: "M3 11h18v10H3zM7 11V8a5 5 0 0110 0v3",
  moon: "M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z",
  sun: "M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  play: "M8 5v14l11-7z",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  logout: "M10 17l5-5-5-5M15 12H3M21 4v16",
};

export function Icon({ name, size = 16, style, strokeWidth = 1.8 }: { name: keyof typeof paths | string; size?: number; style?: CSSProperties; strokeWidth?: number }) {
  if (name === "grip") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={style} aria-hidden="true">
        {[6, 12, 18].map((y) => [9, 15].map((x) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.6" />))}
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
      <path d={paths[name] ?? ""} />
    </svg>
  );
}
