"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Lamp } from "./icons";
import { BrainBoxMark } from "./logo";

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
      window.localStorage.setItem("brainbox.paint", next);
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

// The head rail carries the name of the place and the light switch. Where you
// can go is the sidebar's job.
export function Rail() {
  return (
    <header className="rail">
      <div className="rail__inner">
        <Link href="/" className="rail__mark" aria-label="BrainBox, back to the board">
          <BrainBoxMark className="rail__logo" size={30} />
          <span className="rail__wordmark">BrainBox</span>
        </Link>

        <span className="rail__spacer" />

        <div className="rail__side">
          <PaintSwitch />
        </div>
      </div>
    </header>
  );
}
