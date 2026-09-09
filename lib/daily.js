// Today's challenge.
//
// Deterministic from the calendar date, so every visit on the same day meets
// the same challenge and no server is needed to agree on what it is.

import { GAMES } from "./games.js";
import { dayKey } from "./board.js";

const CHALLENGES = {
  chess: [
    "Open with a pawn to the centre and castle inside twelve moves.",
    "Finish the game without losing a piece worth more than a knight.",
    "Trade queens early, then win the endgame.",
  ],
  sudoku: [
    "Fill the grid without spending a single mistake.",
    "Clear the grid in under ten minutes.",
    "Solve it without writing one note.",
  ],
  go: [
    "Win a 9×9 against Fair without ever passing first.",
    "Take a corner and hold it to the count.",
    "Finish a game where you capture nothing at all.",
  ],
  minesweeper: [
    "Clear a beginner field without planting a single flag.",
    "Clear an intermediate field in under four minutes.",
    "Clear two fields in a row without hitting a mine.",
  ],
  checkers: [
    "Win a round without ever losing a king.",
    "Take three pieces in one chain.",
    "Beat Fair with a piece to spare.",
  ],
  reversi: [
    "Win holding two corners.",
    "Win a round where you are behind on discs at halfway.",
    "Beat Fair without ever taking a square next to an empty corner.",
  ],
  connect4: [
    "Win three rounds off the machine in a row.",
    "Win once without ever playing the middle column.",
    "Beat Sharp as the second player.",
  ],
  tictactoe: [
    "Take three rounds off the machine in a row.",
    "Win once without ever taking the centre square.",
    "Force a draw as the second player, three times over.",
  ],
};

// A game with no list of its own still gets a challenge rather than taking the
// whole board down with it.
const ANY = [
  "Finish one game today.",
  "Win a round against the machine at its top setting.",
  "Play two rounds back to back.",
];

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function dailyChallenge(date = new Date()) {
  const key = dayKey(date);
  const seed = hash(key);
  const game = GAMES[seed % GAMES.length];
  const list = CHALLENGES[game.id] || ANY;
  return {
    key,
    date,
    game,
    task: list[Math.floor(seed / GAMES.length) % list.length],
  };
}

export function isDoneToday(sessions, challenge) {
  return sessions.some((s) => s.day === challenge.key && s.game === challenge.game.id);
}
