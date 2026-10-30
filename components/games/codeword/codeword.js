"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ANSWERS,
  LEVELS,
  deduce,
  isWord,
  levelOf,
  loadDictionary,
  pick,
  score,
} from "../../../lib/codeword";
import { CodewordBoard } from "./board";
import { Keyboard } from "../keyboard";
import { Peg } from "../../board/peg";
import { Verdict } from "../../board/verdict";
import { Pencil, Replay } from "../../board/icons";

function clock(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const NEXT_NOTE = { undefined: "out", out: "in", in: undefined };

export default function Codeword({ onResult }) {
  const [levelId, setLevelId] = useState("medium");
  const level = levelOf(levelId);
  const [secret, setSecret] = useState(null);
  const [rows, setRows] = useState([]);
  const [typing, setTyping] = useState("");
  const [notes, setNotes] = useState({});
  const [marking, setMarking] = useState(false);
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
    setNotes({});
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

  const playing = status === "playing" && !!secret;

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

  const mark = (letter) => {
    if (!playing) return;
    setNotes((current) => ({ ...current, [letter]: NEXT_NOTE[current[letter]] }));
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

    const result = score(secret, word);
    const next = [...rows, { word, score: result }];
    setRows(next);
    setTyping("");
    setMessage(null);

    const proven = deduce(word, result);
    if (proven.out.length || proven.in.length) {
      setNotes((current) => {
        const updated = { ...current };
        proven.out.forEach((l) => (updated[l] = "out"));
        proven.in.forEach((l) => (updated[l] = "in"));
        return updated;
      });
    }

    if (result.inPlace === level.length) setStatus("won");
    else if (next.length >= level.guesses) setStatus("lost");
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

  const ruledOut = Object.values(notes).filter((n) => n === "out").length;

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
          onKey={marking ? mark : type}
          onMark={mark}
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
          <button
            type="button"
            className={`tool ${marking ? "is-on" : ""}`}
            aria-pressed={marking}
            disabled={!playing}
            onClick={() => setMarking((m) => !m)}>
            <Pencil size={18} />
            <span>Mark letters</span>
          </button>
          <button type="button" className="tool" onClick={() => newGame(levelId)}>
            <Replay size={18} />
            <span>New word</span>
          </button>
        </div>

        <div className="cw__legend">
          <span className="cw__count">
            <i className="cw__dot" />
            in the right place
          </span>
          <span className="cw__count">
            <i className="cw__ring" />
            in the word, elsewhere
          </span>
        </div>

        <p className="chalk chalk--tight">
          Find the hidden word in {level.guesses} guesses. Each guess is scored with two numbers
          and nothing more: which letters earned them is yours to work out. Turn on{" "}
          <b>Mark letters</b> (or right-click a key) to strike a letter out or ring it in; a guess
          that scores nothing, or scores every letter, marks its letters for you.
        </p>
      </div>
    </div>
  );
}
