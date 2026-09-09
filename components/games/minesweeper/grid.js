"use client";

import { Flag, Mine } from "../../board/icons";

// Danger is a number, and the number is the mark. The three bands only carry
// how bad it is getting.
function band(near) {
  if (near <= 2) return "low";
  if (near <= 4) return "mid";
  return "high";
}

// The minefield, on its own so the dashboard can show one without starting a
// game on it.
export function MineField({
  field,
  revealed,
  flags,
  lost = false,
  hit = null,
  disabled = false,
  flagging = false,
  onOpen,
  onFlag,
  children,
}) {
  const { cols, rows } = field;

  return (
    <div
      className="ms__wrap"
      style={{ "--ms-cols": cols, "--ms-rows": rows }}>
      <div
        className="ms__grid"
        role="grid"
        aria-label="Minefield"
        onContextMenu={(event) => event.preventDefault()}>
        {revealed.map((open, point) => {
          const mine = field.mines[point];
          const flagged = flags[point];
          const near = field.near[point];
          const showMine = lost && mine && !flagged;
          const wrongFlag = lost && flagged && !mine;

          return (
            <button
              key={point}
              type="button"
              role="gridcell"
              className={[
                "ms__cell",
                open ? "is-open" : "is-shut",
                open && !mine && near ? `is-${band(near)}` : "",
                point === hit ? "is-hit" : "",
                wrongFlag ? "is-wrong" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={disabled}
              onClick={() => (flagging && !open ? onFlag?.(point) : onOpen?.(point))}
              onContextMenu={(event) => {
                event.preventDefault();
                onFlag?.(point);
              }}
              aria-label={`Square ${point + 1}${
                flagged ? ", flagged" : open ? (mine ? ", mine" : `, ${near}`) : ", closed"
              }`}>
              {flagged && !showMine && <Flag className="ms__flag" size={14} />}
              {showMine && <Mine className="ms__mine" size={14} />}
              {open && !mine && near > 0 && <span className="ms__near">{near}</span>}
            </button>
          );
        })}
      </div>
      {children}
    </div>
  );
}
