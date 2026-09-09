"use client";

import { useRef } from "react";

// A key peg sliding in a routed groove. Moving it re-hangs every plate on
// the board at once.
export function Peg({ options, value, onChange, label }) {
  const refs = useRef([]);

  const move = (event, index) => {
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    const step = keys[event.key];
    if (!step) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div className="peg" role="radiogroup" aria-label={label}>
      {options.map((option, index) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          ref={(node) => {
            refs.current[index] = node;
          }}
          aria-checked={option.id === value}
          tabIndex={option.id === value ? 0 : -1}
          className="peg__option"
          onKeyDown={(event) => move(event, index)}
          onClick={() => onChange(option.id)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}
