import {
  endGame,
  getLobby,
  joinLobby,
  leaveLobby,
  pickGame,
  publicLobby,
  renameInLobby,
  sayInLobby,
  setReady,
  startLobby,
} from "../../../../lib/lobby";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ERRORS = {
  "no-room": [404, "That room has closed or never existed."],
  "no-game": [400, "That game cannot be played in a room."],
  full: [409, "That room is full."],
  "not-host": [403, "Only the player who opened the room can do that."],
  "not-seated": [403, "You are not in this room."],
  "not-ready": [409, "Everyone has to be ready first."],
  "already-started": [409, "A game is already running."],
  empty: [400, "Say something first."],
};

function fail(code) {
  const [status, message] = ERRORS[code] || [400, "That request did not work."];
  return Response.json({ error: code, message }, { status });
}

// Same deal as the game rooms: the client sends the version it holds and a room
// that has not moved answers 304, so a quiet lobby costs almost nothing.
export async function GET(request, { params }) {
  const { code } = await params;
  const lobby = await getLobby(code);
  if (!lobby) return fail("no-room");

  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const since = Number(url.searchParams.get("since"));

  if (Number.isFinite(since) && since > 0 && lobby.version <= since) {
    return new Response(null, { status: 304 });
  }

  return Response.json({ state: publicLobby(lobby, token) });
}

const ACTIONS = {
  say: (code, token, body) => sayInLobby(code, token, body.text),
  ready: (code, token, body) => setReady(code, token, body.ready),
  rename: (code, token, body) => renameInLobby(code, token, body.name),
  pick: (code, token, body) => pickGame(code, token, body.game),
  start: (code, token) => startLobby(code, token),
  end: (code, token) => endGame(code, token),
};

export async function POST(request, { params }) {
  const { code } = await params;
  const body = await request.json().catch(() => ({}));
  const { action, token } = body;

  if (action === "join") {
    const result = await joinLobby(code, body.name, token);
    if (result.error) return fail(result.error);
    return Response.json({
      token: result.token,
      state: publicLobby(result.lobby, result.token),
    });
  }

  if (action === "leave") {
    const result = await leaveLobby(code, token);
    return Response.json({ ok: true, closed: !!result.closed });
  }

  const run = ACTIONS[action];
  if (!run) return fail("bad-action");

  const result = await run(code, token, body);
  if (result.error) return fail(result.error);
  return Response.json({ state: publicLobby(result.lobby, token) });
}
