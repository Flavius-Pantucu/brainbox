"use client";

import { meldValue, tileName } from "../../../lib/remi";
import { Tile } from "./tile";

// One player's channel: their nameplate at the end, their melds sitting in it,
// and what is still on their rack. Yours is the lit one.
export function Lane({ seat, name, melds, held, mine = false, live = false, opened = false, score = 0, live_ }) {
  return (
    <div className={`lane ${mine ? "is-mine" : ""} ${live ? "is-live" : ""}`}>
      <div className="lane__plate">
        <span className="lane__name">{name}</span>
        <span className="lane__held">
          {held}
          <em>held</em>
        </span>
        <span className={`lane__score ${score ? "" : "is-clean"}`}>{score}</span>
      </div>

      <div className="lane__melds">
        {melds.length === 0 ? (
          <span className="lane__shut">{opened ? "nothing down yet" : "not open"}</span>
        ) : (
          melds.map(({ index, tiles }) => (
            <span
              key={index}
              className="meld"
              data-drop="meld"
              data-index={index}
              aria-label={`Meld of ${tiles.map(tileName).join(", ")}`}>
              {tiles.map((tile) => (
                <Tile key={tile} tile={tile} />
              ))}
              <b className="meld__value">{meldValue(tiles)}</b>
            </span>
          ))
        )}
      </div>
    </div>
  );
}
