"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

// Holds one online room: creates or joins it, keeps a live stream open, and
// posts whatever actions the game on top of it defines.
export function useRoom(game = "tictactoe") {
  const [state, setState] = useState(null);
  const [code, setCode] = useState(null);
  const [seat, setSeat] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);
  const token = useRef(null);
  const source = useRef(null);

  const closeStream = useCallback(() => {
    source.current?.close();
    source.current = null;
    setLive(false);
  }, []);

  const openStream = useCallback(
    (roomCode, roomToken) => {
      closeStream();
      const es = new EventSource(
        `/api/rooms/${roomCode}/stream?token=${encodeURIComponent(roomToken)}`
      );
      es.onmessage = (event) => {
        setState(JSON.parse(event.data));
        setLive(true);
      };
      es.onerror = () => setLive(false);
      source.current = es;
    },
    [closeStream]
  );

  useEffect(() => closeStream, [closeStream]);

  const host = useCallback(
    async (name, options = {}) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, game, seat: options.seat, time: options.time }),
        });
        if (!res.ok) throw new Error("Could not open a room.");
        const data = await res.json();
        token.current = data.token;
        rememberToken(data.state.code, data.token);
        setCode(data.state.code);
        setSeat(data.seat);
        setState(data.state);
        openStream(data.state.code, data.token);
      } catch (e) {
        setError(e.message);
      } finally {
        setBusy(false);
      }
    },
    [game, openStream]
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
        setState(data.state);
        openStream(clean, data.token);
      } catch (e) {
        setError(e.message);
      } finally {
        setBusy(false);
      }
    },
    [openStream]
  );

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
        if (data.state) setState(data.state);
      } catch {
        setError("The room did not answer. Check your connection.");
      }
    },
    [code]
  );

  const leave = useCallback(async () => {
    await act("leave");
    closeStream();
    setState(null);
    setCode(null);
    setSeat(null);
    token.current = null;
  }, [act, closeStream]);

  return {
    state,
    code,
    seat,
    error,
    busy,
    live,
    host,
    join,
    leave,
    act,
    move: (payload) => act("move", typeof payload === "number" ? { index: payload } : payload),
    rematch: () => act("rematch"),
    clearError: () => setError(null),
  };
}
