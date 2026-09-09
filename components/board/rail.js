"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Lamp } from "./icons";
import { NamePlate } from "./nameplate";

const LINKS = [
  { href: "/", label: "Board" },
  { href: "/standings", label: "Standings" },
];

function PaintSwitch() {
  const [paint, setPaint] = useState("night");

  useEffect(() => {
    setPaint(document.documentElement.dataset.paint || "night");
  }, []);

  const flip = () => {
    const next = paint === "night" ? "day" : "night";
    document.documentElement.dataset.paint = next;
    setPaint(next);
    try {
      window.localStorage.setItem("gamehub.paint", next);
    } catch {
      /* the board simply forgets the choice next visit */
    }
  };

  return (
    <button
      type="button"
      className="lamp"
      onClick={flip}
      aria-pressed={paint === "day"}
      title={paint === "night" ? "Repaint for daylight" : "Repaint for the evening"}>
      <Lamp lit={paint === "night"} />
      <span className="sr-only">
        {paint === "night" ? "Switch to the day board" : "Switch to the night board"}
      </span>
    </button>
  );
}

export function Rail() {
  const pathname = usePathname();

  return (
    <header className="rail">
      <div className="rail__inner">
        <Link href="/" className="rail__mark" aria-label="GameHub, back to the board">
          <span className="rail__wordmark">GameHub</span>
          <span className="rail__mark-sub">Club Board</span>
        </Link>

        <nav className="rail__nav" aria-label="Board sections">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rail__link"
              aria-current={pathname === link.href ? "page" : undefined}>
              {link.label}
            </Link>
          ))}
        </nav>

        <span className="rail__spacer" />

        <div className="rail__side">
          <NamePlate />
          <PaintSwitch />
        </div>
      </div>
    </header>
  );
}
