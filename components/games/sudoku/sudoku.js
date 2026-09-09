"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DIFFICULTIES,
  boxOf,
  colOf,
  generate,
  isComplete,
  peersOf,
  remainingCounts,
  rowOf,
} from "../../../lib/sudoku";
import { Peg } from "../../board/peg";
import { Tag } from "../../board/tag";
import { Pencil, Eraser, Undo, Bulb, Pause, Play as PlayMark } from "../../board/icons";

const CELLS = 81;
const MAX_MISTAKES = 3;

function emptyNotes() {
  return new Array(CELLS).fill(0);
}

function clock(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function Sudoku({ onResult, onStatus }) {
  const [difficulty, setDifficulty] = useState("medium");
  const [deal, setDeal] = useState(null);
  const [values, setValues] = useState(() => new Array(CELLS).fill(0));
  const [notes, setNotes] = useState(emptyNotes);
  const [selected, setSelected] = useState(40);
  const [mistakes, setMistakes] = useState(0);
  const [notesMode, setNotesMode] = useState(false);
  const [status, setStatus] = useState("dealing");
  const [seconds, setSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hints, setHints] = useState(0);
  const history = useRef([]);
  const reported = useRef(false);
  const boardRef = useRef(null);

  // --- dealing -------------------------------------------------------------

  const newGame = useCallback((id) => {
    setStatus("dealing");
    setDeal(null);
    // yield a frame so the dealing state paints before the generator blocks
    requestAnimationFrame(() => {
      const next = generate(id);
      history.current = [];
      reported.current = false;
      setDeal(next);
      setValues(next.puzzle.slice());
      setNotes(emptyNotes());
      setMistakes(0);
      setHints(0);
      setSeconds(0);
      setPaused(false);
      setNotesMode(false);
      setSelected(next.puzzle.findIndex((v) => !v));
      setStatus("playing");
    });
  }, []);

  useEffect(() => {
    newGame(difficulty);
  }, [difficulty, newGame]);

  // --- clock ---------------------------------------------------------------

  useEffect(() => {
    if (status !== "playing" || paused) return undefined;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [status, paused]);

  useEffect(() => {
    onStatus?.({ status, seconds, mistakes, difficulty });
  }, [status, seconds, mistakes, difficulty, onStatus]);

  // --- derived -------------------------------------------------------------

  const given = useMemo(
    () => (deal ? deal.puzzle.map((v) => v !== 0) : new Array(CELLS).fill(false)),
    [deal]
  );

  const peers = useMemo(() => (selected >= 0 ? peersOf(selected) : new Set()), [selected]);
  const counts = useMemo(() => remainingCounts(values), [values]);
  const selectedValue = selected >= 0 ? values[selected] : 0;

  const wrong = useMemo(() => {
    if (!deal) return new Set();
    const set = new Set();
    values.forEach((v, i) => {
      if (v && v !== deal.solution[i]) set.add(i);
    });
    return set;
  }, [values, deal]);

  const filled = values.filter(Boolean).length;

  // --- moves ---------------------------------------------------------------

  const pushHistory = () => {
    history.current.push({ values: values.slice(), notes: notes.slice(), mistakes });
    if (history.current.length > 200) history.current.shift();
  };

  const place = (index, value) => {
    if (status !== "playing" || paused) return;
    if (index < 0 || given[index]) return;

    if (notesMode && value) {
      pushHistory();
      const next = notes.slice();
      next[index] ^= 1 << (value - 1);
      setNotes(next);
      return;
    }

    pushHistory();
    const nextValues = values.slice();
    const nextNotes = notes.slice();

    if (!value || nextValues[index] === value) {
      nextValues[index] = 0;
      nextNotes[index] = 0;
      setValues(nextValues);
      setNotes(nextNotes);
      return;
    }

    nextValues[index] = value;
    nextNotes[index] = 0;
    // a placed number clears that pencil mark from everything it sees
    peersOf(index).forEach((p) => {
      nextNotes[p] &= ~(1 << (value - 1));
    });
    setValues(nextValues);
    setNotes(nextNotes);

    if (deal && value !== deal.solution[index]) {
      const next = mistakes + 1;
      setMistakes(next);
      if (next >= MAX_MISTAKES) setStatus("lost");
      return;
    }

    if (deal && isComplete(nextValues, deal.solution)) setStatus("won");
  };

  const erase = () => place(selected, 0);

  const undo = () => {
    const last = history.current.pop();
    if (!last) return;
    setValues(last.values);
    setNotes(last.notes);
    setMistakes(last.mistakes);
    if (status === "lost" && last.mistakes < MAX_MISTAKES) setStatus("playing");
  };

  const hint = () => {
    if (!deal || status !== "playing") return;
    const blanks = values
      .map((v, i) => (v === 0 || v !== deal.solution[i] ? i : -1))
      .filter((i) => i >= 0);
    if (!blanks.length) return;
    const index = blanks[Math.floor(Math.random() * blanks.length)];
    pushHistory();
    const nextValues = values.slice();
    nextValues[index] = deal.solution[index];
    const nextNotes = notes.slice();
    nextNotes[index] = 0;
    setValues(nextValues);
    setNotes(nextNotes);
    setHints((h) => h + 1);
    setSelected(index);
    if (isComplete(nextValues, deal.solution)) setStatus("won");
  };

  // --- reporting -----------------------------------------------------------

  useEffect(() => {
    if (reported.current) return;
    if (status === "won") {
      reported.current = true;
      onResult?.({
        outcome: "won",
        durationMs: seconds * 1000,
        meta: { difficulty, mistakes, hints },
      });
    }
    if (status === "lost") {
      reported.current = true;
      onResult?.({
        outcome: "lost",
        durationMs: seconds * 1000,
        meta: { difficulty, mistakes: MAX_MISTAKES },
      });
    }
  }, [status, seconds, difficulty, mistakes, hints, onResult]);

  // --- keyboard ------------------------------------------------------------

  useEffect(() => {
    const onKey = (event) => {
      if (event.metaKey || event.ctrlKey) return;
      const key = event.key;

      if (key >= "1" && key <= "9") {
        event.preventDefault();
        place(selected, Number(key));
        return;
      }
      if (key === "Backspace" || key === "Delete" || key === "0") {
        event.preventDefault();
        erase();
        return;
      }
      if (key === "n" || key === "N") {
        setNotesMode((m) => !m);
        return;
      }
      if (key === "u" || key === "U") {
        undo();
        return;
      }
      if (key === "h" || key === "H") {
        hint();
        return;
      }
      if (key === " ") {
        event.preventDefault();
        setPaused((p) => !p);
        return;
      }

      const moves = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 };
      const step = moves[key];
      if (step === undefined) return;
      event.preventDefault();
      let next = selected + step;
      if (step === -1 && colOf(selected) === 0) next = selected + 8;
      if (step === 1 && colOf(selected) === 8) next = selected - 8;
      if (next < 0) next += CELLS;
      if (next >= CELLS) next -= CELLS;
      setSelected(next);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // --- render --------------------------------------------------------------

  const playable = status === "playing" && !paused;

  return (
    <div className="sud">
      <div className="sud__field">
        <div className="sud__boardwrap">
          <div
            className="sud__board"
            ref={boardRef}
            role="grid"
            aria-label="Sudoku grid"
            aria-busy={status === "dealing"}>
            {Array.from({ length: CELLS }, (_, i) => {
              const value = values[i];
              const note = notes[i];
              const isGiven = given[i];
              const isWrong = wrong.has(i);
              const isSelected = i === selected;
              const isPeer = peers.has(i);
              const isMatch = !isSelected && value !== 0 && value === selectedValue;

              return (
                <button
                  key={i}
                  type="button"
                  role="gridcell"
                  className={[
                    "sud__cell",
                    isGiven ? "is-given" : "",
                    isWrong ? "is-wrong" : "",
                    isSelected ? "is-selected" : "",
                    isPeer ? "is-peer" : "",
                    isMatch ? "is-match" : "",
                    colOf(i) % 3 === 2 && colOf(i) !== 8 ? "edge-right" : "",
                    rowOf(i) % 3 === 2 && rowOf(i) !== 8 ? "edge-bottom" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{ "--box": boxOf(i) % 2 }}
                  onClick={() => setSelected(i)}
                  aria-label={`Row ${rowOf(i) + 1} column ${colOf(i) + 1}${
                    value ? `, ${value}` : ", empty"
                  }`}>
                  {value ? (
                    <span className="sud__value">{value}</span>
                  ) : note ? (
                    <span className="sud__notes" aria-hidden="true">
                      {Array.from({ length: 9 }, (_, n) => (
                        <i key={n}>{note & (1 << n) ? n + 1 : ""}</i>
                      ))}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {status === "dealing" && (
            <div className="sud__veil">
              <p className="label">Setting the grid</p>
            </div>
          )}

          {paused && status === "playing" && (
            <div className="sud__veil">
              <p className="label">Paused</p>
              <button type="button" className="key" onClick={() => setPaused(false)}>
                <PlayMark size={14} />
                Resume
              </button>
            </div>
          )}

          {status === "won" && (
            <div className="sud__veil">
              <p className="sud__verdict">Solved</p>
              <p className="chalk">
                {DIFFICULTIES.find((d) => d.id === difficulty)?.label} in {clock(seconds)},
                {mistakes === 0 ? " clean" : ` ${mistakes} mistake${mistakes > 1 ? "s" : ""}`}
                {hints > 0 ? `, ${hints} hint${hints > 1 ? "s" : ""}` : ""}.
              </p>
              <button type="button" className="key" onClick={() => newGame(difficulty)}>
                New grid
              </button>
            </div>
          )}

          {status === "lost" && (
            <div className="sud__veil">
              <p className="sud__verdict">Three mistakes</p>
              <p className="chalk">The grid is closed. Undo the last move, or set a new one.</p>
              <div className="row" style={{ justifyContent: "center" }}>
                <button type="button" className="key" onClick={() => newGame(difficulty)}>
                  New grid
                </button>
                <button type="button" className="key key--quiet" onClick={undo}>
                  Undo last move
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="sud__side">
        <div className="readout">
          <div className="readout__item">
            <span className="readout__label">Time</span>
            <span className="readout__value">{clock(seconds)}</span>
          </div>
          <div className="readout__item">
            <span className="readout__label">Mistakes</span>
            <span className={`readout__value ${mistakes ? "is-warn" : ""}`}>
              {mistakes}/{MAX_MISTAKES}
            </span>
          </div>
          <div className="readout__item">
            <span className="readout__label">Filled</span>
            <span className="readout__value">{filled}/81</span>
          </div>
        </div>

        <div className="stack" style={{ gap: 10 }}>
          <span className="zone-label" style={{ margin: 0 }}>
            Difficulty
          </span>
          <Peg
            options={DIFFICULTIES.map((d) => ({ id: d.id, label: d.label }))}
            value={difficulty}
            onChange={setDifficulty}
            label="Difficulty"
          />
        </div>

        <div className="pad">
          {Array.from({ length: 9 }, (_, n) => {
            const value = n + 1;
            const left = counts[value];
            return (
              <button
                key={value}
                type="button"
                className="pad__key"
                disabled={!playable || left <= 0}
                onClick={() => place(selected, value)}>
                <span className="pad__digit">{value}</span>
                <span className="pad__left">{left > 0 ? left : ""}</span>
              </button>
            );
          })}
        </div>

        <div className="tools">
          <button
            type="button"
            className={`tool ${notesMode ? "is-on" : ""}`}
            aria-pressed={notesMode}
            disabled={!playable}
            onClick={() => setNotesMode((m) => !m)}>
            <Pencil size={18} />
            <span>Notes</span>
            <em>{notesMode ? "On" : "Off"}</em>
          </button>
          <button type="button" className="tool" disabled={!playable} onClick={erase}>
            <Eraser size={18} />
            <span>Erase</span>
          </button>
          <button
            type="button"
            className="tool"
            disabled={!history.current.length}
            onClick={undo}>
            <Undo size={18} />
            <span>Undo</span>
          </button>
          <button type="button" className="tool" disabled={!playable} onClick={hint}>
            <Bulb size={18} />
            <span>Hint</span>
            <em>{hints || ""}</em>
          </button>
          <button
            type="button"
            className="tool"
            disabled={status !== "playing"}
            onClick={() => setPaused((p) => !p)}>
            <Pause size={18} />
            <span>{paused ? "Resume" : "Pause"}</span>
          </button>
          <button type="button" className="tool" onClick={() => newGame(difficulty)}>
            <span className="tool__wide">New grid</span>
          </button>
        </div>

        <p className="chalk chalk--tight">
          Arrow keys move, 1–9 place, 0 erases. <b>N</b> notes, <b>U</b> undo, <b>H</b> hint,
          space pauses. Every grid is generated fresh and has exactly one solution.
        </p>

        {deal && (
          <div className="row" style={{ gap: 8 }}>
            <Tag tone="chalk" mark="live">
              {deal.clues} clues
            </Tag>
            {mistakes > 0 && (
              <Tag tone="on" mark="lost">
                {mistakes} wrong
              </Tag>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
