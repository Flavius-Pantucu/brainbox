"use client";

import { useEffect, useRef, useState } from "react";

const reduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Tabular numerals that count to their new reading when the board re-hangs.
export function Counter({ value, duration = 520, className = "", suffix = "" }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const frame = useRef(0);

  useEffect(() => {
    if (value === from.current) return undefined;
    if (reduced()) {
      from.current = value;
      setShown(value);
      return undefined;
    }
    const start = performance.now();
    const a = from.current;
    const b = value;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(a + (b - a) * eased));
      if (t < 1) frame.current = requestAnimationFrame(tick);
      else from.current = b;
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [value, duration]);

  return (
    <span className={className}>
      {shown}
      {suffix}
    </span>
  );
}
