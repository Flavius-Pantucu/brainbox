"use client";

import { useEffect, useRef } from "react";
import { VERDICTS } from "../../../lib/chess-core";

// The scoresheet. One row per full move, both halves clickable, and the board
// follows whatever is selected.
export function MoveList({ moves, cursor, onJump, verdicts = null, result = null }) {
  const live = useRef(null);

  useEffect(() => {
    live.current?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  const rows = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({ no: i / 2 + 1, white: moves[i], black: moves[i + 1], index: i });
  }

  const half = (move, index) => {
    if (!move) return <span className="movelist__half" />;
    const verdict = verdicts?.[index];
    const tone = verdict ? VERDICTS[verdict.verdict] : null;
    return (
      <button
        type="button"
        ref={cursor === index ? live : null}
        className={`movelist__half ${cursor === index ? "is-current" : ""} ${
          tone ? `is-${tone.tone}` : ""
        }`}
        onClick={() => onJump?.(index)}>
        <span className="movelist__san">{move.san}</span>
        {tone?.mark && <em className="movelist__mark">{tone.mark}</em>}
      </button>
    );
  };

  return (
    <div className="movelist">
      <div className="movelist__scroll">
        {rows.length === 0 && <p className="chalk chalk--tight movelist__empty">No moves yet.</p>}
        {rows.map((row) => (
          <div className="movelist__row" key={row.no}>
            <span className="movelist__no">{row.no}</span>
            {half(row.white, row.index)}
            {half(row.black, row.index + 1)}
          </div>
        ))}
      </div>

      {result && <p className="movelist__result">{result}</p>}

      <div className="movelist__nav">
        <button type="button" className="tool" onClick={() => onJump?.(-1)} disabled={cursor < 0}>
          «
        </button>
        <button
          type="button"
          className="tool"
          onClick={() => onJump?.(cursor - 1)}
          disabled={cursor < 0}>
          ‹
        </button>
        <button
          type="button"
          className="tool"
          onClick={() => onJump?.(cursor + 1)}
          disabled={cursor >= moves.length - 1}>
          ›
        </button>
        <button
          type="button"
          className="tool"
          onClick={() => onJump?.(moves.length - 1)}
          disabled={cursor >= moves.length - 1}>
          »
        </button>
      </div>
    </div>
  );
}
