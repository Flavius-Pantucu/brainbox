// Better Auth, server side. Email and password only — no OAuth provider, so
// there is nothing to register with anyone and no client secret to carry.
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db, schema } from "./db/index.js";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),

  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL,

  emailAndPassword: {
    enabled: true,
    // Nothing here sends mail yet, so demanding a verified address would lock
    // everybody out. Turn this on the day an email sender exists.
    requireEmailVerification: false,
    minPasswordLength: 8,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // a month
    updateAge: 60 * 60 * 24, // slide it forward at most once a day
  },

  // The board is one small app on one domain; there is nothing to advertise.
  advanced: {
    cookiePrefix: "brainbox",
  },
});

// The signed-in user, or null. Every route that touches player data goes
// through this rather than trusting anything the client sent.
export async function currentUser(headers) {
  const result = await auth.api.getSession({ headers });
  return result?.user ?? null;
}
