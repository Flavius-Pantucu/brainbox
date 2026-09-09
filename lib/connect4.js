// Connect Four rules and opponents. Pure functions — the same logic runs in the
// browser for local play and on the server for online rooms.

export const COLS = 7;
export const ROWS = 6;
export const CELLS = COLS * ROWS;

// Row 0 is the top, so a disc falls to the highest row index that is free.
export const index = (row, col) => row * COLS + col;

export const EMPTY = () => new Array(CELLS).fill(null);

const other = (disc) => (disc === "R" ? "Y" : "R");

// Every run of four on the board, worked out once.
export const LINES = (() => {
  const lines = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (col + 3 < COLS) lines.push([0, 1, 2, 3].map((n) => index(row, col + n)));
      if (row + 3 < ROWS) lines.push([0, 1, 2, 3].map((n) => index(row + n, col)));
      if (col + 3 < COLS && row + 3 < ROWS)
        lines.push([0, 1, 2, 3].map((n) => index(row + n, col + n)));
      if (col - 3 >= 0 && row + 3 < ROWS)
        lines.push([0, 1, 2, 3].map((n) => index(row + n, col - n)));
    }
  }
  return lines;
})();

export function landingRow(board, col) {
  for (let row = ROWS - 1; row >= 0; row -= 1) {
    if (!board[index(row, col)]) return row;
  }
  return -1;
}

export function openColumns(board) {
  const open = [];
  for (let col = 0; col < COLS; col += 1) if (landingRow(board, col) >= 0) open.push(col);
  return open;
}

// Returns the new board and where the disc landed, or null if the column is full.
export function drop(board, col, disc) {
  if (!Number.isInteger(col) || col < 0 || col >= COLS) return null;
  const row = landingRow(board, col);
  if (row < 0) return null;
  const next = board.slice();
  next[index(row, col)] = disc;
  return { board: next, at: index(row, col), row, col };
}

export function outcomeOf(board) {
  for (const line of LINES) {
    const [a, b, c, d] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c] && board[a] === board[d]) {
      return { winner: board[a], line };
    }
  }
  if (board.every(Boolean)) return { winner: "draw", line: null };
  return null;
}

/* ------------------------------------------------------------ opponents --- */

// A position is worth what its open runs of four are worth. A run with both
// colours in it can never be completed, so it is worth nothing to anybody.
function score(board, me) {
  const foe = other(me);
  let total = 0;

  for (const line of LINES) {
    let mine = 0;
    let theirs = 0;
    for (const cell of line) {
      if (board[cell] === me) mine += 1;
      else if (board[cell] === foe) theirs += 1;
    }
    if (mine && theirs) continue;
    if (mine === 3) total += 50;
    else if (mine === 2) total += 6;
    else if (mine === 1) total += 1;
    if (theirs === 3) total -= 60;
    else if (theirs === 2) total -= 8;
    else if (theirs === 1) total -= 1;
  }

  // the middle column feeds more runs than any other, so holding it is worth something
  for (let row = 0; row < ROWS; row += 1) {
    const cell = board[index(row, 3)];
    if (cell === me) total += 4;
    else if (cell === foe) total -= 4;
  }

  return total;
}

// Middle first: a better first guess prunes more of the tree.
const ORDER = [3, 2, 4, 1, 5, 0, 6];

function search(board, disc, me, depth, alpha, beta) {
  const outcome = outcomeOf(board);
  if (outcome) {
    if (outcome.winner === "draw") return 0;
    // depth is folded in so it takes the fastest win and the slowest loss
    return outcome.winner === me ? 10000 + depth : -10000 - depth;
  }
  if (depth === 0) return score(board, me);

  const maximising = disc === me;
  let best = maximising ? -Infinity : Infinity;

  for (const col of ORDER) {
    const played = drop(board, col, disc);
    if (!played) continue;
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

export function bestMove(board, disc, depth = 5) {
  const open = openColumns(board);
  if (!open.length) return -1;

  let best = -Infinity;
  let picks = [];
  for (const col of ORDER) {
    const played = drop(board, col, disc);
    if (!played) continue;
    const value = search(played.board, other(disc), disc, depth - 1, -Infinity, Infinity);
    if (value > best) {
      best = value;
      picks = [col];
    } else if (value === best) {
      picks.push(col);
    }
  }
  return picks[Math.floor(Math.random() * picks.length)] ?? open[0];
}

export function randomMove(board) {
  const open = openColumns(board);
  if (!open.length) return -1;
  return open[Math.floor(Math.random() * open.length)];
}

// "Loose" still takes a win and still blocks one — an opponent that misses
// those is not easy, it is broken.
export function pickMove(board, disc, level) {
  const open = openColumns(board);
  if (!open.length) return -1;

  const setting = LEVELS.find((l) => l.id === level) || LEVELS[1];

  for (const col of open) {
    const mine = drop(board, col, disc);
    if (mine && outcomeOf(mine.board)?.winner === disc) return col;
  }
  for (const col of open) {
    const theirs = drop(board, col, other(disc));
    if (theirs && outcomeOf(theirs.board)?.winner === other(disc)) return col;
  }

  if (setting.slip && Math.random() < setting.slip) return randomMove(board);
  return bestMove(board, disc, setting.depth);
}

export const LEVELS = [
  { id: "easy", label: "Loose", depth: 2, slip: 0.55 },
  { id: "fair", label: "Fair", depth: 4, slip: 0.15 },
  { id: "sharp", label: "Sharp", depth: 6, slip: 0 },
];
