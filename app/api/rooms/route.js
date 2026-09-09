import { createRoom, publicState } from "../../../lib/rooms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    // an empty body is fine; the host just gets a default name
  }

  const result = createRoom(body.name, body.game || "tictactoe", {
    seat: body.seat,
    time: body.time,
    size: body.size,
  });
  if (result.error) {
    return Response.json({ error: result.error, message: "Unknown game." }, { status: 400 });
  }

  const { room, token, seat } = result;
  return Response.json({ token, seat, state: publicState(room, token) }, { status: 201 });
}
