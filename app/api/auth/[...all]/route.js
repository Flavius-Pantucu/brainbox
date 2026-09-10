// Every Better Auth endpoint — sign up, sign in, sign out, session — hangs off
// this one catch-all.
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "../../../../lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
