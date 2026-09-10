// One pooled connection, reused. Next reloads modules freely in development
// and every reload would otherwise open another pool, so it hangs off
// globalThis the way the old room Map did.
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

export const db = globalThis.__brainboxDb || (globalThis.__brainboxDb = connect());
