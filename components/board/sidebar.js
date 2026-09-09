"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GAME_MARKS } from "./icons";
import { GAMES } from "../../lib/games";

// Everywhere you can go, down the side. The catalogue drives it, so a new game
// appears the moment it is added to lib/games.js.
export function Sidebar() {
  const pathname = usePathname();

  const entry = (href, label, Mark) => (
    <Link
      key={href}
      href={href}
      className="side__link"
      aria-current={pathname === href ? "page" : undefined}>
      {Mark ? <Mark size={18} /> : <span className="side__dot" aria-hidden="true" />}
      <span>{label}</span>
    </Link>
  );

  return (
    <nav className="side" aria-label="Games and sections">
      <div className="side__inner">
        <span className="side__label">The board</span>
        {entry("/", "Today")}
        {entry("/standings", "Standings")}

        <span className="side__label side__label--gap">Games</span>
        {GAMES.map((game) => entry(`/play/${game.slug}`, game.name, GAME_MARKS[game.id]))}
      </div>
    </nav>
  );
}
