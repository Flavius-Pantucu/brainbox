// The ladder, across everybody.
//
// Until now the standings page ranked you against yourself, and the eight-rung
// ladder on it was openly invented. There are accounts and a plays table now,
// so it can be counted instead.
//
// Only a name and three numbers leave here. An email address is not a score.
import { desc, eq, sql } from "drizzle-orm";
import { currentUser } from "../../../lib/auth";
import { db, schema } from "../../../lib/db";

export const dynamic = "force-dynamic";

const SHOWN = 20;

// ponytail: one grouped query, capped. A board with more than five hundred
// players who have finished a game needs the rank worked out in SQL instead —
// a window function over the same group-by — and nothing above this changes.
const DEPTH = 500;

export async function GET(request) {
  const me = await currentUser(request.headers).catch(() => null);

  const rows = await db
    .select({
      id: schema.play.userId,
      name: schema.user.name,
      played: sql`count(*)::int`.as("played"),
      wins: sql`(count(*) filter (where ${schema.play.outcome} = 'won'))::int`.as("wins"),
      days: sql`(count(distinct ${schema.play.day}))::int`.as("days"),
    })
    .from(schema.play)
    .innerJoin(schema.user, eq(schema.user.id, schema.play.userId))
    .groupBy(schema.play.userId, schema.user.name)
    .orderBy(desc(sql`count(*)`))
    .limit(DEPTH);

  const place = rows.findIndex((row) => row.id === me?.id);

  return Response.json({
    // the id is what lets the page light up your own rung, and it is already
    // yours; nobody else's is sent
    rungs: rows.slice(0, SHOWN).map((row, i) => ({
      rank: i + 1,
      name: row.name || "Unnamed",
      played: row.played,
      wins: row.wins,
      days: row.days,
      you: row.id === me?.id,
    })),
    you:
      place >= 0
        ? { rank: place + 1, played: rows[place].played, wins: rows[place].wins }
        : null,
    counted: rows.length,
    deeper: rows.length === DEPTH,
  });
}
