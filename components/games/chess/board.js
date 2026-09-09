"use client";

import { useCallback, useEffect, useState } from "react";
import { FILES, RANKS, pieceImage, PIECE_NAME } from "../../../lib/chess-core";

const PROMOTIONS = ["q", "r", "b", "n"];

// Which square is under a pointer. Reading it off the DOM beats doing the
// arithmetic: it survives borders, padding and a board that is mid-resize.
function squareUnder(x, y) {
  const el = document.elementFromPoint(x, y);
  return el?.closest?.("[data-square]")?.dataset.square || null;
}

function centreOf(square, orientation) {
  const file = FILES.indexOf(square[0]);
  const rank = RANKS.indexOf(square[1]);
  const col = orientation === "w" ? file : 7 - file;
  const row = orientation === "w" ? rank : 7 - rank;
  return { x: col * 12.5 + 6.25, y: row * 12.5 + 6.25 };
}

function Arrow({ from, to, orientation, tone }) {
  const a = centreOf(from, orientation);
  const b = centreOf(to, orientation);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  // stop short of the middle of the target square so the head sits in it
  const back = 3.6;
  const end = { x: b.x - (dx / len) * back, y: b.y - (dy / len) * back };
  return (
    <g className={`chessarrow chessarrow--${tone}`}>
      <line x1={a.x} y1={a.y} x2={end.x} y2={end.y} />
      <polygon
        points="0,-2.6 5.2,0 0,2.6"
        transform={`translate(${end.x} ${end.y}) rotate(${(Math.atan2(dy, dx) * 180) / Math.PI})`}
      />
    </g>
  );
}

export function Board({
  board,
  orientation = "w",
  interactive = true,
  drag: dragging = true,
  selected = null,
  targets = [],
  lastMove = null,
  checkSquare = null,
  marks = [],
  arrows = [],
  hintArrow = null,
  promotion = null,
  onSelect,
  onMove,
  onOffBoard,
  onMark,
  onArrow,
  onPromote,
  onCancelPromotion,
  children,
}) {
  const [drag, setDrag] = useState(null);
  const rows = orientation === "w" ? board : [...board].reverse().map((row) => [...row].reverse());

  const targetSet = new Map(targets.map((move) => [move.to, move]));

  const endDrag = useCallback(
    (event) => {
      setDrag((active) => {
        if (!active) return null;
        const to = squareUnder(event.clientX, event.clientY);
        // dragged clean off the board: in set-up mode that means "take it away"
        if (!to) onOffBoard?.(active.from);
        else if (to !== active.from) onMove?.(active.from, to);
        return null;
      });
    },
    [onMove, onOffBoard]
  );

  useEffect(() => {
    if (!drag) return undefined;
    const move = (event) =>
      setDrag((active) => (active ? { ...active, x: event.clientX, y: event.clientY } : null));
    const drop = () => setDrag(null);
    // touch-action alone has let the page scroll out from under a drag on some
    // phones; refusing the touchmove outright cannot
    const hold = (event) => event.preventDefault();

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", drop);
    document.addEventListener("touchmove", hold, { passive: false });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", drop);
      document.removeEventListener("touchmove", hold);
    };
  }, [drag, endDrag]);

  const pointerDown = (event, square, piece) => {
    // Right-press to left-release draws: on the same square it is a mark, on
    // another it is an arrow. The context menu fires on press, not release, so
    // the release has to be caught on the window.
    if (event.button === 2) {
      const done = (up) => {
        window.removeEventListener("pointerup", done);
        const to = squareUnder(up.clientX, up.clientY) || square;
        if (to === square) onMark?.(square);
        else onArrow?.({ from: square, to });
      };
      window.addEventListener("pointerup", done);
      return;
    }
    if (event.button !== 0 || !interactive) return;
    onSelect?.(square);
    if (piece && dragging) {
      event.preventDefault();
      // keep the moves coming to this square even once the finger leaves it
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* a mouse that has already released has nothing to capture */
      }
      setDrag({
        from: square,
        piece,
        size: event.currentTarget.offsetWidth,
        x: event.clientX,
        y: event.clientY,
      });
    }
  };

  return (
    <div className="chessboard__wrap">
      <div
        className={`chessboard chessboard--${orientation}`}
        role="grid"
        aria-label="Chess board"
        onContextMenu={(event) => event.preventDefault()}>
        {rows.map((row, rowIndex) =>
          row.map((piece, colIndex) => {
            const file = orientation === "w" ? colIndex : 7 - colIndex;
            const rank = orientation === "w" ? rowIndex : 7 - rowIndex;
            const square = `${FILES[file]}${RANKS[rank]}`;
            const target = targetSet.get(square);
            const dark = (file + rank) % 2 === 1;
            const classes = [
              "chesssq",
              dark ? "chesssq--dark" : "chesssq--light",
              selected === square ? "is-selected" : "",
              lastMove && (lastMove.from === square || lastMove.to === square) ? "is-last" : "",
              checkSquare === square ? "is-check" : "",
              marks.includes(square) ? "is-marked" : "",
              drag?.from === square ? "is-lifted" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <div
                key={square}
                role="gridcell"
                data-square={square}
                className={classes}
                onPointerDown={(event) => pointerDown(event, square, piece)}>
                {colIndex === 0 && <span className="chesssq__rank">{RANKS[rank]}</span>}
                {rowIndex === 7 && <span className="chesssq__file">{FILES[file]}</span>}
                {piece && (
                  <img
                    className="chesspiece"
                    src={pieceImage(piece.color, piece.type)}
                    alt={`${piece.color === "w" ? "White" : "Black"} ${PIECE_NAME[piece.type]}`}
                    draggable={false}
                  />
                )}
                {target && <span className={target.captured ? "chessdot chessdot--take" : "chessdot"} />}
              </div>
            );
          })
        )}

        <svg className="chessoverlay" viewBox="0 0 100 100" aria-hidden="true">
          {hintArrow && <Arrow {...hintArrow} orientation={orientation} tone="hint" />}
          {arrows.map((arrow) => (
            <Arrow
              key={`${arrow.from}${arrow.to}`}
              {...arrow}
              orientation={orientation}
              tone="drawn"
            />
          ))}
        </svg>

        {promotion && (
          <div className="chesspromo" role="dialog" aria-label="Choose a promotion piece">
            <div className="chesspromo__card">
              <span className="chesspromo__label">Promote to</span>
              <div className="chesspromo__row">
                {PROMOTIONS.map((type) => (
                  <button
                    key={type}
                    type="button"
                    className="chesspromo__pick"
                    onClick={() => onPromote?.(type)}>
                    <img src={pieceImage(promotion.color, type)} alt={PIECE_NAME[type]} />
                  </button>
                ))}
              </div>
              <button type="button" className="key key--quiet" onClick={onCancelPromotion}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {children}

      {drag && (
        <img
          className="chesspiece chesspiece--drag"
          src={pieceImage(drag.piece.color, drag.piece.type)}
          alt=""
          style={{ left: drag.x, top: drag.y, width: drag.size, height: drag.size }}
        />
      )}
    </div>
  );
}
