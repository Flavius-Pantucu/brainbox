// One runnable check for the parts of the games that are ours rather than a
// library's: the chess material read, the review maths, the variation tree, the
// clocks, Connect Four's rules and opponent, Go's rules and scoring, and the
// room's move rules.
//   npm run check
const assert = require("node:assert/strict");
const { Chess } = require("chess.js");

async function main() {
  const core = await import("../lib/chess-core.js");
  const tree = await import("../lib/chess-tree.js");
  const c4 = await import("../lib/connect4.js");
  const go = await import("../lib/go.js");
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
  assert.ok(
    after.clock.b <= 180000 && after.clock.b > 179000,
    "black is only charged for the time since the press"
  );

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

  /* connect four --------------------------------------------------------- */
  assert.equal(c4.LINES.length, 69, "every run of four on a 7x6 grid");

  let grid = c4.EMPTY();
  assert.equal(c4.landingRow(grid, 0), 5, "a disc falls to the bottom row");
  grid = c4.drop(grid, 0, "R").board;
  assert.equal(c4.landingRow(grid, 0), 4, "the next one stacks on it");

  let full = c4.EMPTY();
  for (let i = 0; i < 6; i += 1) full = c4.drop(full, 2, i % 2 ? "Y" : "R").board;
  assert.equal(c4.drop(full, 2, "R"), null, "a full column takes nothing");

  let won = c4.EMPTY();
  for (const col of [0, 1, 2, 3]) won = c4.drop(won, col, "R").board;
  const line = c4.outcomeOf(won);
  assert.equal(line.winner, "R");
  assert.deepEqual(line.line, [35, 36, 37, 38]);

  let vertical = c4.EMPTY();
  for (let i = 0; i < 4; i += 1) vertical = c4.drop(vertical, 6, "Y").board;
  assert.equal(c4.outcomeOf(vertical).winner, "Y", "four stacked counts too");

  // the machine blocks a three in a row, at every level
  let threat = c4.EMPTY();
  for (const col of [0, 1, 2]) threat = c4.drop(threat, col, "Y").board;
  for (const setting of c4.LEVELS) {
    assert.equal(c4.pickMove(threat, "R", setting.id), 3, `${setting.id} blocks`);
  }

  // and takes its own win rather than blocking
  let race = c4.EMPTY();
  for (const col of [1, 2, 3]) race = c4.drop(race, col, "R").board;
  for (const col of [4, 5, 6]) race = c4.drop(race, col, "Y").board;
  assert.equal(c4.pickMove(race, "R", "sharp"), 0, "0 wins outright, 3 only blocks");

  const c4host = rooms.createRoom("Ada", "connect4", { seat: "R" });
  const c4guest = rooms.joinRoom(c4host.room.code, "Bo");
  assert.equal(c4guest.seat, "Y");
  assert.equal(
    rooms.act(c4host.room.code, c4host.token, "move", { col: 9 }).error,
    "column-full",
    "a column off the grid is refused"
  );
  for (let i = 0; i < 3; i += 1) {
    rooms.act(c4host.room.code, c4host.token, "move", { col: i });
    rooms.act(c4host.room.code, c4guest.token, "move", { col: i });
  }
  rooms.act(c4host.room.code, c4host.token, "move", { col: 3 });
  const c4state = rooms.publicState(rooms.getRoom(c4host.room.code), c4guest.token);
  assert.equal(c4state.status, "won");
  assert.equal(c4state.winner, "R");
  assert.equal(c4state.score.R, 1);
  assert.equal(c4state.last, 38);

  /* go -------------------------------------------------------------------- */
  const size = 9;
  const point = (row, col) => go.pointOf(size, row, col);

  // a stone in the corner with its last liberty filled comes off
  let stones = go.emptyBoard(size);
  stones = go.play(stones, size, point(0, 0), "w").board;
  stones = go.play(stones, size, point(0, 1), "b").board;
  const taken = go.play(stones, size, point(1, 0), "b");
  assert.deepEqual(taken.captured, [point(0, 0)]);
  assert.equal(taken.board[point(0, 0)], null);

  assert.equal(go.play(taken.board, size, point(0, 0), "w").error, "suicide");
  assert.equal(go.play(taken.board, size, point(0, 1), "w").error, "taken");
  assert.equal(go.play(taken.board, size, -1, "w").error, "off-board");

  // ko: black takes one stone, white cannot take it straight back
  let shape = go.emptyBoard(size);
  for (const [r, c] of [[0, 1], [1, 0], [2, 1]]) shape[point(r, c)] = "b";
  for (const [r, c] of [[0, 2], [1, 3], [2, 2], [1, 1]]) shape[point(r, c)] = "w";
  const koTake = go.play(shape, size, point(1, 2), "b");
  assert.deepEqual(koTake.captured, [point(1, 1)], "the lone white stone comes off");
  assert.equal(koTake.ko, point(1, 1), "and that point is closed by ko");
  assert.equal(
    go.play(koTake.board, size, point(1, 1), "w", koTake.ko).error,
    "ko",
    "white cannot take it straight back"
  );
  assert.ok(!go.play(koTake.board, size, point(1, 1), "w", null).error, "but can a turn later");

  // area scoring: one stone owns an empty board, and komi decides a bare one
  const lone = go.emptyBoard(size);
  lone[point(4, 4)] = "b";
  assert.deepEqual(go.score(lone, size), { b: 81, w: 6.5, winner: "b", margin: 74.5 });
  assert.equal(go.score(go.emptyBoard(size), size).winner, "w", "komi wins an empty board");

  // a wall down the middle splits the board in two
  const wall = go.emptyBoard(size);
  for (let row = 0; row < size; row += 1) {
    wall[point(row, 4)] = "b";
    wall[point(row, 5)] = "w";
  }
  assert.deepEqual(go.score(wall, size, 6.5), { b: 45, w: 42.5, winner: "b", margin: 2.5 });

  // marking a group dead takes its stones off and opens its territory up
  const withDead = go.score(wall, size, 6.5, [point(0, 5)]);
  assert.ok(withDead.w < 42.5, "white loses the stone and the territory behind it");

  assert.equal(go.territoryOf(lone, size).owner.filter(Boolean).length, 80);
  assert.equal(go.groupAt(wall, size, point(0, 4)).stones.length, 9, "the wall is one string");
  assert.equal(go.groupAt(go.emptyBoard(size), size, 0), null);

  // a board with nowhere left worth playing is a pass
  const filled = go.emptyBoard(size).map(() => "b");
  assert.equal(go.pickMove(filled, size, "w", "easy"), null);

  /* a whole go room, from the first stone to the count ---------------------- */
  const bigger = rooms.createRoom("Ada", "go", { seat: "b", size: 13 });
  assert.equal(rooms.publicState(bigger.room, bigger.token).board.length, 169, "13x13 asked for");
  assert.equal(
    rooms.publicState(rooms.createRoom("Ada", "go", { size: 4 }).room, null).size,
    9,
    "a size nobody plays falls back to 9x9"
  );

  const goHost = rooms.createRoom("Ada", "go", { seat: "b", size: 9 });
  const goGuest = rooms.joinRoom(goHost.room.code, "Bo");
  assert.equal(goGuest.seat, "w");

  const goCode = goHost.room.code;
  assert.equal(rooms.act(goCode, goGuest.token, "move", { point: 0 }).error, "not-your-turn");
  rooms.act(goCode, goHost.token, "move", { point: point(4, 4) });
  assert.equal(rooms.act(goCode, goGuest.token, "move", { point: point(4, 4) }).error, "taken");
  rooms.act(goCode, goGuest.token, "move", { point: point(0, 0) });

  assert.equal(
    rooms.act(goCode, goHost.token, "accept", {}).error,
    "not-counting",
    "there is nothing to agree on until both have passed"
  );

  rooms.act(goCode, goHost.token, "pass", {});
  rooms.act(goCode, goGuest.token, "pass", {});
  let goState = rooms.publicState(rooms.getRoom(goCode), goHost.token);
  assert.equal(goState.status, "scoring", "two passes start the count");

  rooms.act(goCode, goHost.token, "mark", { point: point(0, 0) });
  goState = rooms.publicState(rooms.getRoom(goCode), goHost.token);
  assert.deepEqual(goState.dead, [point(0, 0)], "white's corner stone is marked dead");

  rooms.act(goCode, goHost.token, "accept", {});
  rooms.act(goCode, goGuest.token, "mark", { point: point(0, 0) });
  goState = rooms.publicState(rooms.getRoom(goCode), goHost.token);
  assert.deepEqual(goState.dead, [], "marking the same group again brings it back");
  assert.deepEqual(goState.accepted, { b: false, w: false }, "a new mark needs new agreement");

  rooms.act(goCode, goGuest.token, "mark", { point: point(0, 0) });
  rooms.act(goCode, goHost.token, "accept", {});
  rooms.act(goCode, goGuest.token, "accept", {});
  goState = rooms.publicState(rooms.getRoom(goCode), goHost.token);
  assert.equal(goState.status, "won");
  assert.equal(goState.winner, "b", "black holds the whole board");
  assert.equal(goState.result.b, 81, "one stone plus everything it surrounds");
  assert.equal(goState.score.b, 1);

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

  console.log("game checks pass");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
