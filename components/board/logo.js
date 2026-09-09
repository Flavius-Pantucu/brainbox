// The BrainBox mark.
//
// A solid brain, not an outline: filled silhouettes hold their shape at 16px
// where strokes close up. The folds are cut out of the fill rather than drawn
// over it, so the mark sits on any ground and needs no second colour.
//
// Rejected on the way here, all rendered at icon sizes before being dropped: a
// brain inside a box (the box ate the brain small), a single folded path (read
// as the digit 2), a two-tone split (the light half vanished on the day coat),
// and folds routed as circuit traces (read as a plus sign below 32px).
const HALF =
  "M16 5.9c-1.5-1.5-4.1-1.7-5.8-.3-2-.3-4 1-4.5 3-1.9.8-2.9 3-2.1 4.9" +
  "-1.5 1.4-1.5 3.9 0 5.3-.7 2 .4 4.2 2.4 4.9.2 2.1 2.1 3.7 4.2 3.5" +
  "1.1 1.5 3 2.1 4.7 1.5 .4-.2.8-.4 1.1-.7V5.9Z";

const FOLDS = (
  <g fill="none" stroke="#000" strokeWidth="2.2" strokeLinecap="round">
    <path d="M16 4.6v22.4" />
    <path d="M11.2 10.2c-2.6 1.4-2.9 4.3-.7 6" />
    <path d="M10.2 18.4c-2.4 1.3-2.7 4-.6 5.6" />
    <path d="M20.8 10.2c2.6 1.4 2.9 4.3.7 6" />
    <path d="M21.8 18.4c2.4 1.3 2.7 4 .6 5.6" />
  </g>
);

export function BrainBoxMark({ size = 28, ...rest }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      {...rest}>
      <mask id="brainbox-folds">
        <rect width="32" height="32" fill="#fff" />
        {FOLDS}
      </mask>
      <g mask="url(#brainbox-folds)" fill="var(--signal, currentColor)">
        <path d={HALF} />
        <g transform="translate(32,0) scale(-1,1)">
          <path d={HALF} />
        </g>
      </g>
    </svg>
  );
}
