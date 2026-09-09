// The catalog. One entry per game the board can hang a plate for.
export const GAMES = [
  {
    id: "chess",
    name: "Chess",
    slug: "chess",
    line: "Full board, legal moves, captures and castling.",
    // What a finished session is measured in, on this game's plates.
    measure: "moves",
    outcomes: false, // no endgame detection yet — sessions record as played
    legacy: true, // still on the pre-rebuild interface
  },
  {
    id: "sudoku",
    name: "Sudoku",
    slug: "sudoku",
    line: "A fresh grid every game, three mistakes, the clock running.",
    measure: "time",
    outcomes: true,
  },
  {
    id: "tictactoe",
    name: "Tic-Tac-Toe",
    slug: "tictactoe",
    line: "Three in a row — the machine, the next chair, or a room code.",
    measure: "rounds",
    outcomes: true,
  },
];

export const GAME_BY_ID = Object.fromEntries(GAMES.map((g) => [g.id, g]));

export function gameName(id) {
  return GAME_BY_ID[id]?.name ?? id;
}
