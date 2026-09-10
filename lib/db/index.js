// One pooled connection, opened the first time somebody actually queries.
//
// Lazily, deliberately: rooms may be served entirely from Redis, and a
// deployment in that shape should not fall over at import time because it has
// no Postgres URL. Next also reloads modules freely in development and every
// reload would otherwise open another pool, so it hangs off globalThis.
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";

export { schema };

function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and fill it in."
    );
  }
  return drizzle(neon(url), { schema });
}

function live() {
  if (!globalThis.__brainboxDb) globalThis.__brainboxDb = connect();
  return globalThis.__brainboxDb;
}

// A stand-in that connects on first touch, so `db.select(...)` reads the same
// at every call site as it did when this was eager.
export const db = new Proxy(
  {},
  {
    get: (_, prop) => {
      const real = live();
      const value = real[prop];
      return typeof value === "function" ? value.bind(real) : value;
    },
    has: (_, prop) => prop in live(),
  }
);
