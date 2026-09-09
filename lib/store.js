// Local persistence for the board.
//
// There is no backend yet. Everything the board hangs is kept in this one
// browser, under one versioned key, and every read and write in the app goes
// through lib/board.js — so replacing this file with real endpoints later is a
// contained change and nothing else in the UI has to move.

const KEY = "brainbox.board.v1";
const LEGACY_KEY = "gamehub.board.v1"; // the name before the rename
const VERSION = 1;

export function emptyBoard() {
  return {
    version: VERSION,
    player: { name: "" },
    sessions: [],
    updatedAt: null,
  };
}

function isBrowser() {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function read() {
  if (!isBrowser()) return emptyBoard();
  try {
    // A board saved under the old product name is adopted once, then written
    // back under the current key.
    let raw = window.localStorage.getItem(KEY);
    if (!raw) {
      const legacy = window.localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        window.localStorage.setItem(KEY, legacy);
        window.localStorage.removeItem(LEGACY_KEY);
        raw = legacy;
      }
    }
    if (!raw) return emptyBoard();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== VERSION) return emptyBoard();
    return {
      ...emptyBoard(),
      ...parsed,
      player: { ...emptyBoard().player, ...(parsed.player || {}) },
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    };
  } catch {
    // A corrupted or unreadable store is treated as an empty board rather than
    // an error the player has to deal with.
    return emptyBoard();
  }
}

export function write(next) {
  if (!isBrowser()) return next;
  const stamped = { ...next, version: VERSION, updatedAt: new Date().toISOString() };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(stamped));
  } catch {
    // Storage full or blocked (private browsing). The session still plays; it
    // just will not be remembered, which the board says out loud.
  }
  return stamped;
}

export function clear() {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nothing to undo */
  }
}

export const STORE_KEY = KEY;
