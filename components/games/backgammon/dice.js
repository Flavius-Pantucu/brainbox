"use client";

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

export function Dice({ dice = [], used = [], rolling = false }) {
  if (!dice.length) return null;

  return (
    <div className={`dice ${rolling ? "is-rolling" : ""}`} aria-label={`Rolled ${dice.join(" and ")}`}>
      {dice.map((die, index) => (
        <svg
          key={index}
          className={`die ${used[index] ? "is-spent" : ""}`}
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
