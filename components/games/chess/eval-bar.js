"use client";

import { evalText, evalToShare } from "../../../lib/chess-core";

// The bar reads from white's side always; it flips with the board so the side
// you are playing is the one nearest you.
export function EvalBar({ score, orientation = "w", thinking = false, hidden = false }) {
  const share = hidden ? 0.5 : evalToShare(score);
  const white = `${Math.round(share * 100)}%`;
  const label = hidden ? "?" : evalText(score);

  return (
    <div
      className={`evalbar ${orientation === "b" ? "evalbar--flipped" : ""} ${
        thinking ? "is-thinking" : ""
      }`}
      role="img"
      aria-label={hidden ? "Evaluation hidden" : `Evaluation ${label}`}>
      <div className="evalbar__white" style={{ height: white }} />
      <span className={`evalbar__value ${share > 0.5 ? "is-white" : "is-black"}`}>{label}</span>
    </div>
  );
}
