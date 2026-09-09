"use client";

import { useState } from "react";
import { starPoints } from "../../../lib/go";

// All in board units, where the spacing between two points is 1.
const PAD = 1.15; // the margin the coordinates sit in
const COORD = 0.5; // how far into that margin they are centred
const STONE = 0.42; // under half the spacing, so the grid still reads between stones
const LAST = 0.13; // the mark on the stone just played
const LETTERS = "ABCDEFGHJKLMNOPQRST"; // Go boards skip I

// The board itself: lines, stones, and whatever is being shown on top of them.
export function Goban({
  board,
  size,
  turn,
  disabled,
  ko = null,
  last = null,
  dead = [],
  territory = null,
  onPlay,
  children,
}) {
  const [hover, setHover] = useState(null);
  const span = size - 1 + PAD * 2;
  const at = (point) => ({
    x: PAD + (point % size),
    y: PAD + Math.floor(point / size),
  });

  const stars = starPoints(size);
  const deadSet = new Set(dead);

  return (
    <div className="goban__wrap">
      <svg
        className="goban"
        viewBox={`0 0 ${span} ${span}`}
        role="grid"
        aria-label={`Go board, ${size} by ${size}`}
        onPointerLeave={() => setHover(null)}>
        <rect className="goban__face" x="0" y="0" width={span} height={span} rx="0.3" />

        {Array.from({ length: size }, (_, i) => (
          <g key={i} className="goban__lines">
            <line x1={PAD} y1={PAD + i} x2={PAD + size - 1} y2={PAD + i} />
            <line x1={PAD + i} y1={PAD} x2={PAD + i} y2={PAD + size - 1} />
          </g>
        ))}

        {/* a real board's outer line is the heavy one */}
        <rect
          className="goban__border"
          x={PAD}
          y={PAD}
          width={size - 1}
          height={size - 1}
        />

        {stars.map((point) => {
          const { x, y } = at(point);
          return <circle key={`s${point}`} className="goban__star" cx={x} cy={y} r="0.09" />;
        })}

        {Array.from({ length: size }, (_, i) => (
          <g key={`c${i}`} className="goban__coords">
            <text x={PAD + i} y={COORD} textAnchor="middle" dominantBaseline="central">
              {LETTERS[i]}
            </text>
            <text x={COORD} y={PAD + i} textAnchor="middle" dominantBaseline="central">
              {size - i}
            </text>
          </g>
        ))}

        {territory &&
          territory.map((colour, point) => {
            if (!colour || board[point]) return null;
            const { x, y } = at(point);
            return (
              <rect
                key={`t${point}`}
                className={`goban__territory goban__territory--${colour}`}
                x={x - 0.14}
                y={y - 0.14}
                width="0.28"
                height="0.28"
              />
            );
          })}

        {board.map((stone, point) => {
          if (!stone) return null;
          const { x, y } = at(point);
          return (
            <g key={`p${point}`} className={deadSet.has(point) ? "is-dead" : ""}>
              <circle
                className={`goban__stone goban__stone--${stone}`}
                cx={x}
                cy={y}
                r={STONE}
              />
              {point === last && (
                <circle
                  className={`goban__last goban__last--${stone}`}
                  cx={x}
                  cy={y}
                  r={LAST}
                />
              )}
              {deadSet.has(point) && (
                <g className="goban__cross">
                  <line x1={x - 0.2} y1={y - 0.2} x2={x + 0.2} y2={y + 0.2} />
                  <line x1={x + 0.2} y1={y - 0.2} x2={x - 0.2} y2={y + 0.2} />
                </g>
              )}
            </g>
          );
        })}

        {ko != null && !board[ko] && (
          <rect
            className="goban__ko"
            x={at(ko).x - 0.16}
            y={at(ko).y - 0.16}
            width="0.32"
            height="0.32"
          />
        )}

        {hover != null && !board[hover] && !disabled && (
          <circle
            className={`goban__stone goban__stone--${turn} is-ghost`}
            cx={at(hover).x}
            cy={at(hover).y}
            r={STONE}
          />
        )}

        {board.map((stone, point) => {
          const { x, y } = at(point);
          return (
            <rect
              key={`h${point}`}
              className="goban__hit"
              x={x - 0.5}
              y={y - 0.5}
              width="1"
              height="1"
              role="gridcell"
              aria-label={`${LETTERS[point % size]}${size - Math.floor(point / size)}${
                stone ? (stone === "b" ? ", black" : ", white") : ", empty"
              }`}
              onPointerEnter={(event) => {
                // a finger leaves no cursor behind, so it leaves no ghost stone
                if (event.pointerType !== "touch") setHover(point);
              }}
              onClick={() => !disabled && onPlay?.(point)}
            />
          );
        })}
      </svg>
      {children}
    </div>
  );
}
