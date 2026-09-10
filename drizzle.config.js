// Migrations run in two places: from a machine, and from the Vercel build,
// which is what keeps the deployed schema from drifting behind the code.
//
// The direct URL is preferred — Neon's pooler runs in transaction mode and
// cannot hold the session some schema changes need — but a deployment has no
// reason to carry it, so the pooled one is the fallback and has handled every
// migration here so far.
import "./lib/env.js";

if (!process.env.DATABASE_URL && !process.env.DATABASE_URL_UNPOOLED) {
  // Failing here beats failing at the first request: a build that cannot reach
  // the database would otherwise deploy happily and 500 on sign-in.
  throw new Error(
    "DATABASE_URL is not set, so migrations cannot run. Set it in the environment " +
      "this build runs in (on Vercel: Project > Settings > Environment Variables)."
  );
}

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
