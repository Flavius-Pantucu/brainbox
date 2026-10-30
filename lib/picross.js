// PiCross (nonogram) generation and line logic.
//
// Every puzzle is generated in the browser when a game starts: a picture is
// drawn at random and kept only if line-by-line logic solves it all the way. A
// puzzle that logic finishes has exactly one answer and never asks the player
// to guess, at any difficulty. There is no fixed puzzle list and no server.

export const SIZES = [
  { id: "small", label: "5 × 5", n: 5 },
  { id: "medium", label: "10 × 10", n: 10 },
  { id: "large", label: "15 × 15", n: 15 },
];

export const sizeOf = (id) => SIZES.find((s) => s.id === id) || SIZES[1];

// Difficulty is how the picture is drawn and how hard logic has to work for it.
// Dense, smoothed, mirrored pictures give long runs that settle most of the grid
// on the first read; thin, rough, lopsided ones give short broken clues that
// only give way sweep after sweep. `rounds` bounds the solver's sweeps per
// size, measured over thousands of pictures (see `npm run check`).
export const DIFFICULTIES = [
  {
    id: "easy",
    label: "Easy",
    density: [0.6, 0.68],
    mirror: true,
    smooth: true,
    rounds: { 5: [1, 2], 10: [1, 4], 15: [1, 5] },
  },
  {
    id: "medium",
    label: "Medium",
    density: [0.52, 0.6],
    mirror: true,
    smooth: true,
    rounds: { 5: [2, 3], 10: [4, 6], 15: [5, 8] },
  },
  {
    id: "hard",
    label: "Hard",
    density: [0.48, 0.55],
    mirror: true,
    smooth: false,
    rounds: { 5: [3, 4], 10: [6, 9], 15: [8, 12] },
  },
  {
    id: "extreme",
    label: "Extreme",
    density: [0.44, 0.5],
    mirror: false,
    smooth: false,
    rounds: { 5: [4, 99], 10: [9, 99], 15: [13, 99] },
  },
];

export const difficultyOf = (id) => DIFFICULTIES.find((d) => d.id === id) || DIFFICULTIES[1];

// Cell states on the player's grid.
export const EMPTY = 0;
export const FILLED = 1;
export const CROSSED = 2;

// The runs of filled cells along one line. An empty line's clue is [0].
export function runsOf(line) {
  const runs = [];
  let run = 0;
  for (const cell of line) {
    if (cell === FILLED || cell === true) run += 1;
    else if (run) {
      runs.push(run);
      run = 0;
    }
  }
  if (run) runs.push(run);
  return runs.length ? runs : [0];
}

export function rowAt(grid, n, r) {
  return grid.slice(r * n, r * n + n);
}

export function colAt(grid, n, c) {
  return Array.from({ length: n }, (_, r) => grid[r * n + c]);
}

export function cluesOf(grid, n) {
  return {
    rows: Array.from({ length: n }, (_, r) => runsOf(rowAt(grid, n, r))),
    cols: Array.from({ length: n }, (_, c) => runsOf(colAt(grid, n, c))),
  };
}

export const sameRuns = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

// --- the line solver --------------------------------------------------------

// Given a clue and what is known of a line (-1 unknown, 0 empty, 1 filled),
// returns every cell the clue forces, or null if the line cannot be satisfied.
// `fit(i, j)` asks whether clues j.. can still be laid from cell i onwards;
// the second walk marks what each surviving placement puts in each cell.
export function solveLine(clue, known) {
  const n = known.length;
  const blocks = clue[0] === 0 ? [] : clue;
  const k = blocks.length;
  const memo = new Map();

  const fit = (i, j) => {
    const key = i * 32 + j;
    if (memo.has(key)) return memo.get(key);
    let ok = false;
    if (j === k) {
      ok = true;
      for (let x = i; x < n; x += 1) if (known[x] === 1) ok = false;
    } else if (i < n) {
      if (known[i] !== 1 && fit(i + 1, j)) ok = true;
      const len = blocks[j];
      if (!ok && i + len <= n) {
        let room = true;
        for (let x = i; x < i + len; x += 1) if (known[x] === 0) room = false;
        if (room && i + len < n && known[i + len] === 1) room = false;
        if (room && fit(Math.min(n, i + len + 1), j + 1)) ok = true;
      }
    }
    memo.set(key, ok);
    return ok;
  };

  if (!fit(0, 0)) return null;

  const canFill = new Uint8Array(n);
  const canEmpty = new Uint8Array(n);
  const seen = new Set();

  const mark = (i, j) => {
    const key = i * 32 + j;
    if (seen.has(key)) return;
    seen.add(key);
    if (j === k) {
      for (let x = i; x < n; x += 1) canEmpty[x] = 1;
      return;
    }
    if (i >= n) return;
    if (known[i] !== 1 && fit(i + 1, j)) {
      canEmpty[i] = 1;
      mark(i + 1, j);
    }
    const len = blocks[j];
    if (i + len > n) return;
    for (let x = i; x < i + len; x += 1) if (known[x] === 0) return;
    if (i + len < n && known[i + len] === 1) return;
    const next = Math.min(n, i + len + 1);
    if (!fit(next, j + 1)) return;
    for (let x = i; x < i + len; x += 1) canFill[x] = 1;
    if (i + len < n) canEmpty[i + len] = 1;
    mark(next, j + 1);
  };

  mark(0, 0);
  return Array.from(known, (_, x) => (canFill[x] && !canEmpty[x] ? 1 : !canFill[x] ? 0 : -1));
}

// Runs the line solver over rows and columns until nothing changes. Returns the
// grid it reached (-1 where logic could not decide) or null on a contradiction.
// It works in sweeps — every line that changed is read again in the next one —
// and `stats.rounds` counts them: how many times a player must go back over
// the board is what makes one picture harder than another.
export function solveByLines(clues, n, stats = {}) {
  const grid = new Array(n * n).fill(-1);
  let dirty = new Set(Array.from({ length: n * 2 }, (_, i) => i));
  stats.rounds = 0;

  while (dirty.size) {
    stats.rounds += 1;
    const next = new Set();
    for (const line of dirty) {
      const isRow = line < n;
      const at = isRow ? line : line - n;
      const cells = Array.from({ length: n }, (_, x) => (isRow ? at * n + x : x * n + at));
      const known = cells.map((i) => grid[i]);
      const solved = solveLine(isRow ? clues.rows[at] : clues.cols[at], known);
      if (!solved) return null;
      solved.forEach((value, x) => {
        if (value === -1 || known[x] !== -1) return;
        grid[cells[x]] = value;
        next.add(isRow ? n + x : x);
      });
    }
    dirty = next;
  }
  return grid;
}

// --- generation ---------------------------------------------------------------

function sketch(n, density, { mirror, smooth }, random) {
  let grid = new Array(n * n).fill(false);
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      grid[r * n + c] = mirror && c >= Math.ceil(n / 2) ? grid[r * n + (n - 1 - c)] : random() < density;
    }
  }
  // one majority pass pulls the noise together into shapes
  if (smooth && n > 5) {
    grid = grid.map((on, i) => {
      const r = (i / n) | 0;
      const c = i % n;
      let near = 0;
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          const rr = r + dr;
          const cc = c + dc;
          if (rr >= 0 && rr < n && cc >= 0 && cc < n && grid[rr * n + cc]) near += 1;
        }
      }
      return near >= 5 || (on && near >= 4);
    });
  }
  return grid;
}

function balanced(grid, n) {
  const filled = grid.filter(Boolean).length / grid.length;
  if (filled < 0.36 || filled > 0.72) return false;
  // a picture with a blank row or column is a smaller picture
  for (let x = 0; x < n; x += 1) {
    if (!rowAt(grid, n, x).some(Boolean) || !colAt(grid, n, x).some(Boolean)) return false;
  }
  return true;
}

// ponytail: rejection sampling, measured by `npm run check`. A band that is
// rarely hit falls back, after MAX_TRIES, to the solvable picture nearest it,
// so a new game always arrives; repair undecided cells if sizes past 15 come.
const MAX_TRIES = 6000;

export function generate(sizeId = "medium", difficultyId = "medium", random = Math.random) {
  const { id, n } = sizeOf(sizeId);
  const level = difficultyOf(difficultyId);
  const [low, high] = level.rounds[n];
  const [dLow, dHigh] = level.density;
  let best = null;

  for (let attempt = 1; attempt <= MAX_TRIES; attempt += 1) {
    const grid = sketch(n, dLow + random() * (dHigh - dLow), level, random);
    if (!balanced(grid, n)) continue;
    const clues = cluesOf(grid, n);
    const stats = {};
    const solved = solveByLines(clues, n, stats);
    if (!solved || solved.includes(-1)) continue;
    const deal = { size: id, difficulty: level.id, n, solution: grid, clues, rounds: stats.rounds, attempts: attempt };
    const miss = stats.rounds < low ? low - stats.rounds : Math.max(0, stats.rounds - high);
    if (!miss) return deal;
    if (!best || miss < best.miss) best = { deal, miss };
  }
  return best.deal;
}

// --- helpers the board uses ---------------------------------------------------

// Whether the player's line already matches its clue — the clue greys out.
export function lineDone(cells, clue) {
  return sameRuns(runsOf(cells), clue);
}

export function isSolved(cells, clues, n) {
  for (let x = 0; x < n; x += 1) {
    if (!lineDone(rowAt(cells, n, x), clues.rows[x])) return false;
    if (!lineDone(colAt(cells, n, x), clues.cols[x])) return false;
  }
  return true;
}
