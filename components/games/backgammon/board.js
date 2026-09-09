"use client";

import { countAt } from "../../../lib/backgammon";

// Board units. Twelve points either side of a bar, with the tray on the right.
const W = 7; // one point wide
const BAR = 47;
const TRAY = 89;
const H = 70; // board height, deep enough for two stacks of five to clear
const TOP = 1;
const BOTTOM = H - 1;
const ROW = 30; // how far a point reaches into the board
const R = 2.85; // a checker
const MAX_SHOWN = 5;

// Where a point sits, and which way it hangs.
export function pointAt(index) {
  if (index <= 5) return { x: BAR + (5 - index) * W, top: false };
  if (index <= 11) return { x: (11 - index) * W, top: false };
  if (index <= 17) return { x: (index - 12) * W, top: true };
  return { x: BAR + (index - 18) * W, top: true };
}

function Checkers({ count, colour, x, top, from = 0 }) {
  const shown = Math.min(count, MAX_SHOWN);
  const out = [];
  for (let i = 0; i < shown; i += 1) {
    const step = from + i * (R * 2 + 0.2) + R + 0.4;
    const cy = top ? TOP + step : BOTTOM - step;
    out.push(
      <circle key={i} className={`bg__checker bg__checker--${colour}`} cx={x} cy={cy} r={R} />
    );
  }
  if (count > MAX_SHOWN) {
    const step = from + (shown - 1) * (R * 2 + 0.2) + R + 0.4;
    const cy = top ? TOP + step : BOTTOM - step;
    out.push(
      <text key="n" className={`bg__stack bg__stack--${colour}`} x={x} y={cy} textAnchor="middle" dominantBaseline="central">
        {count}
      </text>
    );
  }
  return out;
}

export function BackgammonBoard({
  state,
  plays = [],
  selected = null,
  last = [],
  disabled = false,
  onPress,
  children,
}) {
  const sources = new Set(plays.map((play) => play.from));
  const targets = new Set(
    plays.filter((play) => play.from === selected).map((play) => play.to)
  );
  const touched = new Set(last.flatMap((play) => [play.from, play.to]));

  return (
    <div className="bg__wrap">
      <svg className="bg__board" viewBox={`0 0 100 ${H}`} role="grid" aria-label="Backgammon board">
        <rect className="bg__face" x="0" y="0" width="100" height={H} rx="1.4" />
        <rect className="bg__bar" x={BAR - 5} y="0" width="5" height={H} />
        <rect className="bg__tray" x={TRAY} y="0" width="11" height={H} rx="1" />

        {Array.from({ length: 24 }, (_, index) => {
          const { x, top } = pointAt(index);
          const mid = x + W / 2;
          const base = top ? TOP : BOTTOM;
          const tip = top ? TOP + ROW : BOTTOM - ROW;
          const white = countAt(state.board, index, "w");
          const black = countAt(state.board, index, "b");

          return (
            <g key={index}>
              <polygon
                className={[
                  "bg__point",
                  index % 2 ? "bg__point--dark" : "bg__point--light",
                  touched.has(index) ? "is-last" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                points={`${x + 0.3},${base} ${x + W - 0.3},${base} ${mid},${tip}`}
              />
              {targets.has(index) && (
                <circle className="bg__target" cx={mid} cy={top ? TOP + 4 : BOTTOM - 4} r="1.5" />
              )}
              {white > 0 && <Checkers count={white} colour="w" x={mid} top={top} />}
              {black > 0 && <Checkers count={black} colour="b" x={mid} top={top} />}
            </g>
          );
        })}

        {/* the bar, where a checker waits to come back in */}
        {state.bar.w > 0 && (
          <Checkers count={state.bar.w} colour="w" x={BAR - 2.5} top={false} from={12} />
        )}
        {state.bar.b > 0 && (
          <Checkers count={state.bar.b} colour="b" x={BAR - 2.5} top from={12} />
        )}

        {/* and the tray, where it ends up */}
        {state.off.w > 0 && (
          <g>
            <rect className="bg__off bg__off--w" x={TRAY + 1.4} y={BOTTOM - 3} width="8" height="2" rx="0.6" />
            <text className="bg__offcount" x={TRAY + 5.4} y={BOTTOM - 6.5} textAnchor="middle">
              {state.off.w}
            </text>
          </g>
        )}
        {state.off.b > 0 && (
          <g>
            <rect className="bg__off bg__off--b" x={TRAY + 1.4} y={TOP + 1} width="8" height="2" rx="0.6" />
            <text className="bg__offcount" x={TRAY + 5.4} y={TOP + 6.5} textAnchor="middle">
              {state.off.b}
            </text>
          </g>
        )}

        {/* hit areas: a whole point column, the bar, and the tray */}
        {Array.from({ length: 24 }, (_, index) => {
          const { x, top } = pointAt(index);
          const open = sources.has(index) || targets.has(index);
          return (
            <rect
              key={`h${index}`}
              className={`bg__hit ${open ? "is-open" : ""} ${selected === index ? "is-picked" : ""}`}
              x={x}
              y={top ? 0 : H / 2}
              width={W}
              height={H / 2}
              role="gridcell"
              aria-label={`Point ${index + 1}`}
              onClick={() => !disabled && onPress?.(index)}
            />
          );
        })}

        <rect
          className={`bg__hit ${sources.has("bar") ? "is-open" : ""} ${
            selected === "bar" ? "is-picked" : ""
          }`}
          x={BAR - 5}
          y="0"
          width="5"
          height={H}
          role="gridcell"
          aria-label="The bar"
          onClick={() => !disabled && onPress?.("bar")}
        />

        <rect
          className={`bg__hit ${targets.has("off") ? "is-open" : ""}`}
          x={TRAY}
          y="0"
          width="11"
          height={H}
          role="gridcell"
          aria-label="Bear off"
          onClick={() => !disabled && onPress?.("off")}
        />
      </svg>
      {children}
    </div>
  );
}
