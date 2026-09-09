"use client";

import { tileName } from "../../../lib/remi";
import { Lane } from "./lane";
import { Rack } from "./rack";
import { Tile } from "./tile";

// The bench: a channel for every player, the two piles, and your own rack cut
// into the near edge of it.
export function RemiTable({
  seats = [],
  names = {},
  table = [],
  held = {},
  opened = {},
  scores = {},
  you = null,
  turn = null,
  slots,
  discard = [],
  stock = 0,
  picked = null,
  disabled = false,
  onArrange,
  onPick,
  onDropOut,
  onTake,
  children,
}) {
  const top = discard[discard.length - 1];
  const meldsOf = (seat) =>
    table.map((meld, index) => ({ ...meld, index })).filter((meld) => meld.seat === seat);

  return (
    <div className="remi__bench">
      <div className="remi__lanes">
        {seats.map((seat) => (
          <Lane
            key={seat}
            seat={seat}
            name={names[seat] || seat}
            melds={meldsOf(seat)}
            held={held[seat] ?? 0}
            mine={seat === you}
            live={seat === turn}
            opened={!!opened[seat]}
            score={scores[seat] ?? 0}
          />
        ))}
      </div>

      <div className="remi__well">
        <button
          type="button"
          className="well well--stock"
          disabled={disabled || !stock}
          onClick={() => onTake?.("stock")}
          aria-label={`Stock, ${stock} tiles`}>
          <span className="tile tile--back" aria-hidden="true" />
          <span className="well__label">{stock} left</span>
        </button>

        <button
          type="button"
          className="well well--discard"
          data-drop="discard"
          disabled={disabled || top == null}
          onClick={() => onTake?.("discard")}
          aria-label={top == null ? "Discard, empty" : `Discard, ${tileName(top)}`}>
          {top == null ? (
            <span className="tile tile--empty" aria-hidden="true" />
          ) : (
            <Tile tile={top} />
          )}
          <span className="well__label">throw here</span>
        </button>
      </div>

      <Rack
        slots={slots}
        disabled={disabled}
        picked={picked}
        onPick={onPick}
        onArrange={onArrange}
        onDropOut={onDropOut}
      />

      {children}
    </div>
  );
}
