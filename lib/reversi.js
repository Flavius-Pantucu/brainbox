// Reversi rules and opponents. Pure functions — the same logic runs in the
// browser for local play and on the server for online rooms.

export const SIZE = 8;
export const CELLS = SIZE * SIZE;

export const other = (disc) => (disc === "b" ? "w" : "b");

export const index = (row, col) => row * SIZE + col;

const DIRECTIONS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

export function start() {
  const board = new Array(CELLS).fill(null);
  board[index(3, 3)] = "w";
  board[index(3, 4)] = "b";
  board[index(4, 3)] = "b";
  board[index(4, 4)] = "w";
  return board;
}

// Every disc a move would turn over. An empty list means the move is not legal:
// in Reversi a move that turns nothing is no move at all.
export function flipsFor(board, point, disc) {
  if (board[point] !== null) return [];
  const row = Math.floor(point / SIZE);
  const col = point % SIZE;
  const flipped = [];

  for (const [dr, dc] of DIRECTIONS) {
    const run = [];
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[index(r, c)] === other(disc)) {
      run.push(index(r, c));
      r += dr;
      c += dc;
    }
    // the run only turns if your own disc closes it
    if (run.length && r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[index(r, c)] === disc) {
      flipped.push(...run);
    }
  }

  return flipped;
}

export function legalMoves(board, disc) {
  const moves = new Map();
  for (let point = 0; point < CELLS; point += 1) {
    const flipped = flipsFor(board, point, disc);
    if (flipped.length) moves.set(point, flipped);
  }
  return moves;
}

export function play(board, point, disc) {
  if (!Number.isInteger(point) || point < 0 || point >= CELLS) return { error: "off-board" };
  if (board[point] !== null) return { error: "taken" };
  const flipped = flipsFor(board, point, disc);
  if (!flipped.length) return { error: "turns-nothing" };

  const next = board.slice();
  next[point] = disc;
  for (const cell of flipped) next[cell] = disc;
  return { board: next, flipped };
}

export function counts(board) {
  const tally = { b: 0, w: 0 };
  for (const disc of board) if (disc) tally[disc] += 1;
  return tally;
}

// Who plays next: the other side, unless they cannot move, in which case the
// turn comes straight back. Null means neither side can move and it is over.
export function turnAfter(board, disc) {
  const next = other(disc);
  if (legalMoves(board, next).size) return next;
  if (legalMoves(board, disc).size) return disc;
  return null;
}

export function outcomeOf(board) {
  if (legalMoves(board, "b").size || legalMoves(board, "w").size) return null;
  const tally = counts(board);
  return {
    winner: tally.b > tally.w ? "b" : tally.w > tally.b ? "w" : "draw",
    counts: tally,
  };
}

export function resultText(outcome) {
  if (!outcome) return "";
  if (outcome.winner === "draw") return `Level, ${outcome.counts.b} discs each.`;
  const won = outcome.winner === "b" ? "Black" : "White";
  const high = Math.max(outcome.counts.b, outcome.counts.w);
  const low = Math.min(outcome.counts.b, outcome.counts.w);
  return `${won} takes it, ${high} to ${low}.`;
}

/* ------------------------------------------------------------ opponents --- */

// A corner can never be turned over, and the square diagonally inside one hands
// it away. Both facts are worth more than any count of discs until the end.
const WEIGHTS = [
  120, -20, 20, 5, 5, 20, -20, 120,
  -20, -40, -5, -5, -5, -5, -40, -20,
  20, -5, 15, 3, 3, 15, -5, 20,
  5, -5, 3, 3, 3, 3, -5, 5,
  5, -5, 3, 3, 3, 3, -5, 5,
  20, -5, 15, 3, 3, 15, -5, 20,
  -20, -40, -5, -5, -5, -5, -40, -20,
  120, -20, 20, 5, 5, 20, -20, 120,
];

// Holding squares matters until the board is nearly full; after that only the
// count does, because nothing can be turned back.
function score(board, me, empties) {
  const foe = other(me);
  if (empties <= 10) {
    const tally = counts(board);
    return (tally[me] - tally[foe]) * 100;
  }

  let position = 0;
  for (let point = 0; point < CELLS; point += 1) {
    if (board[point] === me) position += WEIGHTS[point];
    else if (board[point] === foe) position -= WEIGHTS[point];
  }

  const mobility = legalMoves(board, me).size - legalMoves(board, foe).size;
  return position + mobility * 10;
}

function search(board, disc, me, depth, alpha, beta) {
  const empties = board.reduce((n, cell) => (cell ? n : n + 1), 0);
  const moves = legalMoves(board, disc);

  if (!moves.size) {
    // a pass is a move; two in a row ends the game
    if (!legalMoves(board, other(disc)).size) {
      const tally = counts(board);
      const mine = tally[me] - tally[other(me)];
      return mine > 0 ? 100000 + mine : mine < 0 ? -100000 + mine : 0;
    }
    return search(board, other(disc), me, depth, alpha, beta);
  }

  if (depth === 0) return score(board, me, empties);

  const maximising = disc === me;
  let best = maximising ? -Infinity : Infinity;

  for (const [point] of moves) {
    const played = play(board, point, disc);
    const value = search(played.board, other(disc), me, depth - 1, alpha, beta);
    if (maximising) {
      best = Math.max(best, value);
      alpha = Math.max(alpha, value);
    } else {
      best = Math.min(best, value);
      beta = Math.min(beta, value);
    }
    if (alpha >= beta) break;
  }

  return best;
}

export const LEVELS = [
  { id: "easy", label: "Loose", depth: 1, slip: 0.5 },
  { id: "fair", label: "Fair", depth: 4, slip: 0.1 },
  { id: "sharp", label: "Sharp", depth: 6, slip: 0 },
];

export function pickMove(board, disc, level) {
  const moves = [...legalMoves(board, disc).keys()];
  if (!moves.length) return null; // nothing to play: the turn passes

  const setting = LEVELS.find((l) => l.id === level) || LEVELS[1];
  if (setting.slip && Math.random() < setting.slip) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  let best = -Infinity;
  let picks = [];
  for (const point of moves) {
    const played = play(board, point, disc);
    const value = search(played.board, other(disc), disc, setting.depth - 1, -Infinity, Infinity);
    if (value > best) {
      best = value;
      picks = [point];
    } else if (value === best) {
      picks.push(point);
    }
  }
  return picks[Math.floor(Math.random() * picks.length)];
}
