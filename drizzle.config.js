// Migrations run from a machine, never from a deployment, so they use the
// direct URL: Neon's pooler runs in transaction mode and cannot hold the
// session a schema change needs. Falls back to the pooled one so `db:push`
// still works if only the one URL is set.
import "./lib/env.js";

export default {
  schema: "./lib/db/schema.js",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
};
