"use client";

import { meldValue, tileName } from "../../../lib/remi";
import { Tile } from "./tile";

// The table: what everybody has put down, the two piles, and your own rack.
export function RemiTable({
  table = [],
  hand = [],
  others = {},
  names = {},
  discard = [],
  stock = 0,
  picked = [],
  canDraw = false,
  canPlay = false,
  onTake,
  onPick,
  onMeld,
  children,
}) {
  const top = discard[discard.length - 1];
  const chosen = new Set(picked);

  return (
    <div className="remi__table">
      <div className="remi__seats">
        {Object.entries(others).map(([seat, count]) => (
          <span key={seat} className="remi__seat">
            <span className="remi__who">{names[seat] || seat}</span>
            <span className="remi__count">{count}</span>
          </span>
        ))}
      </div>

      <div className="remi__laid">
        {table.length === 0 ? (
          <p className="chalk chalk--tight remi__empty">
            Nothing down yet. The first lay has to be worth forty-five.
          </p>
        ) : (
          table.map((meld, index) => (
            <button
              key={index}
              type="button"
              className="meld"
              disabled={!canPlay || !onMeld}
              onClick={() => onMeld?.(index)}
              aria-label={`Meld of ${meld.tiles.map(tileName).join(", ")}`}>
              {meld.tiles.map((tile) => (
                <Tile key={tile} tile={tile} />
              ))}
              <span className="meld__value">{meldValue(meld.tiles)}</span>
            </button>
          ))
        )}
      </div>

      <div className="remi__piles">
        <button
          type="button"
          className="pile"
          disabled={!canDraw || !stock}
          onClick={() => onTake?.("stock")}
          aria-label={`Stock, ${stock} tiles`}>
          <span className="tile tile--back" aria-hidden="true" />
          <span className="pile__count">{stock}</span>
        </button>

        <button
          type="button"
          className="pile"
          disabled={!canDraw || top == null}
          onClick={() => onTake?.("discard")}
          aria-label={top == null ? "Discard pile, empty" : `Discard pile, ${tileName(top)}`}>
          {top == null ? <span className="tile tile--empty" aria-hidden="true" /> : <Tile tile={top} />}
          <span className="pile__count">discard</span>
        </button>
      </div>

      <div className="remi__rack">
        {hand.map((tile) => (
          <Tile
            key={tile}
            tile={tile}
            selected={chosen.has(tile)}
            disabled={!canPlay}
            onPress={onPick ? () => onPick(tile) : undefined}
            label={tileName(tile)}
          />
        ))}
      </div>

      {children}
    </div>
  );
}
