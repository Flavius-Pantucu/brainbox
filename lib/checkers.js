// Checkers (English draughts) rules and opponents. Pure functions — the same
// logic runs in the browser for local play and on the server for online rooms.
//
// The rules that decide whether an implementation is right: a capture is
// compulsory, a capture that can continue must continue, and a man crowned by a
// jump stops there even if more jumps were available.

export const SIZE = 8;
export const CELLS = SIZE * SIZE;

// Play happens on the dark squares only.
export const playable = (point) => (Math.floor(point / SIZE) + (point % SIZE)) % 2 === 1;

export const index = (row, col) => row * SIZE + col;

export const other = (colour) => (colour === "b" ? "r" : "b");

export const colourOf = (piece) => (piece ? (piece === "b" || piece === "B" ? "b" : "r") : null);

export const isKing = (piece) => piece === "B" || piece === "R";

// Black sits at the top and moves down the board; red sits at the bottom and
// moves up. Each crowns on the other's back row.
const FORWARD = { b: 1, r: -1 };
const CROWN_ROW = { b: SIZE - 1, r: 0 };

const KING_STEPS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

export function start() {
  const board = new Array(CELLS).fill(null);
  for (let point = 0; point < CELLS; point += 1) {
    if (!playable(point)) continue;
    const row = Math.floor(point / SIZE);
    if (row <= 2) board[point] = "b";
    else if (row >= 5) board[point] = "r";
  }
  return board;
}

export function counts(board) {
  const tally = { b: 0, r: 0, bKings: 0, rKings: 0 };
  for (const piece of board) {
    if (!piece) continue;
    const colour = colourOf(piece);
    tally[colour] += 1;
    if (isKing(piece)) tally[`${colour}Kings`] += 1;
  }
  return tally;
}

function stepsFrom(board, point, colour) {
  const piece = board[point];
  const king = isKing(piece);
  const row = Math.floor(point / SIZE);
  const col = point % SIZE;
  const directions = king ? KING_STEPS : [[FORWARD[colour], -1], [FORWARD[colour], 1]];

  const jumps = [];
  const plain = [];

  for (const [dr, dc] of directions) {
    const r = row + dr;
    const c = col + dc;
    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) continue;
    const over = index(r, c);

    if (board[over] === null) {
      plain.push({ from: point, to: over, captured: null, crowns: !king && r === CROWN_ROW[colour] });
      continue;
    }
    if (colourOf(board[over]) === colour) continue;

    const jr = row + dr * 2;
    const jc = col + dc * 2;
    if (jr < 0 || jr >= SIZE || jc < 0 || jc >= SIZE) continue;
    const landing = index(jr, jc);
    if (board[landing] !== null) continue;

    jumps.push({
      from: point,
      to: landing,
      captured: over,
      crowns: !king && jr === CROWN_ROW[colour],
    });
  }

  return { jumps, plain };
}

// Every single hop the side to move may make. A capture anywhere on the board
// makes every quiet move illegal, which is the rule people forget.
export function stepsFor(board, colour, chainFrom = null) {
  if (chainFrom != null) {
    if (colourOf(board[chainFrom]) !== colour) return [];
    return stepsFrom(board, chainFrom, colour).jumps;
  }

  const jumps = [];
  const plain = [];
  for (let point = 0; point < CELLS; point += 1) {
    if (colourOf(board[point]) !== colour) continue;
    const found = stepsFrom(board, point, colour);
    jumps.push(...found.jumps);
    plain.push(...found.plain);
  }
  return jumps.length ? jumps : plain;
}

// One hop, checked against the rules rather than trusted.
export function applyStep(board, from, to, chainFrom = null) {
  const colour = colourOf(board[from]);
  if (!colour) return { error: "empty" };

  const legal = stepsFor(board, colour, chainFrom).find(
    (step) => step.from === from && step.to === to
  );
  if (!legal) return { error: "illegal-move" };

  const next = board.slice();
  next[to] = legal.crowns ? board[from].toUpperCase() : board[from];
  next[from] = null;
  if (legal.captured != null) next[legal.captured] = null;

  // a man crowned by a jump stops there, even with another jump available
  const mustContinue =
    legal.captured != null && !legal.crowns && stepsFrom(next, to, colour).jumps.length > 0;

  return {
    board: next,
    captured: legal.captured,
    crowned: legal.crowns,
    mustContinue,
    // a quiet king move changes nothing anyone can count towards a win
    idle: legal.captured == null && isKing(board[from]),
  };
}

// A side with no pieces, or no move, has lost. Nothing else ends a game on its
// own — a shuffle that goes nowhere is drawn by the counter above this.
export function outcomeOf(board, toMove) {
  if (stepsFor(board, toMove).length === 0) return { winner: other(toMove), reason: "no move" };
  return null;
}

export function resultText(outcome, names = { b: "Black", r: "Red" }) {
  if (!outcome) return "";
  if (outcome.winner === "draw") return "Drawn — forty moves with nothing taken.";
  return outcome.reason === "resignation"
    ? `${names[outcome.winner]} wins by resignation.`
    : `${names[outcome.winner]} wins — nothing left to move.`;
}

/* ------------------------------------------------------------ opponents --- */

// Whole moves, chains expanded, for the search to walk.
export function fullMoves(board, colour) {
  const out = [];

  const walk = (current, from, path) => {
    const steps = stepsFor(current, colour, from);
    if (!steps.length) {
      out.push({ board: current, from: path[0], to: from, path });
      return;
    }
    for (const step of steps) {
      const played = applyStep(current, step.from, step.to, from);
      if (played.error) continue;
      if (played.mustContinue) walk(played.board, step.to, [...path, step.to]);
      else out.push({ board: played.board, from: path[0], to: step.to, path: [...path, step.to] });
    }
  };

  for (const step of stepsFor(board, colour)) {
    const played = applyStep(board, step.from, step.to);
    if (played.error) continue;
    if (played.mustContinue) walk(played.board, step.to, [step.from, step.to]);
    else out.push({ board: played.board, from: step.from, to: step.to, path: [step.from, step.to] });
  }

  return out;
}

const MAN = 100;
const KING = 175;

function score(board, me) {
  let total = 0;
  for (let point = 0; point < CELLS; point += 1) {
    const piece = board[point];
    if (!piece) continue;
    const colour = colourOf(piece);
    const row = Math.floor(point / SIZE);
    const col = point % SIZE;

    let value = isKing(piece) ? KING : MAN;
    // a man is worth more the closer it is to crowning
    if (!isKing(piece)) value += (colour === "b" ? row : SIZE - 1 - row) * 6;
    // the edge cannot be jumped over
    if (col === 0 || col === SIZE - 1) value += 4;
    // and a back row held is a back row that cannot be crowned into
    if (row === CROWN_ROW[other(colour)]) value += 6;

    total += colour === me ? value : -value;
  }
  return total;
}

function search(board, colour, me, depth, alpha, beta) {
  const moves = fullMoves(board, colour);
  if (!moves.length) {
    // the side to move has lost
    return colour === me ? -100000 - depth : 100000 + depth;
  }
  if (depth === 0) return score(board, me);

  const maximising = colour === me;
  let best = maximising ? -Infinity : Infinity;

  for (const move of moves) {
    const value = search(move.board, other(colour), me, depth - 1, alpha, beta);
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

// How many more jumps a chain can go on for, from here.
function chainDepth(board, colour, from) {
  let deepest = 0;
  for (const step of stepsFor(board, colour, from)) {
    const played = applyStep(board, step.from, step.to, from);
    if (played.error) continue;
    const depth = played.mustContinue ? 1 + chainDepth(played.board, colour, step.to) : 1;
    if (depth > deepest) deepest = depth;
  }
  return deepest;
}

// Mid-chain the choice is only ever between branches of the same forced take,
// so the one that takes the most wins. There is nothing else to weigh.
export function bestChainStep(board, colour, from) {
  const options = stepsFor(board, colour, from);
  if (!options.length) return null;

  let deepest = -1;
  let picks = [];
  for (const step of options) {
    const played = applyStep(board, step.from, step.to, from);
    if (played.error) continue;
    const depth = played.mustContinue ? 1 + chainDepth(played.board, colour, step.to) : 1;
    if (depth > deepest) {
      deepest = depth;
      picks = [step];
    } else if (depth === deepest) {
      picks.push(step);
    }
  }
  return picks[Math.floor(Math.random() * picks.length)] ?? null;
}

export const LEVELS = [
  { id: "easy", label: "Loose", depth: 2, slip: 0.5 },
  { id: "fair", label: "Fair", depth: 5, slip: 0.12 },
  { id: "sharp", label: "Sharp", depth: 7, slip: 0 },
];

// Returns the whole move, path and all — the caller walks it one hop at a time
// so the board shows a chain being taken rather than a piece teleporting.
export function pickMove(board, colour, level) {
  const moves = fullMoves(board, colour);
  if (!moves.length) return null;

  const setting = LEVELS.find((l) => l.id === level) || LEVELS[1];
  if (setting.slip && Math.random() < setting.slip) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  let best = -Infinity;
  let picks = [];
  for (const move of moves) {
    const value = search(move.board, other(colour), colour, setting.depth - 1, -Infinity, Infinity);
    if (value > best) {
      best = value;
      picks = [move];
    } else if (value === best) {
      picks.push(move);
    }
  }
  return picks[Math.floor(Math.random() * picks.length)];
}
