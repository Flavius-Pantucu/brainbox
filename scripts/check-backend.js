// The backend, against real services: the room store on whichever driver is
// live, then sign-up through to sign-out over the HTTP API.
//
// Unlike `npm run check` this needs .env filled in and `npm run dev` running,
// so it is a separate script rather than part of the game checks.
//   npm run check:backend
import "../lib/env.js";
import assert from "node:assert/strict";

const BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function rooms() {
  const store = await import("../lib/rooms-store.js");
  const code = "CHK" + Math.random().toString(36).slice(2, 6).toUpperCase();
  const driver = await store.activeDriver();

  assert.equal(await store.readRoom(code), null, "an unknown code reads as null");

  const first = await store.writeRoom(code, { game: "chess", status: "waiting", seats: { w: "Ada" } });
  assert.equal(first.version, 1, "the first write is version 1");

  const back = await store.readRoom(code);
  assert.equal(back.game, "chess");
  assert.equal(back.seats.w, "Ada", "the room survives the round trip whole");

  const second = await store.writeRoom(code, { ...back, status: "playing" });
  assert.equal(second.version, 2, "the version climbs on every write");
  assert.equal((await store.readRoom(code)).status, "playing");

  await store.removeRoom(code);
  assert.equal(await store.readRoom(code), null, "a removed room is gone");

  console.log(`rooms: round trip ok on ${driver}`);
}

async function board() {
  let jar = "";
  const call = async (path, init = {}) => {
    const res = await fetch(BASE + path, {
      ...init,
      headers: {
        "content-type": "application/json",
        // Better Auth refuses a request with no Origin, which is what stops a
        // form on someone else's site posting here
        origin: BASE,
        ...(init.headers || {}),
        ...(jar ? { cookie: jar } : {}),
      },
    });
    const set = res.headers.getSetCookie?.() || [];
    if (set.length) jar = set.map((c) => c.split(";")[0]).join("; ");
    const text = await res.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    return { status: res.status, body };
  };

  const email = `check-${Date.now()}@example.test`;
  const play = {
    id: `check-${Date.now()}`,
    game: "chess",
    outcome: "won",
    durationMs: 90000,
    daily: true,
    day: "2026-09-10",
    startedAt: new Date(Date.now() - 90000).toISOString(),
    endedAt: new Date().toISOString(),
    meta: { level: "sharp" },
  };

  assert.equal((await call("/api/board")).status, 401, "signed out, the board is refused");

  const up = await call("/api/auth/sign-up/email", {
    method: "POST",
    body: JSON.stringify({ email, password: "correct-horse-battery", name: "Probe" }),
  });
  assert.ok(up.status < 400, `sign-up failed: ${up.status}`);
  assert.equal((await call("/api/auth/get-session")).body?.user?.email, email);

  let seen = await call("/api/board");
  assert.equal(seen.status, 200);
  assert.equal(seen.body.sessions.length, 0, "a new player has an empty board");
  assert.equal(seen.body.player.name, "Probe");

  assert.equal(
    (await call("/api/board/plays", { method: "POST", body: JSON.stringify(play) })).status,
    200
  );

  const [got] = (await call("/api/board")).body.sessions;
  assert.equal(got.game, "chess");
  assert.equal(got.outcome, "won");
  assert.equal(got.daily, true);
  assert.equal(got.day, "2026-09-10", "the player's own day is kept, not the server's");
  assert.equal(got.durationMs, 90000);
  assert.deepEqual(got.meta, { level: "sharp" });

  await call("/api/board/plays", { method: "POST", body: JSON.stringify(play) });
  assert.equal(
    (await call("/api/board")).body.sessions.length,
    1,
    "the same play sent twice is still one game"
  );

  await call("/api/board", { method: "PATCH", body: JSON.stringify({ name: "Renamed" }) });
  assert.equal((await call("/api/board")).body.player.name, "Renamed");

  await call("/api/board/plays", {
    method: "POST",
    body: JSON.stringify({ ...play, id: `${play.id}-b`, outcome: "cheated" }),
  });
  const dodgy = (await call("/api/board")).body.sessions.find((s) => s.id === `${play.id}-b`);
  assert.equal(dodgy.outcome, "played", "an outcome the server does not know falls back to played");

  await call("/api/board", { method: "DELETE" });
  assert.equal((await call("/api/board")).body.sessions.length, 0, "clearing empties the board");

  await call("/api/auth/sign-out", { method: "POST" });
  jar = "";
  assert.equal((await call("/api/board")).status, 401, "and signing out closes it again");

  console.log("board: sign-up through sign-out ok");
}

// The same room, driven the way a browser drives it: over HTTP, against
// whichever store is live, with the polling the event stream was replaced by.
async function roomsOverHttp() {
  const post = (path, body) =>
    fetch(BASE + path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));

  const opened = await post("/api/rooms", { name: "Ada", game: "chess", seat: "w" });
  assert.equal(opened.status, 201, "a room opens");
  const code = opened.body.state.code;
  const host = opened.body.token;

  const joined = await post(`/api/rooms/${code}`, { action: "join", name: "Bo" });
  assert.equal(joined.status, 200);
  assert.equal(joined.body.seat, "b", "the guest takes the other seat");
  assert.equal(joined.body.state.status, "playing", "and a full table starts");

  const guest = joined.body.token;
  let version = joined.body.state.version;

  // an unchanged room answers 304, which is what makes polling affordable
  const quiet = await fetch(`${BASE}/api/rooms/${code}?token=${host}&since=${version}`);
  assert.equal(quiet.status, 304, "nothing has moved, so there is nothing to send");

  const wrongTurn = await post(`/api/rooms/${code}`, {
    action: "move",
    token: guest,
    from: "e7",
    to: "e5",
  });
  assert.equal(wrongTurn.status, 409, "black cannot open");

  const moved = await post(`/api/rooms/${code}`, {
    action: "move",
    token: host,
    from: "e2",
    to: "e4",
  });
  assert.equal(moved.status, 200);
  assert.equal(moved.body.state.moves[0].san, "e4");
  assert.ok(moved.body.state.version > version, "a move moves the version on");

  // and now the poll has something to say
  const noisy = await fetch(`${BASE}/api/rooms/${code}?token=${host}&since=${version}`);
  assert.equal(noisy.status, 200, "a changed room sends the board");
  const seen = (await noisy.json()).state;
  assert.equal(seen.moves.length, 1);
  assert.equal(seen.turn, "b");
  // The position survived a round trip through the store, which for chess means
  // it was packed down to PGN and built back into a Chess instance. Before that
  // packing existed, JSON turned the game into {} and this came back empty.
  assert.equal(
    seen.fen,
    "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
    "the board came back with the pawn on e4 and black to move"
  );

  await post(`/api/rooms/${code}`, { action: "leave", token: host });
  const gone = await fetch(`${BASE}/api/rooms/${code}?token=${host}`);
  assert.equal(gone.status, 404, "the host leaving closes the room");

  console.log("rooms over http: open, join, move, poll, close ok");
}

async function main() {
  await rooms();
  try {
    await fetch(BASE, { signal: AbortSignal.timeout(2000) });
  } catch {
    console.log(`board: skipped — nothing answering at ${BASE}. Start it with: npm run dev`);
    return;
  }
  await board();
  await roomsOverHttp();
  console.log("backend checks pass");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
