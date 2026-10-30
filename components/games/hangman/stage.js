"use client";

// The gallows and the word, on their own so the dashboard can show them
// without starting a game. The gallows stand from the start; each wrong
// letter draws one more stroke of the figure, in the order a hand would.
const FIGURE = [
  <circle key="head" cx="86" cy="40" r="11" />,
  <line key="body" x1="86" y1="51" x2="86" y2="88" />,
  <line key="arm-l" x1="86" y1="60" x2="72" y2="76" />,
  <line key="arm-r" x1="86" y1="60" x2="100" y2="76" />,
  <line key="leg-l" x1="86" y1="88" x2="74" y2="112" />,
  <line key="leg-r" x1="86" y1="88" x2="98" y2="112" />,
];

export function HangmanStage({ word, guessed, misses, lost = false, category }) {
  return (
    <div className={`hm__stage ${lost ? "is-lost" : ""}`}>
      <svg
        className="hm__gallows"
        viewBox="0 0 120 140"
        role="img"
        aria-label={`${misses} of ${FIGURE.length} wrong letters`}>
        <g className="hm__frame">
          <line x1="12" y1="132" x2="72" y2="132" />
          <line x1="30" y1="132" x2="30" y2="10" />
          <line x1="30" y1="10" x2="86" y2="10" />
          <line x1="30" y1="30" x2="50" y2="10" />
          <line x1="86" y1="10" x2="86" y2="29" />
        </g>
        <g className="hm__figure">{FIGURE.slice(0, misses)}</g>
      </svg>

      {category && <p className="hm__category">{category}</p>}

      <p
        className="hm__word"
        aria-label={`The word: ${[...word].map((l) => (guessed.has(l) ? l : "blank")).join(", ")}`}>
        {[...word].map((letter, i) => {
          const shown = guessed.has(letter);
          return (
            <span
              key={i}
              className={`hm__slot ${shown ? "is-shown" : ""} ${lost && !shown ? "is-missed" : ""}`}
              aria-hidden="true">
              {shown || lost ? letter : ""}
            </span>
          );
        })}
      </p>
    </div>
  );
}
