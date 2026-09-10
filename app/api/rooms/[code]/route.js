import {
  act,
  getRoom,
  joinRoom,
  leaveRoom,
  publicState,
  requestRematch,
  startRoom,
} from "../../../../lib/rooms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ERRORS = {
  "no-room": [404, "That room has closed or never existed."],
  "no-game": [400, "That game has no rooms."],
  full: [409, "That room has no seat left."],
  "not-host": [403, "Only the player who opened the room can start it."],
  "already-started": [409, "That game has already started."],
  "too-few": [409, "Not enough players yet."],
  "not-seated": [403, "You are not seated in this room."],
  "not-playing": [409, "The game is not running."],
  "not-your-turn": [409, "It is not your turn."],
  "bad-square": [400, "That square is not on the board."],
  "bad-action": [400, "Unknown action."],
  taken: [409, "That square is taken."],
  "column-full": [409, "That column is full."],
  "off-board": [400, "That point is not on the board."],
  suicide: [409, "That move would fill your own last liberty."],
  ko: [409, "That point is closed by ko this turn."],
  "not-counting": [409, "The game is not being counted."],
  "no-group": [400, "There is no group on that point."],
  "turns-nothing": [409, "That square turns nothing over."],
  "must-continue": [409, "That piece has another jump to take."],
  empty: [400, "There is no piece on that square."],
  "nothing-to-undo": [409, "Nothing has been moved this turn."],
  "hand-over": [409, "That hand is finished."],
  "already-drawn": [409, "You have already drawn."],
  "draw-first": [409, "Draw before you throw."],
  "not-your-card": [400, "That card is not in your hand."],
  "empty-pile": [409, "There is nothing there to take."],
  "too-much-deadwood": [409, "That is too much deadwood to knock on."],
  "illegal-move": [409, "That move is not legal here."],
  "no-offer": [409, "There is no draw on the table."],
  "still-playing": [409, "The game is still running."],
};

function fail(code) {
  const [status, message] = ERRORS[code] || [400, "That request did not work."];
  return Response.json({ error: code, message }, { status });
}

// Polling replaced the event stream: a serverless function cannot hold a
// connection open for a whole game, and the watchers it pushed to lived in one
// process's memory.
//
// `since` is what keeps that cheap. A client sends the version it already has,
// and a room that has not moved answers 304 with no body — no board, no
// serialising, and nothing for the client to re-render.
export async function GET(request, { params }) {
  const { code } = await params;
  const room = await getRoom(code);
  if (!room) return fail("no-room");

  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const since = Number(url.searchParams.get("since"));

  if (Number.isFinite(since) && since > 0 && room.version <= since) {
    return new Response(null, { status: 304 });
  }

  return Response.json({ state: publicState(room, token) });
}

export async function POST(request, { params }) {
  const { code } = await params;
  const body = await request.json().catch(() => ({}));
  const { action, token } = body;

  if (action === "join") {
    const result = await joinRoom(code, body.name, token);
    if (result.error) return fail(result.error);
    return Response.json({
      token: result.token,
      seat: result.seat,
      state: publicState(result.room, result.token),
    });
  }

  if (action === "start") {
    const result = await startRoom(code, token);
    if (result.error) return fail(result.error);
    return Response.json({ state: publicState(result.room, token) });
  }

  if (action === "rematch") {
    const result = await requestRematch(code, token);
    if (result.error) return fail(result.error);
    return Response.json({ state: publicState(result.room, token) });
  }

  if (action === "leave") {
    await leaveRoom(code, token);
    return Response.json({ ok: true });
  }

  // everything else is the game's own business
  const result = await act(code, token, action, body);
  if (result.error) return fail(result.error);
  return Response.json({ state: publicState(result.room, token) });
}
