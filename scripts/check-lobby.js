// The private room, end to end, against the in-memory store.
//
// The lifecycle has the only real rules in it — who may start, when ready is
// thrown away, who sits and who watches, and how a series is counted — so it
// gets one runnable check rather than a suite.
//   npm run check:lobby
process.env.BRAINBOX_ROOMS = "memory";

import assert from "node:assert/strict";
import {
  createLobby,
  endGame,
  getLobby,
  joinLobby,
  leaveLobby,
  markDaily,
  pickGame,
  playAgain,
  publicLobby,
  sayInLobby,
  seatMember,
  setReady,
  startLobby,
  titleLobby,
} from "../lib/lobby.js";
import { act, getRoom } from "../lib/rooms.js";
import { readRoom, writeRoom } from "../lib/rooms-store.js";

// Reaching into the stored room is how the clock is wound forward: settle()
// reads Date.now(), and waiting five real minutes is not a test.
async function age(code, edit) {
  const stored = await readRoom(`L${code}`);
  edit(stored);
  await writeRoom(`L${code}`, stored);
}

/* ------------------------------------------------------------ the basics --- */

const host = await createLobby("Ada", "tictactoe");
const code = host.lobby.code;
assert.equal(code.length, 4, "a room code is four characters");
assert.equal(publicLobby(host.lobby, host.token).canStart, false, "one player is not enough");

const guest = await joinLobby(code, "Bo");
let view = publicLobby(guest.lobby, host.token);
assert.equal(view.playing, 2, "two in chairs");
assert.equal(view.ready, 0, "a new arrival clears every tick");

assert.equal((await startLobby(code, host.token)).error, "not-ready", "nobody is ready yet");
await setReady(code, host.token, true);
await setReady(code, guest.token, true);
assert.equal((await startLobby(code, guest.token)).error, "not-host", "only the host starts it");

/* -------------------------------------------------------------- watchers --- */

const watcher = await joinLobby(code, "Cy");
view = publicLobby(watcher.lobby, watcher.token);
assert.equal(view.members.length, 3, "three in the room");
assert.equal(view.playing, 2, "but a two-seat game still seats two");
assert.equal(
  view.members.find((m) => m.you).playing,
  false,
  "the third person watches rather than being turned away"
);

// a watcher does not gate the start: they are not the one who has to move
await setReady(code, host.token, true);
await setReady(code, guest.token, true);
assert.equal(publicLobby(await getLobby(code), host.token).canStart, true, "two ready is enough");

/* ------------------------------------------------ starting, seat by seat --- */

const started = await startLobby(code, host.token);
const play = started.lobby.play;
assert.ok(play?.code, "starting opens a game room");

const hostSeat = publicLobby(started.lobby, host.token).play;
const guestSeat = publicLobby(started.lobby, guest.token).play;
const watchSeat = publicLobby(started.lobby, watcher.token).play;
assert.ok(hostSeat.token && guestSeat.token, "both players are handed their own seat");
assert.notEqual(hostSeat.token, guestSeat.token, "and they are not the same seat");
assert.equal(watchSeat.token, null, "the watcher is handed none");
assert.equal(watchSeat.watching, true, "and is walked in as a watcher");
assert.equal((await startLobby(code, host.token)).error, "already-started", "one game at a time");

/* ---------------------------------------------------- playing it out --- */

// X takes the top row; the room counts that against whichever member sat there
const seatOf = Object.fromEntries(
  Object.entries(play.seats).map(([member, held]) => [held.seat, { member, token: held.token }])
);
for (const [seat, square] of [["X", 0], ["O", 3], ["X", 1], ["O", 4], ["X", 2]]) {
  const moved = await act(play.code, seatOf[seat].token, "move", { index: square });
  assert.ok(!moved.error, `${seat} plays ${square}: ${moved.error || "ok"}`);
}
assert.equal((await getRoom(play.code)).status, "won", "the top row wins it");

const back = await endGame(code, watcher.token);
assert.equal(back.lobby.play, null, "ending the game empties the pointer");
assert.equal(back.lobby.series.tally[seatOf.X.member], 1, "the win lands on the member who sat X");
assert.equal(back.lobby.series.played, 1, "one game in the series");
assert.equal(back.lobby.lastPlay.code, play.code, "the finished room is kept to watch back");
assert.equal(publicLobby(back.lobby, host.token).ready, 0, "and ready is cleared for the next one");

/* --------------------------------------------------------- same again --- */

const again = await playAgain(code, host.token);
assert.ok(again.lobby.play?.code, "same again needs no fresh ticks");
assert.notEqual(again.lobby.play.code, play.code, "and it is a new room");
await endGame(code, host.token);

/* ------------------------------------------------------ seating by hand --- */

const seated = await seatMember(code, host.token, watcher.lobby.members.at(-1).id);
assert.equal(seated.error, "full", "a full table cannot take another player");

await seatMember(code, host.token, publicLobby(await getLobby(code), host.token).members[1].id);
view = publicLobby(await getLobby(code), host.token);
assert.equal(view.playing, 2, "the chair the host emptied is filled by the watcher");
assert.equal(view.members.find((m) => m.name === "Cy").playing, true, "Cy is sat down");

/* --------------------------------------------- the room's other business --- */

await titleLobby(code, host.token, "Thursday club");
await markDaily(code, guest.token, true);
await sayInLobby(code, guest.token, "good game");
view = publicLobby(await getLobby(code), host.token);
assert.equal(view.title, "Thursday club", "the room has a name");
assert.equal(view.members.find((m) => m.name === "Bo").daily, true, "today's challenge is marked");
assert.ok(
  view.chat.some((line) => line.name === "Bo" && line.text === "good game"),
  "what was said is kept"
);
assert.equal((await titleLobby(code, guest.token, "mine now")).error, "not-host", "guests do not rename it");

/* ------------------------------------------------------------ the clock --- */

await setReady(code, host.token, true);
await age(code, (lobby) => {
  lobby.members.forEach((m) => {
    m.readyAt = Date.now() - 6 * 60 * 1000;
  });
});
assert.equal(publicLobby(await getLobby(code), host.token).ready, 0, "a tick goes stale in minutes");

// a tab that closed stops asking; the chair it was holding has to come back
await age(code, (lobby) => {
  const ada = lobby.members.find((m) => m.name === "Ada");
  ada.seenAt = Date.now() - 10 * 60 * 1000;
});
view = publicLobby(await getLobby(code), guest.token);
assert.ok(!view.members.some((m) => m.name === "Ada"), "a closed tab gives up its chair");
assert.ok(view.members.some((m) => m.host), "and somebody still has the room");

/* ------------------------------------------------------------ the door --- */

await leaveLobby(code, guest.token);
await leaveLobby(code, watcher.token);
assert.equal(await getLobby(code), null, "the last person out closes the room");

// a game that cannot be played in a room is not a table anyone can set
const solo = await createLobby("Ada", "sudoku");
assert.equal(solo.error, "no-game", "sudoku has no chairs");
const two = await createLobby("Ada", "chess");
assert.equal((await pickGame(two.lobby.code, two.token, "minesweeper")).error, "no-game", "nor minesweeper");

console.log("lobby: ok");
