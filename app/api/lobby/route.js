import { createLobby, publicLobby } from "../../../lib/lobby";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Open a private room. The code that comes back is the whole invitation.
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const result = await createLobby(body.name, body.game || "tictactoe");

  if (result.error) {
    return Response.json({ error: result.error, message: "Unknown game." }, { status: 400 });
  }

  return Response.json(
    { token: result.token, state: publicLobby(result.lobby, result.token) },
    { status: 201 }
  );
}
