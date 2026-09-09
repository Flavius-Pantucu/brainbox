// Go rules, scoring and an opponent. Pure functions — the same logic runs in
// the browser for local play and on the server for online rooms.
//
// Area (Chinese) scoring, simple ko, and stones marked dead by hand at the end.
// Not implemented: positional superko, and the bot is a flat Monte-Carlo
// player rather than anything that has read a book.

export const SIZES = [
  { id: 9, label: "9 × 9" },
  { id: 13, label: "13 × 13" },
  { id: 19, label: "19 × 19" },
];

export const KOMI = 6.5;

export const emptyBoard = (size) => new Array(size * size).fill(null);

export const other = (colour) => (colour === "b" ? "w" : "b");

export const pointOf = (size, row, col) => row * size + col;

// Where the board's dots go: the standard nine, or four and the centre on 9×9.
export function starPoints(size) {
  if (size < 9) return [];
  const edge = size > 9 ? 3 : 2;
  const middle = (size - 1) / 2;
  const lines = [edge, middle, size - 1 - edge].filter(Number.isInteger);
  const points = [];
  for (const row of lines) {
    for (const col of lines) {
      if (size === 9 && (row === middle) !== (col === middle)) continue;
      points.push(pointOf(size, row, col));
    }
  }
  return points;
}

export function neighbours(size, point) {
  const row = Math.floor(point / size);
  const col = point % size;
  const out = [];
  if (row > 0) out.push(point - size);
  if (row < size - 1) out.push(point + size);
  if (col > 0) out.push(point - 1);
  if (col < size - 1) out.push(point + 1);
  return out;
}

// The whole connected string a stone belongs to, and the empty points around it.
export function groupAt(board, size, point) {
  const colour = board[point];
  if (!colour) return null;
  const stones = [point];
  const seen = new Set([point]);
  const liberties = new Set();

  for (let i = 0; i < stones.length; i += 1) {
    for (const next of neighbours(size, stones[i])) {
      if (board[next] === null) liberties.add(next);
      else if (board[next] === colour && !seen.has(next)) {
        seen.add(next);
        stones.push(next);
      }
    }
  }

  return { stones, liberties };
}

// One move. Returns the board it makes, or why it cannot be played.
export function play(board, size, point, colour, ko = null) {
  if (!Number.isInteger(point) || point < 0 || point >= size * size) return { error: "off-board" };
  if (board[point] !== null) return { error: "taken" };
  if (ko === point) return { error: "ko" };

  const next = board.slice();
  next[point] = colour;

  const captured = [];
  for (const around of neighbours(size, point)) {
    if (next[around] !== other(colour)) continue;
    const group = groupAt(next, size, around);
    if (group.liberties.size === 0) {
      for (const stone of group.stones) {
        next[stone] = null;
        captured.push(stone);
      }
    }
  }

  const own = groupAt(next, size, point);
  if (own.liberties.size === 0) return { error: "suicide" };

  // simple ko: one stone taken by a lone stone that is itself down to one liberty
  const nextKo =
    captured.length === 1 && own.stones.length === 1 && own.liberties.size === 1
      ? captured[0]
      : null;

  return { board: next, captured, ko: nextKo };
}

/* --------------------------------------------------------------- scoring --- */

// Who surrounds what. Empty points touching one colour only belong to it;
// everything else is neutral. Stones marked dead come off first.
export function territoryOf(board, size, dead = []) {
  const settled = board.slice();
  for (const point of dead) settled[point] = null;

  const owner = new Array(board.length).fill(null);
  const seen = new Set();

  for (let point = 0; point < settled.length; point += 1) {
    if (settled[point] !== null || seen.has(point)) continue;

    const region = [point];
    seen.add(point);
    const borders = new Set();

    for (let i = 0; i < region.length; i += 1) {
      for (const next of neighbours(size, region[i])) {
        if (settled[next] === null) {
          if (!seen.has(next)) {
            seen.add(next);
            region.push(next);
          }
        } else {
          borders.add(settled[next]);
        }
      }
    }

    if (borders.size === 1) {
      const colour = [...borders][0];
      for (const empty of region) owner[empty] = colour;
    }
  }

  return { owner, settled };
}

// Area scoring: what you have stones on, plus what only you surround.
export function score(board, size, komi = KOMI, dead = []) {
  const { owner, settled } = territoryOf(board, size, dead);

  const area = { b: 0, w: 0 };
  for (const stone of settled) if (stone) area[stone] += 1;
  for (const colour of owner) if (colour) area[colour] += 1;

  const black = area.b;
  const white = area.w + komi;
  return {
    b: black,
    w: white,
    winner: black > white ? "b" : white > black ? "w" : null,
    margin: Math.abs(black - white),
  };
}

export function resultText(scored) {
  if (!scored.winner) return "A tie, which komi is meant to prevent.";
  return `${scored.winner === "b" ? "Black" : "White"} by ${scored.margin.toFixed(1)}.`;
}

/* -------------------------------------------------------------- opponent --- */

// A point surrounded by your own stones is your own eye; filling it is how a
// random player kills itself, so neither the bot nor a playout ever does.
function isOwnEye(board, size, point, colour) {
  if (board[point] !== null) return false;
  for (const next of neighbours(size, point)) if (board[next] !== colour) return false;

  const row = Math.floor(point / size);
  const col = point % size;
  const diagonals = [];
  for (const [dr, dc] of [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ]) {
    const r = row + dr;
    const c = col + dc;
    if (r >= 0 && r < size && c >= 0 && c < size) diagonals.push(board[pointOf(size, r, c)]);
  }
  // on the edge one bad diagonal is already too many
  const allowed = diagonals.length < 4 ? 0 : 1;
  return diagonals.filter((stone) => stone !== colour).length <= allowed;
}

export function legalMoves(board, size, colour, ko = null) {
  const out = [];
  for (let point = 0; point < board.length; point += 1) {
    if (board[point] !== null || point === ko) continue;
    if (isOwnEye(board, size, point, colour)) continue;
    if (play(board, size, point, colour, ko).error) continue;
    out.push(point);
  }
  return out;
}

// One random game to the end, scored. Crude, and that is the point: enough of
// them say which move was worth making.
function playout(board, size, colour, ko, komi) {
  let current = board;
  let turn = colour;
  let koPoint = ko;
  let passes = 0;
  const cap = size * size * 2;

  for (let move = 0; move < cap && passes < 2; move += 1) {
    const options = legalMoves(current, size, turn, koPoint);
    if (!options.length) {
      passes += 1;
      turn = other(turn);
      koPoint = null;
      continue;
    }
    passes = 0;
    const point = options[Math.floor(Math.random() * options.length)];
    const played = play(current, size, point, turn, koPoint);
    current = played.board;
    koPoint = played.ko;
    turn = other(turn);
  }

  return score(current, size, komi);
}

export const LEVELS = [
  { id: "easy", label: "Loose", budget: 40 },
  { id: "fair", label: "Fair", budget: 220 },
  { id: "sharp", label: "Sharp", budget: 650 },
];

// ponytail: flat Monte-Carlo on the main thread, on a time budget. Good enough
// on 9×9 and honest about the rest; a worker and a tree search is the upgrade.
export function pickMove(board, size, colour, level, ko = null, komi = KOMI) {
  const setting = LEVELS.find((l) => l.id === level) || LEVELS[1];
  const options = legalMoves(board, size, colour, ko);
  if (!options.length) return null; // nothing worth playing: pass

  // early on every move scores about the same; shuffling means the bot does
  // not open in the same corner every game
  for (let i = options.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  const wins = new Array(options.length).fill(0);
  const runs = new Array(options.length).fill(0);
  // a playout on a big board costs many times what one on 9x9 does, so the
  // budget grows with the board rather than the bot getting quietly worse
  const budget = Math.min(1200, Math.round(setting.budget * (size / 9)));
  const deadline = Date.now() + budget;

  let i = 0;
  while (Date.now() < deadline) {
    const index = i % options.length;
    i += 1;
    const played = play(board, size, options[index], colour, ko);
    if (played.error) continue;
    const result = playout(played.board, size, other(colour), played.ko, komi);
    runs[index] += 1;
    if (result.winner === colour) wins[index] += 1;
  }

  let best = -1;
  let bestRate = -1;
  for (let index = 0; index < options.length; index += 1) {
    const rate = runs[index] ? wins[index] / runs[index] : 0;
    if (rate > bestRate) {
      bestRate = rate;
      best = index;
    }
  }

  // losing every playout means the game is gone; a pass is the honest answer
  if (bestRate < 0.08 && board.some(Boolean)) return null;
  return options[best] ?? null;
}
