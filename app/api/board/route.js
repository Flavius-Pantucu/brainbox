// The signed-in player's board: who they are, and every game they have
// finished. Signed-out players never reach here — lib/board.js keeps them on
// localStorage, exactly as before accounts existed.
import { desc, eq } from "drizzle-orm";
import { auth, currentUser } from "../../../lib/auth";
import { db, schema } from "../../../lib/db";

export const dynamic = "force-dynamic";

const unauthorised = () =>
  Response.json({ error: "not-signed-in" }, { status: 401 });

// Rows come back shaped the way lib/board.js has always read them, so nothing
// downstream has to know the data moved.
const toSession = (row) => ({
  id: row.id,
  game: row.game,
  startedAt: row.startedAt.toISOString(),
  endedAt: row.endedAt.toISOString(),
  durationMs: row.durationMs,
  outcome: row.outcome,
  daily: row.daily,
  day: row.day,
  meta: row.meta || {},
});

export async function GET(request) {
  const user = await currentUser(request.headers);
  if (!user) return unauthorised();

  const rows = await db
    .select()
    .from(schema.play)
    .where(eq(schema.play.userId, user.id))
    .orderBy(desc(schema.play.endedAt))
    .limit(2000);

  return Response.json({
    player: { name: user.name || "", email: user.email },
    // the UI reads oldest-first; the query is newest-first so the limit takes
    // the most recent games rather than the first ones ever played
    sessions: rows.reverse().map(toSession),
  });
}

export async function PATCH(request) {
  const user = await currentUser(request.headers);
  if (!user) return unauthorised();

  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? "").slice(0, 18);

  await db.update(schema.user).set({ name, updatedAt: new Date() }).where(eq(schema.user.id, user.id));
  return Response.json({ player: { name } });
}

export async function DELETE(request) {
  const user = await currentUser(request.headers);
  if (!user) return unauthorised();

  await db.delete(schema.play).where(eq(schema.play.userId, user.id));
  return Response.json({ cleared: true });
}
