"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Stockfish, compiled to wasm, talking UCI down a worker pipe. The lite
// single-threaded build is the one that needs no cross-origin isolation
// headers, which keeps this working on any host the rest of the site runs on.
const ENGINE_URL = "/engine/stockfish-18-lite-single.js";

const DEPTH_RE = /\bdepth (\d+)/;
const CP_RE = /\bscore cp (-?\d+)/;
const MATE_RE = /\bscore mate (-?\d+)/;
const PV_RE = /\bpv (.+)$/;

function parseInfo(line) {
  if (!line.startsWith("info ")) return null;
  const pv = line.match(PV_RE);
  if (!pv) return null;
  const mate = line.match(MATE_RE);
  const cp = line.match(CP_RE);
  if (!mate && !cp) return null;
  return {
    depth: Number(line.match(DEPTH_RE)?.[1] ?? 0),
    score: mate ? { mate: Number(mate[1]), cp: null } : { cp: Number(cp[1]), mate: null },
    pv: pv[1].trim().split(/\s+/),
  };
}

// ponytail: one engine, one search at a time, queued. A second worker would
// double the 7 MB download to save a few hundred milliseconds on the review.
export function useEngine() {
  const api = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let worker;
    try {
      worker = new Worker(ENGINE_URL);
    } catch {
      setFailed(true);
      return undefined;
    }

    const queue = [];
    let current = null;
    let live = false;
    let skill = null;
    let killed = false;

    const send = (text) => worker.postMessage(text);

    const pump = () => {
      if (current || !live) return;
      const job = queue.shift();
      if (!job) return;
      if (job.cancelled) {
        job.resolve(null);
        pump();
        return;
      }
      current = job;
      if (job.skill != null && job.skill !== skill) {
        skill = job.skill;
        send(`setoption name Skill Level value ${job.skill}`);
      }
      send("ucinewgame");
      send(`position fen ${job.fen}`);
      send(job.go);
    };

    const finish = (result) => {
      const job = current;
      current = null;
      job?.resolve(job.cancelled ? null : result);
      pump();
    };

    worker.onerror = () => {
      if (!killed) setFailed(true);
    };

    worker.onmessage = (event) => {
      const line = typeof event.data === "string" ? event.data : event.data?.data;
      if (typeof line !== "string") return;

      if (line === "uciok") {
        send("isready");
        return;
      }
      if (line === "readyok") {
        live = true;
        if (!killed) setReady(true);
        pump();
        return;
      }
      if (!current) return;

      if (line.startsWith("bestmove")) {
        const parts = line.split(/\s+/);
        finish({
          best: parts[1] === "(none)" ? null : parts[1],
          ponder: parts[3] || null,
          score: current.last?.score ?? null,
          pv: current.last?.pv ?? [],
          depth: current.last?.depth ?? 0,
        });
        return;
      }

      const info = parseInfo(line);
      if (!info) return;
      current.last = info;
      if (!current.cancelled) current.onInfo?.(info);
    };

    api.current = {
      run: (fen, { go, skill: level = null, onInfo = null } = {}) =>
        new Promise((resolve) => {
          queue.push({ fen, go, skill: level, onInfo, resolve, cancelled: false, last: null });
          pump();
        }),
      cancel: () => {
        for (const job of queue) job.cancelled = true;
        if (current) {
          current.cancelled = true;
          send("stop");
        }
      },
    };

    send("uci");

    return () => {
      killed = true;
      api.current = null;
      for (const job of queue) job.resolve(null);
      current?.resolve(null);
      worker.terminate();
    };
  }, []);

  const run = useCallback(
    (fen, options) => api.current?.run(fen, options) ?? Promise.resolve(null),
    []
  );

  const analyse = useCallback(
    (fen, { depth = 14, onInfo } = {}) => run(fen, { go: `go depth ${depth}`, onInfo, skill: 20 }),
    [run]
  );

  const play = useCallback(
    (fen, { skill: level = 20, depth = 12, movetime = null } = {}) =>
      run(fen, { go: movetime ? `go movetime ${movetime}` : `go depth ${depth}`, skill: level }),
    [run]
  );

  // Drops everything waiting and cuts the running search short — used whenever
  // the position changes under a search that is still going.
  const cancel = useCallback(() => api.current?.cancel(), []);

  // A stable object: effects downstream key off it, and a fresh identity every
  // render would restart every search.
  return useMemo(
    () => ({ ready, failed, analyse, play, cancel }),
    [ready, failed, analyse, play, cancel]
  );
}
