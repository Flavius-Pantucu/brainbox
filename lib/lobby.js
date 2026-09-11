// A private room — the place people sit before, between and after games.
//
// A game room (lib/rooms.js) is one game, and it dies with it. A lobby outlives
// the game: the same people stay in it, talk, pick something else and play
// again. So the two are separate objects, and a lobby only ever holds a
// *pointer* to whatever game room is running right now.
//
// Storage is the same key-value store the game rooms use, under a prefixed key
// so the two code spaces cannot collide.

import { readRoom, removeRoom, writeRoom } from "./rooms-store.js";
import { announce, lobbyChannel } from "./live.js";
import { ONLINE_GAMES, createRoom, getRoom, joinRoom } from "./rooms.js";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1
const KEY = (code) => `L${code}`;
const MAX_MEMBERS = 8;
const CHAT_KEPT = 60;
const CHAT_MAX_CHARS = 240;
const DEFAULT_GAME = "tictactoe";

// Presence. A tab that is open asks every few seconds, so silence this long is
// somebody who closed it — and holding a chair for them is what makes a room of
// four people unable to start anything.
export const AWAY_MS = 45000;
const DROP_MS = 150000;

// A tick given five minutes ago is not consent to start now.
const READY_TTL_MS = 5 * 60 * 1000;

function token() {
  return Array.from(
    { length: 24 },
    () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  ).join("");
}

function clean(name, max = 18) {
  return String(name || "").slice(0, max).trim();
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
  await announce(lobbyChannel(lobby.code), lobby.version);
  return lobby;
}

// Everyone drops out of ready when the table changes under them — a tick given
// for chess is not a tick given for go.
function unready(lobby) {
  lobby.members.forEach((m) => {
    m.ready = false;
    m.readyAt = null;
  });
}

function emptySeries(game) {
  return { game, tally: {}, draws: 0, played: 0 };
}

/* ------------------------------------------------------------------ seats --- */

// The chairs, and who is watching. A game seats two; a room holds eight. The
// first people in take the chairs and the rest watch, which is a better answer
// than turning them away at the door.
function seatPeople(lobby) {
  const fit = ONLINE_GAMES[lobby.game];
  const present = new Set(lobby.members.map((m) => m.id));
  const before = lobby.players.join(",");

  const players = lobby.players.filter((id) => present.has(id));
  for (const member of lobby.members) {
    if (players.length >= fit.seats) break;
    // somebody the host sat out stays out; otherwise the chair they were just
    // moved from fills with them again on the very next read
    if (member.benched) continue;
    if (!players.includes(member.id)) players.push(member.id);
  }

  lobby.players = players.slice(0, fit.seats);
  return lobby.players.join(",") !== before;
}

const isPlayer = (lobby, member) => lobby.players.includes(member.id);

/* ---------------------------------------------------------------- settle --- */

// Everything that happens to a room because time passed rather than because
// somebody did something: stale ticks, closed tabs, a host who walked away.
// Every read runs it, because there is no timer on a serverless host.
function settle(lobby) {
  const now = Date.now();
  let changed = false;

  for (const member of lobby.members) {
    if (member.ready && member.readyAt && now - member.readyAt > READY_TTL_MS) {
      member.ready = false;
      member.readyAt = null;
      changed = true;
    }
  }

  // A game in progress holds the room open: a player staring at a board is not
  // polling the lobby, and dropping them mid-game would be absurd.
  if (!lobby.play) {
    const kept = lobby.members.filter((m) => !m.seenAt || now - m.seenAt < DROP_MS);
    if (kept.length !== lobby.members.length) {
      lobby.members = kept;
      changed = true;
    }
  }

  if (lobby.members.length === 0) return "empty";

  // the room outlives whoever opened it; the longest-sitting person inherits it
  if (!lobby.members.some((m) => m.token === lobby.host)) {
    lobby.host = lobby.members[0].token;
    post(lobby, `${lobby.members[0].name} has the room now.`);
    changed = true;
  }

  if (seatPeople(lobby)) changed = true;
  return changed;
}

/* ------------------------------------------------------------------ view --- */

export function publicLobby(lobby, viewerToken) {
  const me = memberOf(lobby, viewerToken);
  const fit = ONLINE_GAMES[lobby.game];
  const now = Date.now();

  const players = lobby.players
    .map((id) => lobby.members.find((m) => m.id === id))
    .filter(Boolean);
  const ready = players.filter((m) => m.ready).length;

  const seat = (member) => ({
    id: member.id,
    name: member.name,
    ready: member.ready,
    host: member.token === lobby.host,
    you: member.token === viewerToken,
    playing: isPlayer(lobby, member),
    away: !!member.seenAt && now - member.seenAt > AWAY_MS,
    daily: !!member.dailyDone,
    wins: lobby.series?.tally?.[member.id] ?? 0,
  });

  return {
    code: lobby.code,
    title: lobby.title || "",
    version: lobby.version,
    game: lobby.game,
    seats: fit.seats,
    minSeats: fit.minSeats,
    host: lobby.host === viewerToken,
    you: me ? me.id : null,
    members: lobby.members.map(seat),
    ready,
    playing: players.length,
    // enough people in chairs, and every one of them ticked. Watchers are not
    // asked: they are not the ones who have to move.
    canStart:
      !lobby.play &&
      players.length >= fit.minSeats &&
      players.length <= fit.seats &&
      ready === players.length,
    series: lobby.series || emptySeries(lobby.game),
    chat: lobby.chat,
    play: lobby.play
      ? {
          game: lobby.play.game,
          code: lobby.play.code,
          startedAt: lobby.play.startedAt,
          // each player is handed the seat the game room gave them, and nobody
          // else's; a member with no seat is walked in as a watcher
          token: me ? lobby.play.seats?.[me.id]?.token ?? null : null,
          watching: me ? !lobby.play.seats?.[me.id] : true,
        }
      : null,
    lastPlay: lobby.lastPlay || null,
    updatedAt: lobby.updatedAt,
  };
}

/* ------------------------------------------------------------- lifecycle --- */

export async function createLobby(name, game = DEFAULT_GAME) {
  if (!ONLINE_GAMES[game]) return { error: "no-game" };

  const hostToken = token();
  const code = await newCode();
  const host = {
    id: "m1",
    token: hostToken,
    name: clean(name) || "Host",
    ready: false,
    readyAt: null,
    seenAt: Date.now(),
    dailyDone: false,
    benched: false,
  };
  const lobby = {
    kind: "lobby",
    code,
    title: "",
    host: hostToken,
    game,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 0,
    members: [host],
    players: [host.id],
    chat: [],
    play: null,
    lastPlay: null,
    series: emptySeries(game),
    nextId: 2,
  };
  post(lobby, `${host.name} opened the room.`);

  await save(lobby);
  return { lobby, token: hostToken };
}

export async function getLobby(code) {
  const key = String(code || "").toUpperCase();
  const stored = await readRoom(KEY(key));
  if (!stored || stored.kind !== "lobby") return null;

  const outcome = settle(stored);
  if (outcome === "empty") {
    await removeRoom(KEY(stored.code));
    return null;
  }
  if (outcome) await save(stored);
  return stored;
}

// The heartbeat, and the only reason a plain read ever writes. Throttled hard,
// because every write here is a row the database has to wake up for.
export async function touchLobby(code, playerToken) {
  const lobby = await getLobby(code);
  if (!lobby) return null;

  const me = memberOf(lobby, playerToken);
  if (me && Date.now() - (me.seenAt || 0) > AWAY_MS / 2) {
    me.seenAt = Date.now();
    await save(lobby);
  }
  return lobby;
}

export async function joinLobby(code, name, existingToken) {
  const lobby = await getLobby(code);
  if (!lobby) return { error: "no-room" };

  const held = memberOf(lobby, existingToken);
  if (held) {
    held.seenAt = Date.now();
    await save(lobby);
    return { lobby, token: existingToken };
  }

  if (lobby.members.length >= MAX_MEMBERS) return { error: "full" };

  const guestToken = token();
  const member = {
    id: `m${lobby.nextId}`,
    token: guestToken,
    name: clean(name) || `Player ${lobby.nextId}`,
    ready: false,
    readyAt: null,
    seenAt: Date.now(),
    dailyDone: false,
    benched: false,
  };
  lobby.nextId += 1;
  lobby.members.push(member);
  seatPeople(lobby);
  unready(lobby); // the table changed size; everyone confirms again
  post(lobby, isPlayer(lobby, member) ? `${member.name} came in.` : `${member.name} is watching.`);

  await save(lobby);
  return { lobby, token: guestToken };
}

export async function sayInLobby(code, playerToken, text) {
  const lobby = await getLobby(code);
  if (!lobby) return { error: "no-room" };
  const me = memberOf(lobby, playerToken);
  if (!me) return { error: "not-seated" };

  const said = clean(text, CHAT_MAX_CHARS);
  if (!said) return { error: "empty" };

  me.seenAt = Date.now();
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
  me.readyAt = me.ready ? Date.now() : null;
  me.seenAt = Date.now();
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

// What the room is called. A code is how you get in; a name is how you know
// which of the two open tabs you are looking at.
export async function titleLobby(code, playerToken, title) {
  const lobby = await getLobby(code);
  if (!lobby) return { error: "no-room" };
  if (lobby.host !== playerToken) return { error: "not-host" };

  lobby.title = clean(title, 32);
  await save(lobby);
  return { lobby };
}

// Whether today's challenge is cleared. The client knows; the room wants to
// show it beside everyone's name.
export async function markDaily(code, playerToken, done) {
  const lobby = await getLobby(code);
  if (!lobby) return { error: "no-room" };
  const me = memberOf(lobby, playerToken);
  if (!me) return { error: "not-seated" };
  if (me.dailyDone === !!done) return { lobby };

  me.dailyDone = !!done;
  await save(lobby);
  return { lobby };
}

// The host moves somebody between a chair and the rail.
export async function seatMember(code, playerToken, memberId) {
  const lobby = await getLobby(code);
  if (!lobby) return { error: "no-room" };
  if (lobby.host !== playerToken) return { error: "not-host" };
  if (lobby.play) return { error: "already-started" };

  const member = lobby.members.find((m) => m.id === memberId);
  if (!member) return { error: "not-seated" };

  if (isPlayer(lobby, member)) {
    lobby.players = lobby.players.filter((id) => id !== memberId);
    member.benched = true;
  } else {
    if (lobby.players.length >= ONLINE_GAMES[lobby.game].seats) return { error: "full" };
    member.benched = false;
    lobby.players.push(memberId);
  }

  unready(lobby);
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
    lobby.series = emptySeries(game); // a run of wins belongs to one game
    seatPeople(lobby);
    unready(lobby);
    post(lobby, `The table is set for ${game}.`);
  }

  await save(lobby);
  return { lobby };
}

// Opening the game room is the lobby's job, not the players'. Everyone in a
// chair is seated here, so nobody races anybody else for a colour and the room
// knows which member is which seat when the result comes back.
async function openTable(lobby) {
  const players = lobby.players.map((id) => lobby.members.find((m) => m.id === id)).filter(Boolean);
  if (players.length < ONLINE_GAMES[lobby.game].minSeats) return { error: "too-few" };

  const opened = await createRoom(players[0].name, lobby.game, {});
  if (opened.error) return { error: opened.error };

  const seats = { [players[0].id]: { seat: opened.seat, token: opened.token } };
  for (const player of players.slice(1)) {
    const sat = await joinRoom(opened.room.code, player.name);
    if (sat.error) return { error: sat.error };
    seats[player.id] = { seat: sat.seat, token: sat.token };
  }

  lobby.play = { game: lobby.game, code: opened.room.code, seats, startedAt: Date.now() };
  unready(lobby);
  post(lobby, `The game is on — room ${opened.room.code}.`);
  return { ok: true };
}

export async function startLobby(code, playerToken) {
  const lobby = await getLobby(code);
  if (!lobby) return { error: "no-room" };
  if (lobby.host !== playerToken) return { error: "not-host" };
  if (lobby.play) return { error: "already-started" };
  if (!publicLobby(lobby, playerToken).canStart) return { error: "not-ready" };

  const opened = await openTable(lobby);
  if (opened.error) return opened;

  await save(lobby);
  return { lobby };
}

// Same again. Nobody has to tick anything: they were all sitting there thirty
// seconds ago, which is the only thing ready was ever asking.
export async function playAgain(code, playerToken) {
  const lobby = await getLobby(code);
  if (!lobby) return { error: "no-room" };
  if (lobby.host !== playerToken) return { error: "not-host" };
  if (lobby.play) return { error: "already-started" };

  const opened = await openTable(lobby);
  if (opened.error) return opened;

  await save(lobby);
  return { lobby };
}

// Back from the board. Anyone can call it: the game room dies on its own TTL,
// and a lobby stuck pointing at a finished game is worse than one that lets a
// straggler be pulled back a second early.
//
// ponytail: two people ending at the same moment can both read the room and
// both add its score to the series. The store has no compare-and-set, and a
// double-counted win in a friendly series is not worth one.
export async function endGame(code, playerToken) {
  const lobby = await getLobby(code);
  if (!lobby) return { error: "no-room" };
  if (!memberOf(lobby, playerToken)) return { error: "not-seated" };
  if (!lobby.play) return { lobby };

  const { code: roomCode, game, seats } = lobby.play;

  // The game room counts wins per seat across every rematch played in it, so
  // reading it once on the way out is the whole series update.
  const room = await getRoom(roomCode).catch(() => null);
  if (room?.score) {
    if (!lobby.series || lobby.series.game !== game) lobby.series = emptySeries(game);
    for (const [memberId, held] of Object.entries(seats || {})) {
      const won = room.score[held.seat] || 0;
      if (won) lobby.series.tally[memberId] = (lobby.series.tally[memberId] || 0) + won;
    }
    lobby.series.draws += room.score.draw || 0;
    lobby.series.played += Object.values(room.score).reduce((a, b) => a + b, 0);
  }

  lobby.lastPlay = { game, code: roomCode, endedAt: Date.now() };
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

  lobby.members = lobby.members.filter((m) => m.token !== playerToken);
  if (lobby.members.length === 0) {
    await removeRoom(KEY(lobby.code));
    return { ok: true, closed: true };
  }

  seatPeople(lobby);
  unready(lobby);
  post(lobby, `${me.name} left.`);
  await save(lobby);
  return { ok: true };
}
