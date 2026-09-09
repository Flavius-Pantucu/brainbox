// One runnable check for the parts of chess that are ours rather than the
// engine's: the material read, the review maths, and the room's move rules.
//   node scripts/check-chess.js
const assert = require("node:assert/strict");
const { Chess } = require("chess.js");

async function main() {
  const core = await import("../lib/chess-core.js");
  const rooms = await import("../lib/rooms.js");

  /* material ------------------------------------------------------------- */
  const start = new Chess();
  assert.deepEqual(core.materialFrom(start.board()), { taken: { w: [], b: [] }, score: 0 });

  const traded = new Chess();
  ["e4", "d5", "exd5", "Qxd5"].forEach((san) => traded.move(san));
  const material = core.materialFrom(traded.board());
  assert.deepEqual(material.taken.w, ["p"], "white has taken a pawn");
  assert.deepEqual(material.taken.b, ["p"], "black has taken one back");
  assert.equal(material.score, 0, "the trade is level");

  /* evaluation ----------------------------------------------------------- */
  assert.deepEqual(core.whiteScore({ cp: 120, mate: null }, "b"), { cp: -120, mate: null });
  assert.equal(core.evalText({ cp: 150, mate: null }), "+1.5");
  assert.equal(core.evalText({ cp: null, mate: -3 }), "M3");
  assert.equal(core.evalToShare({ cp: null, mate: 2 }), 1);
  assert.equal(core.winPercent({ mate: 3 }, "b"), 0);
  assert.ok(core.accuracyOf(0) > 99 && core.accuracyOf(50) < 15);
  assert.equal(core.verdictFor(40, false), "blunder");
  assert.equal(core.verdictFor(40, true), "best", "the engine's own move is never a blunder");

  /* outcomes ------------------------------------------------------------- */
  const mated = new Chess("rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3");
  assert.deepEqual(core.outcomeOf(mated), {
    over: true,
    status: "won",
    winner: "b",
    reason: "checkmate",
  });

  /* rooms ---------------------------------------------------------------- */
  const host = rooms.createRoom("Ada", "chess", { seat: "w" });
  assert.equal(host.seat, "w");
  const guest = rooms.joinRoom(host.room.code, "Bo");
  assert.equal(guest.seat, "b");

  const code = host.room.code;
  assert.equal(rooms.act(code, guest.token, "move", { from: "e2", to: "e4" }).error, "not-your-turn");
  assert.equal(rooms.act(code, host.token, "move", { from: "e2", to: "e5" }).error, "illegal-move");
  assert.equal(rooms.act(code, "not-a-token", "move", { from: "e2", to: "e4" }).error, "not-seated");
  assert.ok(rooms.act(code, host.token, "move", { from: "e2", to: "e4" }).room);

  const state = rooms.publicState(rooms.getRoom(code), guest.token);
  assert.equal(state.seat, "b");
  assert.equal(state.turn, "b");
  assert.equal(state.moves[0].san, "e4");
  assert.equal(state.moves[0].after, state.fen);
  assert.equal(state.game, "chess");

  assert.equal(rooms.act(code, host.token, "accept-draw", {}).error, "no-offer");
  rooms.act(code, host.token, "offer-draw", {});
  assert.equal(rooms.publicState(rooms.getRoom(code), guest.token).drawOffer, "w");
  rooms.act(code, guest.token, "accept-draw", {});
  const drawn = rooms.publicState(rooms.getRoom(code), guest.token);
  assert.equal(drawn.status, "draw");
  assert.equal(drawn.reason, "agreement");
  assert.equal(drawn.score.draw, 1);

  // both sides asking for another game swaps the colours
  rooms.requestRematch(code, host.token);
  rooms.requestRematch(code, guest.token);
  const again = rooms.publicState(rooms.getRoom(code), host.token);
  assert.equal(again.seat, "b", "the host takes black next game");
  assert.equal(again.status, "playing");
  assert.equal(again.moves.length, 0);

  /* tictactoe still works on the same store ------------------------------ */
  const ttt = rooms.createRoom("Ada", "tictactoe", { seat: "X" });
  const tttGuest = rooms.joinRoom(ttt.room.code, "Bo");
  [0, 3, 1, 4, 2].forEach((index, i) => {
    const who = i % 2 === 0 ? ttt.token : tttGuest.token;
    rooms.act(ttt.room.code, who, "move", { index });
  });
  const tttState = rooms.publicState(rooms.getRoom(ttt.room.code), ttt.token);
  assert.equal(tttState.status, "won");
  assert.equal(tttState.winner, "X");
  assert.deepEqual(tttState.line, [0, 1, 2]);

  console.log("chess checks pass");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
