// The BrainBox mark: a soft-cornered box with a brain in it.
//
// Two lobes either side of a centre division — the brain idiom, kept to three
// strokes so it survives at 16px, where anything denser fills in.
export function BrainBoxMark({ size = 28, ...rest }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...rest}>
      <rect
        x="2.8"
        y="2.8"
        width="26.4"
        height="26.4"
        rx="8.6"
        stroke="currentColor"
        strokeWidth="2.3"
      />
      <g
        stroke="var(--signal, currentColor)"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round">
      <path d="M16 10.9v11.2" />
      <path d="M16 11.7a4.1 4.1 0 0 0-6.8 2.7 3.4 3.4 0 0 0 .6 6.2 3.9 3.9 0 0 0 6.2 1.3" />
      <path d="M16 11.7a4.1 4.1 0 0 1 6.8 2.7 3.4 3.4 0 0 1-.6 6.2 3.9 3.9 0 0 1-6.2 1.3" />
      </g>
    </svg>
  );
}
