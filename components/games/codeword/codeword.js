"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ANSWERS,
  LEVELS,
  grade,
  isWord,
  levelOf,
  loadDictionary,
  pick,
} from "../../../lib/codeword";
import { CodewordBoard } from "./board";
import { Keyboard } from "../keyboard";
import { Peg } from "../../board/peg";
import { Verdict } from "../../board/verdict";
import { Replay } from "../../board/icons";

function clock(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// a row turns over one tile at a time: this is how long until the last one lands
const FLIP_MS = 300;
const revealMs = (length) => (length - 1) * FLIP_MS + 600;

// the best a letter has earned over the guesses shown so far
const RANK = { gone: 0, near: 1, right: 2 };
function keyStates(rows) {
  const states = {};
  for (const { word, marks } of rows)
    [...word].forEach((l, k) => {
      if (!states[l] || RANK[marks[k]] > RANK[states[l]]) states[l] = marks[k];
    });
  return states;
}

export default function Codeword({ onResult }) {
  const [levelId, setLevelId] = useState("medium");
  const level = levelOf(levelId);
  const [secret, setSecret] = useState(null);
  const [rows, setRows] = useState([]);
  const [typing, setTyping] = useState("");
  const [shown, setShown] = useState(0); // rows whose reveal has finished
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("playing"); // playing | won | lost
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const [message, setMessage] = useState(null);
  const [shake, setShake] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [dictionary, setDictionary] = useState(null);
  const [dictFailed, setDictFailed] = useState(false);
  const reported = useRef(false);

  // the secret is drawn after mount, never on the server
  const newGame = useCallback((id) => {
    setSecret(pick(id));
    setRows([]);
    setTyping("");
    setShown(0);
    setBusy(false);
    setStatus("playing");
    setSeconds(0);
    setStarted(false);
    setMessage(null);
    setDismissed(false);
    reported.current = false;
  }, []);

  useEffect(() => {
    newGame(levelId);
  }, [levelId, newGame]);

  useEffect(() => {
    let alive = true;
    setDictionary(null);
    setDictFailed(false);
    loadDictionary(level.length).then((set) => {
      if (!alive) return;
      if (set) setDictionary(set);
      else setDictFailed(true);
    });
    return () => {
      alive = false;
    };
  }, [level.length]);

  useEffect(() => {
    if (status !== "playing" || !started) return undefined;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [status, started]);

  useEffect(() => {
    if (status === "playing" || reported.current) return;
    reported.current = true;
    onResult?.({
      outcome: status,
      durationMs: status === "won" ? seconds * 1000 : 0,
      meta: { level: levelId, guesses: rows.length },
    });
  }, [status, seconds, levelId, rows.length, onResult]);

  const playing = status === "playing" && !!secret && !busy;

  const refuse = (text) => {
    setMessage(text);
    setShake((n) => n + 1);
  };

  const type = (letter) => {
    if (!playing || typing.length >= level.length) return;
    if (!started) setStarted(true);
    setTyping((t) => t + letter);
    setMessage(null);
  };

  const back = () => {
    if (!playing) return;
    setTyping((t) => t.slice(0, -1));
    setMessage(null);
  };

  const submit = () => {
    if (!playing) return;
    const word = typing;
    if (word.length < level.length) return refuse(`A guess is ${level.length} letters.`);
    if (rows.some((row) => row.word === word)) return refuse("That word is already on the sheet.");
    // If the word list never arrived, play on without it rather than stop.
    if (!dictionary && !dictFailed) return refuse("The word list is still loading.");
    if (dictionary && !isWord(word, dictionary, ANSWERS[level.length]))
      return refuse(`${word.toUpperCase()} is not in the word list.`);

    const marks = grade(secret, word);
    const next = [...rows, { word, marks }];
    setRows(next);
    setTyping("");
    setMessage(null);
    setBusy(true);

    // keys, verdict and the next row wait for the last tile to land
    setTimeout(() => {
      setShown(next.length);
      setBusy(false);
      if (marks.every((m) => m === "right")) setStatus("won");
      else if (next.length >= level.guesses) setStatus("lost");
    }, revealMs(level.length));
  };

  // The physical keyboard types; the letter board types too, or takes notes.
  useEffect(() => {
    const onKey = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === "Enter") {
        if (event.target instanceof HTMLButtonElement) return;
        event.preventDefault();
        submit();
      } else if (event.key === "Backspace") {
        event.preventDefault();
        back();
      } else if (/^[a-z]$/i.test(event.key)) {
        type(event.key.toLowerCase());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const notes = keyStates(rows.slice(0, shown));
  const ruledOut = Object.values(notes).filter((n) => n === "gone").length;

  return (
    <div className="cw">
      <div className="cw__field">
        <div className="cw__sheet">
          <CodewordBoard
            length={level.length}
            limit={level.guesses}
            rows={rows}
            typing={typing}
            live={playing}
            shake={shake}
            flip={busy}
          />
          <Verdict
            open={status !== "playing" && !dismissed}
            tone={status === "won" ? "won" : "lost"}
            title={status === "won" ? "Found it" : "Out of guesses"}
            line={
              status === "won"
                ? `${secret?.toUpperCase()} in ${rows.length} guess${rows.length > 1 ? "es" : ""}, ${clock(seconds)}.`
                : `The word was ${secret?.toUpperCase()}.`
            }
            actions={[{ label: "New word", onClick: () => newGame(levelId) }]}
            onClose={() => setDismissed(true)}
          />
        </div>

        <p className="cw__message" role="status" aria-live="polite">
          {message || " "}
        </p>

        <Keyboard
          states={notes}
          disabled={!playing}
          onKey={type}
          onEnter={submit}
          onBack={back}
        />
      </div>

      <div className="cw__side">
        <div className="readout">
          <div className="readout__item">
            <span className="readout__label">Time</span>
            <span className="readout__value">{clock(seconds)}</span>
          </div>
          <div className="readout__item">
            <span className="readout__label">Guesses</span>
            <span className="readout__value">
              {rows.length}/{level.guesses}
            </span>
          </div>
          <div className="readout__item">
            <span className="readout__label">Ruled out</span>
            <span className="readout__value">{ruledOut}</span>
          </div>
        </div>

        <div className="stack" style={{ gap: 10 }}>
          <span className="zone-label" style={{ margin: 0 }}>
            Word
          </span>
          <Peg options={LEVELS} value={levelId} onChange={setLevelId} label="Word length" />
        </div>

        <div className="tools">
          <button type="button" className="tool" onClick={() => newGame(levelId)}>
            <Replay size={18} />
            <span>New word</span>
          </button>
        </div>

        <div className="cw__legend">
          <span className="cw__count">
            <i className="cw__chip is-right" />
            in the right place
          </span>
          <span className="cw__count">
            <i className="cw__chip is-near" />
            in the word, elsewhere
          </span>
          <span className="cw__count">
            <i className="cw__chip is-gone" />
            not in the word
          </span>
        </div>

        <p className="chalk chalk--tight">
          Find the hidden word in {level.guesses} guesses. Every guess must be a real word; after
          each one, its letters turn green, orange or grey to show how close they are.
        </p>
      </div>
    </div>
  );
}
