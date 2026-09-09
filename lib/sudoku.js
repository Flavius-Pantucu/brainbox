// Sudoku generation and solving.
//
// Every puzzle is generated in the browser at the moment a game starts: a full
// solved grid is built by randomised backtracking, then clues are removed one
// at a time and each removal is kept only while the grid still has exactly one
// solution. There is no fixed puzzle and no server.

const N = 9;
const CELLS = 81;
const ALL = 0x1ff; // nine candidate bits

export const DIFFICULTIES = [
  { id: "easy", label: "Easy", clues: 42 },
  { id: "medium", label: "Medium", clues: 34 },
  { id: "hard", label: "Hard", clues: 29 },
  { id: "evil", label: "Evil", clues: 25 },
];

export const rowOf = (i) => (i / N) | 0;
export const colOf = (i) => i % N;
export const boxOf = (i) => (((i / N) | 0) / 3 | 0) * 3 + ((i % N) / 3 | 0);

function popcount(mask) {
  let n = 0;
  let m = mask;
  while (m) {
    m &= m - 1;
    n += 1;
  }
  return n;
}

function lowestBit(mask) {
  return mask & -mask;
}

function bitToValue(bit) {
  return 32 - Math.clz32(bit); // 1-indexed
}

function shuffled(list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function makeMasks(grid) {
  const rows = new Uint16Array(N);
  const cols = new Uint16Array(N);
  const boxes = new Uint16Array(N);
  for (let i = 0; i < CELLS; i += 1) {
    const v = grid[i];
    if (!v) continue;
    const bit = 1 << (v - 1);
    rows[rowOf(i)] |= bit;
    cols[colOf(i)] |= bit;
    boxes[boxOf(i)] |= bit;
  }
  return { rows, cols, boxes };
}

// Counts solutions up to `limit`, so uniqueness costs two solutions, not all of
// them. Picks the most constrained cell first, which is what makes digging fast
// enough to run on every new game.
export function countSolutions(grid, limit = 2) {
  const work = Int8Array.from(grid);
  const { rows, cols, boxes } = makeMasks(work);
  let found = 0;

  const step = () => {
    let best = -1;
    let bestMask = 0;
    let bestCount = 10;

    for (let i = 0; i < CELLS; i += 1) {
      if (work[i]) continue;
      const r = rowOf(i);
      const c = colOf(i);
      const b = boxOf(i);
      const mask = ALL & ~(rows[r] | cols[c] | boxes[b]);
      const n = popcount(mask);
      if (n === 0) return;
      if (n < bestCount) {
        bestCount = n;
        best = i;
        bestMask = mask;
        if (n === 1) break;
      }
    }

    if (best === -1) {
      found += 1;
      return;
    }

    const r = rowOf(best);
    const c = colOf(best);
    const b = boxOf(best);
    let mask = bestMask;
    while (mask && found < limit) {
      const bit = lowestBit(mask);
      mask ^= bit;
      work[best] = bitToValue(bit);
      rows[r] |= bit;
      cols[c] |= bit;
      boxes[b] |= bit;
      step();
      rows[r] &= ~bit;
      cols[c] &= ~bit;
      boxes[b] &= ~bit;
      work[best] = 0;
    }
  };

  step();
  return found;
}

export function solve(grid) {
  const work = Int8Array.from(grid);
  const { rows, cols, boxes } = makeMasks(work);

  const step = () => {
    let best = -1;
    let bestMask = 0;
    let bestCount = 10;

    for (let i = 0; i < CELLS; i += 1) {
      if (work[i]) continue;
      const mask = ALL & ~(rows[rowOf(i)] | cols[colOf(i)] | boxes[boxOf(i)]);
      const n = popcount(mask);
      if (n === 0) return false;
      if (n < bestCount) {
        bestCount = n;
        best = i;
        bestMask = mask;
        if (n === 1) break;
      }
    }

    if (best === -1) return true;

    const r = rowOf(best);
    const c = colOf(best);
    const b = boxOf(best);
    for (const bit of shuffled(bitsOf(bestMask))) {
      work[best] = bitToValue(bit);
      rows[r] |= bit;
      cols[c] |= bit;
      boxes[b] |= bit;
      if (step()) return true;
      rows[r] &= ~bit;
      cols[c] &= ~bit;
      boxes[b] &= ~bit;
      work[best] = 0;
    }
    return false;
  };

  return step() ? work : null;
}

function bitsOf(mask) {
  const out = [];
  let m = mask;
  while (m) {
    const bit = lowestBit(m);
    out.push(bit);
    m ^= bit;
  }
  return out;
}

function fullGrid() {
  const solved = solve(new Int8Array(CELLS));
  return solved || fullGrid();
}

// Digs clues out of a solved grid while the remaining puzzle stays unique.
// Symmetric pairs are removed together, which is what makes a puzzle look
// hand-set rather than randomly punched.
function dig(solution, targetClues) {
  const puzzle = Int8Array.from(solution);
  let clues = CELLS;
  const order = shuffled([...Array(CELLS).keys()]);

  for (const i of order) {
    if (clues <= targetClues) break;
    const mirror = CELLS - 1 - i;
    const pair = mirror !== i && puzzle[mirror] ? [i, mirror] : [i];
    if (!puzzle[i]) continue;
    if (clues - pair.length < targetClues) continue;

    const kept = pair.map((k) => puzzle[k]);
    pair.forEach((k) => {
      puzzle[k] = 0;
    });

    if (countSolutions(puzzle, 2) === 1) {
      clues -= pair.length;
    } else {
      pair.forEach((k, n) => {
        puzzle[k] = kept[n];
      });
    }
  }

  return { puzzle, clues };
}

export function generate(difficultyId = "medium") {
  const difficulty =
    DIFFICULTIES.find((d) => d.id === difficultyId) || DIFFICULTIES[1];
  const solution = fullGrid();
  const { puzzle, clues } = dig(solution, difficulty.clues);
  return {
    difficulty: difficulty.id,
    puzzle: Array.from(puzzle),
    solution: Array.from(solution),
    clues,
  };
}

// --- helpers the board uses -------------------------------------------------

export function peersOf(index) {
  const peers = new Set();
  const r = rowOf(index);
  const c = colOf(index);
  const b = boxOf(index);
  for (let i = 0; i < CELLS; i += 1) {
    if (i === index) continue;
    if (rowOf(i) === r || colOf(i) === c || boxOf(i) === b) peers.add(i);
  }
  return peers;
}

export function remainingCounts(values) {
  const counts = new Array(10).fill(9);
  counts[0] = 0;
  values.forEach((v) => {
    if (v) counts[v] -= 1;
  });
  return counts;
}

export function isComplete(values, solution) {
  for (let i = 0; i < CELLS; i += 1) {
    if (values[i] !== solution[i]) return false;
  }
  return true;
}
