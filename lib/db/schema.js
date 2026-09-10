// The whole database, in one file.
//
// Four tables belong to Better Auth and have to keep the shape it expects —
// the field names on the left are the contract, the column names on the right
// are ours. Two are the app's own.

import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ auth --- */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_idx").on(t.userId)]
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    // email and password sign-in keeps the hash here; there is no OAuth
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("account_user_idx").on(t.userId)]
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)]
);

/* ------------------------------------------------------------------ play --- */

// One finished game. What lib/board.js has been keeping in localStorage all
// along, with the same field names, so the shape the UI reads does not move.
//
// It is called `play` and not `session` because Better Auth already owns that
// word, and two things called session in one schema is how you end up reading
// the wrong table at two in the morning.
export const play = pgTable(
  "play",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    game: text("game").notNull(),
    startedAt: timestamp("started_at").notNull(),
    endedAt: timestamp("ended_at").notNull(),
    durationMs: integer("duration_ms").notNull().default(0),
    // won | lost | drawn | played
    outcome: text("outcome").notNull().default("played"),
    daily: boolean("daily").notNull().default(false),
    // the local day it counted for, YYYY-MM-DD, worked out on the client where
    // the player's own timezone is
    day: text("day").notNull(),
    meta: jsonb("meta").notNull().default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    // every read is "this player's plays, newest first"
    index("play_user_ended_idx").on(t.userId, t.endedAt),
    // and the run and the streak both group by day
    index("play_user_day_idx").on(t.userId, t.day),
  ]
);

/* ----------------------------------------------------------------- rooms --- */

// The fallback store for online rooms, used when Redis is not configured or
// not answering. Redis is the first choice — see lib/rooms-store.js — but the
// game cannot depend on a service that may not be there.
//
// `data` is the whole room object, the same shape the in-memory Map held.
// `version` climbs on every write so a client can poll with "anything past N?"
// and be told no cheaply.
export const room = pgTable(
  "room",
  {
    code: text("code").primaryKey(),
    game: text("game").notNull(),
    data: jsonb("data").notNull(),
    version: integer("version").notNull().default(0),
    // waiting | playing | won | drawn | abandoned
    status: text("status").notNull().default("waiting"),
    // replaces the two-hour idle TTL the Map had; pushed forward on each write
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("room_code_idx").on(t.code),
    // the sweep that stands in for Redis's EXPIRE
    index("room_expires_idx").on(t.expiresAt),
  ]
);
