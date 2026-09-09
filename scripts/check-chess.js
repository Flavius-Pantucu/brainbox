// One runnable check for the parts of chess that are ours rather than the
// engine's: the material read, the review maths, and the room's move rules.
//   node scripts/check-chess.js
const assert = require("node:assert/strict");
const { Chess } = require("chess.js");

async function main() {
  const core = await import("../lib/chess-core.js");
  const tree = await import("../lib/chess-tree.js");
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

  /* clocks --------------------------------------------------------------- */
  assert.equal(core.formatClock(180000), "3:00");
  assert.equal(core.formatClock(9400), "9.4", "tenths under ten seconds");
  assert.equal(core.formatClock(-50), "0.0", "a flagged clock never reads negative");
  assert.equal(core.timeControl("3+2").increment, 2000);
  assert.equal(core.timeControl("nonsense").initial, null, "an unknown control is no clock");

  /* the variation tree --------------------------------------------------- */
  const walk = new Chess();
  const e4 = walk.move("e4");
  const e5 = walk.move("e5");
  walk.undo();
  const c5 = walk.move("c5"); // a sideline against the same position

  let t = tree.newTree(e4.before);
  const first = tree.addMove(t, t.root, e4);
  t = first.tree;
  const main = tree.addMove(t, first.id, e5);
  t = main.tree;
  const side = tree.addMove(t, first.id, c5);
  t = side.tree;

  assert.equal(t.nodes[first.id].children.length, 2, "one move, two replies");
  assert.equal(t.nodes[first.id].children[0], main.id, "the first reply is the main line");
  assert.equal(tree.addMove(t, first.id, e5).id, main.id, "a repeated move walks in, not twice");
  assert.deepEqual(
    tree.lineTo(t, side.id).map((node) => node.move.san),
    ["e4", "c5"]
  );
  assert.equal(tree.depthOf(t, side.id), 1);
  assert.equal(tree.depthOf(t, main.id), 0);

  const promoted = tree.promoteNode(t, side.id);
  assert.equal(promoted.nodes[first.id].children[0], side.id, "the sideline becomes the line");
  assert.deepEqual(
    tree.mainLineFrom(promoted, promoted.root).map((node) => node.move.san),
    ["e4", "c5"]
  );

  const cut = tree.removeNode(t, side.id);
  assert.equal(cut.id, first.id, "cutting a line leaves you on its parent");
  assert.equal(cut.tree.nodes[side.id], undefined);
  assert.equal(cut.tree.nodes[first.id].children.length, 1);

  const straight = tree.treeFromMoves([e4, e5], e4.before);
  assert.deepEqual(
    tree.mainLineFrom(straight.tree, straight.tree.root).map((node) => node.move.san),
    ["e4", "e5"]
  );
  assert.equal(straight.tree.nodes[straight.tip].move.san, "e5");

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

  /* the room owns the clock ---------------------------------------------- */
  const timed = rooms.createRoom("Ada", "chess", { seat: "w", time: "3+2" });
  const timedGuest = rooms.joinRoom(timed.room.code, "Bo");
  const before = rooms.publicState(rooms.getRoom(timed.room.code), timed.token);
  assert.equal(before.clock.initial, 180000);
  assert.equal(before.clock.running, "w", "white's clock runs from the start");
  assert.ok(before.clock.w <= 180000 && before.clock.w > 179000);

  rooms.act(timed.room.code, timed.token, "move", { from: "e2", to: "e4" });
  const after = rooms.publicState(rooms.getRoom(timed.room.code), timed.token);
  assert.equal(after.clock.running, "b", "the press passes with the move");
  assert.ok(after.clock.w > 180000, "the increment is added on");
  assert.equal(after.clock.b, 180000, "black has not been charged yet");

  // a move that arrives after the flag has fallen does not land
  const flagged = rooms.getRoom(timed.room.code);
  flagged.data.clock.left.b = 0;
  flagged.data.clock.since = Date.now() - 10;
  rooms.act(timed.room.code, timedGuest.token, "move", { from: "e7", to: "e5" });
  const out = rooms.publicState(flagged, timedGuest.token);
  assert.equal(out.status, "won");
  assert.equal(out.winner, "w");
  assert.equal(out.reason, "time");
  assert.equal(out.moves.length, 1, "the late move never reached the board");

  // a fresh game keeps the same control
  rooms.requestRematch(timed.room.code, timed.token);
  rooms.requestRematch(timed.room.code, timedGuest.token);
  const rematched = rooms.publicState(rooms.getRoom(timed.room.code), timed.token);
  assert.equal(rematched.clock.control, "3+2");
  assert.equal(rematched.clock.b, 180000);

  const untimed = rooms.createRoom("Ada", "chess", { seat: "w" });
  rooms.joinRoom(untimed.room.code, "Bo");
  assert.equal(rooms.publicState(rooms.getRoom(untimed.room.code), untimed.token).clock, null);

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
