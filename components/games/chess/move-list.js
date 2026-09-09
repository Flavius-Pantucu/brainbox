"use client";

import { useEffect, useRef } from "react";
import { VERDICTS } from "../../../lib/chess-core";
import { mainLineFrom } from "../../../lib/chess-tree";

// The move number is in the position the move was played from, so a board set
// up mid-game still numbers its moves the way the game did.
function numberOf(node) {
  return Number(node.move.before.split(" ")[5]) || 1;
}

function Half({ node, current, onJump, verdicts, inline = false }) {
  const here = useRef(null);
  const verdict = verdicts?.[node.id];
  const tone = verdict ? VERDICTS[verdict.verdict] : null;

  useEffect(() => {
    if (current === node.id) here.current?.scrollIntoView({ block: "nearest" });
  }, [current, node.id]);

  return (
    <button
      type="button"
      ref={here}
      className={[
        "movelist__half",
        inline ? "movelist__half--inline" : "",
        current === node.id ? "is-current" : "",
        tone ? `is-${tone.tone}` : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => onJump?.(node.id)}>
      <span className="movelist__san">{node.move.san}</span>
      {tone?.mark && <em className="movelist__mark">{tone.mark}</em>}
    </button>
  );
}

// A variation reads as running text — number, moves, nested lines in brackets —
// the way one does in a book.
function Variation({ tree, id, current, onJump, verdicts, depth }) {
  const line = [tree.nodes[id], ...mainLineFrom(tree, id)];
  const out = [];

  line.forEach((node, index) => {
    const white = node.move.color === "w";
    if (white || index === 0) {
      out.push(
        <span className="movelist__no movelist__no--inline" key={`n${node.id}`}>
          {numberOf(node)}
          {white ? "." : "…"}
        </span>
      );
    }
    out.push(
      <Half
        key={node.id}
        node={node}
        current={current}
        onJump={onJump}
        verdicts={verdicts}
        inline
      />
    );
    // anything played instead of this move, once we are inside the line
    if (index > 0) {
      for (const alt of tree.nodes[node.parent].children.slice(1)) {
        out.push(
          <Variation
            key={`v${alt}`}
            tree={tree}
            id={alt}
            current={current}
            onJump={onJump}
            verdicts={verdicts}
            depth={depth + 1}
          />
        );
      }
    }
  });

  return (
    <span className={`movelist__var movelist__var--${Math.min(depth, 2)}`}>
      <b>(</b>
      {out}
      <b>)</b>
    </span>
  );
}

// The scoresheet. The main line is a numbered grid; anything played off it
// hangs under the move it branched from.
export function MoveList({ tree, current, onJump, verdicts = null, result = null }) {
  const main = mainLineFrom(tree, tree.root);
  const node = tree.nodes[current] || tree.nodes[tree.root];

  const rows = [];
  for (const move of main) {
    const white = move.move.color === "w";
    if (white || !rows.length) {
      rows.push({
        key: move.id,
        no: numberOf(move),
        white: white ? move : null,
        black: white ? null : move,
      });
    } else {
      rows[rows.length - 1].black = move;
    }
  }

  return (
    <div className="movelist">
      <div className="movelist__scroll">
        {!main.length && <p className="chalk chalk--tight movelist__empty">No moves yet.</p>}
        {rows.map((row) => {
          const branches = [row.white, row.black]
            .filter(Boolean)
            .flatMap((half) => tree.nodes[half.parent].children.slice(1));
          return (
            <div key={row.key}>
              <div className="movelist__row">
                <span className="movelist__no">{row.no}</span>
                {row.white ? (
                  <Half node={row.white} current={current} onJump={onJump} verdicts={verdicts} />
                ) : (
                  <span className="movelist__half movelist__half--gap">…</span>
                )}
                {row.black ? (
                  <Half node={row.black} current={current} onJump={onJump} verdicts={verdicts} />
                ) : (
                  <span className="movelist__half" />
                )}
              </div>
              {branches.length > 0 && (
                <div className="movelist__branches">
                  {branches.map((id) => (
                    <Variation
                      key={id}
                      tree={tree}
                      id={id}
                      current={current}
                      onJump={onJump}
                      verdicts={verdicts}
                      depth={0}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {result && <p className="movelist__result">{result}</p>}

      <div className="movelist__nav">
        <button
          type="button"
          className="tool"
          onClick={() => onJump?.(tree.root)}
          disabled={current === tree.root}>
          «
        </button>
        <button
          type="button"
          className="tool"
          onClick={() => onJump?.(node.parent)}
          disabled={!node.parent}>
          ‹
        </button>
        <button
          type="button"
          className="tool"
          onClick={() => onJump?.(node.children[0])}
          disabled={!node.children.length}>
          ›
        </button>
        <button
          type="button"
          className="tool"
          onClick={() => {
            const line = mainLineFrom(tree, current);
            if (line.length) onJump?.(line[line.length - 1].id);
          }}
          disabled={!node.children.length}>
          »
        </button>
      </div>
    </div>
  );
}
