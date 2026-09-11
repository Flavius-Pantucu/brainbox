"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { nudge } from "../../lib/nudge";

const KEY = (code) => `brainbox.room.${code}`;

function rememberToken(code, token) {
  try {
    window.sessionStorage.setItem(KEY(code), token);
  } catch {
    /* the seat is still held for this tab by the state below */
  }
}

function recallToken(code) {
  try {
    return window.sessionStorage.getItem(KEY(code));
  } catch {
    return null;
  }
}

// How often to ask, and how far to back off when the room is quiet. A room
// nobody is moving in costs one 304 every few seconds rather than a held
// connection — which matters, because the database is billed by the time it
// spends awake.
const POLL_MIN_MS = 1200;
const POLL_MAX_MS = 8000;

// Holds one online room: creates or joins it, keeps asking what has changed,
// and posts whatever actions the game on top of it defines.
export function useRoom(game = "tictactoe") {
  const [state, setState] = useState(null);
  const [code, setCode] = useState(null);
  const [seat, setSeat] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);
  const [watching, setWatching] = useState(false);
  const token = useRef(null);
  const poll = useRef(null);
  const cleanup = useRef(null);
  // the last version seen, so the server can answer "nothing new" cheaply
  const version = useRef(0);

  const closeStream = useCallback(() => {
    if (poll.current) clearTimeout(poll.current);
    poll.current = null;
    setLive(false);
  }, []);

  // The stream used to push; now the client asks. Three things keep that from
  // being wasteful: `since`, so an unchanged room replies 304 with no body; a
  // delay that grows while nothing happens and snaps back the moment something
  // does; and stopping entirely while the tab is hidden, because a forgotten
  // tab must not keep a database awake all night.
  const openStream = useCallback(
    (roomCode, roomToken) => {
      closeStream();
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
            `/api/rooms/${roomCode}?token=${encodeURIComponent(roomToken)}&since=${version.current}`,
            { cache: "no-store" }
          );

          if (res.status === 304) {
            // quiet: ask a little less often, up to the ceiling
            wait = Math.min(POLL_MAX_MS, Math.round(wait * 1.5));
          } else if (res.ok) {
            const data = await res.json();
            version.current = data.state.version ?? 0;
            setState(data.state);
            wait = POLL_MIN_MS; // something moved, so watch closely again
          } else if (res.status === 404) {
            stopped = true;
            setLive(false);
            return;
          }
          setLive(true);
        } catch {
          setLive(false);
          wait = Math.min(POLL_MAX_MS, Math.round(wait * 1.5));
        }

        if (!stopped) poll.current = setTimeout(ask, wait);
      };

      // a hidden tab that comes back should catch up at once
      const wake = () => {
        if (document.hidden || stopped) return;
        if (poll.current) clearTimeout(poll.current);
        wait = POLL_MIN_MS;
        ask();
      };
      document.addEventListener("visibilitychange", wake);

      poll.current = setTimeout(ask, 0);
      cleanup.current = () => {
        stopped = true;
        document.removeEventListener("visibilitychange", wake);
      };
    },
    [closeStream]
  );

  useEffect(
    () => () => {
      cleanup.current?.();
      closeStream();
    },
    [closeStream]
  );

  // An action changes the room, so stop waiting and look now.
  const refresh = useCallback((next) => {
    if (next?.version != null) version.current = next.version;
  }, []);

  const host = useCallback(
    async (name, options = {}) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, game, ...options }),
        });
        if (!res.ok) throw new Error("Could not open a room.");
        const data = await res.json();
        token.current = data.token;
        rememberToken(data.state.code, data.token);
        setCode(data.state.code);
        setSeat(data.seat);
        refresh(data.state);
        setState(data.state);
        openStream(data.state.code, data.token);
      } catch (e) {
        setError(e.message);
      } finally {
        setBusy(false);
      }
    },
    [game, openStream, refresh]
  );

  const join = useCallback(
    async (roomCode, name) => {
      const clean = String(roomCode || "").trim().toUpperCase();
      if (clean.length !== 4) {
        setError("A room code is four characters.");
        return;
      }
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/rooms/${clean}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "join", name, token: recallToken(clean) }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Could not join that room.");
        token.current = data.token;
        rememberToken(clean, data.token);
        setCode(clean);
        setSeat(data.seat);
        refresh(data.state);
        setState(data.state);
        openStream(clean, data.token);
      } catch (e) {
        setError(e.message);
      } finally {
        setBusy(false);
      }
    },
    [openStream, refresh]
  );

  // A seat is not the only way to be in a room. Watching asks for the same
  // state with no token in hand: the server answers with a view that has no
  // seat in it, so every move the board offers is refused anyway.
  const watch = useCallback(
    (roomCode) => {
      const clean = String(roomCode || "").trim().toUpperCase();
      if (!clean) return;
      token.current = null;
      setWatching(true);
      setCode(clean);
      setSeat(null);
      version.current = 0;
      openStream(clean, "");
    },
    [openStream]
  );

  // Walked in from a private room: the code, the name and the intent are all in
  // the link, so there is nothing left for the player to press.
  const invited = useRef(false);
  useEffect(() => {
    if (invited.current || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const roomCode = params.get("room");
    if (!roomCode) return;

    if (params.get("watch") === "1") {
      invited.current = true;
      watch(roomCode);
      return;
    }
    if (params.get("join") !== "1") return;
    invited.current = true;
    join(roomCode, params.get("as") || "");
  }, [join, watch]);

  // Your move, in a tab you are not looking at. Nothing is pushed: this is the
  // poll that is already running, saying so out loud. See lib/nudge.js.
  const wasTurn = useRef(null);
  useEffect(() => {
    const turn = state?.turn ?? null;
    const mine = !!state?.seat && turn === state.seat && state.status === "playing";
    if (mine && wasTurn.current === false) {
      nudge("Your move", `Room ${state.code} is waiting on you.`);
    }
    wasTurn.current = state?.seat ? mine : null;
  }, [state?.turn, state?.seat, state?.status, state?.code]);

  const act = useCallback(
    async (action, extra = {}) => {
      if (!code || !token.current) return;
      setError(null);
      try {
        const res = await fetch(`/api/rooms/${code}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, token: token.current, ...extra }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.message || "That move did not go through.");
          return;
        }
        if (data.state) {
          refresh(data.state);
          setState(data.state);
        }
      } catch {
        setError("The room did not answer. Check your connection.");
      }
    },
    [code, refresh]
  );

  const leave = useCallback(async () => {
    if (!watching) await act("leave");
    closeStream();
    setState(null);
    setCode(null);
    setSeat(null);
    setWatching(false);
    token.current = null;
  }, [act, closeStream, watching]);

  return {
    state,
    code,
    seat,
    error,
    busy,
    live,
    watching,
    host,
    join,
    watch,
    leave,
    act,
    move: (payload) => act("move", typeof payload === "number" ? { index: payload } : payload),
    rematch: () => act("rematch"),
    clearError: () => setError(null),
  };
}
