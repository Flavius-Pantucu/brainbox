// One finished game goes down. The client sends what it knows; the server
// decides who it belongs to, because a player id from a browser is a wish.
import { currentUser } from "../../../../lib/auth";
import { db, schema } from "../../../../lib/db";

export const dynamic = "force-dynamic";

const OUTCOMES = new Set(["won", "lost", "drawn", "played"]);
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function when(value, fallback) {
  const date = new Date(value ?? fallback);
  return Number.isNaN(date.getTime()) ? new Date(fallback) : date;
}

export async function POST(request) {
  const user = await currentUser(request.headers);
  if (!user) return Response.json({ error: "not-signed-in" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.game) return Response.json({ error: "no-game" }, { status: 400 });

  const now = Date.now();
  const endedAt = when(body.endedAt, now);

  const entry = {
    id: String(body.id || `${now}-${Math.random().toString(36).slice(2, 8)}`).slice(0, 64),
    userId: user.id,
    game: String(body.game).slice(0, 32),
    startedAt: when(body.startedAt, endedAt),
    endedAt,
    durationMs: Math.max(0, Math.round(Number(body.durationMs) || 0)),
    outcome: OUTCOMES.has(body.outcome) ? body.outcome : "played",
    daily: !!body.daily,
    // the day is the player's local one, so the client works it out; anything
    // that is not a date falls back to the server's
    day: DAY.test(body.day) ? body.day : endedAt.toISOString().slice(0, 10),
    meta: typeof body.meta === "object" && body.meta ? body.meta : {},
  };

  // Replaying the same id — a retry, or a local board pushed up twice — must not
  // double-count a game. Scoped to the player: the id came from their browser,
  // so it says nothing about anybody else's rows.
  await db
    .insert(schema.play)
    .values(entry)
    .onConflictDoNothing({ target: [schema.play.userId, schema.play.id] });

  return Response.json({
    session: { ...entry, startedAt: entry.startedAt.toISOString(), endedAt: entry.endedAt.toISOString(), userId: undefined },
  });
}
