"use client";

import { useEffect, useRef, useState } from "react";
import { Hook } from "./icons";

const LIFT_MS = 340;

function reducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// A plate hung on a hook. `hangKey` is the value the plate carries: change it
// and the old plate lifts off its hook and away, then the new one drops in and
// swings once to rest.
export function Plate({
  children,
  empty = false,
  tall = false,
  index = 0,
  hangKey,
  hookAt = "center",
  className = "",
  as: Tag = "div",
  ...rest
}) {
  const [outgoing, setOutgoing] = useState(null);
  const previous = useRef({ key: hangKey, children });

  useEffect(() => {
    const last = previous.current;
    previous.current = { key: hangKey, children };
    if (last.key === hangKey || last.key === undefined) return undefined;
    if (reducedMotion()) return undefined;
    setOutgoing({ key: last.key, children: last.children });
    const id = setTimeout(() => setOutgoing(null), LIFT_MS + index * 55);
    return () => clearTimeout(id);
  }, [hangKey, children, index]);

  const plateClass = [
    "plate",
    empty ? "plate--empty" : "",
    tall ? "plate--tall" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`hang ${hookAt === "left" ? "hang--left" : ""}`}>
      <Hook className="hang__hook" />
      {outgoing && (
        <div className={`${plateClass} plate--lifting`} style={{ "--i": index }} aria-hidden="true">
          <div className="plate__body">{outgoing.children}</div>
        </div>
      )}
      <Tag
        className={plateClass}
        style={{ "--i": index }}
        data-hang={hangKey ?? undefined}
        data-relanding={outgoing ? "" : undefined}
        key={hangKey ?? undefined}
        {...rest}>
        <div className="plate__body">{children}</div>
      </Tag>
    </div>
  );
}

// A zone header. Every region of the board says what it is; wayfinding is
// reading, not guessing.
export function ZoneLabel({ children, count }) {
  return (
    <h2 className="zone-label">
      <span>{children}</span>
      {count != null && <span className="zone-label__count">{count}</span>}
    </h2>
  );
}
