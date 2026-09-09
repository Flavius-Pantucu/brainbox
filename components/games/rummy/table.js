"use client";

import { useMemo } from "react";
import { bestArrangement, cardName } from "../../../lib/rummy";
import { Card } from "./card";

// The table, on its own so the dashboard can lay one out without dealing.
export function RummyTable({
  hand,
  theirs = 10,
  discard = [],
  stock = 0,
  picked = null,
  canDraw = false,
  canThrow = false,
  onTake,
  onPick,
  names = { you: "You", them: "Them" },
  children,
}) {
  const arrangement = useMemo(() => bestArrangement(hand), [hand]);
  const inMeld = useMemo(() => new Set(arrangement.melds.flat()), [arrangement]);
  const top = discard[discard.length - 1];

  return (
    <div className="rum__table">
      <div className="rum__seat">
        <span className="rum__who">{names.them}</span>
        <span className="rum__backs">
          {Array.from({ length: theirs }, (_, i) => (
            <Card key={i} faceDown />
          ))}
        </span>
      </div>

      <div className="rum__piles">
        <button
          type="button"
          className="pile"
          disabled={!canDraw || !stock}
          onClick={() => onTake?.("stock")}
          aria-label={`Stock, ${stock} cards`}>
          <span className="card card--back" aria-hidden="true" />
          <span className="pile__count">{stock}</span>
        </button>

        <button
          type="button"
          className="pile"
          disabled={!canDraw || top == null}
          onClick={() => onTake?.("discard")}
          aria-label={top == null ? "Discard pile, empty" : `Discard pile, ${cardName(top)}`}>
          {top == null ? <span className="card card--empty" aria-hidden="true" /> : <Card card={top} />}
          <span className="pile__count">discard</span>
        </button>
      </div>

      <div className="rum__seat rum__seat--you">
        <span className="rum__who">
          {names.you}
          <em className="rum__dead">{arrangement.value} deadwood</em>
        </span>
        <span className="rum__hand">
          {hand.map((card) => (
            <Card
              key={card}
              card={card}
              melded={inMeld.has(card)}
              dim={!inMeld.has(card)}
              selected={picked === card}
              disabled={!canThrow}
              onPress={onPick ? () => onPick(card) : undefined}
              label={cardName(card)}
            />
          ))}
        </span>
      </div>

      {children}
    </div>
  );
}
