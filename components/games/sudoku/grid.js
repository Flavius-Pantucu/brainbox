"use client";

import { boxOf, colOf, rowOf } from "../../../lib/sudoku";

const CELLS = 81;

// The sudoku grid, on its own so the dashboard can show one without starting a
// game on it. It knows nothing about the clock, the mistakes or the tools.
export function SudokuGrid({
  values,
  notes,
  given,
  wrong,
  selected,
  peers,
  selectedValue,
  onSelect,
  busy = false,
  boardRef,
}) {
  return (
    <div
      className="sud__board"
      ref={boardRef}
      role="grid"
      aria-label="Sudoku grid"
      aria-busy={busy}>
      {Array.from({ length: CELLS }, (_, i) => {
        const value = values[i];
        const note = notes[i];
        const isGiven = given[i];
        const isWrong = wrong.has(i);
        const isSelected = i === selected;
        const isPeer = peers.has(i);
        const isMatch = !isSelected && value !== 0 && value === selectedValue;

        return (
          <button
            key={i}
            type="button"
            role="gridcell"
            className={[
              "sud__cell",
              isGiven ? "is-given" : "",
              isWrong ? "is-wrong" : "",
              isSelected ? "is-selected" : "",
              isPeer ? "is-peer" : "",
              isMatch ? "is-match" : "",
              colOf(i) % 3 === 2 && colOf(i) !== 8 ? "edge-right" : "",
              rowOf(i) % 3 === 2 && rowOf(i) !== 8 ? "edge-bottom" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ "--box": boxOf(i) % 2 }}
            onClick={() => onSelect?.(i)}
            aria-label={`Row ${rowOf(i) + 1} column ${colOf(i) + 1}${
              value ? `, ${value}` : ", empty"
            }`}>
            {value ? (
              <span className="sud__value">{value}</span>
            ) : note ? (
              <span className="sud__notes" aria-hidden="true">
                {Array.from({ length: 9 }, (_, n) => (
                  <i key={n}>{note & (1 << n) ? n + 1 : ""}</i>
                ))}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
