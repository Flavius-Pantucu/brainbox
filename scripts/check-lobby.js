// The private room, end to end, against the in-memory store.
//
// The lifecycle has the only real rules in it — who may start, when ready is
// thrown away, and that the host keeps the seat the game room handed out — so
// it gets one runnable check rather than a suite.
//   npm run check:lobby
process.env.BRAINBOX_ROOMS = "memory";

import assert from "node:assert/strict";
import {
  createLobby,
  endGame,
  joinLobby,
  leaveLobby,
  pickGame,
  publicLobby,
  sayInLobby,
  setReady,
  startLobby,
} from "../lib/lobby.js";

const host = await createLobby("Ada", "tictactoe");
const code = host.lobby.code;
assert.equal(code.length, 4, "a room code is four characters");

// one person cannot start a two-seat game, however ready they say they are
await setReady(code, host.token, true);
assert.equal(publicLobby((await joinLobby(code, "Ada", host.token)).lobby, host.token).canStart,
  false, "one player is not enough");

const guest = await joinLobby(code, "Bo");
assert.ok(guest.token, "a second player gets in");

// somebody arriving resets the room: Ada's tick was given to a smaller table
let view = publicLobby(guest.lobby, host.token);
assert.equal(view.members.length, 2, "two at the table");
assert.equal(view.ready, 0, "a new arrival clears every tick");

assert.equal((await startLobby(code, host.token)).error, "not-ready", "nobody is ready yet");

await setReady(code, host.token, true);
await setReady(code, guest.token, true);
assert.equal((await startLobby(code, guest.token)).error, "not-host", "only the host starts it");

// changing the table throws the ticks away again
await pickGame(code, host.token, "chess");
view = publicLobby((await setReady(code, host.token, true)).lobby, host.token);
assert.equal(view.game, "chess", "the host set a different table");
assert.equal(view.ready, 1, "picking a game cleared the other tick");

await setReady(code, guest.token, true);
const started = await startLobby(code, host.token);
assert.ok(started.lobby.play?.code, "starting opens a game room");

const hostView = publicLobby(started.lobby, host.token);
const guestView = publicLobby(started.lobby, guest.token);
assert.ok(hostView.play.token, "the host is handed the seat the room made");
assert.equal(guestView.play.token, null, "and nobody else is");
assert.equal(guestView.play.code, hostView.play.code, "both are pointed at one room");

assert.equal((await startLobby(code, host.token)).error, "already-started", "one game at a time");

// chat, and coming back afterwards
await sayInLobby(code, guest.token, "good game");
const back = await endGame(code, guest.token);
assert.equal(back.lobby.play, null, "ending the game empties the pointer");
assert.equal(publicLobby(back.lobby, host.token).ready, 0, "and clears ready for the next one");
assert.ok(
  back.lobby.chat.some((line) => line.name === "Bo" && line.text === "good game"),
  "what was said is kept"
);

// a guest leaving opens a chair; the host leaving closes the room
await leaveLobby(code, guest.token);
const { getLobby } = await import("../lib/lobby.js");
assert.equal((await getLobby(code)).members.length, 1, "the guest's chair is open again");
await leaveLobby(code, host.token);
assert.equal(await getLobby(code), null, "the host owns the room and takes it with them");

console.log("lobby: ok");
