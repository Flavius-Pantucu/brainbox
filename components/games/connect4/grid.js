"use client";

import { useState } from "react";
import { COLS, ROWS, landingRow } from "../../../lib/connect4";

const NAMES = { R: "Red", Y: "Yellow" };

// The Connect Four grid, on its own so the dashboard can show one without
// starting a game on it.
export function Grid({ board, line, last, onDrop, disabled, ghost, children }) {
  const [over, setOver] = useState(null);
  const landing = over == null ? -1 : landingRow(board, over);

  return (
    <div className="c4__gridwrap">
      <div className="c4__grid" role="grid" aria-label="Connect Four board" onPointerLeave={() => setOver(null)}>
        {Array.from({ length: ROWS * COLS }, (_, cell) => {
          const row = Math.floor(cell / COLS);
          const col = cell % COLS;
          const disc = board[cell];
          const win = line?.includes(cell);
          return (
            <button
              key={cell}
              type="button"
              role="gridcell"
              className={[
                "c4__cell",
                over === col ? "is-column" : "",
                win ? "is-win" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={disabled || landingRow(board, col) < 0}
              onPointerEnter={() => setOver(col)}
              onFocus={() => setOver(col)}
              onClick={() => onDrop(col)}
              aria-label={`Column ${col + 1}, row ${ROWS - row}${
                disc ? `, ${NAMES[disc]}` : ", empty"
              }`}>
              <span className="c4__hole">
                {disc && (
                  <span
                    className={`c4__disc c4__disc--${disc.toLowerCase()} ${
                      cell === last ? "is-dropping" : ""
                    }`}
                    style={{ "--fall": row + 1 }}
                  />
                )}
                {!disc && ghost && row === landing && !disabled && (
                  <span className={`c4__disc c4__disc--${ghost.toLowerCase()} is-ghost`} />
                )}
              </span>
            </button>
          );
        })}
      </div>
      {children}
    </div>
  );
}
