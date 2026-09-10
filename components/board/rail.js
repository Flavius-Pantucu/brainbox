"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Lamp } from "./icons";
import { BrainBoxMark } from "./logo";
import { useSession } from "../../lib/auth-client";

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

// Who is signed in, or the way to be. Renders nothing until the session is
// known, so the rail does not flick from "Sign in" to a name on every load.
function Who() {
  const { data: session, isPending } = useSession();
  if (isPending) return <span className="rail__who" aria-hidden="true" />;

  if (!session) {
    return (
      <Link href="/sign-in" className="rail__who rail__who--in">
        Sign in
      </Link>
    );
  }

  return (
    <Link href="/you" className="rail__who" title="Your card">
      {session.user.name || session.user.email}
    </Link>
  );
}

// The head rail carries the name of the place, who you are, and the light
// switch. Where you can go is the sidebar's job.
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
          <Who />
          <PaintSwitch />
        </div>
      </div>
    </header>
  );
}
