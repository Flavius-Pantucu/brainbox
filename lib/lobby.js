// A private room — the place people sit before and between games.
//
// A game room (lib/rooms.js) is one game, and it dies with it. A lobby outlives
// the game: the same people stay in it, talk, pick something else and play
// again. So the two are separate objects, and a lobby only ever holds a
// *pointer* to whatever game room is running right now.
//
// Storage is the same key-value store the game rooms use, under a prefixed key
// so the two code spaces cannot collide.

import { readRoom, removeRoom, writeRoom } from "./rooms-store.js";
import { ONLINE_GAMES, createRoom } from "./rooms.js";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1
const KEY = (code) => `L${code}`;
const MAX_MEMBERS = 8;
const CHAT_KEPT = 60;
const CHAT_MAX_CHARS = 240;
const DEFAULT_GAME = "tictactoe";

function token() {
  return Array.from(
    { length: 24 },
    () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  ).join("");
}

function clean(name) {
  return String(name || "").slice(0, 18).trim();
}

async function newCode() {
  for (let tries = 0; tries < 12; tries += 1) {
    const code = Array.from(
      { length: 4 },
      () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
    ).join("");
    if (!(await readRoom(KEY(code)))) return code;
  }
  return Array.from(
    { length: 6 },
    () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  ).join("");
}

function memberOf(lobby, playerToken) {
  if (!playerToken) return null;
  return lobby.members.find((m) => m.token === playerToken) || null;
}

function post(lobby, text, name = null) {
  lobby.chat.push({ id: `${Date.now()}-${lobby.chat.length}`, at: Date.now(), name, text });
  if (lobby.chat.length > CHAT_KEPT) lobby.chat = lobby.chat.slice(-CHAT_KEPT);
}

async function save(lobby) {
  const saved = await writeRoom(KEY(lobby.code), lobby);
  lobby.version = saved.version;
  lobby.updatedAt = saved.updatedAt;
  return lobby;
}

// Everyone drops out of ready when the table changes under them — a tick given
// for chess is not a tick given for go.
function unready(lobby) {
  lobby.members.forEach((m) => {
    m.ready = false;
  });
}

/* ------------------------------------------------------------------ view --- */

export function publicLobby(lobby, viewerToken) {
  const me = memberOf(lobby, viewerToken);
  const fit = ONLINE_GAMES[lobby.game];
  const ready = lobby.members.filter((m) => m.ready).length;

  return {
    code: lobby.code,
    version: lobby.version,
    game: lobby.game,
    seats: fit.seats,
    minSeats: fit.minSeats,
    host: lobby.host === viewerToken,
    you: me ? me.id : null,
    members: lobby.members.map((m) => ({
      id: m.id,
      name: m.name,
      ready: m.ready,
      host: m.token === lobby.host,
      you: m.token === viewerToken,
    })),
    ready,
    // enough people for this game, nobody spare, and every one of them ticked
    canStart:
      lobby.members.length >= fit.minSeats &&
      lobby.members.length <= fit.seats &&
      ready === lobby.members.length,
    chat: lobby.chat,
    play: lobby.play
      ? {
          game: lobby.play.game,
          code: lobby.play.code,
          startedAt: lobby.play.startedAt,
          // the seat the host was given when the room was opened travels with
          // them and nobody else, so they can sit back down in it
          token: lobby.play.hostToken && lobby.host === viewerToken ? lobby.play.hostToken : null,
        }
      : null,
    updatedAt: lobby.updatedAt,
  };
}

/* ------------------------------------------------------------- lifecycle --- */

export async function createLobby(name, game = DEFAULT_GAME) {
  if (!ONLINE_GAMES[game]) return { error: "no-game" };

  const hostToken = token();
  const code = await newCode();
  const lobby = {
    kind: "lobby",
    code,
    host: hostToken,
    game,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 0,
    members: [{ id: "m1", token: hostToken, name: clean(name) || "Host", ready: false }],
    chat: [],
    play: null,
    nextId: 2,
  };
  post(lobby, `${lobby.members[0].name} opened the room.`);

  await save(lobby);
  return { lobby, token: hostToken };
}

export async function getLobby(code) {
  const key = String(code || "").toUpperCase();
  const stored = await readRoom(KEY(key));
  if (!stored || stored.kind !== "lobby") return null;
  return stored;
}

export async function joinLobby(code, name, existingToken) {
  const lobby = await getLobby(code);
  if (!lobby) return { error: "no-room" };

  const held = memberOf(lobby, existingToken);
  if (held) return { lobby, token: existingToken };

  if (lobby.members.length >= MAX_MEMBERS) return { error: "full" };

  const guestToken = token();
  const member = {
    id: `m${lobby.nextId}`,
    token: guestToken,
    name: clean(name) || `Player ${lobby.nextId}`,
    ready: false,
  };
  lobby.nextId += 1;
  lobby.members.push(member);
  unready(lobby); // the table changed size; everyone confirms again
  post(lobby, `${member.name} came in.`);

  await save(lobby);
  return { lobby, token: guestToken };
}

export async function sayInLobby(code, playerToken, text) {
  const lobby = await getLobby(code);
  if (!lobby) return { error: "no-room" };
  const me = memberOf(lobby, playerToken);
  if (!me) return { error: "not-seated" };

  const said = String(text || "").slice(0, CHAT_MAX_CHARS).trim();
  if (!said) return { error: "empty" };

  post(lobby, said, me.name);
  await save(lobby);
  return { lobby };
}

export async function setReady(code, playerToken, ready) {
  const lobby = await getLobby(code);
  if (!lobby) return { error: "no-room" };
  const me = memberOf(lobby, playerToken);
  if (!me) return { error: "not-seated" };

  me.ready = !!ready;
  await save(lobby);
  return { lobby };
}

export async function renameInLobby(code, playerToken, name) {
  const lobby = await getLobby(code);
  if (!lobby) return { error: "no-room" };
  const me = memberOf(lobby, playerToken);
  if (!me) return { error: "not-seated" };

  const next = clean(name);
  if (!next || next === me.name) return { lobby };
  me.name = next;
  await save(lobby);
  return { lobby };
}

export async function pickGame(code, playerToken, game) {
  const lobby = await getLobby(code);
  if (!lobby) return { error: "no-room" };
  if (lobby.host !== playerToken) return { error: "not-host" };
  if (!ONLINE_GAMES[game]) return { error: "no-game" };
  if (lobby.play) return { error: "already-started" };

  if (lobby.game !== game) {
    lobby.game = game;
    unready(lobby);
    post(lobby, `The table is set for ${game}.`);
  }

  await save(lobby);
  return { lobby };
}

// Opening the game room is the lobby's job, not the players'. Everyone is
// pointed at the same code a moment later, and the host keeps the seat the room
// handed out when it was made.
export async function startLobby(code, playerToken) {
  const lobby = await getLobby(code);
  if (!lobby) return { error: "no-room" };
  if (lobby.host !== playerToken) return { error: "not-host" };
  if (lobby.play) return { error: "already-started" };

  const view = publicLobby(lobby, playerToken);
  if (!view.canStart) return { error: "not-ready" };

  const host = memberOf(lobby, playerToken);
  const opened = await createRoom(host.name, lobby.game, {});
  if (opened.error) return { error: opened.error };

  lobby.play = {
    game: lobby.game,
    code: opened.room.code,
    hostToken: opened.token,
    startedAt: Date.now(),
  };
  post(lobby, `The game is on — room ${opened.room.code}.`);

  await save(lobby);
  return { lobby };
}

// Back from the board. Anyone can call it: the game room dies on its own TTL,
// and a lobby stuck pointing at a finished game is worse than one that lets a
// straggler be pulled back a second early.
export async function endGame(code, playerToken) {
  const lobby = await getLobby(code);
  if (!lobby) return { error: "no-room" };
  if (!memberOf(lobby, playerToken)) return { error: "not-seated" };
  if (!lobby.play) return { lobby };

  lobby.play = null;
  unready(lobby);
  post(lobby, "Back in the room. Pick the next one.");

  await save(lobby);
  return { lobby };
}

export async function leaveLobby(code, playerToken) {
  const lobby = await getLobby(code);
  if (!lobby) return { ok: true };

  const me = memberOf(lobby, playerToken);
  if (!me) return { ok: true };

  // the host owns the room; when they go, it closes
  if (lobby.host === playerToken) {
    await removeRoom(KEY(lobby.code));
    return { ok: true, closed: true };
  }

  lobby.members = lobby.members.filter((m) => m.token !== playerToken);
  unready(lobby);
  post(lobby, `${me.name} left.`);
  await save(lobby);
  return { ok: true };
}
