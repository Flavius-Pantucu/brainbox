// The live channel, against the real Ably app.
//
// Everything else can be checked in process; this cannot. The question it
// answers is the only one that matters: when one browser posts a move, does a
// message actually reach the other one, and does it carry a version past what
// that browser already held?
//
// Needs .env filled in and `npm run dev` running, so — like check:backend —
// it is a separate script rather than part of `npm run check`.
//   npm run check:live
import "../lib/env.js";
import assert from "node:assert/strict";
import Ably from "ably";

const BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const WAIT_MS = 8000;

if (!process.env.ABLY_API_KEY) {
  console.log("live: skipped (no ABLY_API_KEY — this build polls, which is supported)");
  process.exit(0);
}

const post = (path, body) =>
  fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

/* ----------------------------------------------------- the token endpoint --- */

const bad = await fetch(`${BASE}/api/live/token?channel=room:../secret`);
assert.equal(bad.status, 400, "a channel that is not a room code is refused");

const minted = await fetch(`${BASE}/api/live/token?channel=room:ABCD`);
assert.ok(minted.ok, `the token endpoint answers (${minted.status})`);
const request = await minted.json();
assert.ok(request.mac && request.keyName, "and it is a signed token request");
assert.equal(
  JSON.parse(request.capability)["room:ABCD"].join(),
  "subscribe",
  "scoped to one channel, subscribe only — a client must never be able to publish"
);

/* ------------------------------------------------------------- a real room --- */

const opened = await post("/api/rooms", { name: "Ada", game: "tictactoe", seat: "X" });
assert.ok(opened.ok, "a room opens");
const { token: hostToken, state } = await opened.json();
const code = state.code;

const joined = await post(`/api/rooms/${code}`, { action: "join", name: "Bo" });
assert.ok(joined.ok, "a second player sits down");

// Subscribe the way a second browser would, then move as the first one.
const ably = new Ably.Realtime({ key: process.env.ABLY_API_KEY, autoConnect: true });
const channel = ably.channels.get(`room:${code}`);
await channel.attach();

const heard = new Promise((resolve, reject) => {
  const timer = setTimeout(
    () => reject(new Error(`nothing arrived on room:${code} within ${WAIT_MS}ms`)),
    WAIT_MS
  );
  channel.subscribe("moved", (message) => {
    clearTimeout(timer);
    resolve(message.data);
  });
});

const before = Date.now();
const moved = await post(`/api/rooms/${code}`, { action: "move", token: hostToken, index: 0 });
assert.ok(moved.ok, "X takes a corner");
const after = await moved.json();

const nudge = await heard;
console.log(`  nudge arrived in ${Date.now() - before}ms`);
assert.ok(nudge.version > 0, "the nudge carries a version");
assert.equal(nudge.version, after.state.version, "the same version the mover was handed");

// and the point of the whole thing: that version is past what a watcher held
const stale = await fetch(`${BASE}/api/rooms/${code}?since=${nudge.version}`);
assert.equal(stale.status, 304, "asking with it back gets nothing, so the fetch after a nudge is one round trip");

await post(`/api/rooms/${code}`, { action: "leave", token: hostToken });

/* ---------------------------------------------------------- and the lobby --- */

// The private room publishes on its own channel, so a message typed into the
// chat reaches the others the same way a move does.
const room = await post("/api/lobby", { name: "Ada" });
const lobby = await room.json();
const talk = ably.channels.get(`lobby:${lobby.state.code}`);
await talk.attach();

const said = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("nothing arrived on the lobby channel")), WAIT_MS);
  talk.subscribe("moved", (message) => {
    clearTimeout(timer);
    resolve(message.data);
  });
});

await post(`/api/lobby/${lobby.state.code}`, {
  action: "say",
  token: lobby.token,
  text: "anyone about?",
});
assert.ok((await said).version > lobby.state.version, "the lobby nudge is past what the room held");
await post(`/api/lobby/${lobby.state.code}`, { action: "leave", token: lobby.token });

ably.close();
console.log("live: ok");
