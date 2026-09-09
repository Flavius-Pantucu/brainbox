"use client";

import { useEffect, useState } from "react";
import { getBoard, setPlayerName } from "../../lib/board";

// The player's name, engraved on a plate. There are no accounts yet, so this
// lives in this browser and nowhere else — which the title says out loud.
export function NamePlate({ className = "" }) {
  const [name, setName] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let live = true;
    getBoard().then((board) => {
      if (!live) return;
      setName(board.player.name || "");
      setReady(true);
    });
    return () => {
      live = false;
    };
  }, []);

  const commit = (value) => {
    setName(value);
    setPlayerName(value);
  };

  return (
    <label
      className={`nameplate ${className}`}
      title="Your name on the board. Kept in this browser only.">
      <span className="sr-only">Your name on the board</span>
      <input
        className="nameplate__input"
        value={name}
        placeholder={ready ? "Unnamed" : ""}
        maxLength={18}
        onChange={(event) => commit(event.target.value)}
        spellCheck={false}
      />
    </label>
  );
}
