"use client";

import { SIZE } from "../../../lib/reversi";

const NAMES = { b: "Black", w: "White" };
const FILES = "abcdefgh";

// The reversi board, on its own so the dashboard can show one without starting
// a game on it.
export function ReversiGrid({
  board,
  turn,
  moves = null,
  last = null,
  flipped = [],
  disabled,
  onPlay,
  children,
}) {
  const playable = moves ? new Set(moves) : null;
  const turning = new Set(flipped);

  return (
    <div className="rev__wrap">
      <div className="rev__grid" role="grid" aria-label="Reversi board">
        {board.map((disc, point) => {
          const row = Math.floor(point / SIZE);
          const col = point % SIZE;
          const open = !disc && playable?.has(point) && !disabled;
          return (
            <button
              key={point}
              type="button"
              role="gridcell"
              className={[
                "rev__cell",
                open ? "is-open" : "",
                point === last ? "is-last" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={disabled || !open}
              onClick={() => onPlay?.(point)}
              aria-label={`${FILES[col]}${SIZE - row}${disc ? `, ${NAMES[disc]}` : open ? ", open" : ", empty"}`}>
              {disc && (
                <span
                  className={`rev__disc rev__disc--${disc} ${
                    turning.has(point) ? "is-turning" : ""
                  }`}
                />
              )}
              {open && <span className="rev__open" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      {children}
    </div>
  );
}
