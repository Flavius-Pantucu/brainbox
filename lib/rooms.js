// Server-side room store for online play.
//
// Rooms live in this node process and nowhere else. That is enough for
// `npm run dev` and for a self-hosted `npm start`, which is how BrainBox runs
// today; a serverless deploy with more than one instance would need this file
// swapped for a shared store (Redis, a database) and nothing above it changes.
//
// The lifecycle here — codes, seats, tokens, the live stream — is the same for
// every game. What differs sits in RULES, one entry per game.

import { Chess } from "chess.js";
import {
  EMPTY as emptyGrid,
  drop as dropDisc,
  outcomeOf as gridOutcome,
} from "./connect4.js";
// with the extension so `node scripts/check-chess.js` can import this directly
import { outcomeOf, timeControl } from "./chess-core.js";

const ROOM_TTL_MS = 2 * 60 * 60 * 1000; // two hours idle
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1

const rooms = globalThis.__brainboxRooms || (globalThis.__brainboxRooms = new Map());
const watchers =
  globalThis.__brainboxRoomWatchers || (globalThis.__brainboxRoomWatchers = new Map());

/* ------------------------------------------------------------- tictactoe --- */

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function tttWinner(board) {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  if (board.every(Boolean)) return { winner: "draw", line: null };
  return null;
}

const tictactoe = {
  seats: ["X", "O"],
  names: { X: "Player X", O: "Player O" },
  emptyScore: () => ({ X: 0, O: 0, draw: 0 }),

  create: () => ({ board: new Array(9).fill(null), turn: "X", winner: null, line: null }),

  view: (room) => ({
    board: room.data.board,
    turn: room.data.turn,
    winner: room.data.winner,
    line: room.data.line,
  }),

  actions: {
    move(room, seat, body) {
      const { board } = room.data;
      const index = body.index;
      if (room.data.turn !== seat) return { error: "not-your-turn" };
      if (!Number.isInteger(index) || index < 0 || index > 8) return { error: "bad-square" };
      if (board[index]) return { error: "taken" };

      board[index] = seat;
      const outcome = tttWinner(board);

      if (!outcome) {
        room.data.turn = seat === "X" ? "O" : "X";
        return { ok: true };
      }
      if (outcome.winner === "draw") {
        room.status = "draw";
        room.score.draw += 1;
      } else {
        room.status = "won";
        room.data.winner = outcome.winner;
        room.data.line = outcome.line;
        room.score[outcome.winner] += 1;
      }
      return { ok: true };
    },
  },

  // the loser of the last game opens the next one
  rematch(room) {
    const opener = room.data.winner === "X" ? "O" : "X";
    room.data = { ...tictactoe.create(), turn: opener };
  },

  reset(room) {
    room.data = tictactoe.create();
  },
};

/* ----------------------------------------------------------------- chess --- */

// The clock as the players should see it: whoever is to move is already being
// charged for the time since their opponent pressed it.
function clockView(room) {
  const clock = room.data.clock;
  if (!clock) return null;
  const turn = room.data.game.turn();
  const running = room.status === "playing" && clock.since ? turn : null;
  const spent = running ? Date.now() - clock.since : 0;
  return {
    w: Math.max(0, clock.left.w - (running === "w" ? spent : 0)),
    b: Math.max(0, clock.left.b - (running === "b" ? spent : 0)),
    increment: clock.increment,
    initial: clock.initial,
    control: clock.control,
    running,
  };
}

function disarmClock(room) {
  const clock = room.data.clock;
  if (!clock?.timer) return;
  clearTimeout(clock.timer);
  clock.timer = null;
}

// A player who stops moving still runs out of time, so the flag is a timer on
// the server rather than something a client reports.
function armClock(room) {
  disarmClock(room);
  const clock = room.data.clock;
  if (!clock || room.status !== "playing") return;
  const turn = room.data.game.turn();
  clock.since = Date.now();
  clock.timer = setTimeout(() => {
    clock.left[turn] = 0;
    chessFinish(room, { status: "won", winner: turn === "w" ? "b" : "w", reason: "time" });
    touch(room);
  }, Math.max(0, clock.left[turn]));
  clock.timer.unref?.();
}

function chessView(room) {
  const game = room.data.game;
  const moves = room.data.moves;
  const last = moves[moves.length - 1] || null;
  return {
    clock: clockView(room),
    fen: game.fen(),
    pgn: game.pgn(),
    moves,
    turn: game.turn(),
    check: game.isCheck(),
    winner: room.data.winner,
    reason: room.data.reason,
    drawOffer: room.data.drawOffer,
    lastMove: last ? { from: last.from, to: last.to } : null,
  };
}

// A finished position ends the room the same way whatever finished it.
function chessFinish(room, { status, winner, reason }) {
  disarmClock(room);
  room.status = status;
  room.data.winner = winner;
  room.data.reason = reason;
  room.data.drawOffer = null;
  if (status === "draw") room.score.draw += 1;
  else if (winner) room.score[winner] += 1;
}

const chess = {
  seats: ["w", "b"],
  names: { w: "White", b: "Black" },
  emptyScore: () => ({ w: 0, b: 0, draw: 0 }),

  create: (options = {}) => {
    const control = timeControl(options.time);
    return {
      game: new Chess(),
      moves: [],
      winner: null,
      reason: null,
      drawOffer: null,
      clock: control.initial
        ? {
            control: control.id,
            initial: control.initial,
            increment: control.increment,
            left: { w: control.initial, b: control.initial },
            since: null,
            timer: null,
          }
        : null,
    };
  },

  view: chessView,

  // the first clock starts when the second player sits down
  start: (room) => armClock(room),
  stop: (room) => disarmClock(room),

  actions: {
    // The server keeps its own board and replays the move on it. A client that
    // asks for an illegal move gets nothing, whatever its own board believes.
    move(room, seat, body) {
      const game = room.data.game;
      if (game.turn() !== seat) return { error: "not-your-turn" };

      // the clock is read before the move: a move that arrives after the flag
      // has fallen does not land
      const clock = room.data.clock;
      if (clock && clock.since) {
        const spent = Date.now() - clock.since;
        if (spent >= clock.left[seat]) {
          clock.left[seat] = 0;
          chessFinish(room, {
            status: "won",
            winner: seat === "w" ? "b" : "w",
            reason: "time",
          });
          return { ok: true };
        }
        clock.left[seat] = clock.left[seat] - spent + clock.increment;
      }

      let move;
      try {
        move = game.move({
          from: String(body.from || ""),
          to: String(body.to || ""),
          promotion: body.promotion ? String(body.promotion).toLowerCase() : undefined,
        });
      } catch {
        return { error: "illegal-move" };
      }
      if (!move) return { error: "illegal-move" };

      room.data.moves.push({
        san: move.san,
        from: move.from,
        to: move.to,
        color: move.color,
        piece: move.piece,
        captured: move.captured || null,
        promotion: move.promotion || null,
        flags: move.flags,
        before: move.before,
        after: move.after,
      });
      room.data.drawOffer = null;

      const outcome = outcomeOf(game);
      if (outcome.over) chessFinish(room, outcome);
      else armClock(room);
      return { ok: true };
    },

    resign(room, seat) {
      chessFinish(room, {
        status: "won",
        winner: seat === "w" ? "b" : "w",
        reason: "resignation",
      });
      return { ok: true };
    },

    "offer-draw"(room, seat) {
      room.data.drawOffer = seat;
      return { ok: true };
    },

    "accept-draw"(room, seat) {
      if (!room.data.drawOffer || room.data.drawOffer === seat) return { error: "no-offer" };
      chessFinish(room, { status: "draw", winner: null, reason: "agreement" });
      return { ok: true };
    },

    "decline-draw"(room) {
      room.data.drawOffer = null;
      return { ok: true };
    },
  },

  // Colours swap between games, the way they do over a real board.
  rematch(room) {
    const control = room.data.clock?.control;
    disarmClock(room);
    const [w, b] = [room.seats.w, room.seats.b];
    room.seats = { w: b, b: w };
    room.names = { w: room.names.b, b: room.names.w };
    room.data = chess.create({ time: control });
  },

  reset(room) {
    const control = room.data.clock?.control;
    disarmClock(room);
    room.data = chess.create({ time: control });
  },
};

/* ------------------------------------------------------------- connect 4 --- */

const connect4 = {
  seats: ["R", "Y"],
  names: { R: "Red", Y: "Yellow" },
  emptyScore: () => ({ R: 0, Y: 0, draw: 0 }),

  create: () => ({ board: emptyGrid(), turn: "R", winner: null, line: null, last: null }),

  view: (room) => ({
    board: room.data.board,
    turn: room.data.turn,
    winner: room.data.winner,
    line: room.data.line,
    last: room.data.last,
  }),

  actions: {
    move(room, seat, body) {
      if (room.data.turn !== seat) return { error: "not-your-turn" };
      const played = dropDisc(room.data.board, body.col, seat);
      if (!played) return { error: "column-full" };

      room.data.board = played.board;
      room.data.last = played.at;

      const outcome = gridOutcome(played.board);
      if (!outcome) {
        room.data.turn = seat === "R" ? "Y" : "R";
        return { ok: true };
      }
      if (outcome.winner === "draw") {
        room.status = "draw";
        room.score.draw += 1;
      } else {
        room.status = "won";
        room.data.winner = outcome.winner;
        room.data.line = outcome.line;
        room.score[outcome.winner] += 1;
      }
      return { ok: true };
    },
  },

  // the loser of the last game drops first in the next one
  rematch(room) {
    const opener = room.data.winner === "R" ? "Y" : "R";
    room.data = { ...connect4.create(), turn: opener };
  },

  reset(room) {
    room.data = connect4.create();
  },
};

const RULES = { tictactoe, chess, connect4 };

/* ------------------------------------------------------------- lifecycle --- */

function token() {
  return Array.from(
    { length: 24 },
    () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  ).join("");
}

function newCode() {
  let code;
  do {
    code = Array.from(
      { length: 4 },
      () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
    ).join("");
  } while (rooms.has(code));
  return code;
}

function prune() {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.updatedAt > ROOM_TTL_MS) {
      RULES[room.game].stop?.(room);
      rooms.delete(code);
      watchers.delete(code);
    }
  }
}

function touch(room) {
  room.updatedAt = Date.now();
  room.version += 1;
  broadcast(room);
}

function seatOf(room, playerToken) {
  if (!playerToken) return null;
  return RULES[room.game].seats.find((seat) => room.seats[seat] === playerToken) || null;
}

function clean(name) {
  return String(name || "").slice(0, 18).trim();
}

export function publicState(room, viewerToken) {
  const rules = RULES[room.game];
  const seat = seatOf(room, viewerToken);
  return {
    code: room.code,
    game: room.game,
    version: room.version,
    status: room.status,
    score: room.score,
    names: room.names,
    seat,
    seated: Object.fromEntries(rules.seats.map((s) => [s, !!room.seats[s]])),
    rematch: room.rematch,
    updatedAt: room.updatedAt,
    ...rules.view(room),
  };
}

export function createRoom(name, game = "tictactoe", options = {}) {
  prune();
  const rules = RULES[game];
  if (!rules) return { error: "no-game" };

  // the host picks a seat; anything else, or nothing, is a coin toss
  const [first, second] = rules.seats;
  const wanted = rules.seats.includes(options.seat)
    ? options.seat
    : Math.random() < 0.5
    ? first
    : second;

  const hostToken = token();
  const code = newCode();
  const room = {
    code,
    game,
    host: hostToken,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    seats: Object.fromEntries(rules.seats.map((s) => [s, s === wanted ? hostToken : null])),
    names: Object.fromEntries(
      rules.seats.map((s) => [s, s === wanted ? clean(name) || rules.names[s] : null])
    ),
    status: "waiting",
    score: rules.emptyScore(),
    rematch: Object.fromEntries(rules.seats.map((s) => [s, false])),
    data: rules.create(options),
  };
  rooms.set(code, room);
  return { room, token: hostToken, seat: wanted };
}

export function getRoom(code) {
  prune();
  return rooms.get(String(code || "").toUpperCase()) || null;
}

export function joinRoom(code, name, existingToken) {
  const room = getRoom(code);
  if (!room) return { error: "no-room" };

  const held = seatOf(room, existingToken);
  if (held) return { room, token: existingToken, seat: held };

  const rules = RULES[room.game];
  const open = rules.seats.find((seat) => !room.seats[seat]);
  if (!open) return { error: "full" };

  const guestToken = token();
  room.seats[open] = guestToken;
  room.names[open] = clean(name) || rules.names[open];
  room.status = "playing";
  rules.start?.(room);
  touch(room);
  return { room, token: guestToken, seat: open };
}

// Every in-game action goes through here: the seat is checked once, the game's
// own rules do the rest.
export function act(code, playerToken, action, body = {}) {
  const room = getRoom(code);
  if (!room) return { error: "no-room" };

  const seat = seatOf(room, playerToken);
  if (!seat) return { error: "not-seated" };

  const rules = RULES[room.game];
  const handler = rules.actions[action];
  if (!handler) return { error: "bad-action" };
  if (room.status !== "playing") return { error: "not-playing" };

  const result = handler(room, seat, body);
  if (result.error) return result;

  touch(room);
  return { room, seat };
}

export function requestRematch(code, playerToken) {
  const room = getRoom(code);
  if (!room) return { error: "no-room" };
  const seat = seatOf(room, playerToken);
  if (!seat) return { error: "not-seated" };
  if (room.status !== "won" && room.status !== "draw") return { error: "still-playing" };

  const rules = RULES[room.game];
  room.rematch[seat] = true;

  if (rules.seats.every((s) => room.rematch[s])) {
    rules.rematch(room);
    room.status = "playing";
    room.rematch = Object.fromEntries(rules.seats.map((s) => [s, false]));
    rules.start?.(room);
  }

  touch(room);
  return { room, seat };
}

export function leaveRoom(code, playerToken) {
  const room = getRoom(code);
  if (!room) return { error: "no-room" };

  const rules = RULES[room.game];
  const seat = seatOf(room, playerToken);
  if (!seat) return { ok: true };

  // the host owns the room: when they go, it closes. A guest leaving only
  // opens their seat again.
  if (room.host === playerToken) {
    rules.stop?.(room);
    rooms.delete(room.code);
    broadcast({ ...room, status: "closed" });
    watchers.delete(room.code);
    return { ok: true };
  }

  room.seats[seat] = null;
  room.names[seat] = null;
  room.status = "waiting";
  room.rematch = Object.fromEntries(rules.seats.map((s) => [s, false]));
  rules.reset(room);
  touch(room);
  return { ok: true };
}

/* ----------------------------------------------------------- live updates --- */

export function watch(code, send) {
  const key = String(code).toUpperCase();
  if (!watchers.has(key)) watchers.set(key, new Set());
  watchers.get(key).add(send);
  return () => {
    watchers.get(key)?.delete(send);
  };
}

function broadcast(room) {
  const set = watchers.get(room.code);
  if (!set) return;
  for (const send of set) {
    try {
      send(room);
    } catch {
      set.delete(send);
    }
  }
}
