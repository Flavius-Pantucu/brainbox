"use client";

import { tileName } from "../../../lib/remi";
import { Tile } from "./tile";

// Everything anybody has thrown, in the order it went down. Reach back into it
// and you take that tile and every one thrown after it — which the line shows
// you before you commit.
export function Discard({ tiles, reachable, hovered, onHover }) {
  return (
    <div className="throws" data-drop="discard">
      <span className="throws__label">Thrown</span>

      <div className="throws__line">
        {tiles.length === 0 ? (
          <span className="throws__empty">nothing yet</span>
        ) : (
          tiles.map((tile, index) => (
            <span
              key={`${tile}-${index}`}
              className={`throws__tile ${
                hovered != null && index >= hovered ? "is-coming" : ""
              } ${reachable ? "is-live" : ""}`}
              data-drag={reachable ? "discard" : undefined}
              data-index={index}
              onPointerEnter={(event) => {
                if (reachable && event.pointerType !== "touch") onHover?.(index);
              }}
              onPointerLeave={() => onHover?.(null)}>
              <Tile tile={tile} label={tileName(tile)} />
            </span>
          ))
        )}
      </div>

      {hovered != null && tiles.length - hovered > 1 && (
        <span className="throws__cost">
          takes {tiles.length - hovered} tiles
        </span>
      )}
    </div>
  );
}
