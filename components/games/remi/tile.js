"use client";

import { colourOf, isJoker, numberOf } from "../../../lib/remi";

// A tile: a number in its colour, moulded rather than printed. The joker wears
// a star instead of a number.
export function Tile({ tile, selected = false, dim = false, disabled = false, onPress, label }) {
  const joker = isJoker(tile);
  const classes = [
    "tile",
    joker ? "tile--joker" : `tile--${colourOf(tile)}`,
    selected ? "is-picked" : "",
    dim ? "is-dim" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const face = joker ? (
    <svg className="tile__star" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.5l2.4 5.6 6.1.5-4.6 4 1.4 5.9L12 16.4 6.7 19.5l1.4-5.9-4.6-4 6.1-.5z" />
    </svg>
  ) : (
    <span className="tile__number">{numberOf(tile)}</span>
  );

  if (!onPress) {
    return (
      <span className={classes} aria-label={label}>
        {face}
      </span>
    );
  }

  return (
    <button type="button" className={classes} disabled={disabled} onClick={onPress} aria-label={label}>
      {face}
    </button>
  );
}
