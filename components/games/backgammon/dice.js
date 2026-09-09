"use client";

import { useEffect, useState } from "react";

// Pips, drawn. A die that has been played goes quiet rather than disappearing,
// so you can still see what you rolled.
const PIPS = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
};

const TUMBLES = 6;
const TUMBLE_MS = 90;
const face = () => 1 + Math.floor(Math.random() * 6);

export function Dice({ dice = [], used = [] }) {
  // A fresh roll tumbles through a few faces before it settles, so you can see
  // it happen rather than have the numbers appear out of nowhere.
  const [tumble, setTumble] = useState(null);
  const signature = dice.join(",");

  useEffect(() => {
    if (!signature) {
      setTumble(null);
      return undefined;
    }
    const count = signature.split(",").length;
    setTumble(Array.from({ length: count }, face));
    let step = 0;
    const id = setInterval(() => {
      step += 1;
      if (step >= TUMBLES) {
        clearInterval(id);
        setTumble(null);
      } else {
        setTumble(Array.from({ length: count }, face));
      }
    }, TUMBLE_MS);
    return () => clearInterval(id);
  }, [signature]);

  if (!dice.length) return null;
  const shown = tumble ?? dice;

  return (
    <div
      className={`dice ${tumble ? "is-rolling" : ""}`}
      role="status"
      aria-label={tumble ? "Rolling" : `Rolled ${dice.join(" and ")}`}>
      {shown.map((die, index) => (
        <svg
          key={index}
          className={`die ${!tumble && used[index] ? "is-spent" : ""}`}
          viewBox="0 0 24 24"
          aria-hidden="true">
          <rect x="1" y="1" width="22" height="22" rx="4" />
          {PIPS[die].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={6 + x * 6} cy={6 + y * 6} r="2.1" />
          ))}
        </svg>
      ))}
    </div>
  );
}
