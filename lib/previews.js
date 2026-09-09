// The positions the dashboard shows through each opening.
//
// They are fixed and committed rather than generated or restored: every game
// looks its best every time, a game nobody has played still looks like a game,
// and the dashboard pulls in no rules engine to draw them.

/* ----------------------------------------------------------------- chess --- */

const RUY_LOPEZ = "r1bqk2r/1pppbppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQ1RK1";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

// Enough of a FEN reader for a placement, in the shape chess.js hands to the
// board — which is cheaper than shipping chess.js to a page that never plays.
function placementFrom(rows) {
  return rows.split("/").map((row, rank) => {
    const line = [];
    for (const symbol of row) {
      if (symbol >= "1" && symbol <= "8") {
        for (let i = 0; i < Number(symbol); i += 1) line.push(null);
        continue;
      }
      const lower = symbol.toLowerCase();
      line.push({
        type: lower,
        color: symbol === lower ? "b" : "w",
        square: `${FILES[line.length]}${8 - rank}`,
      });
    }
    return line;
  });
}

export const CHESS_PREVIEW = {
  board: placementFrom(RUY_LOPEZ),
  // the move that made the position: 5...Be7
  lastMove: { from: "f8", to: "e7" },
};

/* -------------------------------------------------------------------- go --- */

// A 9x9 with both sides settled into corners and a contact fight on the right.
const GOBAN = [
  ".........",
  "..w....b.",
  "....w....",
  "..b...bw.",
  "....b.w..",
  ".w.....b.",
  "..w...b..",
  "..b.w....",
  ".........",
].join("");

export const GO_PREVIEW = {
  size: 9,
  board: [...GOBAN].map((cell) => (cell === "." ? null : cell)),
  last: 3 * 9 + 6,
};

/* ------------------------------------------------------------- connect 4 --- */

const GRID = [
  ".......",
  ".......",
  ".......",
  "...R...",
  "..RY...",
  ".RYRY..",
].join("");

export const CONNECT4_PREVIEW = {
  board: [...GRID].map((cell) => (cell === "." ? null : cell)),
  last: 3 * 7 + 3,
};

/* -------------------------------------------------------------- checkers --- */

// Thirty plies of Fair against Fair: seven men to six, both wings opened.
const MEN = [
  ".b.b...b",
  "........",
  ".b.....b",
  "..r.....",
  "...r.b.r",
  "..b.....",
  "........",
  "r...r.r.",
].join("");

export const CHECKERS_PREVIEW = {
  board: [...MEN].map((cell) => (cell === "." ? null : cell)),
};

/* --------------------------------------------------------------- reversi --- */

// Twenty-four plies of Fair against Fair: both wings taken, the corners still open.
const DISCS = [
  ".....w..",
  "...w.w..",
  "bbwwww..",
  "bbbwbb..",
  "bbwwbb..",
  "bbwwb...",
  "..ww....",
  "........",
].join("");

export const REVERSI_PREVIEW = {
  board: [...DISCS].map((cell) => (cell === "." ? null : cell)),
  last: 51,
};

/* ---------------------------------------------------------------- sudoku --- */

// A real grid from lib/sudoku.js, part-solved: the givens plus fourteen moves.
const SUDOKU_GIVEN = [
  8, 0, 5, 0, 0, 0, 4, 0, 0, 4, 0, 0, 8, 5, 0, 0, 0, 0, 0, 7, 0, 3, 9, 4, 0, 2,
  0, 6, 0, 0, 0, 0, 5, 2, 7, 0, 0, 0, 8, 1, 0, 6, 3, 0, 0, 0, 5, 1, 2, 0, 0, 0,
  0, 9, 0, 1, 0, 4, 6, 9, 0, 3, 0, 0, 0, 0, 0, 1, 8, 0, 0, 5, 0, 0, 4, 0, 0, 0,
  7, 0, 6,
];

const SUDOKU_VALUES = [
  8, 3, 5, 6, 2, 0, 4, 9, 0, 4, 2, 0, 8, 5, 0, 1, 6, 0, 1, 7, 0, 3, 9, 4, 5, 2,
  0, 6, 4, 0, 9, 8, 5, 2, 7, 0, 2, 9, 8, 1, 0, 6, 3, 0, 0, 0, 5, 1, 2, 0, 0, 0,
  0, 9, 0, 1, 0, 4, 6, 9, 0, 3, 0, 0, 0, 0, 0, 1, 8, 0, 0, 5, 0, 0, 4, 0, 0, 0,
  7, 0, 6,
];

export const SUDOKU_PREVIEW = {
  values: SUDOKU_VALUES,
  given: SUDOKU_GIVEN.map((value) => value !== 0),
  notes: new Array(81).fill(0),
};

/* ------------------------------------------------------------ tic-tac-toe --- */

// X to play, and two squares make a fork.
export const TICTACTOE_PREVIEW = {
  board: ["X", null, "O", null, "X", null, null, null, "O"],
};
