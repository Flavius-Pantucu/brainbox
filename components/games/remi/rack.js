"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SLOTS, TIERS, rackGroups, tileName } from "../../../lib/remi";
import { Tile } from "./tile";

function slotUnder(x, y) {
  const el = document.elementFromPoint(x, y);
  return el?.closest?.("[data-slot]") || el?.closest?.("[data-drop]") || null;
}

export function Rack({ slots, disabled, onArrange, onDropOut, picked, onPick }) {
  const [drag, setDrag] = useState(null);
  const groups = rackGroups(slots);
  const bracketed = new Set(groups.flatMap((group) => group.tiles));
  const board = useRef(null);

  const end = useCallback(
    (event) => {
      setDrag((active) => {
        if (!active) return null;
        const target = slotUnder(event.clientX, event.clientY);

        if (target?.dataset.slot != null) {
          const to = Number(target.dataset.slot);
          if (to !== active.from) {
            const next = slots.slice();
            next[active.from] = slots[to];
            next[to] = active.tile;
            onArrange(next);
          }
        } else if (target?.dataset.drop) {
          onDropOut?.(target.dataset.drop, active.tile, target.dataset.index);
        }

        return null;
      });
    },
    [slots, onArrange, onDropOut]
  );

  useEffect(() => {
    if (!drag) return undefined;
    const move = (event) =>
      setDrag((active) => (active ? { ...active, x: event.clientX, y: event.clientY } : null));
    const cancel = () => setDrag(null);
    const hold = (event) => event.preventDefault();

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", cancel);
    document.addEventListener("touchmove", hold, { passive: false });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", cancel);
      document.removeEventListener("touchmove", hold);
    };
  }, [drag, end]);

  const press = (event, at) => {
    const tile = slots[at];
    if (disabled) return;

    // a tap picks a tile up and puts it down; a drag does the same in one go
    if (tile == null) {
      if (picked != null) {
        const from = slots.indexOf(picked);
        const next = slots.slice();
        next[from] = null;
        next[at] = picked;
        onArrange(next);
        onPick(null);
      }
      return;
    }

    if (picked != null && picked !== tile) {
      const from = slots.indexOf(picked);
      const next = slots.slice();
      next[from] = tile;
      next[at] = picked;
      onArrange(next);
      onPick(null);
      return;
    }

    onPick(picked === tile ? null : tile);
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* a mouse already released has nothing to capture */
    }
    setDrag({ tile, from: at, size: event.currentTarget.offsetWidth, x: event.clientX, y: event.clientY });
  };

  return (
    <div className="rack" ref={board}>
      {Array.from({ length: TIERS }, (_, tier) => (
        <div className="rack__tier" key={tier}>
          {Array.from({ length: SLOTS }, (_, column) => {
            const at = tier * SLOTS + column;
            const tile = slots[at];
            return (
              <div
                key={at}
                className={`slot-cell ${tile == null ? "is-free" : ""} ${
                  drag?.from === at ? "is-lifted" : ""
                }`}
                data-slot={at}
                onPointerDown={(event) => press(event, at)}>
                {tile != null && (
                  <Tile
                    tile={tile}
                    selected={picked === tile}
                    dim={!bracketed.has(tile)}
                    label={tileName(tile)}
                  />
                )}
              </div>
            );
          })}

          {/* what the rack makes of what is on it */}
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

      {drag && (
        <span
          className="rack__carry"
          style={{ left: drag.x, top: drag.y, width: drag.size }}
          aria-hidden="true">
          <Tile tile={drag.tile} />
        </span>
      )}
    </div>
  );
}
