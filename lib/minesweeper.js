// Minesweeper rules. Pure functions — the component owns the state, this owns
// what is true about it.
//
// The mines are laid after the first click, never before, so the first square
// opened is always safe and always opens something.

export const LEVELS = [
  { id: "beginner", label: "Beginner", cols: 9, rows: 9, mines: 10 },
  { id: "intermediate", label: "Intermediate", cols: 16, rows: 16, mines: 40 },
  { id: "expert", label: "Expert", cols: 30, rows: 16, mines: 99 },
];

export function levelOf(id) {
  return LEVELS.find((level) => level.id === id) || LEVELS[0];
}

export function neighboursOf(cols, rows, point) {
  const row = Math.floor(point / cols);
  const col = point % cols;
  const out = [];
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (!dr && !dc) continue;
      const r = row + dr;
      const c = col + dc;
      if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
      out.push(r * cols + c);
    }
  }
  return out;
}

// Lays the mines away from the square just clicked and everything touching it,
// so the first click opens a space rather than a single number.
export function plant(cols, rows, count, safe) {
  const cells = cols * rows;
  const clear = new Set([safe, ...neighboursOf(cols, rows, safe)]);
  // on a board too crowded for a whole safe patch, only the click itself is safe
  if (cells - clear.size < count) {
    clear.clear();
    clear.add(safe);
  }

  const pool = [];
  for (let point = 0; point < cells; point += 1) if (!clear.has(point)) pool.push(point);
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const mines = new Array(cells).fill(false);
  for (const point of pool.slice(0, count)) mines[point] = true;

  const near = new Array(cells).fill(0);
  for (let point = 0; point < cells; point += 1) {
    if (mines[point]) continue;
    near[point] = neighboursOf(cols, rows, point).filter((n) => mines[n]).length;
  }

  return { cols, rows, count, mines, near };
}

// Opens a square, and everything an empty square leads to.
export function openFrom(field, revealed, flags, point) {
  if (revealed[point] || flags[point]) return revealed;

  const next = revealed.slice();
  const queue = [point];

  while (queue.length) {
    const cell = queue.pop();
    if (next[cell] || flags[cell]) continue;
    next[cell] = true;
    if (field.mines[cell] || field.near[cell] !== 0) continue;
    for (const neighbour of neighboursOf(field.cols, field.rows, cell)) {
      if (!next[neighbour] && !flags[neighbour]) queue.push(neighbour);
    }
  }

  return next;
}

// Clicking a number that already has its flags opens everything else it
// touches — and takes the consequences if a flag is in the wrong place.
export function chordAt(field, revealed, flags, point) {
  if (!revealed[point] || field.near[point] === 0) return { revealed, hit: false };

  const around = neighboursOf(field.cols, field.rows, point);
  const flagged = around.filter((cell) => flags[cell]).length;
  if (flagged !== field.near[point]) return { revealed, hit: false };

  let next = revealed;
  let hit = false;
  for (const cell of around) {
    if (flags[cell] || next[cell]) continue;
    if (field.mines[cell]) hit = true;
    next = openFrom(field, next, flags, cell);
  }
  return { revealed: next, hit };
}

export function isWon(field, revealed) {
  for (let point = 0; point < revealed.length; point += 1) {
    if (!field.mines[point] && !revealed[point]) return false;
  }
  return true;
}

// What the counter reads: mines laid, less flags planted. It can go negative,
// and it should — that is how you find out you over-flagged.
export function minesLeft(field, flags) {
  return field.count - flags.filter(Boolean).length;
}
