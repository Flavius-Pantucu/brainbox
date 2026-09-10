// Every mark on this board is drawn here, at one stroke weight, so the
// hardware and the game marks read as one set of fittings.

const base = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
  focusable: "false",
};

export function ChessMark({ size = 20, ...rest }) {
  // A knight, cut to the same stroke as the rest of the fittings.
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <path d="M8.5 20h8.5" />
      <path d="M9.5 20c0-3 1-4.5 3-6" />
      <path d="M15.5 20c.5-3.5 1-6 .5-8.5-.4-2-1.8-3.4-3.6-3.9" />
      <path d="M12.4 7.6 13.6 4l-2.1.9-1.2-1.6-.9 2.4-2.6 1.9c-1 .7-1.3 1.6-1 2.6l.6 2 2.1-1.7 1.7 1" />
    </svg>
  );
}

export function SudokuMark({ size = 20, ...rest }) {
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="1" />
      <path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17" strokeWidth="1.1" />
      <path d="M6.2 7.4v-1M12 12.9v-1M17.6 18.4v-1" strokeWidth="2.2" />
    </svg>
  );
}

export function TicTacToeMark({ size = 20, ...rest }) {
  // Two marks on a grid, cut wide enough to survive at 18px.
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <path d="M9.3 3.5v17M14.7 3.5v17M3.5 9.3h17M3.5 14.7h17" strokeWidth="1.2" />
      <path d="M4.8 4.8 7.8 7.8M7.8 4.8 4.8 7.8" strokeWidth="2" />
      <circle cx="12" cy="12" r="2.1" strokeWidth="2" />
    </svg>
  );
}

export function Connect4Mark({ size = 20, ...rest }) {
  // A grid of holes with a run of four filled through it.
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
      <circle cx="7.5" cy="8.5" r="1.5" strokeWidth="2" />
      <circle cx="12" cy="8.5" r="1.5" />
      <circle cx="16.5" cy="8.5" r="1.5" />
      <circle cx="7.5" cy="13" r="1.5" />
      <circle cx="12" cy="13" r="1.5" strokeWidth="2" />
      <circle cx="16.5" cy="13" r="1.5" />
      <circle cx="7.5" cy="17" r="1.5" />
      <circle cx="12" cy="17" r="1.5" />
      <circle cx="16.5" cy="17" r="1.5" strokeWidth="2" />
    </svg>
  );
}

export function GoMark({ size = 20, ...rest }) {
  // A corner of a goban with two stones on it.
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <path d="M4 4v16M12 4v16M20 4v16M4 4h16M4 12h16M4 20h16" strokeWidth="1" />
      <circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" />
      <circle cx="20" cy="4" r="2.6" strokeWidth="1.6" />
    </svg>
  );
}

export function ReversiMark({ size = 20, ...rest }) {
  // A disc caught mid-turn: one face filled, one open, on a ruled board.
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="1.5" />
      <path d="M12 3.5v17M3.5 12h17" strokeWidth="1" />
      <circle cx="7.9" cy="7.9" r="2.4" fill="currentColor" stroke="none" />
      <circle cx="16.1" cy="16.1" r="2.4" strokeWidth="1.6" />
    </svg>
  );
}

export function CheckersMark({ size = 20, ...rest }) {
  // Two men on the dark squares, one of them crowned.
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="1.5" />
      <path d="M12 3.5v17M3.5 12h17" strokeWidth="1" />
      <circle cx="7.9" cy="16.1" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="16.1" cy="7.9" r="2.5" strokeWidth="1.6" />
      <path d="M14.9 7.9h2.4" strokeWidth="1.4" />
    </svg>
  );
}

export function Mine({ size = 18, ...rest }) {
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <circle cx="12" cy="12" r="5" fill="currentColor" stroke="none" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
    </svg>
  );
}

export function Flag({ size = 18, ...rest }) {
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <path d="M7 21V3" />
      <path d="M7 4.5h10.5L15 8.2l2.5 3.7H7" fill="currentColor" stroke="none" />
      <path d="M7 4.5h10.5L15 8.2l2.5 3.7H7" />
    </svg>
  );
}

export function MinesweeperMark({ size = 20, ...rest }) {
  // A mine sat in a ruled field.
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="1.5" />
      <path d="M9 3.5v17M15 3.5v17M3.5 9h17M3.5 15h17" strokeWidth="0.9" />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
      <path d="M12 8.4v-1.2M12 16.8v-1.2M8.4 12H7.2M16.8 12h-1.2" strokeWidth="1.4" />
    </svg>
  );
}

export function BackgammonMark({ size = 20, ...rest }) {
  // Two points and a die.
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="1.5" />
      <path d="M6.5 3.8 8.9 12 11.3 3.8" fill="currentColor" stroke="none" />
      <path d="M12.7 20.2 15.1 12l2.4 8.2" strokeWidth="1.2" />
      <circle cx="8.9" cy="17.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15.1" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export const GAME_MARKS = {
  chess: ChessMark,
  sudoku: SudokuMark,
  tictactoe: TicTacToeMark,
  connect4: Connect4Mark,
  go: GoMark,
  reversi: ReversiMark,
  checkers: CheckersMark,
  minesweeper: MinesweeperMark,
  backgammon: BackgammonMark,
};

export function Lamp({ size = 18, lit = false, ...rest }) {
  // The board's work lamp: lit for the day paint, hooded for the night paint.
  return (
    <svg {...base} width={size} height={size} {...rest}>
      {lit ? (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" />
        </>
      ) : (
        <path d="M19 14.2A7.6 7.6 0 0 1 9.8 5 7.6 7.6 0 1 0 19 14.2Z" />
      )}
    </svg>
  );
}

export function ArrowLeft({ size = 14, ...rest }) {
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <path d="M19 12H5" strokeWidth="2" />
      <path d="M10.5 6.5 5 12l5.5 5.5" strokeWidth="2" />
    </svg>
  );
}

export function Check({ size = 14, ...rest }) {
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <path d="M4.5 12.5 9.5 17.5 19.5 6.5" strokeWidth="2.6" />
    </svg>
  );
}

export function Cross({ size = 14, ...rest }) {
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <path d="M6 6l12 12M18 6 6 18" strokeWidth="2.4" />
    </svg>
  );
}

export function Dash({ size = 14, ...rest }) {
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <path d="M5 12h14" strokeWidth="2.4" />
    </svg>
  );
}

export function Square({ size = 8, ...rest }) {
  return (
    <svg {...base} width={size} height={size} viewBox="0 0 8 8" {...rest}>
      <rect x="1" y="1" width="6" height="6" fill="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function Pencil({ size = 18, ...rest }) {
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <path d="M4 20.2h4.2L19.4 9a2.6 2.6 0 0 0-3.7-3.7L4.5 16.5v3.7Z" />
      <path d="M14.6 6.6 18 10" />
    </svg>
  );
}

export function Eraser({ size = 18, ...rest }) {
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <path d="M8.7 20h10.8" />
      <path d="M15.6 4.6 4.6 15.6a2 2 0 0 0 0 2.8l1.6 1.6h4.6l9.6-9.6a2 2 0 0 0 0-2.8l-2-2a2 2 0 0 0-2.8 0Z" />
      <path d="M10.4 9.8 16 15.4" />
    </svg>
  );
}

export function Undo({ size = 18, ...rest }) {
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <path d="M4 8.5h9.5a5.5 5.5 0 0 1 0 11H8" />
      <path d="M7.5 4.5 3.5 8.5l4 4" />
    </svg>
  );
}

export function Bulb({ size = 18, ...rest }) {
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <path d="M9.4 17.5h5.2" />
      <path d="M10 20.5h4" />
      <path d="M12 3.5a5.6 5.6 0 0 0-3.3 10.1c.5.4.8 1 .8 1.6v.3h5v-.3c0-.6.3-1.2.8-1.6A5.6 5.6 0 0 0 12 3.5Z" />
    </svg>
  );
}

export function Pause({ size = 18, ...rest }) {
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <path d="M9.5 5v14M14.5 5v14" strokeWidth="2.2" />
    </svg>
  );
}

export function Play({ size = 18, ...rest }) {
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <path d="M7.5 4.8 19 12 7.5 19.2V4.8Z" />
    </svg>
  );
}

export function Copy({ size = 18, ...rest }) {
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 5.5A2 2 0 0 0 13.5 3.5h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2" />
    </svg>
  );
}

export function Users({ size = 18, ...rest }) {
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3 2.5-5.2 5.5-5.2s5.5 2.2 5.5 5.2" />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 5.9" />
      <path d="M17.4 14.9c1.9.6 3.1 2.4 3.1 5.1" />
    </svg>
  );
}

export function Cpu({ size = 18, ...rest }) {
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <rect x="6.5" y="6.5" width="11" height="11" rx="1.5" />
      <rect x="10" y="10" width="4" height="4" rx="0.5" />
      <path d="M9.5 3.5v3M14.5 3.5v3M9.5 17.5v3M14.5 17.5v3M3.5 9.5h3M3.5 14.5h3M17.5 9.5h3M17.5 14.5h3" />
    </svg>
  );
}
