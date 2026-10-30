"use client";

import { ArrowLeft } from "../board/icons";

const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

// What each state says out loud. The key's look carries it on screen.
const SAID = {
  hit: "in the word",
  miss: "not in the word",
  in: "marked in",
  out: "ruled out",
  right: "in the right place",
  near: "in the word, elsewhere",
  gone: "not in the word",
};

// The letter keys the word games share. `states` maps a letter to hit / miss
// (a letter the game has judged) or in / out (a note the player has made).
// Enter and the backspace key appear only when the game hands in a handler.
//
// A key never takes focus from a click: if it did, the next Enter on the real
// keyboard would press that key again instead of reaching the game.
const keep = (event) => event.preventDefault();

export function Keyboard({ states = {}, onKey, onEnter, onBack, onMark, disabled = false }) {
  return (
    <div className="kb" role="group" aria-label="Letters">
      {ROWS.map((row, r) => (
        <div className="kb__row" key={row}>
          {r === 2 && onEnter && (
            <button
              type="button"
              onMouseDown={keep}
              className="kb__key kb__key--wide"
              disabled={disabled}
              onClick={onEnter}>
              Enter
            </button>
          )}
          {[...row].map((letter) => {
            const state = states[letter];
            return (
              <button
                key={letter}
                type="button"
                onMouseDown={keep}
                className={`kb__key ${state ? `is-${state}` : ""}`}
                disabled={disabled || state === "hit" || state === "miss"}
                aria-label={`${letter.toUpperCase()}${state ? `, ${SAID[state]}` : ""}`}
                onClick={() => onKey?.(letter)}
                onContextMenu={(event) => {
                  if (!onMark) return;
                  event.preventDefault();
                  onMark(letter);
                }}>
                {letter}
              </button>
            );
          })}
          {r === 2 && onBack && (
            <button
              type="button"
              onMouseDown={keep}
              className="kb__key kb__key--wide"
              disabled={disabled}
              aria-label="Delete a letter"
              onClick={onBack}>
              <ArrowLeft size={18} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
