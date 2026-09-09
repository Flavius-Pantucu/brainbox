"use client";

// The tic-tac-toe board, on its own so the dashboard can show one without
// starting a game on it.

function Mark({ mark, delay = 0 }) {
  if (!mark) return null;
  return (
    <svg className={`mark mark--${mark.toLowerCase()}`} viewBox="0 0 100 100" aria-hidden="true">
      {mark === "X" ? (
        <>
          <line x1="22" y1="22" x2="78" y2="78" style={{ animationDelay: `${delay}ms` }} />
          <line
            x1="78"
            y1="22"
            x2="22"
            y2="78"
            style={{ animationDelay: `${delay + 110}ms` }}
          />
        </>
      ) : (
        <circle cx="50" cy="50" r="28" style={{ animationDelay: `${delay}ms` }} />
      )}
    </svg>
  );
}

const LINE_ENDS = {
  "0,1,2": [3, 16.7, 97, 16.7],
  "3,4,5": [3, 50, 97, 50],
  "6,7,8": [3, 83.3, 97, 83.3],
  "0,3,6": [16.7, 3, 16.7, 97],
  "1,4,7": [50, 3, 50, 97],
  "2,5,8": [83.3, 3, 83.3, 97],
  "0,4,8": [6, 6, 94, 94],
  "2,4,6": [94, 6, 6, 94],
};

function WinLine({ line }) {
  if (!line) return null;
  const ends = LINE_ENDS[line.join(",")];
  if (!ends) return null;
  const [x1, y1, x2, y2] = ends;
  return (
    <svg className="ttt__strike" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
    </svg>
  );
}

/* ----------------------------------------------------------------- board --- */

export function Board({ board, line, onPlay, disabled, ghost, children }) {
  return (
    <div className="ttt__boardwrap">
      <div className="ttt__board" role="grid" aria-label="Tic-tac-toe board">
        <svg className="ttt__hash" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <line x1="33.33" y1="3" x2="33.33" y2="97" />
          <line x1="66.67" y1="3" x2="66.67" y2="97" />
          <line x1="3" y1="33.33" x2="97" y2="33.33" />
          <line x1="3" y1="66.67" x2="97" y2="66.67" />
        </svg>
        {board.map((cell, i) => (
          <button
            key={i}
            type="button"
            role="gridcell"
            className={[
              "ttt__cell",
              cell ? "is-taken" : "",
              line?.includes(i) ? "is-win" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            disabled={disabled || !!cell}
            onClick={() => onPlay(i)}
            aria-label={
              cell ? `Square ${i + 1}, ${cell}` : `Square ${i + 1}, empty`
            }>
            <Mark mark={cell} />
            {!cell && ghost && <span className="ttt__ghost">{ghost}</span>}
          </button>
        ))}
        <WinLine line={line} />
      </div>
      {children}
    </div>
  );
}

