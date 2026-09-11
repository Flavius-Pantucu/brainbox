"use client";

import { useEffect, useRef, useState } from "react";

// Loaded from /public with a script tag rather than imported, because the
// bundler will not parse Ably's build — see scripts/copy-engine.js. One promise
// for the whole page, so two rooms on screen fetch it once.
let loading = null;

function loadAbly() {
  if (window.Ably) return Promise.resolve(window.Ably);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const tag = document.createElement("script");
      tag.src = "/live/ably.min.js";
      tag.async = true;
      tag.onload = () => (window.Ably ? resolve(window.Ably) : reject(new Error("loaded but empty")));
      tag.onerror = () => {
        loading = null; // let the next room try again
        reject(new Error("could not load /live/ably.min.js"));
      };
      document.head.appendChild(tag);
    });
  }
  return loading;
}

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

      // fetched only now, so a visitor who never opens a room never pays for it
      const { Realtime } = await loadAbly();
      if (stopped) return;

      client = new Realtime({
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
