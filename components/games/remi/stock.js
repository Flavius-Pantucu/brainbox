"use client";

import { STACK, stacksOf } from "../../../lib/remi";
import { TileBack } from "./tile";

// What is left to draw, sitting the way it sits in the box: stacks of seven,
// and whatever is over at the end. Drag one off, or press it.
export function Stock({ count, disabled }) {
  const { full, loose } = stacksOf(count);

  return (
    <div className="stock" data-drag={disabled ? undefined : "stock"}>
      <span className="stock__rows">
        {Array.from({ length: full }, (_, i) => (
          <span className="stock__stack" key={i} aria-hidden="true">
            {Array.from({ length: STACK }, (_, n) => (
              <TileBack key={n} small />
            ))}
          </span>
        ))}
        {loose > 0 && (
          <span className="stock__stack stock__stack--loose" aria-hidden="true">
            {Array.from({ length: loose }, (_, n) => (
              <TileBack key={n} small />
            ))}
          </span>
        )}
      </span>

      <span className="stock__count">
        <b>{count}</b> left
        <em>
          {full} of seven{loose ? ` and ${loose}` : ""}
        </em>
      </span>
    </div>
  );
}
