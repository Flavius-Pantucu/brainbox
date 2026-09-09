"use client";

import { useEffect, useRef } from "react";

// The result, lowered over the board it happened on. Not a dialog box: the
// board stays readable underneath, and it can be dismissed to look at it.
//
// Tone drives the mark and the colour — never colour on its own.
const MARKS = {
  won: <polyline points="16,34 27,45 48,20" />,
  lost: (
    <>
      <line x1="20" y1="20" x2="44" y2="44" />
      <line x1="44" y1="20" x2="20" y2="44" />
    </>
  ),
  drawn: <line x1="18" y1="32" x2="46" y2="32" />,
  neutral: <circle cx="32" cy="32" r="14" />,
};

const SPARKS = [0, 45, 90, 135, 180, 225, 270, 315];

export function Verdict({ open, tone = "neutral", title, line, actions = [], onClose }) {
  const first = useRef(null);

  useEffect(() => {
    if (open) first.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open || !onClose) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={`verdict verdict--${tone}`} role="dialog" aria-label={title}>
      <div className="verdict__card">
        <span className="verdict__mark">
          <svg viewBox="0 0 64 64" aria-hidden="true">
            {MARKS[tone] || MARKS.neutral}
          </svg>
          {tone === "won" &&
            SPARKS.map((angle) => (
              <i key={angle} style={{ "--angle": `${angle}deg` }} aria-hidden="true" />
            ))}
        </span>

        <p className="verdict__title">{title}</p>
        {line && <p className="verdict__line">{line}</p>}

        {actions.length > 0 && (
          <div className="verdict__actions">
            {actions.map((action, i) => (
              <button
                key={action.label}
                type="button"
                ref={i === 0 ? first : null}
                className={i === 0 ? "key" : "key key--quiet"}
                onClick={action.onClick}>
                {action.label}
              </button>
            ))}
          </div>
        )}

        {onClose && (
          <button type="button" className="verdict__close" onClick={onClose}>
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
