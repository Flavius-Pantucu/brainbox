"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LEVELS, LIVES, isWon, misses as missesOf, pick } from "../../../lib/hangman";
import { HangmanStage } from "./stage";
import { Keyboard } from "../keyboard";
import { Peg } from "../../board/peg";
import { Verdict } from "../../board/verdict";
import { Replay } from "../../board/icons";

function clock(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function Hangman({ onResult }) {
  const [levelId, setLevelId] = useState("medium");
  const [entry, setEntry] = useState(null);
  const [guessed, setGuessed] = useState(() => new Set());
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const reported = useRef(false);

  // the word is drawn after mount, never on the server
  const newGame = useCallback((id) => {
    setEntry((last) => pick(id, last?.word));
    setGuessed(new Set());
    setSeconds(0);
    setStarted(false);
    setDismissed(false);
    reported.current = false;
  }, []);

  useEffect(() => {
    newGame(levelId);
  }, [levelId, newGame]);

  const word = entry?.word ?? "";
  const misses = entry ? missesOf(word, guessed) : 0;
  const status = !entry
    ? "dealing"
    : isWon(word, guessed)
    ? "won"
    : misses >= LIVES
    ? "lost"
    : "playing";

  useEffect(() => {
    if (status !== "playing" || !started) return undefined;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [status, started]);

  useEffect(() => {
    if ((status !== "won" && status !== "lost") || reported.current) return;
    reported.current = true;
    onResult?.({
      outcome: status,
      durationMs: status === "won" ? seconds * 1000 : 0,
      meta: { level: levelId, misses, category: entry.category },
    });
  }, [status, seconds, levelId, misses, entry, onResult]);

  const guess = (letter) => {
    if (status !== "playing" || guessed.has(letter)) return;
    if (!started) setStarted(true);
    setGuessed((current) => new Set(current).add(letter));
  };

  useEffect(() => {
    const onKey = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (/^[a-z]$/i.test(event.key)) guess(event.key.toLowerCase());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const states = Object.fromEntries(
    [...guessed].map((letter) => [letter, word.includes(letter) ? "hit" : "miss"])
  );
  const found = [...new Set(word)].filter((l) => guessed.has(l)).length;

  return (
    <div className="hm">
      <div className="hm__field">
        <div className="hm__board">
          {entry && (
            <HangmanStage
              word={word}
              guessed={guessed}
              misses={misses}
              lost={status === "lost"}
              category={entry.category}
            />
          )}
          <Verdict
            open={(status === "won" || status === "lost") && !dismissed}
            tone={status === "won" ? "won" : "lost"}
            title={status === "won" ? "Saved" : "Out of letters"}
            line={
              status === "won"
                ? `${word.toUpperCase()}, with ${LIVES - misses} wrong letter${
                    LIVES - misses === 1 ? "" : "s"
                  } to spare.`
                : `The word was ${word.toUpperCase()}.`
            }
            actions={[{ label: "New word", onClick: () => newGame(levelId) }]}
            onClose={() => setDismissed(true)}
          />
        </div>

        <Keyboard states={states} disabled={status !== "playing"} onKey={guess} />
      </div>

      <div className="hm__side">
        <div className="readout">
          <div className="readout__item">
            <span className="readout__label">Time</span>
            <span className="readout__value">{clock(seconds)}</span>
          </div>
          <div className="readout__item">
            <span className="readout__label">Misses</span>
            <span className={`readout__value ${misses ? "is-warn" : ""}`}>
              {misses}/{LIVES}
            </span>
          </div>
          <div className="readout__item">
            <span className="readout__label">Letters</span>
            <span className="readout__value">
              {found}/{new Set(word).size}
            </span>
          </div>
        </div>

        <div className="stack" style={{ gap: 10 }}>
          <span className="zone-label" style={{ margin: 0 }}>
            Difficulty
          </span>
          <Peg options={LEVELS} value={levelId} onChange={setLevelId} label="Difficulty" />
        </div>

        <div className="tools">
          <button type="button" className="tool hm__new" onClick={() => newGame(levelId)}>
            <Replay size={18} />
            <span>New word</span>
          </button>
        </div>

        <p className="chalk chalk--tight">
          Guess the word one letter at a time — type, or press the keys. The category is your
          clue. Six wrong letters finish the figure. Long words give themselves away, so Easy
          is long and Hard is short.
        </p>
      </div>
    </div>
  );
}
