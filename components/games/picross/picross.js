"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CROSSED,
  EMPTY,
  FILLED,
  SIZES,
  colAt,
  generate,
  isSolved,
  lineDone,
  rowAt,
  sizeOf,
} from "../../../lib/picross";
import { PicrossGrid } from "./grid";
import { Peg } from "../../board/peg";
import { Verdict } from "../../board/verdict";
import { CrossMark, Eraser, FillMark, Replay, Undo } from "../../board/icons";

function clock(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function Picross({ onResult }) {
  const [sizeId, setSizeId] = useState("medium");
  const [deal, setDeal] = useState(null);
  const [cells, setCells] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [mode, setMode] = useState(FILLED);
  const [status, setStatus] = useState("dealing"); // dealing | playing | won
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [undos, setUndos] = useState(0);
  const history = useRef([]);
  const stroke = useRef(null);
  const gridRef = useRef(null);
  const cellRefs = useRef([]);

  // --- dealing -------------------------------------------------------------

  // Generated after mount, never on the server: a random picture would not
  // match between the two renders.
  const newGame = useCallback((id) => {
    const next = generate(id);
    history.current = [];
    stroke.current = null;
    cellRefs.current = [];
    setDeal(next);
    setCells(new Array(next.n * next.n).fill(EMPTY));
    setCursor(null);
    setSeconds(0);
    setStarted(false);
    setDismissed(false);
    setUndos(0);
    setStatus("playing");
  }, []);

  useEffect(() => {
    newGame(sizeId);
  }, [sizeId, newGame]);

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
      meta: { size: deal.size, seconds, undos },
    });
  }, [cells, deal, status, seconds, undos, onResult]);

  // --- marking -------------------------------------------------------------

  const playable = status === "playing" && !!deal;

  const remember = (snapshot) => {
    history.current.push(snapshot);
    if (history.current.length > 300) history.current.shift();
    if (!started) setStarted(true);
  };

  // A stroke changes every cell between where it started and where the pointer
  // is now, along one row or one column, that was in the same state as the
  // first cell — so a drag fills a run without wiping the crosses beside it,
  // and pulling back un-paints what it passed.
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
    for (let r = sr, c = sc; ; r += dr, c += dc) {
      const i = r * n + c;
      if (s.base[i] === s.from) next[i] = s.value;
      if (r === tr && c === tc) break;
    }
    setCells(next);
    setCursor(tr * n + tc);
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
    const action = event.button === 2 || mode === CROSSED ? CROSSED : FILLED;
    const from = cells[i];
    stroke.current = {
      base: cells,
      start: i,
      last: i,
      from,
      value: from === action ? EMPTY : action,
      axis: null,
    };
    remember(cells);
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

  const toggle = (i, action) => {
    if (!playable || i === null) return;
    remember(cells);
    const next = cells.slice();
    next[i] = cells[i] === action ? EMPTY : action;
    setCells(next);
  };

  const undo = () => {
    const last = history.current.pop();
    if (!last || status !== "playing") return;
    setCells(last);
    setUndos((u) => u + 1);
  };

  const clear = () => {
    if (!playable || !cells.some(Boolean)) return;
    remember(cells);
    setCells(new Array(cells.length).fill(EMPTY));
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
      toggle(at, FILLED);
    } else if (key === "x") {
      toggle(at, CROSSED);
    } else if (key === "backspace" || key === "delete") {
      event.preventDefault();
      if (cells[at] !== EMPTY) toggle(at, cells[at]);
    } else if (key === "u" || key === "z") {
      undo();
    } else if (key === "m") {
      setMode((m) => (m === FILLED ? CROSSED : FILLED));
    }
  };

  // --- derived -------------------------------------------------------------

  const n = deal?.n ?? 0;
  const linesDone = useMemo(() => {
    if (!deal || !cells.length) return 0;
    let done = 0;
    for (let x = 0; x < n; x += 1) {
      if (lineDone(rowAt(cells, n, x), deal.clues.rows[x])) done += 1;
      if (lineDone(colAt(cells, n, x), deal.clues.cols[x])) done += 1;
    }
    return done;
  }, [cells, deal, n]);

  const filled = cells.filter((c) => c === FILLED).length;
  const target = deal ? deal.solution.filter(Boolean).length : 0;
  const label = sizeOf(sizeId).label;

  // --- render --------------------------------------------------------------

  return (
    <div className="pic">
      <div className="pic__field">
        {deal && cells.length === n * n ? (
          <PicrossGrid
            n={n}
            clues={deal.clues}
            cells={cells}
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
              line={`${label} in ${clock(seconds)}${
                undos ? `, ${undos} undo${undos > 1 ? "s" : ""}` : ", clean"
              }.`}
              actions={[{ label: "New picture", onClick: () => newGame(sizeId) }]}
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
            <span className="readout__label">Lines</span>
            <span className="readout__value">
              {linesDone}/{n * 2}
            </span>
          </div>
          <div className="readout__item">
            <span className="readout__label">Filled</span>
            <span className={`readout__value ${filled > target ? "is-warn" : ""}`}>
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
          <button
            type="button"
            className="tool"
            disabled={!playable || !history.current.length}
            onClick={undo}>
            <Undo size={18} />
            <span>Undo</span>
          </button>
          <button
            type="button"
            className="tool"
            disabled={!playable || !cells.some(Boolean)}
            onClick={clear}>
            <Eraser size={18} />
            <span>Clear</span>
          </button>
          <button type="button" className="tool pic__new" onClick={() => newGame(sizeId)}>
            <Replay size={18} />
            <span>New picture</span>
          </button>
        </div>

        <p className="chalk chalk--tight">
          Each number is a run of filled squares in that row or column, in order, with at least
          one gap between runs. Drag to paint a run; right-click or <b>Cross</b> marks a square
          you know is empty. Arrows move, space fills, <b>X</b> crosses, <b>U</b> undoes,{" "}
          <b>M</b> swaps the tool. Every picture solves by logic alone.
        </p>
      </div>
    </div>
  );
}
