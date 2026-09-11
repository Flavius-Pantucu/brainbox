"use client";

import { useEffect, useRef, useState } from "react";

// Listens on one channel and says when something moved. It does not carry the
// thing that moved: the caller already knows how to fetch a room, and having
// one path to state rather than two is the whole point. See lib/live.js.
//
// A build with no ABLY_API_KEY answers the token request with 503, this stays
// disconnected, and the caller keeps polling exactly as it did before.
export function useLive(channel, onMoved) {
  const [connected, setConnected] = useState(false);
  const moved = useRef(onMoved);

  useEffect(() => {
    moved.current = onMoved;
  }, [onMoved]);

  useEffect(() => {
    if (!channel) return undefined;

    let client = null;
    let stopped = false;

    const token = () =>
      fetch(`/api/live/token?channel=${encodeURIComponent(channel)}`, { cache: "no-store" });

    (async () => {
      try {
      // Ask once before loading anything: on a polling build this is a 503 and
      // the realtime library is never even fetched.
      const probe = await token().catch(() => null);
      if (!probe?.ok || stopped) return;

      // Modular, and dynamic. Modular because the pre-bundled browser build
      // does not survive webpack; dynamic so a visitor who never opens a room
      // never downloads any of it. Two plugins is all a subscriber needs —
      // no presence, no encryption, no message pack.
      const { BaseRealtime, WebSocketTransport, FetchRequest } = await import("ably/modular");
      if (stopped) return;

      client = new BaseRealtime({
        plugins: { WebSocketTransport, FetchRequest },
        // The browser is never given the key. Each renewal asks the server for
        // a fresh token scoped to this one channel, subscribe only.
        authCallback: async (_params, done) => {
          try {
            const res = await token();
            if (!res.ok) throw new Error(`token refused (${res.status})`);
            done(null, await res.json());
          } catch (error) {
            done(error, null);
          }
        },
        closeOnUnload: true,
      });

      client.connection.on((change) => {
        if (!stopped) setConnected(change.current === "connected");
      });

        client.channels.get(channel).subscribe("moved", () => moved.current?.());
      } catch (error) {
        // Nothing here is load-bearing. The caller's poll is still running, so
        // a channel that will not open costs latency and nothing else.
        console.warn(`[live] ${channel} stayed closed: ${error.message}`);
        setConnected(false);
      }
    })();

    return () => {
      stopped = true;
      setConnected(false);
      client?.close();
    };
  }, [channel]);

  return connected;
}
