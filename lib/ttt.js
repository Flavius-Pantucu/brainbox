// Tic-tac-toe rules and opponents. Pure functions — the same logic runs in the
// browser for local play and on the server for online rooms.

export const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function outcomeOf(board) {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  if (board.every(Boolean)) return { winner: "draw", line: null };
  return null;
}

export function emptySquares(board) {
  return board.reduce((out, cell, i) => (cell ? out : [...out, i]), []);
}

const other = (mark) => (mark === "X" ? "O" : "X");

// Perfect play. Depth is folded into the score so it takes the fastest win and
// the slowest loss, which is what makes it feel like an opponent rather than a
// solver.
function minimax(board, mark, me, depth, alpha, beta) {
  const outcome = outcomeOf(board);
  if (outcome) {
    if (outcome.winner === "draw") return { score: 0 };
    return { score: outcome.winner === me ? 10 - depth : depth - 10 };
  }

  const maximising = mark === me;
  let best = { score: maximising ? -Infinity : Infinity, index: -1 };
  let a = alpha;
  let b = beta;

  for (const index of emptySquares(board)) {
    board[index] = mark;
    const { score } = minimax(board, other(mark), me, depth + 1, a, b);
    board[index] = null;

    if (maximising) {
      if (score > best.score) best = { score, index };
      a = Math.max(a, score);
    } else {
      if (score < best.score) best = { score, index };
      b = Math.min(b, score);
    }
    if (b <= a) break;
  }

  return best;
}

export function bestMove(board, mark) {
  const open = emptySquares(board);
  if (!open.length) return -1;
  if (open.length === 9) {
    // every opening is equivalent by symmetry; vary it so games differ
    const openings = [0, 2, 4, 6, 8];
    return openings[Math.floor(Math.random() * openings.length)];
  }
  const { index } = minimax(board.slice(), mark, mark, 0, -Infinity, Infinity);
  return index >= 0 ? index : open[0];
}

export function randomMove(board) {
  const open = emptySquares(board);
  if (!open.length) return -1;
  return open[Math.floor(Math.random() * open.length)];
}

// "Fair" plays well but blunders sometimes, which is the only setting most
// people actually enjoy against a solved game.
export function pickMove(board, mark, level) {
  if (level === "easy") return randomMove(board);
  if (level === "fair" && Math.random() < 0.3) return randomMove(board);
  return bestMove(board, mark);
}

export const LEVELS = [
  { id: "easy", label: "Loose" },
  { id: "fair", label: "Fair" },
  { id: "sharp", label: "Perfect" },
];
