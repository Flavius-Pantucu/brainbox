"use client";

import { SIZE, colourOf, isKing, playable } from "../../../lib/checkers";

const NAMES = { b: "Black", r: "Red" };
const FILES = "abcdefgh";

// The draughts board, on its own so the dashboard can show one without
// starting a game on it.
export function CheckersGrid({
  board,
  selected = null,
  targets = [],
  path = [],
  chain = null,
  disabled,
  onPress,
  children,
}) {
  const canLand = new Set(targets.map((step) => step.to));
  const walked = new Set(path);

  return (
    <div className="chk__wrap">
      <div className="chk__grid" role="grid" aria-label="Draughts board">
        {board.map((piece, point) => {
          const row = Math.floor(point / SIZE);
          const col = point % SIZE;
          const dark = playable(point);
          const colour = colourOf(piece);
          const open = canLand.has(point);

          return (
            <button
              key={point}
              type="button"
              role="gridcell"
              className={[
                "chk__cell",
                dark ? "chk__cell--dark" : "chk__cell--light",
                open ? "is-open" : "",
                selected === point ? "is-selected" : "",
                chain === point ? "is-chained" : "",
                walked.has(point) ? "is-walked" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={disabled || (!open && !colour)}
              onClick={() => onPress?.(point)}
              aria-label={`${FILES[col]}${SIZE - row}${
                piece ? `, ${NAMES[colour]} ${isKing(piece) ? "king" : "man"}` : open ? ", open" : ", empty"
              }`}>
              {piece && (
                <span className={`chk__piece chk__piece--${colour} ${isKing(piece) ? "is-king" : ""}`}>
                  {isKing(piece) && <span className="chk__crown" aria-hidden="true" />}
                </span>
              )}
              {open && !piece && <span className="chk__open" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      {children}
    </div>
  );
}
