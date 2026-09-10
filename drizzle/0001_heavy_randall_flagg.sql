-- The id a browser generates is unique only within that player. As the sole
-- primary key it meant two players sharing an id silently lost a game each:
-- the second insert met onConflictDoNothing and vanished behind a 200.
ALTER TABLE "play" DROP CONSTRAINT "play_pkey";--> statement-breakpoint
ALTER TABLE "play" ADD CONSTRAINT "play_user_id_id_pk" PRIMARY KEY("user_id","id");
