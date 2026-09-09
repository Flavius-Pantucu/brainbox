// Today's challenge.
//
// Deterministic from the calendar date, so every visit on the same day meets
// the same challenge and no server is needed to agree on what it is.

import { GAMES } from "./games";
import { dayKey } from "./board";

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
  tictactoe: [
    "Take three rounds off the machine in a row.",
    "Win once without ever taking the centre square.",
    "Force a draw as the second player, three times over.",
  ],
};

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
  const list = CHALLENGES[game.id];
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
