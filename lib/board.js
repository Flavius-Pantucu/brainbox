// The board's data layer. Every screen reads and writes through here.
//
// Today it resolves against local storage (lib/store.js). When a backend
// arrives, the bodies of these functions become fetches and nothing above them
// changes: they are already async, already keyed by player, already the only
// place the shape of a session is known.

import { read, write, clear, emptyBoard } from "./store";
import { GAMES } from "./games";

export const RANGES = [
  { id: "week", label: "This week", days: 7 },
  { id: "season", label: "Season", days: 30 },
  { id: "all", label: "All time", days: null },
];

export function dayKey(date = new Date()) {
  const d = new Date(date);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

export function daysAgoKey(n, from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() - n);
  return dayKey(d);
}

// --- reads -----------------------------------------------------------------

export async function getBoard() {
  return read();
}

export async function getSessions() {
  return read().sessions;
}

// --- writes ----------------------------------------------------------------

export async function recordSession(session) {
  const board = read();
  const entry = {
    id: session.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    game: session.game,
    startedAt: session.startedAt || new Date().toISOString(),
    endedAt: session.endedAt || new Date().toISOString(),
    durationMs: Math.max(0, Math.round(session.durationMs || 0)),
    outcome: session.outcome || "played", // won | lost | drawn | played
    daily: !!session.daily,
    meta: session.meta || {},
  };
  entry.day = dayKey(entry.endedAt);
  const next = { ...board, sessions: [...board.sessions, entry] };
  write(next);
  return entry;
}

export async function setPlayerName(name) {
  const board = read();
  const next = { ...board, player: { ...board.player, name: name.slice(0, 18) } };
  write(next);
  return next.player;
}

export async function clearBoard() {
  clear();
  return emptyBoard();
}

// --- derivation ------------------------------------------------------------

function withinRange(sessions, rangeId) {
  const range = RANGES.find((r) => r.id === rangeId) || RANGES[2];
  if (!range.days) return sessions;
  const cutoff = Date.now() - range.days * 86400000;
  return sessions.filter((s) => new Date(s.endedAt).getTime() >= cutoff);
}

function formatDuration(ms) {
  if (!ms || ms < 1000) return null;
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// The run: the last seven days, each either hung or an open hook.
export function runOfDays(sessions, count = 7) {
  const days = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const key = daysAgoKey(i);
    const played = sessions.filter((s) => (s.day || dayKey(s.endedAt)) === key);
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push({
      key,
      date,
      weekday: date.toLocaleDateString(undefined, { weekday: "short" }),
      count: played.length,
      today: i === 0,
    });
  }
  return days;
}

// Consecutive days with at least one finished session, counting back from today
// (a run stays alive until the day after it was last fed).
export function streakOf(sessions) {
  const keys = new Set(sessions.map((s) => s.day || dayKey(s.endedAt)));
  if (keys.size === 0) return { length: 0, alive: false, playedToday: false };
  const playedToday = keys.has(dayKey());
  let cursor = playedToday ? 0 : 1;
  if (!playedToday && !keys.has(daysAgoKey(1))) {
    return { length: 0, alive: false, playedToday: false };
  }
  let length = 0;
  while (keys.has(daysAgoKey(cursor))) {
    length += 1;
    cursor += 1;
  }
  return { length, alive: true, playedToday };
}

export function statsForGame(sessions, gameId, rangeId = "all") {
  const all = sessions.filter((s) => s.game === gameId);
  const scoped = withinRange(all, rangeId);
  const wins = scoped.filter((s) => s.outcome === "won").length;
  const decided = scoped.filter((s) => s.outcome === "won" || s.outcome === "lost").length;
  const durations = scoped.map((s) => s.durationMs).filter((d) => d > 1000);
  const last = all.length ? all[all.length - 1] : null;
  return {
    gameId,
    played: scoped.length,
    everPlayed: all.length,
    wins,
    decided,
    winRate: decided ? Math.round((wins / decided) * 100) : null,
    bestTime: durations.length ? formatDuration(Math.min(...durations)) : null,
    bestTimeMs: durations.length ? Math.min(...durations) : null,
    longest: durations.length ? formatDuration(Math.max(...durations)) : null,
    last,
    lastPlayedAt: last ? new Date(last.endedAt) : null,
  };
}

export function summarise(sessions, rangeId = "all") {
  const scoped = withinRange(sessions, rangeId);
  const durations = scoped.map((s) => s.durationMs).filter((d) => d > 1000);
  return {
    range: rangeId,
    played: scoped.length,
    everPlayed: sessions.length,
    minutes: Math.round(durations.reduce((a, b) => a + b, 0) / 60000),
    wins: scoped.filter((s) => s.outcome === "won").length,
    games: GAMES.map((g) => statsForGame(sessions, g.id, rangeId)),
    streak: streakOf(sessions),
    run: runOfDays(sessions),
  };
}

export { formatDuration };
