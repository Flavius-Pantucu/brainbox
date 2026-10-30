"use client";

// The Codeword sheet, on its own so the dashboard can show one without
// starting a game on it. Every row is a guess, each letter coloured by how it
// fared: green in place, orange elsewhere in the word, grey not in it. The
// newest row (`flip`) turns over tile by tile.
export function CodewordBoard({ length, limit, rows, typing = "", live = true, shake = 0, flip = false }) {
  const lines = Array.from({ length: limit }, (_, i) => {
    if (i < rows.length) return { ...rows[i], kind: "done", fresh: flip && i === rows.length - 1 };
    if (i === rows.length && live) return { word: typing, kind: "typing" };
    return { word: "", kind: "empty" };
  });

  return (
    <div className="cw__board" style={{ "--len": length, "--limit": limit }}>
      <ol className="cw__rows" aria-label="Guesses">
        {lines.map((line, i) => (
          <li
            key={line.kind === "typing" ? `t${shake}` : i}
            className={`cw__row cw__row--${line.kind} ${line.kind === "typing" && shake ? "is-shaking" : ""}`}
            aria-label={
              line.kind === "done"
                ? `${line.word}: ${line.marks.map((m, k) => `${line.word[k]} ${m === "right" ? "in place" : m === "near" ? "elsewhere" : "not in the word"}`).join(", ")}`
                : undefined
            }>
            {Array.from({ length }, (_, k) => (
              <span
                key={k}
                className={`cw__tile ${line.word[k] ? "is-set" : ""} ${line.kind === "done" ? `is-${line.marks[k]}` : ""} ${line.fresh ? "is-flipping" : ""}`}
                style={line.fresh ? { "--k": k } : undefined}>
                {line.word[k] || ""}
              </span>
            ))}
          </li>
        ))}
      </ol>
    </div>
  );
}
