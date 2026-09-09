"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { GamePreview } from "./preview";
import { Tag } from "./tag";
import { GAME_MARKS } from "./icons";

// How long the opening takes to swallow the screen before the route changes.
const THROUGH_MS = 300;

function reducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// One game, seen through an opening cut in the board's face. Pressing it walks
// through: the opening takes the window, then the room is on the other side.
export function Opening({ game, stats, today, entering, onEnter }) {
  const router = useRouter();
  const mouth = useRef(null);
  const Mark = GAME_MARKS[game.id];
  const href = `/play/${game.slug}`;
  const never = stats.everPlayed === 0;

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
    // A card-shaped link would put the preview's own buttons inside an anchor,
    // which is invalid and unfocusable in the right order. The link is the
    // game's name; it stretches over the whole row instead.
    <div className={`opening ${entering ? "is-entering" : ""}`}>
      <span className="opening__mouth" ref={mouth}>
        <span className="opening__room">
          <GamePreview gameId={game.id} />
        </span>
      </span>

      <span className="opening__face">
        <span className="opening__name">
          <Mark size={18} />
          <Link href={href} className="opening__link" onClick={press} prefetch>
            {game.name}
          </Link>
          {today && (
            <Tag tone="live" mark="live">
              Today
            </Tag>
          )}
        </span>

        <span className="opening__line">{game.line}</span>

        <span className="opening__foot">
          <span className="opening__stats">
            {never ? (
              <em>Not played yet</em>
            ) : (
              <>
                <b>{stats.played}</b> played
                {game.outcomes && stats.winRate != null && (
                  <>
                    {" · "}
                    <b>{stats.winRate}%</b> won
                  </>
                )}
                {game.measure === "time" && stats.bestTime && (
                  <>
                    {" · best "}
                    <b>{stats.bestTime}</b>
                  </>
                )}
              </>
            )}
          </span>
          <span className="opening__enter" aria-hidden="true">
            Enter
          </span>
        </span>
      </span>
    </div>
  );
}

export { THROUGH_MS };
