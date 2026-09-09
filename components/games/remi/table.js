"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Discard } from "./discard";
import { Lane } from "./lane";
import { Rack } from "./rack";
import { Stock } from "./stock";
import { Tile, TileBack } from "./tile";

function targetAt(x, y) {
  const el = document.elementFromPoint(x, y);
  return el?.closest?.("[data-drop]") || null;
}

// The bench. It owns the dragging, because a tile can start on the rack, on the
// stock or in the line of throws, and can land on any of the others.
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
  canDraw = false,
  canPlay = false,
  onArrange,
  onDraw,
  onTakeFrom,
  onMeld,
  onThrow,
  children,
}) {
  const [drag, setDrag] = useState(null);
  const [picked, setPicked] = useState(null);
  const [reaching, setReaching] = useState(null);
  const bench = useRef(null);

  const meldsOf = (seat) =>
    table.map((meld, index) => ({ ...meld, index })).filter((meld) => meld.seat === seat);

  const drop = useCallback(
    (active, x, y) => {
      const target = targetAt(x, y);
      const kind = target?.dataset.drop;

      if (active.from === "rack") {
        if (kind === "slot") {
          const to = Number(target.dataset.index);
          if (to === active.at) return;
          const next = slots.slice();
          next[active.at] = slots[to];
          next[to] = active.tile;
          onArrange(next);
          return;
        }
        if (kind === "meld") onMeld?.(Number(target.dataset.index), active.tile);
        if (kind === "discard") onThrow?.(active.tile);
        return;
      }

      // anything coming from outside only ever lands on the rack
      if (kind !== "slot" && kind !== "rack") return;
      if (active.from === "stock") onDraw?.();
      if (active.from === "discard") onTakeFrom?.(active.at);
    },
    [slots, onArrange, onMeld, onThrow, onDraw, onTakeFrom]
  );

  useEffect(() => {
    if (!drag) return undefined;
    const move = (event) =>
      setDrag((active) => (active ? { ...active, x: event.clientX, y: event.clientY } : null));
    const up = (event) =>
      setDrag((active) => {
        if (active) drop(active, event.clientX, event.clientY);
        return null;
      });
    const cancel = () => setDrag(null);
    const hold = (event) => event.preventDefault();

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    document.addEventListener("touchmove", hold, { passive: false });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      document.removeEventListener("touchmove", hold);
    };
  }, [drag, drop]);

  // One press for everything: it lifts a tile, and a second press puts it down.
  const press = (event) => {
    if (event.button != null && event.button !== 0) return;
    const source = event.target.closest?.("[data-drag]");
    const landing = event.target.closest?.("[data-drop]");

    if (!source) {
      // pressing an empty slot with a tile in hand moves it there
      if (picked != null && landing?.dataset.drop === "slot") {
        const to = Number(landing.dataset.index);
        const next = slots.slice();
        next[picked] = slots[to];
        next[to] = slots[picked];
        onArrange(next);
        setPicked(null);
      }
      return;
    }

    const from = source.dataset.drag;

    if (from === "stock") {
      if (canDraw) onDraw?.();
      return;
    }

    if (from === "discard") {
      if (canDraw) onTakeFrom?.(Number(source.dataset.index));
      return;
    }

    const at = Number(source.dataset.index);
    const tile = slots[at];
    if (tile == null) return;

    if (picked != null && picked !== at) {
      const next = slots.slice();
      next[picked] = slots[at];
      next[at] = slots[picked];
      onArrange(next);
      setPicked(null);
      return;
    }

    setPicked(picked === at ? null : at);
    event.preventDefault();
    setDrag({
      from: "rack",
      at,
      tile,
      size: source.offsetWidth,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const dragStart = (event) => {
    const source = event.target.closest?.("[data-drag]");
    if (!source) return;
    const from = source.dataset.drag;
    if (from === "rack") return; // handled above, so a press can also select
    if (!canDraw) return;
    event.preventDefault();
    setDrag({
      from,
      at: source.dataset.index ? Number(source.dataset.index) : null,
      tile: from === "discard" ? discard[Number(source.dataset.index)] : null,
      size: 34,
      x: event.clientX,
      y: event.clientY,
    });
  };

  return (
    <div
      className="remi__bench"
      ref={bench}
      onPointerDown={(event) => {
        press(event);
        dragStart(event);
      }}>
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

      <div className="remi__box">
        <Stock count={stock} disabled={!canDraw} />
        <Discard
          tiles={discard}
          reachable={canDraw}
          hovered={reaching}
          onHover={setReaching}
        />
      </div>

      <div data-drop="rack">
        <Rack slots={slots} picked={picked} lifted={drag?.from === "rack" ? drag.at : null} />
      </div>

      {drag && (
        <span
          className="rack__carry"
          style={{ left: drag.x, top: drag.y, width: drag.size }}
          aria-hidden="true">
          {drag.tile == null ? <TileBack /> : <Tile tile={drag.tile} />}
        </span>
      )}

      {children}
    </div>
  );
}
