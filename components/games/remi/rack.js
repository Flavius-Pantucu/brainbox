"use client";

import { SLOTS, TIERS, rackGroups, tileName } from "../../../lib/remi";
import { Tile } from "./tile";

// Two tiers of slots. The rack itself does nothing but show what is on it —
// moving tiles is the bench's job, because a tile can come from and go to
// places the rack knows nothing about.
export function Rack({ slots, picked, lifted }) {
  const groups = rackGroups(slots);
  const bracketed = new Set(groups.flatMap((group) => group.tiles));

  return (
    <div className="rack">
      {Array.from({ length: TIERS }, (_, tier) => (
        <div className="rack__tier" key={tier}>
          {Array.from({ length: SLOTS }, (_, column) => {
            const at = tier * SLOTS + column;
            const tile = slots[at];
            return (
              <div
                key={at}
                className={`slot-cell ${tile == null ? "is-free" : ""} ${
                  lifted === at ? "is-lifted" : ""
                }`}
                data-drop="slot"
                data-index={at}
                data-drag={tile == null ? undefined : "rack"}>
                {tile != null && (
                  <Tile
                    tile={tile}
                    selected={picked === at}
                    dim={!bracketed.has(tile)}
                    label={tileName(tile)}
                  />
                )}
              </div>
            );
          })}

          {groups
            .filter((group) => group.tier === tier)
            .map((group) => (
              <span
                key={`${tier}-${group.from}`}
                className="rack__bracket"
                style={{ gridColumn: `${group.from + 1} / ${group.to + 2}` }}>
                <b>{group.value}</b>
              </span>
            ))}
        </div>
      ))}
    </div>
  );
}
