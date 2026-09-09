"use client";

import { useCallback, useRef, useState } from "react";
import { Chess } from "chess.js";
import {
  VERDICTS,
  accuracyOf,
  fenTurn,
  verdictFor,
  whiteScore,
  winPercent,
} from "../../../lib/chess-core";

const REVIEW_DEPTH = 12;

function uciOf(move) {
  return `${move.from}${move.to}${move.promotion || ""}`;
}

// Walks the finished game once, one search per position rather than one per
// move: the position after your move is the position before theirs, so half the
// searches are the same search.
export function useReview(engine) {
  const [state, setState] = useState({ status: "idle", done: 0, total: 0, report: null });
  const abort = useRef(false);

  const cancel = useCallback(() => {
    abort.current = true;
    engine.cancel();
    setState((s) => (s.status === "running" ? { ...s, status: "idle" } : s));
  }, [engine]);

  const run = useCallback(
    async (moves) => {
      if (!moves.length) return;
      abort.current = false;
      const positions = [moves[0].before, ...moves.map((move) => move.after)];
      setState({ status: "running", done: 0, total: positions.length, report: null });

      const evals = [];
      for (let i = 0; i < positions.length; i += 1) {
        if (abort.current) return;
        // eslint-disable-next-line no-await-in-loop
        const result = await engine.analyse(positions[i], { depth: REVIEW_DEPTH });
        if (!result || abort.current) return;
        evals.push({
          white: whiteScore(result.score, fenTurn(positions[i])),
          best: result.best,
        });
        setState((s) => ({ ...s, done: i + 1 }));
      }

      const verdicts = [];
      const totals = { w: { sum: 0, n: 0 }, b: { sum: 0, n: 0 } };
      const counts = { w: {}, b: {} };

      moves.forEach((move, i) => {
        const mover = move.color;
        const before = winPercent(evals[i].white, mover);
        const after = winPercent(evals[i + 1].white, mover);
        const lost = Math.max(0, before - after);
        const playedBest = evals[i].best === uciOf(move);

        const verdict = verdictFor(lost, playedBest);

        let bestSan = null;
        if (!playedBest && evals[i].best) {
          try {
            const board = new Chess(move.before);
            const played = board.move({
              from: evals[i].best.slice(0, 2),
              to: evals[i].best.slice(2, 4),
              promotion: evals[i].best[4] || undefined,
            });
            bestSan = played?.san ?? null;
          } catch {
            bestSan = null;
          }
        }

        verdicts.push({ verdict, lost, bestSan, accuracy: accuracyOf(lost) });
        totals[mover].sum += accuracyOf(lost);
        totals[mover].n += 1;
        counts[mover][verdict] = (counts[mover][verdict] || 0) + 1;
      });

      setState({
        status: "done",
        done: positions.length,
        total: positions.length,
        report: {
          verdicts,
          counts,
          accuracy: {
            w: totals.w.n ? totals.w.sum / totals.w.n : null,
            b: totals.b.n ? totals.b.sum / totals.b.n : null,
          },
          curve: evals.map((entry) => winPercent(entry.white, "w")),
        },
      });
    },
    [engine]
  );

  const clear = useCallback(
    () => setState({ status: "idle", done: 0, total: 0, report: null }),
    []
  );

  return { ...state, run, cancel, clear };
}

/* ------------------------------------------------------------------ panel --- */

function Curve({ points }) {
  if (!points || points.length < 2) return null;
  const step = 100 / (points.length - 1);
  const line = points.map((value, i) => `${i * step},${100 - value}`).join(" ");
  return (
    <svg className="review__curve" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <polygon className="review__fill" points={`0,100 ${line} 100,100`} />
      <polyline className="review__line" points={line} />
      <line className="review__mid" x1="0" y1="50" x2="100" y2="50" />
    </svg>
  );
}

const ORDER = ["best", "excellent", "good", "inaccuracy", "mistake", "blunder"];

export function ReviewPanel({ review, names, onClose }) {
  if (review.status === "running") {
    const share = review.total ? Math.round((review.done / review.total) * 100) : 0;
    return (
      <div className="review">
        <div className="review__head">
          <span className="zone-label" style={{ margin: 0 }}>
            Reviewing
          </span>
          <button type="button" className="key key--quiet" onClick={review.cancel}>
            Stop
          </button>
        </div>
        <div className="review__meter">
          <span style={{ width: `${share}%` }} />
        </div>
        <p className="chalk chalk--tight">
          {review.done} of {review.total} positions, at depth {REVIEW_DEPTH}.
        </p>
      </div>
    );
  }

  const report = review.report;
  if (!report) return null;

  return (
    <div className="review">
      <div className="review__head">
        <span className="zone-label" style={{ margin: 0 }}>
          Game review
        </span>
        <button type="button" className="key key--quiet" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="readout">
        <div className="readout__item">
          <span className="readout__label">{names.w}</span>
          <span className="readout__value">
            {report.accuracy.w == null ? "—" : `${report.accuracy.w.toFixed(1)}%`}
          </span>
        </div>
        <div className="readout__item">
          <span className="readout__label">{names.b}</span>
          <span className="readout__value">
            {report.accuracy.b == null ? "—" : `${report.accuracy.b.toFixed(1)}%`}
          </span>
        </div>
      </div>

      <Curve points={report.curve} />

      <table className="ruled review__table">
        <thead>
          <tr>
            <th>Move</th>
            <th className="num">{names.w}</th>
            <th className="num">{names.b}</th>
          </tr>
        </thead>
        <tbody>
          {ORDER.map((key) => (
            <tr key={key}>
              <td>{VERDICTS[key].label}</td>
              <td className="num">{report.counts.w[key] || 0}</td>
              <td className="num">{report.counts.b[key] || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
