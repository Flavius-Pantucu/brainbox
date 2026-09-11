// A short-lived key for one channel, so the browser never holds the real one.
//
// Subscribe only, and scoped to the single channel asked for. Publishing stays
// on the server: a client that could publish could tell the other player a move
// happened that never did.
//
// The channel is not checked against a real room. It carries nothing but a
// version number, anyone holding the four-character code can already join the
// room itself, and checking would cost a store read on every token renewal.
import Ably from "ably";
import { liveOn, validChannel } from "../../../../lib/live";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  // No key configured is not an error — it is the polling build. The client
  // reads this and stays on the loop it already has.
  if (!liveOn()) {
    return Response.json({ error: "not-configured" }, { status: 503 });
  }

  const channel = new URL(request.url).searchParams.get("channel");
  if (!validChannel(channel)) {
    return Response.json({ error: "bad-channel" }, { status: 400 });
  }

  const ably = new Ably.Rest(process.env.ABLY_API_KEY);
  const tokenRequest = await ably.auth.createTokenRequest({
    capability: { [channel]: ["subscribe"] },
    ttl: 60 * 60 * 1000, // an hour; a game room dies after two
  });

  return Response.json(tokenRequest);
}
