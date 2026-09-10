// Where a live room actually sits.
//
// Redis first: rooms are throwaway state with a clock on them, which is what
// EXPIRE is for, and the writes are frequent and worthless the moment the game
// ends. Postgres second, because a game should not stop working on the day
// Redis is unreachable, out of quota, or simply not configured — a local
// checkout with no Upstash keys still needs online rooms to run.
//
// Both drivers store the same thing: the whole room object, keyed by code,
// with a two-hour idle life that every write pushes forward.

import { and, eq, lt, sql } from "drizzle-orm";
import { db, schema } from "./db/index.js";

export const ROOM_TTL_MS = 2 * 60 * 60 * 1000;
const TTL_SECONDS = Math.floor(ROOM_TTL_MS / 1000);
const key = (code) => `room:${code}`;

/* ----------------------------------------------------------------- redis --- */

function redisConfigured() {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

let redisClient = null;
async function getRedis() {
  if (redisClient) return redisClient;
  const { Redis } = await import("@upstash/redis");
  redisClient = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  return redisClient;
}

const redisDriver = {
  name: "redis",

  async read(code) {
    const redis = await getRedis();
    const raw = await redis.get(key(code));
    if (!raw) return null;
    // the REST client parses JSON already when it can
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  },

  async write(code, room) {
    const redis = await getRedis();
    await redis.set(key(code), JSON.stringify(room), { ex: TTL_SECONDS });
    return room;
  },

  async remove(code) {
    const redis = await getRedis();
    await redis.del(key(code));
  },

  async ping() {
    const redis = await getRedis();
    await redis.ping();
  },
};

/* -------------------------------------------------------------- postgres --- */

const pgDriver = {
  name: "postgres",

  async read(code) {
    const [row] = await db
      .select()
      .from(schema.room)
      .where(and(eq(schema.room.code, code), sql`${schema.room.expiresAt} > now()`))
      .limit(1);
    return row?.data ?? null;
  },

  async write(code, room) {
    const expiresAt = new Date(Date.now() + ROOM_TTL_MS);
    await db
      .insert(schema.room)
      .values({
        code,
        game: room.game,
        data: room,
        version: room.version ?? 0,
        status: room.status ?? "waiting",
        expiresAt,
      })
      .onConflictDoUpdate({
        target: schema.room.code,
        set: {
          data: room,
          version: room.version ?? 0,
          status: room.status ?? "waiting",
          expiresAt,
          updatedAt: new Date(),
        },
      });
    return room;
  },

  async remove(code) {
    await db.delete(schema.room).where(eq(schema.room.code, code));
  },

  async ping() {
    await db.execute(sql`select 1`);
  },

  // Redis forgets on its own; Postgres has to be told. Rather than run a cron
  // for one table, each write occasionally clears what has already lapsed.
  async sweep() {
    await db.delete(schema.room).where(lt(schema.room.expiresAt, new Date()));
  },
};

/* ---------------------------------------------------------------- memory --- */

// Neither a service nor a fallback: the driver the game checks run against, so
// `npm run check` stays a pure offline suite and a fresh clone can play a local
// room before anybody has signed up for anything. Chosen only when asked for by
// name — never picked on its own, because a real deployment silently keeping
// rooms in one process's memory is the bug this whole file exists to fix.
const memory = new Map();

const memoryDriver = {
  name: "memory",

  async read(code) {
    const held = memory.get(code);
    if (!held) return null;
    if (held.expires < Date.now()) {
      memory.delete(code);
      return null;
    }
    return JSON.parse(held.json);
  },

  async write(code, room) {
    memory.set(code, { json: JSON.stringify(room), expires: Date.now() + ROOM_TTL_MS });
    return room;
  },

  async remove(code) {
    memory.delete(code);
  },

  async ping() {},
};

/* ---------------------------------------------------------------- picking --- */

let chosen = null;
let choosing = null;

async function driver() {
  if (chosen) return chosen;
  if (choosing) return choosing;

  choosing = (async () => {
    if (process.env.BRAINBOX_ROOMS === "memory") {
      chosen = memoryDriver;
      return chosen;
    }
    if (redisConfigured()) {
      try {
        await redisDriver.ping();
        chosen = redisDriver;
        return chosen;
      } catch (error) {
        console.warn(
          `[rooms] Redis is configured but not answering (${error.message}). ` +
            `Falling back to Postgres.`
        );
      }
    }
    chosen = pgDriver;
    return chosen;
  })();

  const result = await choosing;
  choosing = null;
  return result;
}

// Which store is live. Exposed so /api/health can say so out loud rather than
// leaving you to guess which one a deployment picked.
export async function activeDriver() {
  return (await driver()).name;
}

// A Redis that dies mid-session should not take the game with it, so every
// call can retreat to Postgres once and stay there.
async function withFallback(run) {
  const active = await driver();
  try {
    return await run(active);
  } catch (error) {
    if (active === pgDriver) throw error;
    console.warn(`[rooms] Redis failed mid-flight (${error.message}). Using Postgres.`);
    chosen = pgDriver;
    return run(pgDriver);
  }
}

/* ------------------------------------------------------------------- api --- */

export async function readRoom(code) {
  if (!code) return null;
  return withFallback((d) => d.read(code));
}

export async function writeRoom(code, room) {
  const next = { ...room, version: (room.version ?? 0) + 1, updatedAt: Date.now() };
  await withFallback((d) => d.write(code, next));
  // one sweep in every fifty writes keeps the table from growing without
  // needing a scheduler
  if (chosen === pgDriver && Math.random() < 0.02) {
    pgDriver.sweep().catch(() => {});
  }
  return next;
}

export async function removeRoom(code) {
  if (!code) return;
  await withFallback((d) => d.remove(code));
}
