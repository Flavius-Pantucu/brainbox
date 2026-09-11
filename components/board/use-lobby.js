"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLive } from "./use-live";

const KEY = (code) => `brainbox.lobby.${code}`;
const SEAT_KEY = (code) => `brainbox.room.${code}`;

function remember(code, token) {
  try {
    window.localStorage.setItem(KEY(code), token);
  } catch {
    /* the seat is still held for this tab by the state below */
  }
}

function recall(code) {
  try {
    return window.localStorage.getItem(KEY(code));
  } catch {
    return null;
  }
}

// Opening a room happens away from the room itself — on the board, before
// there is a page to hold a hook. The token is parked under the same key the
// hook reads, so the host walks into their own room already seated.
export async function openLobby(name, game = "tictactoe") {
  const res = await fetch("/api/lobby", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, game }),
  });
  if (!res.ok) throw new Error("Could not open a room.");
  const data = await res.json();
  remember(data.state.code, data.token);
  return data.state.code;
}

// A lobby moves in bursts — nothing for a minute, then four messages — so the
// same widening ask the game rooms use fits it, with a tighter ceiling because
// a chat that lags eight seconds is not a chat.
const POLL_MIN_MS = 1200;
const POLL_MAX_MS = 5000;

// A live channel turns the loop into a net rather than the way news arrives.
const LIVE_IDLE_MS = 30000;

// Holds one private room: joins it, keeps asking what has changed, and posts
// whatever the people in it do.
export function useLobby(code) {
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [gone, setGone] = useState(false);
  const token = useRef(null);
  const poll = useRef(null);
  const stop = useRef(null);
  const version = useRef(0);
  // set by openStream, so the live channel can make it ask now
  const poke = useRef(null);
  const liveUp = useRef(false);

  const closeStream = useCallback(() => {
    if (poll.current) clearTimeout(poll.current);
    poll.current = null;
    stop.current?.();
  }, []);

  const openStream = useCallback((roomCode, roomToken) => {
    if (poll.current) clearTimeout(poll.current);
    let wait = POLL_MIN_MS;
    let stopped = false;

    const ask = async () => {
      if (stopped) return;

      if (typeof document !== "undefined" && document.hidden) {
        poll.current = setTimeout(ask, POLL_MAX_MS);
        return;
      }

      try {
        const res = await fetch(
          `/api/lobby/${roomCode}?token=${encodeURIComponent(roomToken)}&since=${version.current}`,
          { cache: "no-store" }
        );
        if (res.status === 304) {
          wait = Math.min(liveUp.current ? LIVE_IDLE_MS : POLL_MAX_MS, Math.round(wait * 1.4));
        } else if (res.status === 404) {
          stopped = true;
          setGone(true);
          return;
        } else if (res.ok) {
          const data = await res.json();
          version.current = data.state.version ?? 0;
          setState(data.state);
          wait = POLL_MIN_MS;
        }
      } catch {
        wait = Math.min(POLL_MAX_MS, Math.round(wait * 1.4));
      }

      if (!stopped) poll.current = setTimeout(ask, wait);
    };

    const wake = () => {
      if (document.hidden || stopped) return;
      if (poll.current) clearTimeout(poll.current);
      wait = POLL_MIN_MS;
      ask();
    };
    document.addEventListener("visibilitychange", wake);

    poll.current = setTimeout(ask, 0);
    poke.current = wake;
    stop.current = () => {
      stopped = true;
      poke.current = null;
      document.removeEventListener("visibilitychange", wake);
    };
  }, []);

  // Joining is idempotent: a token already in this browser gets its own seat
  // back rather than a second one, so a refresh is not a new player.
  const join = useCallback(
    async (name) => {
      if (!code) return;
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/lobby/${code}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "join", name, token: recall(code) }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 404) setGone(true);
          throw new Error(data.message || "Could not get into that room.");
        }
        token.current = data.token;
        remember(code, data.token);
        version.current = data.state.version ?? 0;
        setState(data.state);
        openStream(code, data.token);
      } catch (e) {
        setError(e.message);
      } finally {
        setBusy(false);
      }
    },
    [code, openStream]
  );

  const act = useCallback(
    async (action, extra = {}) => {
      if (!code || !token.current) return null;
      setError(null);
      try {
        const res = await fetch(`/api/lobby/${code}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, token: token.current, ...extra }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.message || "That did not go through.");
          return null;
        }
        if (data.state) {
          version.current = data.state.version ?? 0;
          setState(data.state);
        }
        return data;
      } catch {
        setError("The room did not answer. Check your connection.");
        return null;
      }
    },
    [code]
  );

  const leave = useCallback(async () => {
    await act("leave");
    closeStream();
    try {
      window.localStorage.removeItem(KEY(code));
    } catch {
      /* nothing to clear */
    }
    token.current = null;
  }, [act, closeStream, code]);

  // Somebody said something, ticked ready, or the host set the table: the
  // server says so the moment it happens and the ask below fetches it.
  liveUp.current = useLive(code ? `lobby:${String(code).toUpperCase()}` : null, () =>
    poke.current?.()
  );

  useEffect(() => () => closeStream(), [closeStream]);

  // The host was handed a seat when the room was opened; parking its token
  // under the game room's own key is what lets them sit back down in it.
  const keepSeat = useCallback((roomCode, seatToken) => {
    if (!roomCode || !seatToken) return;
    try {
      window.sessionStorage.setItem(SEAT_KEY(roomCode), seatToken);
    } catch {
      /* the room will simply hand out the next free seat instead */
    }
  }, []);

  return {
    state,
    error,
    busy,
    gone,
    join,
    leave,
    keepSeat,
    say: (text) => act("say", { text }),
    ready: (on) => act("ready", { ready: on }),
    rename: (name) => act("rename", { name }),
    title: (title) => act("title", { title }),
    daily: (done) => act("daily", { done }),
    seat: (member) => act("seat", { member }),
    pick: (game) => act("pick", { game }),
    start: () => act("start"),
    again: () => act("again"),
    end: () => act("end"),
    clearError: () => setError(null),
  };
}
