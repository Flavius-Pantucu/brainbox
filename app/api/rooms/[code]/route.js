import {
  getRoom,
  joinRoom,
  leaveRoom,
  playMove,
  publicState,
  requestRematch,
} from "../../../../lib/rooms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ERRORS = {
  "no-room": [404, "That room has closed or never existed."],
  full: [409, "That room already has two players."],
  "not-seated": [403, "You are not seated in this room."],
  "not-playing": [409, "The game is not running."],
  "not-your-turn": [409, "It is not your turn."],
  "bad-square": [400, "That square is not on the board."],
  taken: [409, "That square is taken."],
  "still-playing": [409, "The game is still running."],
};

function fail(code) {
  const [status, message] = ERRORS[code] || [400, "That request did not work."];
  return Response.json({ error: code, message }, { status });
}

export async function GET(request, { params }) {
  const { code } = await params;
  const room = getRoom(code);
  if (!room) return fail("no-room");
  const token = new URL(request.url).searchParams.get("token");
  return Response.json({ state: publicState(room, token) });
}

export async function POST(request, { params }) {
  const { code } = await params;
  const body = await request.json().catch(() => ({}));
  const { action, token } = body;

  if (action === "join") {
    const result = joinRoom(code, body.name, token);
    if (result.error) return fail(result.error);
    return Response.json({
      token: result.token,
      seat: result.seat,
      state: publicState(result.room, result.token),
    });
  }

  if (action === "move") {
    const result = playMove(code, token, body.index);
    if (result.error) return fail(result.error);
    return Response.json({ state: publicState(result.room, token) });
  }

  if (action === "rematch") {
    const result = requestRematch(code, token);
    if (result.error) return fail(result.error);
    return Response.json({ state: publicState(result.room, token) });
  }

  if (action === "leave") {
    leaveRoom(code, token);
    return Response.json({ ok: true });
  }

  return Response.json({ error: "bad-action", message: "Unknown action." }, { status: 400 });
}
