"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CROSSED,
  DIFFICULTIES,
  EMPTY,
  FILLED,
  SIZES,
  difficultyOf,
  generate,
  isSolved,
  sizeOf,
} from "../../../lib/picross";
import { PicrossGrid } from "./grid";
import { Peg } from "../../board/peg";
import { Verdict } from "../../board/verdict";
import { CrossMark, FillMark, Replay } from "../../board/icons";

function clock(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function Picross({ onResult }) {
  const [sizeId, setSizeId] = useState("medium");
  const [difficulty, setDifficulty] = useState("medium");
  const [deal, setDeal] = useState(null);
  const [cells, setCells] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [mode, setMode] = useState(FILLED);
  const [status, setStatus] = useState("dealing"); // dealing | playing | won
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  // squares a mistake landed on: shown in fault red until the picture is done
  const [faults, setFaults] = useState(() => new Set());
  const stroke = useRef(null);
  const gridRef = useRef(null);
  const cellRefs = useRef([]);

  // --- dealing -------------------------------------------------------------

  // Generated after mount, never on the server: a random picture would not
  // match between the two renders.
  const newGame = useCallback((id, level) => {
    const next = generate(id, level);
    stroke.current = null;
    cellRefs.current = [];
    setDeal(next);
    setCells(new Array(next.n * next.n).fill(EMPTY));
    setCursor(null);
    setSeconds(0);
    setStarted(false);
    setDismissed(false);
    setMistakes(0);
    setFaults(new Set());
    setStatus("playing");
  }, []);

  useEffect(() => {
    newGame(sizeId, difficulty);
  }, [sizeId, difficulty, newGame]);

  // --- clock: from the first mark to the last ------------------------------

  useEffect(() => {
    if (status !== "playing" || !started) return undefined;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [status, started]);

  // --- solving -------------------------------------------------------------

  useEffect(() => {
    if (status !== "playing" || !deal || !cells.length) return;
    if (!isSolved(cells, deal.clues, deal.n)) return;
    stroke.current = null;
    setStatus("won");
    onResult?.({
      outcome: "won",
      durationMs: seconds * 1000,
      meta: { size: deal.size, difficulty: deal.difficulty, seconds, mistakes },
    });
  }, [cells, deal, status, seconds, mistakes, onResult]);

  // --- marking -------------------------------------------------------------

  const playable = status === "playing" && !!deal;

  // Every mark is checked against the picture the moment it lands. A right
  // mark stays put. A wrong one counts a mistake and the square is set to what
  // it really is — a fill where the picture is blank becomes a cross, a cross
  // where the picture is filled becomes a fill — both drawn in fault red.
  const judge = (i, action) => {
    const truth = deal.solution[i] ? FILLED : CROSSED;
    return action === truth ? { value: action, wrong: false } : { value: truth, wrong: true };
  };

  const fault = (i) => {
    setMistakes((m) => m + 1);
    setFaults((current) => new Set(current).add(i));
  };

  // A stroke marks every empty square between where it started and where the
  // pointer is now, along one row or one column, and stops at the first
  // mistake — the square is corrected and the rest of the drag does nothing.
  // Pulling back before then takes the marks it laid back off.
  const paintTo = (to) => {
    const s = stroke.current;
    const n = deal.n;
    const sr = (s.start / n) | 0;
    const sc = s.start % n;
    let tr = (to / n) | 0;
    let tc = to % n;
    if (!s.axis && to !== s.start) s.axis = Math.abs(tr - sr) > Math.abs(tc - sc) ? "col" : "row";
    if (s.axis === "row") tr = sr;
    if (s.axis === "col") tc = sc;

    const next = s.base.slice();
    const dr = Math.sign(tr - sr);
    const dc = Math.sign(tc - sc);
    let wrong = -1;
    for (let r = sr, c = sc; ; r += dr, c += dc) {
      const i = r * n + c;
      if (s.base[i] === EMPTY) {
        const mark = judge(i, s.action);
        next[i] = mark.value;
        if (mark.wrong) {
          wrong = i;
          break;
        }
      }
      if (r === tr && c === tc) break;
    }
    setCells(next);
    setCursor(wrong >= 0 ? wrong : tr * n + tc);
    if (wrong >= 0) {
      fault(wrong);
      stroke.current = null;
    }
  };

  const cellFrom = (target) => {
    const node = target?.closest?.("[data-i]");
    if (!node || !gridRef.current?.contains(node)) return -1;
    return Number(node.dataset.i);
  };

  const onPointerDown = (event) => {
    if (!playable || event.button > 2 || event.button === 1) return;
    const i = cellFrom(event.target);
    if (i < 0) return;
    event.preventDefault();
    gridRef.current.setPointerCapture?.(event.pointerId);
    if (!started) setStarted(true);
    stroke.current = {
      base: cells,
      start: i,
      last: i,
      action: event.button === 2 || mode === CROSSED ? CROSSED : FILLED,
      axis: null,
    };
    paintTo(i);
  };

  const onPointerMove = (event) => {
    if (!stroke.current) return;
    const i = cellFrom(document.elementFromPoint(event.clientX, event.clientY));
    if (i < 0 || i === stroke.current.last) return;
    stroke.current.last = i;
    paintTo(i);
  };

  const onPointerUp = () => {
    stroke.current = null;
  };

  const mark = (i, action) => {
    if (!playable || i === null || cells[i] !== EMPTY) return;
    if (!started) setStarted(true);
    const result = judge(i, action);
    const next = cells.slice();
    next[i] = result.value;
    setCells(next);
    if (result.wrong) fault(i);
  };

  // --- keyboard: the grid takes it while a cell has focus -------------------

  const onKeyDown = (event) => {
    if (!deal || event.metaKey || event.ctrlKey || event.altKey) return;
    const n = deal.n;
    const at = cursor ?? 0;
    const moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    const step = moves[event.key];
    if (step) {
      event.preventDefault();
      const r = Math.min(n - 1, Math.max(0, ((at / n) | 0) + step[0]));
      const c = Math.min(n - 1, Math.max(0, (at % n) + step[1]));
      const next = r * n + c;
      setCursor(next);
      cellRefs.current[next]?.focus();
      return;
    }
    const key = event.key.toLowerCase();
    if (key === " " || key === "enter" || key === "f") {
      event.preventDefault();
      mark(at, FILLED);
    } else if (key === "x") {
      mark(at, CROSSED);
    } else if (key === "m") {
      setMode((m) => (m === FILLED ? CROSSED : FILLED));
    }
  };

  // --- derived -------------------------------------------------------------

  const n = deal?.n ?? 0;
  const filled = cells.filter((c) => c === FILLED).length;
  const target = deal ? deal.solution.filter(Boolean).length : 0;
  const label = `${difficultyOf(difficulty).label} ${sizeOf(sizeId).label}`;

  // --- render --------------------------------------------------------------

  return (
    <div className="pic">
      <div className="pic__field">
        {deal && cells.length === n * n ? (
          <PicrossGrid
            n={n}
            clues={deal.clues}
            cells={cells}
            faults={faults}
            cursor={status === "won" ? null : cursor}
            solved={status === "won"}
            gridRef={gridRef}
            cellRefs={cellRefs}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onKeyDown={onKeyDown}>
            <Verdict
              open={status === "won" && !dismissed}
              tone="won"
              title="Solved"
              line={`${label} in ${clock(seconds)}, ${
                mistakes ? `${mistakes} mistake${mistakes > 1 ? "s" : ""}` : "no mistakes"
              }.`}
              actions={[{ label: "New picture", onClick: () => newGame(sizeId, difficulty) }]}
              onClose={() => setDismissed(true)}
            />
          </PicrossGrid>
        ) : (
          <div className="pic__veil">
            <p className="label">Drawing the picture</p>
          </div>
        )}
      </div>

      <div className="pic__side">
        <div className="readout">
          <div className="readout__item">
            <span className="readout__label">Time</span>
            <span className="readout__value">{clock(seconds)}</span>
          </div>
          <div className="readout__item">
            <span className="readout__label">Mistakes</span>
            <span className={`readout__value ${mistakes ? "is-warn" : ""}`}>{mistakes}</span>
          </div>
          <div className="readout__item">
            <span className="readout__label">Filled</span>
            <span className="readout__value">
              {filled}/{target}
            </span>
          </div>
        </div>

        <div className="stack" style={{ gap: 10 }}>
          <span className="zone-label" style={{ margin: 0 }}>
            Grid
          </span>
          <Peg
            options={SIZES.map((s) => ({ id: s.id, label: s.label }))}
            value={sizeId}
            onChange={setSizeId}
            label="Grid size"
          />
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

        <div className="tools pic__tools">
          <button
            type="button"
            className={`tool ${mode === FILLED ? "is-on" : ""}`}
            aria-pressed={mode === FILLED}
            disabled={!playable}
            onClick={() => setMode(FILLED)}>
            <FillMark size={18} />
            <span>Fill</span>
          </button>
          <button
            type="button"
            className={`tool ${mode === CROSSED ? "is-on" : ""}`}
            aria-pressed={mode === CROSSED}
            disabled={!playable}
            onClick={() => setMode(CROSSED)}>
            <CrossMark size={18} />
            <span>Cross</span>
          </button>
          <button type="button" className="tool pic__new" onClick={() => newGame(sizeId, difficulty)}>
            <Replay size={18} />
            <span>New picture</span>
          </button>
        </div>

        <p className="chalk chalk--tight">
          Each number is a run of filled squares in that row or column, in order, with at least
          one gap between runs. Drag to paint a run; right-click or <b>Cross</b> marks a square
          you know is empty. Every mark is checked as it lands: a wrong one counts as a mistake
          and shows what the square really is, in red. Arrows move, space fills, <b>X</b>{" "}
          crosses, <b>M</b> swaps the tool. Every picture solves by logic alone.
        </p>
      </div>
    </div>
  );
}
