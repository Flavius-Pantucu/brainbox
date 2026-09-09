// The catalog. One entry per game the board can hang a plate for.
export const GAMES = [
  {
    id: "chess",
    name: "Chess",
    slug: "chess",
    line: "An analysis board, a Stockfish opponent, or a room code.",
    // What a finished session is measured in, on this game's plates.
    measure: "moves",
    outcomes: true,
  },
  {
    id: "go",
    name: "Go",
    slug: "go",
    line: "Stones, liberties and territory — 9×9 up to 19×19.",
    measure: "games",
    outcomes: true,
  },
  {
    id: "minesweeper",
    name: "Minesweeper",
    slug: "minesweeper",
    line: "Read the numbers, flag the mines, open everything else.",
    measure: "time",
    outcomes: true,
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
    id: "checkers",
    name: "Checkers",
    slug: "checkers",
    line: "Take when you can, take again when you can — and crown on the far row.",
    measure: "rounds",
    outcomes: true,
  },
  {
    id: "reversi",
    name: "Reversi",
    slug: "reversi",
    line: "Turn the line, hold the corners — eight by eight, filled to the last square.",
    measure: "rounds",
    outcomes: true,
  },
  {
    id: "connect4",
    name: "Connect Four",
    slug: "connect4",
    line: "Four in a row — the machine, the next chair, or a room code.",
    measure: "rounds",
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
