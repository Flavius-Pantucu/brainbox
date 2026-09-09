// Server-side room store for online play.
//
// Rooms live in this node process and nowhere else. That is enough for
// `npm run dev` and for a self-hosted `npm start`, which is how GameHub runs
// today; a serverless deploy with more than one instance would need this file
// swapped for a shared store (Redis, a database) and nothing above it changes.

const ROOM_TTL_MS = 2 * 60 * 60 * 1000; // two hours idle
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1

const rooms = globalThis.__gamehubRooms || (globalThis.__gamehubRooms = new Map());
const watchers =
  globalThis.__gamehubRoomWatchers || (globalThis.__gamehubRoomWatchers = new Map());

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

function token() {
  return Array.from({ length: 24 }, () =>
    CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  ).join("");
}

function newCode() {
  let code;
  do {
    code = Array.from({ length: 4 }, () =>
      CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
    ).join("");
  } while (rooms.has(code));
  return code;
}

function prune() {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.updatedAt > ROOM_TTL_MS) {
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

// --- public shape -----------------------------------------------------------

export function publicState(room, viewerToken) {
  const seat =
    room.seats.X === viewerToken ? "X" : room.seats.O === viewerToken ? "O" : null;
  return {
    code: room.code,
    version: room.version,
    board: room.board,
    turn: room.turn,
    status: room.status,
    winner: room.winner,
    line: room.line,
    score: room.score,
    names: room.names,
    seat,
    seated: { X: !!room.seats.X, O: !!room.seats.O },
    rematch: room.rematch,
    updatedAt: room.updatedAt,
  };
}

// --- lifecycle --------------------------------------------------------------

export function createRoom(name) {
  prune();
  const code = newCode();
  const hostToken = token();
  const room = {
    code,
    game: "tictactoe",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    seats: { X: hostToken, O: null },
    names: { X: (name || "").slice(0, 18) || "Player X", O: null },
    board: new Array(9).fill(null),
    turn: "X",
    status: "waiting",
    winner: null,
    line: null,
    score: { X: 0, O: 0, draw: 0 },
    rematch: { X: false, O: false },
  };
  rooms.set(code, room);
  return { room, token: hostToken, seat: "X" };
}

export function getRoom(code) {
  prune();
  return rooms.get(String(code || "").toUpperCase()) || null;
}

export function joinRoom(code, name, existingToken) {
  const room = getRoom(code);
  if (!room) return { error: "no-room" };

  if (existingToken && (room.seats.X === existingToken || room.seats.O === existingToken)) {
    const seat = room.seats.X === existingToken ? "X" : "O";
    return { room, token: existingToken, seat };
  }

  if (room.seats.O) return { error: "full" };

  const guestToken = token();
  room.seats.O = guestToken;
  room.names.O = (name || "").slice(0, 18) || "Player O";
  room.status = "playing";
  touch(room);
  return { room, token: guestToken, seat: "O" };
}

function winnerOf(board) {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  if (board.every(Boolean)) return { winner: "draw", line: null };
  return null;
}

export function playMove(code, playerToken, index) {
  const room = getRoom(code);
  if (!room) return { error: "no-room" };

  const seat = room.seats.X === playerToken ? "X" : room.seats.O === playerToken ? "O" : null;
  if (!seat) return { error: "not-seated" };
  if (room.status !== "playing") return { error: "not-playing" };
  if (room.turn !== seat) return { error: "not-your-turn" };
  if (!Number.isInteger(index) || index < 0 || index > 8) return { error: "bad-square" };
  if (room.board[index]) return { error: "taken" };

  room.board[index] = seat;
  const outcome = winnerOf(room.board);

  if (outcome) {
    if (outcome.winner === "draw") {
      room.status = "draw";
      room.winner = null;
      room.score.draw += 1;
    } else {
      room.status = "won";
      room.winner = outcome.winner;
      room.line = outcome.line;
      room.score[outcome.winner] += 1;
    }
  } else {
    room.turn = seat === "X" ? "O" : "X";
  }

  touch(room);
  return { room, seat };
}

export function requestRematch(code, playerToken) {
  const room = getRoom(code);
  if (!room) return { error: "no-room" };
  const seat = room.seats.X === playerToken ? "X" : room.seats.O === playerToken ? "O" : null;
  if (!seat) return { error: "not-seated" };
  if (room.status !== "won" && room.status !== "draw") return { error: "still-playing" };

  room.rematch[seat] = true;

  if (room.rematch.X && room.rematch.O) {
    // the loser of the last game opens the next one
    const opener = room.winner === "X" ? "O" : "X";
    room.board = new Array(9).fill(null);
    room.turn = opener;
    room.status = "playing";
    room.winner = null;
    room.line = null;
    room.rematch = { X: false, O: false };
  }

  touch(room);
  return { room, seat };
}

export function leaveRoom(code, playerToken) {
  const room = getRoom(code);
  if (!room) return { error: "no-room" };
  if (room.seats.O === playerToken) {
    room.seats.O = null;
    room.names.O = null;
    room.status = "waiting";
    room.board = new Array(9).fill(null);
    room.turn = "X";
    room.winner = null;
    room.line = null;
    room.rematch = { X: false, O: false };
    touch(room);
  } else if (room.seats.X === playerToken) {
    rooms.delete(room.code);
    broadcast({ ...room, status: "closed" });
    watchers.delete(room.code);
  }
  return { ok: true };
}

// --- live updates -----------------------------------------------------------

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
