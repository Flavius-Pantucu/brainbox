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
  const { room, token, seat } = createRoom(body.name);
  return Response.json({ token, seat, state: publicState(room, token) }, { status: 201 });
}
