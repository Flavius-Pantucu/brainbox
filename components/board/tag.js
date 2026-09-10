import { Check, Cross, Dash, Square } from "./icons";

// A state is a written word plus a form. Never paint colour on its own —
// the word and the mark both carry it.
const MARKS = {
  on: Check,
  live: Square,
  off: Dash,
  lost: Cross,
};

export function Tag({ tone = "chalk", mark = "off", children }) {
  const Mark = MARKS[mark] || Dash;
  return (
    <span className={`tag tag--${tone}`}>
      <Mark className="tag__mark" size={mark === "live" ? 7 : 11} />
      {children}
    </span>
  );
}
