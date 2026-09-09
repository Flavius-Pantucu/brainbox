"use client";

import { Plate } from "./plate";

// The standings ladder: one peg per rung. A taken rung carries a plate; an
// open rung shows the bare peg and says so.
export function Ladder({ rungs, startIndex = 0 }) {
  return (
    <ol className="ladder">
      {rungs.map((rung, i) => (
        <li className="ladder__rung" key={rung.no}>
          <span className="ladder__no" aria-hidden="true">
            {rung.no}
          </span>
          <Plate
            pegAt="left"
            index={startIndex + i}
            hangKey={`${rung.no}-${rung.score}`}
            empty={!!rung.empty}
            className="ladder__plate">
            <span className="ladder__row">
              <span className="ladder__name">
                <span className="sr-only">Rung {rung.no}: </span>
                {rung.empty ? "Open rung" : rung.name}
              </span>
              <span className="ladder__score">{rung.empty ? "" : rung.score}</span>
            </span>
          </Plate>
        </li>
      ))}
    </ol>
  );
}

export function buildRungs({ count, name, score }) {
  const rungs = [];
  if (score > 0) rungs.push({ no: 1, name: name || "You", score, you: true });
  for (let i = rungs.length; i < count; i += 1) {
    rungs.push({ no: i + 1, empty: true, score: "" });
  }
  return rungs;
}
