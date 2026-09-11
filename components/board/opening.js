"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { GamePreview } from "./preview";
import { GAME_MARKS } from "./icons";

// How long the opening takes to swallow the screen before the route changes.
const THROUGH_MS = 300;

function reducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// When you last sat at this one. A date is a fact; "yesterday" is a nudge, and
// this line exists to nudge.
function lastSeen(at) {
  if (!at) return "New to you";
  const days = Math.floor((Date.now() - at.getTime()) / 86400000);
  if (days <= 0) return "Played today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 28) return `${Math.floor(days / 7)} weeks ago`;
  return at.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

// One game, seen through an opening cut in the board's face. Pressing it walks
// through: the opening takes the window, then the room is on the other side.
export function Opening({ game, stats, today, entering, onEnter }) {
  const router = useRouter();
  const mouth = useRef(null);
  const Mark = GAME_MARKS[game.id];
  const href = `/play/${game.slug}`;

  const press = (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    if (reducedMotion()) return; // the link navigates on its own
    event.preventDefault();

    // An opening halfway down the page would otherwise swallow the screen from
    // wherever it happens to sit. Walk it to the middle on the way through, and
    // scale it by however much this viewport actually needs.
    const node = mouth.current;
    if (node) {
      const box = node.getBoundingClientRect();
      const dx = window.innerWidth / 2 - (box.left + box.width / 2);
      const dy = window.innerHeight / 2 - (box.top + box.height / 2);
      const zoom = Math.max(window.innerWidth / box.width, window.innerHeight / box.height) * 1.2;
      node.style.setProperty("--dx", `${Math.round(dx)}px`);
      node.style.setProperty("--dy", `${Math.round(dy)}px`);
      node.style.setProperty("--zoom", zoom.toFixed(2));
    }

    onEnter(game.id);
    setTimeout(() => router.push(href), THROUGH_MS);
  };

  return (
    <div className={`opening ${entering ? "is-entering" : ""} ${today ? "is-today" : ""}`}>
      <span className="opening__mouth" ref={mouth}>
        <span className="opening__room">
          <GamePreview gameId={game.id} />
        </span>

        {/* two things worth knowing before you go in, cut into the sill */}
        {today && <span className="opening__flag">Today</span>}
        {game.online && (
          <span className="opening__pair" title="Can be played against another person">
            <i aria-hidden="true" />
            <span className="sr-only">Plays online</span>
          </span>
        )}
      </span>

      <span className="opening__face">
        <span className="opening__name">
          <Mark size={15} />
          <Link href={href} className="opening__link" onClick={press} prefetch>
            {game.name}
          </Link>
        </span>
        <span className="opening__meta">{lastSeen(stats?.lastPlayedAt)}</span>
      </span>
    </div>
  );
}

export { THROUGH_MS };
