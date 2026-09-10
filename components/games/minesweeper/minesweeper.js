"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LEVELS,
  chordAt,
  isWon,
  levelOf,
  minesLeft,
  openFrom,
  plant,
} from "../../../lib/minesweeper";
import { MineField } from "./grid";
import { Peg } from "../../board/peg";
import { Verdict } from "../../board/verdict";
import { Flag, Replay } from "../../board/icons";

const EMPTY_FIELD = (level) => ({
  cols: level.cols,
  rows: level.rows,
  count: level.mines,
  mines: new Array(level.cols * level.rows).fill(false),
  near: new Array(level.cols * level.rows).fill(0),
});

function clock(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function Minesweeper({ onResult }) {
  const [levelId, setLevelId] = useState("beginner");
  const level = levelOf(levelId);

  // the field is empty until the first click, which is what makes that click safe
  const [field, setField] = useState(() => EMPTY_FIELD(level));
  const [laid, setLaid] = useState(false);
  const [revealed, setRevealed] = useState(() => new Array(level.cols * level.rows).fill(false));
  const [flags, setFlags] = useState(() => new Array(level.cols * level.rows).fill(false));
  const [status, setStatus] = useState("playing"); // playing | won | lost
  const [hit, setHit] = useState(null);
  const [flagging, setFlagging] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const startedAt = useRef(null);

  const newGame = useCallback((next = level) => {
    setField(EMPTY_FIELD(next));
    setLaid(false);
    setRevealed(new Array(next.cols * next.rows).fill(false));
    setFlags(new Array(next.cols * next.rows).fill(false));
    setStatus("playing");
    setHit(null);
    setSeconds(0);
    setDismissed(false);
    startedAt.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    newGame(levelOf(levelId));
  }, [levelId, newGame]);

  // the clock runs from the first square opened to the last
  useEffect(() => {
    if (status !== "playing" || !laid) return undefined;
    const id = setInterval(() => setSeconds(Math.round((Date.now() - startedAt.current) / 1000)), 500);
    return () => clearInterval(id);
  }, [status, laid]);

  const finish = useCallback(
    (outcome, board) => {
      setStatus(outcome);
      const elapsed = startedAt.current ? Date.now() - startedAt.current : 0;
      onResult?.({
        outcome,
        // only a cleared field has a time worth keeping; a fast loss is not a best
        durationMs: outcome === "won" ? elapsed : 0,
        meta: { level: levelId, opened: board.filter(Boolean).length, seconds: Math.round(elapsed / 1000) },
      });
    },
    [levelId, onResult]
  );

  const open = (point) => {
    if (status !== "playing" || flags[point]) return;

    // the first click lays the mines around itself
    let current = field;
    if (!laid) {
      current = plant(level.cols, level.rows, level.mines, point);
      setField(current);
      setLaid(true);
      startedAt.current = Date.now();
    }

    if (revealed[point]) {
      const chorded = chordAt(current, revealed, flags, point);
      if (chorded.revealed === revealed) return;
      setRevealed(chorded.revealed);
      if (chorded.hit) {
        setHit(point);
        finish("lost", chorded.revealed);
      } else if (isWon(current, chorded.revealed)) {
        finish("won", chorded.revealed);
      }
      return;
    }

    if (current.mines[point]) {
      const next = revealed.slice();
      next[point] = true;
      setRevealed(next);
      setHit(point);
      finish("lost", next);
      return;
    }

    const next = openFrom(current, revealed, flags, point);
    setRevealed(next);
    if (isWon(current, next)) finish("won", next);
  };

  const flag = (point) => {
    if (status !== "playing" || revealed[point]) return;
    setFlags((current) => {
      const next = current.slice();
      next[point] = !next[point];
      return next;
    });
  };

  const left = useMemo(() => minesLeft(field, flags), [field, flags]);
  const opened = revealed.filter(Boolean).length;
  const safe = level.cols * level.rows - level.mines;

  return (
    <div className="ms">
      <div className="ms__field">
        <MineField
          field={field}
          revealed={revealed}
          flags={flags}
          lost={status === "lost"}
          hit={hit}
          disabled={status !== "playing"}
          flagging={flagging}
          onOpen={open}
          onFlag={flag}>
          <Verdict
            open={status !== "playing" && !dismissed}
            tone={status === "won" ? "won" : "lost"}
            title={status === "won" ? "Field cleared" : "Mine"}
            line={
              status === "won"
                ? `${level.label} in ${clock(seconds)}.`
                : `${opened} of ${safe} squares opened. The rest were never the problem.`
            }
            actions={[{ label: "New field", onClick: () => newGame(level) }]}
            onClose={() => setDismissed(true)}
          />
        </MineField>
      </div>

      <div className="ms__side">
        <div className="stack" style={{ gap: 10 }}>
          <span className="zone-label" style={{ margin: 0 }}>
            Field
          </span>
          <Peg options={LEVELS} value={levelId} onChange={setLevelId} label="Field size" />
        </div>

        <div className="readout">
          <div className="readout__item">
            <span className="readout__label">Mines</span>
            <span className={`readout__value ${left < 0 ? "is-warn" : ""}`}>{left}</span>
          </div>
          <div className="readout__item">
            <span className="readout__label">Time</span>
            <span className="readout__value">{clock(seconds)}</span>
          </div>
          <div className="readout__item">
            <span className="readout__label">Opened</span>
            <span className="readout__value">{Math.round((opened / safe) * 100)}%</span>
          </div>
        </div>

        <div className="tools">
          <button
            type="button"
            className={`tool ${flagging ? "is-on" : ""}`}
            onClick={() => setFlagging((on) => !on)}
            aria-pressed={flagging}>
            <Flag size={16} />
            <em>Flag</em>
          </button>
          <button type="button" className="tool" onClick={() => newGame(level)}>
            <Replay size={16} />
            <em>New field</em>
          </button>
        </div>

        <p className="chalk chalk--tight">
          Right-click plants a flag, or hold the flag key down and press. A number that already
          has its flags opens everything else it touches when you press it.
        </p>
      </div>
    </div>
  );
}
