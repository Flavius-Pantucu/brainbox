// Everything about a chess game that is neither React nor a rules engine.
// chess.js owns the rules; this file owns the numbers we hang off them, and it
// runs in the browser and on the server unchanged.

export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
export const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

export const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
export const PIECE_NAME = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

// The board art already in /public/images is named the way the engine names
// pieces, so the mapping is the filename.
export function pieceImage(color, type) {
  return `/images/${color}${type.toUpperCase()}.svg`;
}

export function squareOf(file, rank) {
  return `${FILES[file]}${RANKS[rank]}`;
}

/* -------------------------------------------------------------- material --- */

// What each side has taken, and who is up on the exchange. Read off the board
// rather than the move list, so a position loaded from a FEN counts too.
export function materialFrom(board) {
  const left = { w: {}, b: {} };
  for (const row of board) {
    for (const piece of row) {
      if (!piece) continue;
      left[piece.color][piece.type] = (left[piece.color][piece.type] || 0) + 1;
    }
  }

  const FULL = { p: 8, n: 2, b: 2, r: 2, q: 1 };
  const taken = { w: [], b: [] };
  let score = 0;

  for (const type of ["q", "r", "b", "n", "p"]) {
    for (const color of ["w", "b"]) {
      // a promoted piece can put a side above its starting count; never report
      // a negative capture count for it
      const missing = Math.max(0, FULL[type] - (left[color][type] || 0));
      for (let i = 0; i < missing; i += 1) taken[color === "w" ? "b" : "w"].push(type);
      score += (color === "w" ? 1 : -1) * ((left[color][type] || 0) * PIECE_VALUE[type]);
    }
  }

  return { taken, score };
}

/* ------------------------------------------------------------ evaluation --- */

// Engine scores arrive from the mover's point of view. Everything above the
// board reads from white's, so normalise once, here.
export function whiteScore(score, turn) {
  if (!score) return null;
  const sign = turn === "b" ? -1 : 1;
  if (score.mate != null) return { mate: score.mate * sign, cp: null };
  return { cp: score.cp * sign, mate: null };
}

// How much of the bar white owns, 0..1. Mate is the whole bar; a pawn or two is
// most of the movement anyone can read.
export function evalToShare(score) {
  if (!score) return 0.5;
  if (score.mate != null) return score.mate > 0 ? 1 : 0;
  return 1 / (1 + Math.exp(-score.cp / 320));
}

export function evalText(score) {
  if (!score) return "0.0";
  if (score.mate != null) return `M${Math.abs(score.mate)}`;
  const pawns = score.cp / 100;
  return `${pawns > 0 ? "+" : pawns < 0 ? "−" : ""}${Math.abs(pawns).toFixed(1)}`;
}

// Lichess's win-percentage curve. Centipawns are not linear in how much a
// position is actually worth, and a report built on raw centipawns calls every
// swing in a lost position a blunder.
export function winPercent(score, forColor = "w") {
  if (!score) return 50;
  if (score.mate != null) {
    const mating = score.mate > 0 ? "w" : "b";
    return mating === forColor ? 100 : 0;
  }
  const cp = forColor === "w" ? score.cp : -score.cp;
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

// Lichess's accuracy curve over the win percentage a move gave away.
export function accuracyOf(lostWin) {
  const value = 103.1668 * Math.exp(-0.04354 * lostWin) - 3.1669;
  return Math.max(0, Math.min(100, value));
}

export const VERDICTS = {
  best: { label: "Best", mark: "!", tone: "best" },
  excellent: { label: "Excellent", mark: "", tone: "good" },
  good: { label: "Good", mark: "", tone: "good" },
  inaccuracy: { label: "Inaccuracy", mark: "?!", tone: "warn" },
  mistake: { label: "Mistake", mark: "?", tone: "bad" },
  blunder: { label: "Blunder", mark: "??", tone: "worst" },
};

// Judge a move by how much win percentage it handed over, not by centipawns.
export function verdictFor(lostWin, playedBest) {
  if (playedBest || lostWin < 2) return "best";
  if (lostWin < 5) return "excellent";
  if (lostWin < 10) return "good";
  if (lostWin < 20) return "inaccuracy";
  if (lostWin < 30) return "mistake";
  return "blunder";
}

/* --------------------------------------------------------------- outcome --- */

// One reading of a finished (or unfinished) position, in the words the rest of
// the app uses.
export function outcomeOf(chess) {
  if (chess.isCheckmate()) {
    const winner = chess.turn() === "w" ? "b" : "w";
    return { over: true, status: "won", winner, reason: "checkmate" };
  }
  if (chess.isStalemate()) return { over: true, status: "draw", winner: null, reason: "stalemate" };
  if (chess.isInsufficientMaterial())
    return { over: true, status: "draw", winner: null, reason: "insufficient material" };
  if (chess.isThreefoldRepetition())
    return { over: true, status: "draw", winner: null, reason: "repetition" };
  if (chess.isDraw()) return { over: true, status: "draw", winner: null, reason: "the fifty-move rule" };
  return { over: false, status: "playing", winner: null, reason: null };
}

export function resultLine({ status, winner, reason }, names = { w: "White", b: "Black" }) {
  if (status === "draw") return `Drawn by ${reason || "agreement"}.`;
  if (status === "won") return `${names[winner]} wins by ${reason || "checkmate"}.`;
  return "";
}

/* ----------------------------------------------------------------- clock --- */

export function fenTurn(fen) {
  return fen.split(" ")[1] === "b" ? "b" : "w";
}

/* ---------------------------------------------------------------- clocks --- */

// Both the browser and the room server read these, so neither can offer a
// control the other does not know.
export const TIME_CONTROLS = [
  { id: "none", label: "No clock", initial: null, increment: 0 },
  { id: "3+2", label: "3 + 2", initial: 180000, increment: 2000 },
  { id: "5+0", label: "5 + 0", initial: 300000, increment: 0 },
  { id: "10+5", label: "10 + 5", initial: 600000, increment: 5000 },
];

export function timeControl(id) {
  return TIME_CONTROLS.find((control) => control.id === id) || TIME_CONTROLS[0];
}

// Under ten seconds a clock shows tenths, because that is when tenths matter.
export function formatClock(ms) {
  if (ms == null) return "—";
  const left = Math.max(0, ms);
  const total = Math.floor(left / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (left < 10000) return `${seconds}.${Math.floor((left % 1000) / 100)}`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
