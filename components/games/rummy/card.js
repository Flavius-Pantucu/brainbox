"use client";

import { RANKS, rankOf, suitOf } from "../../../lib/rummy";

// The four suits, drawn rather than typed: a glyph would be whatever face the
// browser happened to have.
const SUITS = [
  { id: "s", red: false, path: "M12 3c2.4 3.6 7 6.2 7 9.7 0 2.2-1.7 3.7-3.6 3.7-1.2 0-2.2-.5-2.8-1.3.2 1.9.9 3.3 2.1 4.4H9.3c1.2-1.1 1.9-2.5 2.1-4.4-.6.8-1.6 1.3-2.8 1.3-1.9 0-3.6-1.5-3.6-3.7C5 9.2 9.6 6.6 12 3z" },
  { id: "h", red: true, path: "M12 20.5C7.5 17 4 13.9 4 10.4 4 7.9 5.9 6 8.3 6c1.5 0 2.9.8 3.7 2 .8-1.2 2.2-2 3.7-2C18.1 6 20 7.9 20 10.4c0 3.5-3.5 6.6-8 10.1z" },
  { id: "d", red: true, path: "M12 3l6.5 9L12 21l-6.5-9L12 3z" },
  {
    id: "c",
    red: false,
    path: "M12 3c2 0 3.6 1.6 3.6 3.5 0 .6-.2 1.2-.4 1.7.5-.3 1.1-.4 1.7-.4 2 0 3.6 1.6 3.6 3.5S18.9 15 16.9 15c-1.3 0-2.5-.7-3.1-1.8.2 2.6 1 4.5 2.3 5.8H7.9c1.3-1.3 2.1-3.2 2.3-5.8-.6 1.1-1.8 1.8-3.1 1.8-2 0-3.6-1.6-3.6-3.6S5.1 7.8 7.1 7.8c.6 0 1.2.1 1.7.4-.2-.5-.4-1.1-.4-1.7C8.4 4.6 10 3 12 3z",
  },
];

export function Suit({ suit, size = 14 }) {
  const shape = SUITS[suit];
  return (
    <svg
      className={`suit ${shape.red ? "suit--red" : "suit--black"}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true">
      <path d={shape.path} />
    </svg>
  );
}

export function Card({
  card,
  faceDown = false,
  selected = false,
  melded = false,
  dim = false,
  disabled = false,
  onPress,
  label,
}) {
  if (faceDown) {
    return <span className="card card--back" aria-hidden="true" />;
  }

  const suit = suitOf(card);
  const rank = RANKS[rankOf(card)];
  const classes = [
    "card",
    SUITS[suit].red ? "card--red" : "card--black",
    selected ? "is-picked" : "",
    melded ? "is-melded" : "",
    dim ? "is-dim" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const body = (
    <>
      <span className="card__rank">{rank}</span>
      <Suit suit={suit} size={16} />
    </>
  );

  if (!onPress) {
    return (
      <span className={classes} aria-label={label}>
        {body}
      </span>
    );
  }

  return (
    <button type="button" className={classes} disabled={disabled} onClick={onPress} aria-label={label}>
      {body}
    </button>
  );
}
