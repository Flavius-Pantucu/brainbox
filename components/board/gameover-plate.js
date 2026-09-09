"use client";

// The board's own game-over notice: a plate lowered over the surface, not a
// generic dialog box.
import { useEffect, useRef } from "react";
import { Plate } from "./plate";

export function GameOverPlate({ open, title, line, actions = [] }) {
  const first = useRef(null);

  useEffect(() => {
    if (open) first.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 50,
        display: "grid",
        placeItems: "center",
        background: "color-mix(in srgb, var(--paint-board) 78%, transparent)",
        padding: 24,
      }}>
      <div style={{ width: "min(340px, 100%)" }}>
        <Plate tall hangKey={title}>
          <p
            className="today__game"
            style={{ fontSize: "clamp(1.9rem, 5vw, 2.4rem)", marginTop: 0 }}>
            {title}
          </p>
          <p className="chalk" style={{ marginTop: 0 }}>
            {line}
          </p>
          <div className="stack" style={{ marginTop: 20, gap: 10 }}>
            {actions.map((action, i) => (
              <button
                key={action.label}
                type="button"
                ref={i === 0 ? first : null}
                className={i === 0 ? "key" : "key key--quiet"}
                style={{ width: "100%" }}
                onClick={action.onClick}>
                {action.label}
              </button>
            ))}
          </div>
        </Plate>
      </div>
    </div>
  );
}
