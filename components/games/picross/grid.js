"use client";

import { CROSSED, FILLED, colAt, lineDone, rowAt } from "../../../lib/picross";

// How much room the clue bands take, in cells. A row clue reads across, so
// each number costs a little over half a cell; a column clue stacks.
function bands(clues) {
  const across = Math.max(...clues.rows.map((c) => c.length));
  const down = Math.max(...clues.cols.map((c) => c.length));
  return {
    bx: Math.max(1.4, across * 0.62 + 0.5),
    by: Math.max(1.3, down * 0.68 + 0.35),
  };
}

// The PiCross board — clue bands and the grid — on its own so the dashboard
// can show one without starting a game on it. It knows nothing about the clock
// or the tools; the surface hands it pointer and key handlers.
export function PicrossGrid({
  n,
  clues,
  cells,
  cursor = null,
  solved = false,
  gridRef,
  cellRefs,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onKeyDown,
  children,
}) {
  const { bx, by } = bands(clues);
  const hotRow = cursor === null ? -1 : (cursor / n) | 0;
  const hotCol = cursor === null ? -1 : cursor % n;

  const clueClass = (done, hot, x) =>
    [
      "pic__clue",
      done ? "is-done" : "",
      hot ? "is-hot" : "",
      x % 2 ? "is-odd" : "",
      x % 5 === 4 && x !== n - 1 ? "edge" : "",
    ]
      .filter(Boolean)
      .join(" ");

  return (
    <div
      className={`pic__wrap ${solved ? "is-solved" : ""}`}
      style={{ "--n": n, "--bx": bx, "--by": by, "--ratio": (n + bx) / (n + by) }}>
      <div
        className="pic__board"
        style={{ gridTemplateColumns: `${bx}fr ${n}fr`, gridTemplateRows: `${by}fr ${n}fr` }}>
        <div className="pic__corner" aria-hidden="true" />

        <div className="pic__cols" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          {clues.cols.map((clue, c) => {
            const done = lineDone(colAt(cells, n, c), clue);
            return (
              <div
                key={c}
                className={clueClass(done, c === hotCol, c)}
                aria-label={`Column ${c + 1}: ${clue.join(" ")}${done ? ", done" : ""}`}>
                {clue.map((run, i) => (
                  <span key={i}>{run}</span>
                ))}
              </div>
            );
          })}
        </div>

        <div className="pic__rows" style={{ gridTemplateRows: `repeat(${n}, minmax(0, 1fr))` }}>
          {clues.rows.map((clue, r) => {
            const done = lineDone(rowAt(cells, n, r), clue);
            return (
              <div
                key={r}
                className={clueClass(done, r === hotRow, r)}
                aria-label={`Row ${r + 1}: ${clue.join(" ")}${done ? ", done" : ""}`}>
                {clue.map((run, i) => (
                  <span key={i}>{run}</span>
                ))}
              </div>
            );
          })}
        </div>

        <div
          className="pic__grid"
          ref={gridRef}
          role="grid"
          aria-label={`PiCross grid, ${n} by ${n}`}
          style={{
            gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${n}, minmax(0, 1fr))`,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          onContextMenu={(event) => event.preventDefault()}>
          {cells.map((cell, i) => {
            const r = (i / n) | 0;
            const c = i % n;
            return (
              <button
                key={i}
                type="button"
                role="gridcell"
                data-i={i}
                ref={cellRefs ? (node) => (cellRefs.current[i] = node) : undefined}
                tabIndex={i === (cursor ?? 0) ? 0 : -1}
                className={[
                  "pic__cell",
                  cell === FILLED ? "is-filled" : cell === CROSSED ? "is-crossed" : "",
                  r === hotRow || c === hotCol ? "is-peer" : "",
                  c === n - 1 ? "end-col" : c % 5 === 4 ? "edge-right" : "",
                  r === n - 1 ? "end-row" : r % 5 === 4 ? "edge-bottom" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{ "--d": r + c }}
                aria-label={`Row ${r + 1} column ${c + 1}, ${
                  cell === FILLED ? "filled" : cell === CROSSED ? "crossed out" : "empty"
                }`}
              />
            );
          })}
        </div>
      </div>
      {children}
    </div>
  );
}
