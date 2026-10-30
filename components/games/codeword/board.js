"use client";

// The Codeword sheet, on its own so the dashboard can show one without
// starting a game on it. Every row is a guess and its score: a filled dot for
// each letter in the right place, a ring for each one in the word elsewhere,
// each with its number beside it. Which letters those are, the sheet never says.
export function CodewordBoard({ length, limit, rows, typing = "", live = true, shake = 0 }) {
  const lines = Array.from({ length: limit }, (_, i) => {
    if (i < rows.length) return { ...rows[i], kind: "done" };
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
                ? `${line.word}: ${line.score.inPlace} in place, ${line.score.elsewhere} elsewhere`
                : undefined
            }>
            {Array.from({ length }, (_, k) => (
              <span key={k} className={`cw__tile ${line.word[k] ? "is-set" : ""}`}>
                {line.word[k] || ""}
              </span>
            ))}
            <span className="cw__score" aria-hidden="true">
              {line.kind === "done" && (
                <>
                  <span className="cw__count">
                    <i className="cw__dot" />
                    {line.score.inPlace}
                  </span>
                  <span className="cw__count">
                    <i className="cw__ring" />
                    {line.score.elsewhere}
                  </span>
                </>
              )}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
