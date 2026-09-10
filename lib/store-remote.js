// The server-backed half of the data layer, used when somebody is signed in.
// Signed out, lib/store.js keeps working exactly as it always has — an account
// is an upgrade, not a gate.

const json = { "content-type": "application/json" };

/* --------------------------------------------------------------- session --- */

// Whether anyone is signed in. Cached, because every read would otherwise ask
// twice, and reset by forgetSession() when the answer can have changed.
let known = null;

export async function signedIn() {
  if (known !== null) return known;
  try {
    const res = await fetch("/api/auth/get-session", { credentials: "include" });
    const body = res.ok ? await res.json().catch(() => null) : null;
    known = !!body?.user;
  } catch {
    // offline, or no backend at all: fall back to the local board rather than
    // losing the game somebody just finished
    known = false;
  }
  return known;
}

// Call after signing in or out, so the next read asks again.
export function forgetSession() {
  known = null;
}

/* ----------------------------------------------------------------- board --- */

export async function readRemote() {
  const res = await fetch("/api/board", { credentials: "include" });
  if (res.status === 401) {
    known = false;
    return null;
  }
  if (!res.ok) throw new Error(`board read failed: ${res.status}`);
  const body = await res.json();
  return { version: 1, player: body.player, sessions: body.sessions, updatedAt: Date.now() };
}

export async function recordRemote(entry) {
  const res = await fetch("/api/board/plays", {
    method: "POST",
    headers: json,
    credentials: "include",
    body: JSON.stringify(entry),
  });
  if (res.status === 401) {
    known = false;
    return null;
  }
  if (!res.ok) throw new Error(`play write failed: ${res.status}`);
  return (await res.json()).session;
}

export async function setNameRemote(name) {
  const res = await fetch("/api/board", {
    method: "PATCH",
    headers: json,
    credentials: "include",
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`name write failed: ${res.status}`);
  return (await res.json()).player;
}

export async function clearRemote() {
  const res = await fetch("/api/board", { method: "DELETE", credentials: "include" });
  if (!res.ok) throw new Error(`clear failed: ${res.status}`);
}

/* --------------------------------------------------------------- joining --- */

// Somebody has just signed in on a browser that has been keeping a board
// locally. Send those games up before the local one stops being read.
//
// Every play carries the id it already had, and the insert ignores conflicts,
// so running this twice — two tabs, a retry — cannot double-count a game.
export async function pushLocal(sessions) {
  if (!sessions?.length) return { sent: 0 };
  let sent = 0;
  for (const entry of sessions) {
    try {
      await recordRemote(entry);
      sent += 1;
    } catch {
      // one bad row should not strand the rest
    }
  }
  return { sent };
}
