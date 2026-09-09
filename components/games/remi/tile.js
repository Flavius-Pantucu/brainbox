"use client";

import { colourOf, isJoker, numberOf } from "../../../lib/remi";

// A tile the way the set makes them: a white face, the number in its colour,
// and the little peg at the foot that a real tile has moulded into it. The
// joker wears the face the set gives it.
export function Tile({ tile, selected = false, dim = false, small = false, label }) {
  const joker = isJoker(tile);
  const classes = [
    "tile",
    joker ? "tile--joker" : `tile--${colourOf(tile)}`,
    selected ? "is-picked" : "",
    dim ? "is-dim" : "",
    small ? "tile--small" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} aria-label={label} data-tile={tile}>
      {joker ? (
        <svg className="tile__face" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="tile__head" cx="12" cy="12" r="9" />
          <circle className="tile__eye" cx="9" cy="10" r="1.5" />
          <circle className="tile__eye" cx="15" cy="10" r="1.5" />
          <path className="tile__grin" d="M7.6 14.2a5 5 0 0 0 8.8 0" />
        </svg>
      ) : (
        <span className="tile__number">{numberOf(tile)}</span>
      )}
      <span className="tile__peg" aria-hidden="true" />
    </span>
  );
}

// The back of a tile, for a stock nobody has turned over yet.
export function TileBack({ small = false }) {
  return <span className={`tile tile--back ${small ? "tile--small" : ""}`} aria-hidden="true" />;
}
