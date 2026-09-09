// Backgammon rules. Pure functions — the same logic runs in the browser for
// local play and on the server for online rooms, where the dice are the
// server's to roll.
//
// Points are 0..23. White moves down towards 0 and bears off past it; black
// moves up towards 23 and bears off past that. A point holds a signed count:
// positive is white, negative is black.

export const POINTS = 24;
export const CHECKERS = 15;

export const other = (colour) => (colour === "w" ? "b" : "w");

// Where each side is heading, and the six points it must gather in first.
const HOME = { w: [0, 5], b: [18, 23] };
const STEP = { w: -1, b: 1 };

export function start() {
  const board = new Array(POINTS).fill(0);
  board[23] = 2;
  board[12] = 5;
  board[7] = 3;
  board[5] = 5;
  board[0] = -2;
  board[11] = -5;
  board[16] = -3;
  board[18] = -5;
  return { board, bar: { w: 0, b: 0 }, off: { w: 0, b: 0 } };
}

export const countAt = (board, point, colour) =>
  colour === "w" ? Math.max(0, board[point]) : Math.max(0, -board[point]);

// A point with two or more of the other colour is shut.
const blocked = (board, point, colour) =>
  colour === "w" ? board[point] <= -2 : board[point] >= 2;

export function roll(random = Math.random) {
  const a = 1 + Math.floor(random() * 6);
  const b = 1 + Math.floor(random() * 6);
  // doubles are played four times over
  return a === b ? [a, a, a, a] : [a, b];
}

export function pipCount(state, colour) {
  let pips = state.bar[colour] * 25;
  for (let point = 0; point < POINTS; point += 1) {
    const n = countAt(state.board, point, colour);
    if (!n) continue;
    pips += n * (colour === "w" ? point + 1 : POINTS - point);
  }
  return pips;
}

export function allHome(state, colour) {
  if (state.bar[colour] > 0) return false;
  const [low, high] = HOME[colour];
  for (let point = 0; point < POINTS; point += 1) {
    if (countAt(state.board, point, colour) && (point < low || point > high)) return false;
  }
  return true;
}

// How far a checker on this point is from bearing off.
const distanceOff = (point, colour) => (colour === "w" ? point + 1 : POINTS - point);

// Whether anything of this colour sits further from home than the given point.
function anyFurther(state, colour, point) {
  for (let p = 0; p < POINTS; p += 1) {
    if (!countAt(state.board, p, colour)) continue;
    if (distanceOff(p, colour) > distanceOff(point, colour)) return true;
  }
  return false;
}

// Every move one die allows, from the bar first if anything is sitting there.
export function playsWithDie(state, colour, die) {
  const out = [];

  if (state.bar[colour] > 0) {
    const entry = colour === "w" ? POINTS - die : die - 1;
    if (!blocked(state.board, entry, colour)) {
      out.push({ from: "bar", to: entry, die, hit: countAt(state.board, entry, other(colour)) === 1 });
    }
    return out;
  }

  const bearing = allHome(state, colour);

  for (let point = 0; point < POINTS; point += 1) {
    if (!countAt(state.board, point, colour)) continue;
    const to = point + STEP[colour] * die;

    if (to >= 0 && to < POINTS) {
      if (!blocked(state.board, to, colour)) {
        out.push({ from: point, to, die, hit: countAt(state.board, to, other(colour)) === 1 });
      }
      continue;
    }

    if (!bearing) continue;
    const distance = distanceOff(point, colour);
    // an exact roll always bears off; a bigger one only from the furthest point
    if (die === distance || (die > distance && !anyFurther(state, colour, point))) {
      out.push({ from: point, to: "off", die, hit: false });
    }
  }

  return out;
}

export function applyPlay(state, colour, play) {
  const board = state.board.slice();
  const bar = { ...state.bar };
  const off = { ...state.off };
  const sign = colour === "w" ? 1 : -1;

  if (play.from === "bar") bar[colour] -= 1;
  else board[play.from] -= sign;

  if (play.to === "off") {
    off[colour] += 1;
  } else {
    if (countAt(board, play.to, other(colour)) === 1) {
      board[play.to] = 0;
      bar[other(colour)] += 1;
    }
    board[play.to] += sign;
  }

  return { board, bar, off };
}

/* ------------------------------------------------------------------ turn --- */

// Every way the whole roll can be played, longest first. The rule everybody
// gets wrong lives here: you must use both dice if any order lets you, and if
// only one can be played you must play the higher one.
export function turnOptions(state, colour, dice) {
  const found = [];

  const walk = (current, left, path) => {
    let extended = false;
    const tried = new Set();

    for (let i = 0; i < left.length; i += 1) {
      const die = left[i];
      if (tried.has(die)) continue; // the same number twice is the same branch
      tried.add(die);
      const rest = left.slice(0, i).concat(left.slice(i + 1));
      for (const play of playsWithDie(current, colour, die)) {
        extended = true;
        walk(applyPlay(current, colour, play), rest, [...path, play]);
      }
    }

    if (!extended) found.push(path);
  };

  walk(state, dice, []);

  const longest = found.reduce((most, path) => Math.max(most, path.length), 0);
  if (longest === 0) return [];
  let best = found.filter((path) => path.length === longest);

  // one die only, and both are on the table: it has to be the bigger one
  if (longest === 1 && dice.length === 2 && dice[0] !== dice[1]) {
    const high = Math.max(...dice);
    const withHigh = best.filter((path) => path[0].die === high);
    if (withHigh.length) best = withHigh;
  }

  // the same move written twice is one move
  const seen = new Set();
  return best.filter((path) => {
    const key = path.map((play) => `${play.from}>${play.to}`).join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// The moves a player may make right now: the first step of anything still open.
export function nextPlays(sequences) {
  const seen = new Map();
  for (const path of sequences) {
    if (!path.length) continue;
    const play = path[0];
    const key = `${play.from}>${play.to}`;
    if (!seen.has(key)) seen.set(key, play);
  }
  return [...seen.values()];
}

// What is left open once that move is made.
export function advance(sequences, from, to) {
  return sequences
    .filter((path) => path.length && path[0].from === from && path[0].to === to)
    .map((path) => path.slice(1));
}

export function isOver(state) {
  for (const colour of ["w", "b"]) {
    if (state.off[colour] < CHECKERS) continue;
    const loser = other(colour);
    if (state.off[loser] > 0) return { winner: colour, value: 1, reason: "the game" };
    // nothing borne off is a gammon; still in the winner's home or on the bar
    // is a backgammon
    const [low, high] = HOME[colour];
    let deep = state.bar[loser] > 0;
    for (let point = low; point <= high && !deep; point += 1) {
      if (countAt(state.board, point, loser)) deep = true;
    }
    return deep
      ? { winner: colour, value: 3, reason: "a backgammon" }
      : { winner: colour, value: 2, reason: "a gammon" };
  }
  return null;
}

export function resultText(outcome, names = { w: "White", b: "Black" }) {
  if (!outcome) return "";
  if (outcome.reason === "resignation") return `${names[outcome.winner]} wins by resignation.`;
  if (outcome.value === 1) return `${names[outcome.winner]} bears off first.`;
  return `${names[outcome.winner]} wins ${outcome.reason}, worth ${outcome.value}.`;
}

/* -------------------------------------------------------------- opponent --- */

// How many of the thirty-six rolls cover a given distance. ponytail: it ignores
// what stands in the way, so an indirect shot through a made point is counted
// as open. Good enough to keep the bot off obvious blots; a real shot counter
// walks the board.
const SHOTS = {
  1: 11, 2: 12, 3: 14, 4: 15, 5: 15, 6: 17,
  7: 6, 8: 6, 9: 5, 10: 3, 11: 2, 12: 3,
  15: 1, 16: 1, 18: 1, 20: 1, 24: 1,
};

// A checker on its own can be sent back. How likely that is depends on what is
// behind it, and behind means the way the other side is travelling.
function blotDanger(state, colour) {
  const foe = other(colour);
  let danger = 0;

  for (let point = 0; point < POINTS; point += 1) {
    if (countAt(state.board, point, colour) !== 1) continue;

    let nearest = Infinity;
    if (state.bar[foe] > 0) {
      const fromBar = foe === "w" ? POINTS - point : point + 1;
      nearest = Math.min(nearest, fromBar);
    }
    for (let q = 0; q < POINTS; q += 1) {
      if (!countAt(state.board, q, foe)) continue;
      // the other side is coming the other way
      const gap = foe === "w" ? q - point : point - q;
      if (gap > 0) nearest = Math.min(nearest, gap);
    }

    danger += SHOTS[nearest] || 0;
  }

  return danger;
}

function madePoints(state, colour) {
  const [low, high] = HOME[colour];
  let home = 0;
  let anchors = 0;
  const [foeLow, foeHigh] = HOME[other(colour)];

  for (let point = 0; point < POINTS; point += 1) {
    if (countAt(state.board, point, colour) < 2) continue;
    if (point >= low && point <= high) home += 1;
    if (point >= foeLow && point <= foeHigh) anchors += 1;
  }
  return { home, anchors };
}

export function evaluate(state, colour, risk = 1) {
  const foe = other(colour);
  const { home, anchors } = madePoints(state, colour);

  return (
    (pipCount(state, foe) - pipCount(state, colour)) +
    (state.off[colour] - state.off[foe]) * 14 +
    (state.bar[foe] - state.bar[colour]) * 22 +
    home * 8 +
    anchors * 6 -
    blotDanger(state, colour) * 1.4 * risk
  );
}

export const LEVELS = [
  { id: "easy", label: "Loose", risk: 0, chaos: 1 },
  { id: "fair", label: "Fair", risk: 0.5, chaos: 0.25 },
  { id: "sharp", label: "Sharp", risk: 1, chaos: 0 },
];

// Picks a whole turn rather than a move: the dice are rolled together, and half
// a plan is worse than either whole one.
export function pickSequence(state, colour, dice, level) {
  const sequences = turnOptions(state, colour, dice);
  if (!sequences.length) return null;

  const setting = LEVELS.find((l) => l.id === level) || LEVELS[1];
  if (setting.chaos >= 1 || (setting.chaos && Math.random() < setting.chaos)) {
    return sequences[Math.floor(Math.random() * sequences.length)];
  }

  let best = -Infinity;
  let picks = [];
  for (const path of sequences) {
    let after = state;
    for (const play of path) after = applyPlay(after, colour, play);
    const value = evaluate(after, colour, setting.risk);
    if (value > best) {
      best = value;
      picks = [path];
    } else if (value === best) {
      picks.push(path);
    }
  }
  return picks[Math.floor(Math.random() * picks.length)];
}
