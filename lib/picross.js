// PiCross (nonogram) generation and line logic.
//
// Every puzzle is generated in the browser when a game starts: a picture is
// drawn at random — mirrored down the middle and smoothed, so it reads as a
// figure rather than noise — and kept only if line-by-line logic solves it all
// the way. A puzzle that logic finishes has exactly one answer and never asks
// the player to guess. There is no fixed puzzle list and no server.

export const SIZES = [
  { id: "small", label: "5 × 5", n: 5 },
  { id: "medium", label: "10 × 10", n: 10 },
  { id: "large", label: "15 × 15", n: 15 },
];

export const sizeOf = (id) => SIZES.find((s) => s.id === id) || SIZES[1];

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
export function solveByLines(clues, n) {
  const grid = new Array(n * n).fill(-1);
  const dirty = new Set(Array.from({ length: n * 2 }, (_, i) => i));

  while (dirty.size) {
    const line = dirty.values().next().value;
    dirty.delete(line);
    const isRow = line < n;
    const at = isRow ? line : line - n;
    const cells = Array.from({ length: n }, (_, x) => (isRow ? at * n + x : x * n + at));
    const known = cells.map((i) => grid[i]);
    const solved = solveLine(isRow ? clues.rows[at] : clues.cols[at], known);
    if (!solved) return null;
    solved.forEach((value, x) => {
      if (value === -1 || known[x] !== -1) return;
      grid[cells[x]] = value;
      dirty.add(isRow ? n + x : x);
    });
  }
  return grid;
}

// --- generation ---------------------------------------------------------------

function sketch(n, density, random) {
  const half = Math.ceil(n / 2);
  let grid = new Array(n * n).fill(false);
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < half; c += 1) {
      const on = random() < density;
      grid[r * n + c] = on;
      grid[r * n + (n - 1 - c)] = on;
    }
  }
  // one majority pass pulls the noise together into shapes
  if (n > 5) {
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

// ponytail: rejection sampling, measured by `npm run check`; switch to
// repairing the undecided cells if sizes past 15 are ever added.
export function generate(sizeId = "medium", random = Math.random) {
  const { id, n } = sizeOf(sizeId);
  for (let attempt = 0; ; attempt += 1) {
    const grid = sketch(n, 0.5 + random() * 0.14, random);
    if (!balanced(grid, n)) continue;
    const clues = cluesOf(grid, n);
    const solved = solveByLines(clues, n);
    if (solved && !solved.includes(-1)) {
      return { size: id, n, solution: grid, clues, attempts: attempt + 1 };
    }
  }
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
