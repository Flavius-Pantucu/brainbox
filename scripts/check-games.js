// One runnable check for the parts of the games that are ours rather than a
// library's: the chess material read, the review maths, the variation tree, the
// clocks, Connect Four's rules and opponent, Go's rules and scoring, Reversi's
// turning and passing, draughts' compulsory captures and chains, minesweeper's
// safe first click, backgammon's dice rules, the room's move rules, and a pass over
// the rules an implementation usually gets wrong.
//   npm run check
const assert = require("node:assert/strict");
const { Chess } = require("chess.js");

async function main() {
  const core = await import("../lib/chess-core.js");
  const tree = await import("../lib/chess-tree.js");
  const c4 = await import("../lib/connect4.js");
  const go = await import("../lib/go.js");
  const rev = await import("../lib/reversi.js");
  const chk = await import("../lib/checkers.js");
  const ms = await import("../lib/minesweeper.js");
  const bg = await import("../lib/backgammon.js");
  const daily = await import("../lib/daily.js");
  const games = await import("../lib/games.js");
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

  /* reversi --------------------------------------------------------------- */
  const opening = rev.start();
  assert.deepEqual(rev.counts(opening), { b: 2, w: 2 });
  assert.deepEqual(
    [...rev.legalMoves(opening, "b").keys()].sort((a, b) => a - b),
    [rev.index(2, 3), rev.index(3, 2), rev.index(4, 5), rev.index(5, 4)],
    "the four opening moves"
  );

  const opened = rev.play(opening, rev.index(2, 3), "b");
  assert.deepEqual(opened.flipped, [rev.index(3, 3)], "one disc turns");
  assert.deepEqual(rev.counts(opened.board), { b: 4, w: 1 });
  assert.equal(rev.play(opening, rev.index(0, 0), "b").error, "turns-nothing");
  assert.equal(rev.play(opening, rev.index(3, 3), "b").error, "taken");
  assert.equal(rev.play(opening, 99, "b").error, "off-board");

  // a run only turns when your own disc closes it
  const openEnded = new Array(64).fill(null);
  openEnded[rev.index(4, 4)] = "w";
  assert.deepEqual(rev.flipsFor(openEnded, rev.index(4, 3), "b"), [], "nothing closes the run");

  // the turn comes back to you when the other side has nowhere to go: the board
  // is black but for two white discs walled in at the top, and one empty square
  const stuck = new Array(64).fill("b");
  stuck[rev.index(0, 1)] = "w";
  stuck[rev.index(0, 2)] = "w";
  stuck[rev.index(0, 3)] = null;
  assert.equal(rev.legalMoves(stuck, "w").size, 0, "white has nowhere to play");
  assert.equal(rev.legalMoves(stuck, "b").size, 1, "black can still close the run");
  assert.equal(rev.turnAfter(stuck, "b"), "b", "so the turn comes straight back");
  assert.equal(rev.outcomeOf(stuck), null, "and the game is not over while black can move");

  const finished = new Array(64).fill("b");
  finished[0] = "w";
  const decided = rev.outcomeOf(finished);
  assert.equal(decided.winner, "b");
  assert.equal(decided.counts.b, 63);

  const level = new Array(64).fill("b");
  for (let i = 0; i < 32; i += 1) level[i] = "w";
  assert.equal(rev.outcomeOf(level).winner, "draw");

  // the machine takes a corner when one is going
  const corner = rev.start();
  let stage = corner;
  for (const [point, disc] of [
    [rev.index(0, 1), "w"],
    [rev.index(0, 2), "b"],
  ]) {
    stage = stage.slice();
    stage[point] = disc;
  }
  assert.equal(
    rev.pickMove(stage, "b", "sharp"),
    rev.index(0, 0),
    "a corner beats every other square"
  );

  // a whole game, played out by the machine, ends
  let selfPlay = rev.start();
  let turn = "b";
  let plies = 0;
  while (turn && plies < 80) {
    const point = rev.pickMove(selfPlay, turn, "easy");
    if (point == null) break;
    selfPlay = rev.play(selfPlay, point, turn).board;
    turn = rev.turnAfter(selfPlay, turn);
    plies += 1;
  }
  assert.equal(turn, null, "a played-out game reaches a position nobody can move in");
  assert.ok(rev.outcomeOf(selfPlay), "and that position has a result");

  /* a reversi room ------------------------------------------------------- */
  const revHost = rooms.createRoom("Ada", "reversi", { seat: "b" });
  const revGuest = rooms.joinRoom(revHost.room.code, "Bo");
  const revCode = revHost.room.code;
  assert.equal(revGuest.seat, "w");
  assert.equal(
    rooms.act(revCode, revGuest.token, "move", { point: rev.index(2, 3) }).error,
    "not-your-turn"
  );
  assert.equal(
    rooms.act(revCode, revHost.token, "move", { point: 0 }).error,
    "turns-nothing",
    "the server refuses a move that turns nothing"
  );
  rooms.act(revCode, revHost.token, "move", { point: rev.index(2, 3) });
  const revState = rooms.publicState(rooms.getRoom(revCode), revGuest.token);
  assert.equal(revState.turn, "w");
  assert.deepEqual(revState.counts, { b: 4, w: 1 });
  assert.deepEqual(revState.flipped, [rev.index(3, 3)]);
  assert.ok(revState.moves.length > 0, "white is told where it may play");

  /* checkers -------------------------------------------------------------- */
  const men = chk.start();
  assert.deepEqual(chk.counts(men), { b: 12, r: 12, bKings: 0, rKings: 0 });
  assert.equal(chk.stepsFor(men, "b").length, 7, "seven opening moves each");
  assert.equal(chk.stepsFor(men, "r").length, 7);
  assert.ok(
    chk.stepsFor(men, "b").every((step) => step.captured === null),
    "and none of them takes anything"
  );

  // a capture anywhere makes every quiet move illegal
  const forced = new Array(64).fill(null);
  forced[chk.index(3, 2)] = "b";
  forced[chk.index(4, 3)] = "r";
  forced[chk.index(0, 1)] = "b"; // has quiet moves, and may not use them
  const only = chk.stepsFor(forced, "b");
  assert.equal(only.length, 1, "the jump is the only move on the board");
  assert.equal(only[0].captured, chk.index(4, 3));
  assert.equal(
    chk.applyStep(forced, chk.index(0, 1), chk.index(1, 0)).error,
    "illegal-move",
    "the quiet move is refused while a capture is going"
  );

  // a jump that can continue must continue, and only that piece may move
  const chain = new Array(64).fill(null);
  chain[chk.index(1, 2)] = "b";
  chain[chk.index(2, 3)] = "r";
  chain[chk.index(4, 5)] = "r";
  const hop1 = chk.applyStep(chain, chk.index(1, 2), chk.index(3, 4));
  assert.equal(hop1.captured, chk.index(2, 3));
  assert.equal(hop1.mustContinue, true, "another jump is on");
  const hop2 = chk.applyStep(hop1.board, chk.index(3, 4), chk.index(5, 6), chk.index(3, 4));
  assert.equal(hop2.captured, chk.index(4, 5));
  assert.equal(hop2.mustContinue, false, "and the chain is done");
  assert.equal(chk.counts(hop2.board).r, 0, "both men came off");

  // a man crowned by a jump stops there, whatever else was available
  const crowning = new Array(64).fill(null);
  crowning[chk.index(5, 2)] = "b";
  crowning[chk.index(6, 3)] = "r";
  crowning[chk.index(6, 5)] = "r";
  const crowned = chk.applyStep(crowning, chk.index(5, 2), chk.index(7, 4));
  assert.equal(crowned.crowned, true);
  assert.equal(crowned.board[chk.index(7, 4)], "B", "and it is a king now");
  assert.equal(crowned.mustContinue, false, "crowning ends the move");

  // men only go forward; kings go both ways
  const backwards = new Array(64).fill(null);
  backwards[chk.index(4, 3)] = "b";
  assert.ok(
    chk.stepsFor(backwards, "b").every((step) => step.to > chk.index(4, 3)),
    "a black man only moves down the board"
  );
  backwards[chk.index(4, 3)] = "B";
  assert.equal(chk.stepsFor(backwards, "b").length, 4, "a king moves all four ways");

  // nothing left to move is a loss
  const beaten = new Array(64).fill(null);
  beaten[chk.index(0, 1)] = "b";
  assert.deepEqual(chk.outcomeOf(beaten, "r"), { winner: "b", reason: "no move" });
  assert.equal(chk.outcomeOf(beaten, "b"), null);

  // whole moves carry the chain, so the machine plays one and takes both
  const whole = chk.fullMoves(chain, "b");
  assert.equal(whole.length, 1);
  assert.deepEqual(whole[0].path, [chk.index(1, 2), chk.index(3, 4), chk.index(5, 6)]);

  // and it takes a free capture rather than a quiet move
  assert.equal(chk.pickMove(forced, "b", "sharp").to, chk.index(5, 4));

  // mid-chain it takes the branch that eats the most, and nothing when the
  // piece has no jump left
  assert.equal(
    chk.bestChainStep(hop1.board, "b", chk.index(3, 4)).to,
    chk.index(5, 6),
    "the chain carries on"
  );
  assert.equal(chk.bestChainStep(chk.start(), "b", chk.index(2, 1)), null);

  /* a checkers room ------------------------------------------------------- */
  const chkHost = rooms.createRoom("Ada", "checkers", { seat: "b" });
  const chkGuest = rooms.joinRoom(chkHost.room.code, "Bo");
  const chkCode = chkHost.room.code;
  assert.equal(chkGuest.seat, "r");
  assert.equal(
    rooms.act(chkCode, chkGuest.token, "move", { from: chk.index(5, 0), to: chk.index(4, 1) })
      .error,
    "not-your-turn"
  );
  assert.equal(
    rooms.act(chkCode, chkHost.token, "move", { from: chk.index(2, 1), to: chk.index(4, 3) })
      .error,
    "illegal-move",
    "a man cannot jump an empty square"
  );
  rooms.act(chkCode, chkHost.token, "move", { from: chk.index(2, 1), to: chk.index(3, 0) });
  const chkState = rooms.publicState(rooms.getRoom(chkCode), chkGuest.token);
  assert.equal(chkState.turn, "r");
  assert.deepEqual(chkState.path, [chk.index(2, 1), chk.index(3, 0)]);
  assert.equal(chkState.steps.length, 7, "red is told its seven replies");
  assert.equal(chkState.counts.b, 12);

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

  /* minesweeper ----------------------------------------------------------- */
  const beginner = ms.levelOf("beginner");
  assert.equal(beginner.cols * beginner.rows, 81);
  assert.equal(ms.levelOf("nonsense").id, "beginner", "an unknown field falls back");
  assert.equal(ms.neighboursOf(9, 9, 0).length, 3, "a corner touches three squares");
  assert.equal(ms.neighboursOf(9, 9, 40).length, 8, "the middle touches eight");

  // the first click, and everything around it, is never a mine
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const safe = Math.floor(Math.random() * 81);
    const field = ms.plant(9, 9, 10, safe);
    assert.equal(field.mines.filter(Boolean).length, 10, "ten mines, every time");
    assert.equal(field.mines[safe], false, "the click is safe");
    for (const around of ms.neighboursOf(9, 9, safe)) {
      assert.equal(field.mines[around], false, "and so is everything it touches");
    }
    // so the first click always opens more than one square
    const opened = ms.openFrom(field, new Array(81).fill(false), new Array(81).fill(false), safe);
    assert.ok(opened.filter(Boolean).length > 1, "the first click opens a space");
  }

  // the counts are the mines around each square
  const counted = ms.plant(9, 9, 10, 40);
  for (let point = 0; point < 81; point += 1) {
    if (counted.mines[point]) continue;
    const around = ms.neighboursOf(9, 9, point).filter((n) => counted.mines[n]).length;
    assert.equal(counted.near[point], around);
  }

  // a board too crowded for a whole safe patch keeps the click itself safe
  const crowded = ms.plant(3, 3, 8, 4);
  assert.equal(crowded.mines.filter(Boolean).length, 8);
  assert.equal(crowded.mines[4], false);

  // a hand-laid field: one mine, everything else open by one click
  const hand = { cols: 3, rows: 3, count: 1, mines: new Array(9).fill(false), near: new Array(9).fill(0) };
  hand.mines[0] = true;
  hand.near = hand.mines.map((mine, point) =>
    mine ? 0 : ms.neighboursOf(3, 3, point).filter((n) => hand.mines[n]).length
  );
  const shut = new Array(9).fill(false);
  const noFlags = new Array(9).fill(false);
  const swept = ms.openFrom(hand, shut, noFlags, 8);
  assert.equal(swept.filter(Boolean).length, 8, "one press clears everything but the mine");
  assert.equal(ms.isWon(hand, swept), true);
  assert.equal(ms.isWon(hand, shut), false);

  // a flag stops the flood, and counts against the mines left
  const guarded = new Array(9).fill(false);
  guarded[1] = true;
  const blocked = ms.openFrom(hand, shut, guarded, 8);
  assert.equal(blocked[1], false, "the flood goes around a flag");
  assert.equal(ms.minesLeft(hand, guarded), 0);
  assert.equal(ms.minesLeft(hand, noFlags), 1);

  // chording opens the rest only once the flags match the number
  const chordField = ms.plant(9, 9, 10, 40);
  const marked = new Array(81).fill(false);
  let numbered = -1;
  for (let point = 0; point < 81; point += 1) {
    if (!chordField.mines[point] && chordField.near[point] === 1) {
      numbered = point;
      break;
    }
  }
  assert.ok(numbered >= 0, "some square touches exactly one mine");
  const touching = ms.neighboursOf(9, 9, numbered);
  const oneOpen = new Array(81).fill(false);
  oneOpen[numbered] = true;
  assert.equal(
    ms.chordAt(chordField, oneOpen, marked, numbered).revealed,
    oneOpen,
    "nothing happens while the flags do not match"
  );
  marked[touching.find((cell) => chordField.mines[cell])] = true;
  const chorded = ms.chordAt(chordField, oneOpen, marked, numbered);
  assert.ok(chorded.revealed.filter(Boolean).length > 1, "and everything else opens once they do");
  assert.equal(chorded.hit, false, "with the mine flagged, nothing blows up");

  {
    /* backgammon ------------------------------------------------------------ */
    const race0 = bg.start();
    assert.equal(bg.pipCount(race0, "w"), 167, "the opening is a hundred and sixty-seven pips");
    assert.equal(bg.pipCount(race0, "b"), 167);
    assert.equal(
      race0.board.filter((n) => n > 0).reduce((a, b) => a + b, 0),
      15,
      "fifteen checkers a side"
    );

    const blank = () => ({ board: new Array(24).fill(0), bar: { w: 0, b: 0 }, off: { w: 0, b: 0 } });

    // doubles are played four times over
    assert.equal(bg.turnOptions(race0, "w", [6, 6, 6, 6])[0].length, 4);

    // a checker on the bar comes in before anything else moves
    const barred = blank();
    barred.board[10] = 2;
    barred.bar.w = 1;
    const fromBar = bg.nextPlays(bg.turnOptions(barred, "w", [3, 4]));
    assert.ok(fromBar.length > 0 && fromBar.every((play) => play.from === "bar"), "the bar comes first");
    assert.deepEqual(fromBar.map((play) => play.to).sort((a, b) => a - b), [20, 21]);

    // and stays there while both entry points are shut
    const shutOut = blank();
    shutOut.board[21] = -2;
    shutOut.board[20] = -2;
    shutOut.bar.w = 1;
    assert.equal(bg.turnOptions(shutOut, "w", [3, 4]).length, 0, "no way in is no move at all");

    // when only one die can be played it has to be the higher one
    const onlyOne = blank();
    onlyOne.board[10] = 1;
    onlyOne.board[9] = -2; // the 1 is shut
    onlyOne.board[7] = -2;
    onlyOne.board[6] = -2;
    const onlyHigh = bg.turnOptions(onlyOne, "w", [1, 5]);
    assert.equal(onlyHigh.length, 1);
    assert.equal(onlyHigh[0][0].die, 5, "the five, not the one");

    // bearing off: an exact roll always, a bigger one only from the furthest point
    const bearing = blank();
    bearing.board[3] = 1;
    bearing.board[1] = 1;
    assert.deepEqual(
      bg.playsWithDie(bearing, "w", 4).map((play) => `${play.from}>${play.to}`),
      ["3>off"],
      "four bears off the four-point exactly"
    );
    assert.deepEqual(
      bg.playsWithDie(bearing, "w", 6).map((play) => `${play.from}>${play.to}`),
      ["3>off"],
      "and six only takes the furthest checker"
    );
    const alone = blank();
    alone.board[1] = 1;
    assert.deepEqual(bg.playsWithDie(alone, "w", 6).map((play) => play.to), ["off"]);

    // a lone checker gets sent back
    const lone = blank();
    lone.board[10] = 1;
    lone.board[7] = -1;
    const hit = bg.playsWithDie(lone, "w", 3)[0];
    assert.equal(hit.hit, true);
    const afterHit = bg.applyPlay(lone, "w", hit);
    assert.equal(afterHit.bar.b, 1, "onto the bar");
    assert.equal(afterHit.board[7], 1, "and the point is white's");

    // what a win is worth
    const plain = blank();
    plain.off.w = 15;
    plain.off.b = 2;
    plain.board[20] = -1;
    assert.deepEqual(bg.isOver(plain), { winner: "w", value: 1, reason: "the game" });

    const gammon = blank();
    gammon.off.w = 15;
    gammon.board[20] = -3;
    assert.equal(bg.isOver(gammon).value, 2, "nothing borne off is a gammon");

    const deep = blank();
    deep.off.w = 15;
    deep.board[2] = -3;
    assert.equal(bg.isOver(deep).value, 3, "still in the winner's home is a backgammon");

    assert.equal(bg.isOver(race0), null);

    // the opening three-one makes the five point, which is the book move
    const book = bg.pickSequence(race0, "w", [3, 1], "sharp");
    assert.deepEqual(
      book.map((play) => `${play.from}/${play.to}`).sort(),
      ["5/4", "7/4"],
      "8/5 6/5 in this board's numbering"
    );

    // a whole game finishes
    let race = bg.start();
    let side = "w";
    let turns = 0;
    while (!bg.isOver(race) && turns < 500) {
      const path = bg.pickSequence(race, side, bg.roll(), "fair");
      if (path) for (const play of path) race = bg.applyPlay(race, side, play);
      side = bg.other(side);
      turns += 1;
    }
    const raced = bg.isOver(race);
    assert.ok(raced, "somebody bears off");
    assert.equal(race.off[raced.winner], 15);

    /* a backgammon room, where the dice are the server's --------------------- */
    const bgHost = rooms.createRoom("Ada", "backgammon", { seat: "w" });
    const bgGuest = rooms.joinRoom(bgHost.room.code, "Bo");
    const bgCode = bgHost.room.code;
    let bgState = rooms.publicState(rooms.getRoom(bgCode), bgHost.token);
    assert.ok(bgState.dice.length >= 2, "the first roll is down as soon as both seats are filled");
    assert.ok(bgState.plays.length > 0, "and the mover is told what it may do");

    const onRoll = bgState.turn === "w" ? bgHost.token : bgGuest.token;
    const waiting = bgState.turn === "w" ? bgGuest.token : bgHost.token;
    assert.equal(
      rooms.act(bgCode, waiting, "move", bgState.plays[0]).error,
      "not-your-turn",
      "the other side cannot move the dice it did not roll"
    );
    assert.equal(rooms.act(bgCode, onRoll, "move", { from: 99, to: 98 }).error, "illegal-move");
    assert.equal(rooms.act(bgCode, onRoll, "undo", {}).error, "nothing-to-undo");

    const firstPlay = bgState.plays[0];
    rooms.act(bgCode, onRoll, "move", { from: firstPlay.from, to: firstPlay.to });
    bgState = rooms.publicState(rooms.getRoom(bgCode), bgHost.token);
    assert.equal(bgState.played.length, 1);
    assert.equal(bgState.used.filter(Boolean).length, 1, "one die spent");

    rooms.act(bgCode, onRoll, "undo", {});
    bgState = rooms.publicState(rooms.getRoom(bgCode), bgHost.token);
    assert.equal(bgState.played.length, 0, "and a turn can be taken back to where it started");
    assert.equal(bgState.used.filter(Boolean).length, 0);
  }

  /* the rules an implementation usually gets wrong ------------------------ */
  {
    const S = 9;
    const at = (row, col) => go.pointOf(S, row, col);

    // filling your own last liberty is suicide — unless the same stone takes
    // something, which is checked first
    const snap = go.emptyBoard(S);
    snap[at(0, 0)] = "w";
    snap[at(0, 1)] = "b";
    snap[at(1, 1)] = "b";
    snap[at(2, 0)] = "b";
    const takes = go.play(snap, S, at(1, 0), "b");
    assert.equal(takes.error, undefined, "it captures, so it is not suicide");
    assert.deepEqual(takes.captured, [at(0, 0)]);

    // a whole string comes off at once, and taking more than one stone can
    // never be a ko
    const pair = go.emptyBoard(S);
    pair[at(0, 0)] = "w";
    pair[at(0, 1)] = "w";
    pair[at(1, 0)] = "b";
    pair[at(1, 1)] = "b";
    const both = go.play(pair, S, at(0, 2), "b");
    assert.deepEqual(both.captured.sort((a, b) => a - b), [at(0, 0), at(0, 1)]);
    assert.equal(both.ko, null, "two stones off is never a ko");

    // and the ko point reopens the moment anybody plays elsewhere
    const koShape = go.emptyBoard(S);
    for (const [r, c] of [[0, 1], [1, 0], [2, 1]]) koShape[at(r, c)] = "b";
    for (const [r, c] of [[0, 2], [1, 3], [2, 2], [1, 1]]) koShape[at(r, c)] = "w";
    const took = go.play(koShape, S, at(1, 2), "b");
    assert.equal(go.play(took.board, S, at(6, 6), "w", took.ko).ko, null, "a plain move clears it");

    // an empty point touching both colours belongs to neither
    const dame = go.emptyBoard(S);
    for (let row = 0; row < S; row += 1) {
      dame[at(row, 3)] = "b";
      dame[at(row, 5)] = "w";
    }
    const { owner } = go.territoryOf(dame, S);
    for (let row = 0; row < S; row += 1) {
      assert.equal(owner[at(row, 4)], null, "the column between two walls is neutral");
    }

    // nobody fills a one-point eye: its owner will not, and the other side
    // cannot, because playing there is suicide
    const eye = go.emptyBoard(S);
    eye[at(0, 1)] = "b";
    eye[at(1, 0)] = "b";
    eye[at(1, 1)] = "b";
    assert.ok(!go.legalMoves(eye, S, "b").includes(at(0, 0)), "black leaves its own eye alone");
    assert.equal(go.play(eye, S, at(0, 0), "w").error, "suicide");

    // one live enemy stone gives a region a second border, so the whole of it
    // counts as neutral. Marking that stone dead is what hands the region over,
    // and it is worth far more than the stone.
    const invaded = go.emptyBoard(S);
    for (let row = 0; row < S; row += 1) {
      invaded[at(row, 4)] = "b";
      invaded[at(row, 5)] = "w";
    }
    invaded[at(0, 0)] = "w";
    const standing = go.score(invaded, S, 0);
    const marked = go.score(invaded, S, 0, [at(0, 0)]);
    assert.equal(standing.b, 9, "black scores its wall and nothing else");
    assert.equal(marked.b, 45, "and the whole region once the stone is dead");
    assert.equal(marked.w, standing.w - 1, "white loses only the stone itself");

    /* backgammon ---------------------------------------------------------- */
    const bare = () => ({
      board: new Array(24).fill(0),
      bar: { w: 0, b: 0 },
      off: { w: 0, b: 0 },
    });

    // both dice have to be played when just one order of them works: here the
    // three is shut, so the four must go first or the turn dies half-played
    const order = bare();
    order.board[12] = 1;
    order.board[9] = -2;
    const forcedOrder = bg.turnOptions(order, "w", [3, 4]);
    assert.equal(forcedOrder[0].length, 2, "both dice get played");
    assert.equal(forcedOrder[0][0].die, 4, "and the four has to go first");

    // nothing bears off while a checker is still sitting on the bar
    const barredOff = bare();
    barredOff.board[3] = 1;
    barredOff.bar.w = 1;
    assert.ok(
      bg.playsWithDie(barredOff, "w", 4).every((play) => play.to !== "off"),
      "the bar comes first, always"
    );

    // coming in off the bar can send a blot back
    const entering = bare();
    entering.bar.w = 1;
    entering.board[21] = -1;
    const entry = bg.playsWithDie(entering, "w", 3);
    assert.equal(entry.length, 1);
    assert.equal(entry[0].hit, true);
    const entered = bg.applyPlay(entering, "w", entry[0]);
    assert.equal(entered.bar.b, 1, "and the blot goes to the bar");
    assert.equal(entered.board[21], 1);

    // what the win is worth: one off is a plain game, none off is a gammon,
    // and stranded in the winner's home or on the bar is a backgammon
    const plain = bare();
    plain.off.w = 15;
    plain.off.b = 1;
    assert.equal(bg.isOver(plain).value, 1);
    const gammon = bare();
    gammon.off.w = 15;
    gammon.board[12] = -1;
    assert.equal(bg.isOver(gammon).value, 2);
    const backgammon = bare();
    backgammon.off.w = 15;
    backgammon.board[2] = -1;
    assert.equal(bg.isOver(backgammon).value, 3, "still in white's home");
    const onTheBar = bare();
    onTheBar.off.w = 15;
    onTheBar.bar.b = 1;
    assert.equal(bg.isOver(onTheBar).value, 3, "and so is the bar");

    // doubles bring in four checkers off the bar
    const flooded = bare();
    flooded.bar.w = 4;
    const allFour = bg.turnOptions(flooded, "w", [2, 2, 2, 2]);
    assert.equal(allFour[0].length, 4);
    assert.ok(allFour[0].every((play) => play.from === "bar"));

    /* checkers ------------------------------------------------------------ */

    // offered a single take and a double, the whole move is the double
    const branching = new Array(64).fill(null);
    branching[chk.index(1, 2)] = "b";
    branching[chk.index(2, 3)] = "r";
    branching[chk.index(4, 5)] = "r";
    branching[chk.index(2, 1)] = "r";
    assert.equal(
      Math.max(...chk.fullMoves(branching, "b").map((move) => move.path.length)),
      3,
      "the two-jump chain is found"
    );

    // a king carries a chain backwards
    const royal = new Array(64).fill(null);
    royal[chk.index(3, 2)] = "B";
    royal[chk.index(4, 3)] = "r";
    royal[chk.index(4, 5)] = "r";
    const down = chk.applyStep(royal, chk.index(3, 2), chk.index(5, 4));
    assert.equal(down.mustContinue, true);
    const backUp = chk.applyStep(down.board, chk.index(5, 4), chk.index(3, 6), chk.index(5, 4));
    assert.equal(backUp.captured, chk.index(4, 5), "and takes the second going the other way");

    // a king that leaves the crown row is still a king
    const stepping = new Array(64).fill(null);
    stepping[chk.index(7, 4)] = "B";
    assert.equal(
      chk.applyStep(stepping, chk.index(7, 4), chk.index(6, 3)).board[chk.index(6, 3)],
      "B"
    );

    // pieces on the board are not the same as a move on the board
    const boxed = new Array(64).fill(null);
    boxed[chk.index(0, 1)] = "r";
    boxed[chk.index(1, 0)] = "b";
    boxed[chk.index(1, 2)] = "b";
    assert.equal(chk.stepsFor(boxed, "r").length, 0, "red is boxed in");
    assert.deepEqual(chk.outcomeOf(boxed, "r"), { winner: "b", reason: "no move" });

    /* reversi ------------------------------------------------------------- */

    // one disc can turn a run in every direction at once
    const star = new Array(64).fill(null);
    for (const [dr, dc] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]) {
      star[rev.index(4 + dr, 4 + dc)] = "w";
      star[rev.index(4 + dr * 2, 4 + dc * 2)] = "b";
    }
    assert.equal(rev.flipsFor(star, rev.index(4, 4), "b").length, 8, "all eight runs turn");

    // a gap breaks a run, however it ends
    const gapped = new Array(64).fill(null);
    gapped[rev.index(4, 5)] = "w";
    gapped[rev.index(4, 7)] = "b";
    assert.deepEqual(rev.flipsFor(gapped, rev.index(4, 4), "b"), [], "the empty square breaks it");

    // a side with no move is passed over, and the turn comes straight back
    const noReply = new Array(64).fill("b");
    noReply[rev.index(0, 0)] = null;
    noReply[rev.index(0, 1)] = "w";
    assert.equal(rev.legalMoves(noReply, "w").size, 0, "white has nothing");
    assert.equal(rev.turnAfter(noReply, "b"), "b", "so black goes again");
    assert.equal(rev.outcomeOf(noReply), null, "and the game is still on");

    // but when neither can move it is over, however empty the board is
    const stuck = new Array(64).fill(null);
    stuck[rev.index(0, 0)] = "b";
    assert.equal(rev.outcomeOf(stuck).winner, "b", "one disc and nowhere to play");
  }

  /* every game the catalog lists can be today's --------------------------- */
  for (let day = 0; day < 40; day += 1) {
    const date = new Date(2026, 0, 1 + day);
    const challenge = daily.dailyChallenge(date);
    assert.ok(challenge.task, `${challenge.game.id} has a challenge on day ${day}`);
    assert.ok(games.GAME_BY_ID[challenge.game.id], "and it names a game the catalog holds");
  }

  console.log("game checks pass");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
