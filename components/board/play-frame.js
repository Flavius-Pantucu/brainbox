"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef } from "react";
import TicTacToe from "../games/tictactoe/tictactoe";
import Sudoku from "../games/sudoku/sudoku";
import Chess from "../games/chess/chess";
import Connect4 from "../games/connect4/connect4";
import Go from "../games/go/go";
import Reversi from "../games/reversi/reversi";
import Checkers from "../games/checkers/checkers";
import Minesweeper from "../games/minesweeper/minesweeper";
import { Tag } from "./tag";
import { ArrowLeft } from "./icons";
import { GAME_BY_ID } from "../../lib/games";
import { recordSession } from "../../lib/board";
import { dailyChallenge } from "../../lib/daily";

const SURFACES = {
  chess: Chess,
  connect4: Connect4,
  go: Go,
  reversi: Reversi,
  checkers: Checkers,
  minesweeper: Minesweeper,
  sudoku: Sudoku,
  tictactoe: TicTacToe,
};

// A visit shorter than this is someone looking, not playing, and the board does
// not record it.
const MIN_SESSION_MS = 20000;

export function PlayFrame({ gameId }) {
  const game = GAME_BY_ID[gameId];
  const Surface = SURFACES[gameId];

  const openedAt = useRef(Date.now());
  const lastResultAt = useRef(Date.now());
  const recorded = useRef(0);

  const challenge = useMemo(() => dailyChallenge(), []);
  const isTodays = challenge.game.id === gameId;

  // Each finished round writes its own session, timed from the end of the last
  // one, so a sitting of five tic-tac-toe rounds reads as five games.
  const onResult = useCallback(
    (payload) => {
      const now = Date.now();
      recordSession({
        game: gameId,
        startedAt: new Date(lastResultAt.current).toISOString(),
        endedAt: new Date(now).toISOString(),
        durationMs: payload.durationMs ?? now - lastResultAt.current,
        outcome: payload.outcome || "played",
        daily: isTodays,
        meta: payload.meta || {},
      });
      lastResultAt.current = now;
      recorded.current += 1;
    },
    [gameId, isTodays]
  );

  // A game that reports nothing — an analysis board someone only looked at —
  // still records the sitting, once, on the way out.
  useEffect(() => {
    const started = openedAt.current;
    return () => {
      if (recorded.current > 0) return;
      const durationMs = Date.now() - started;
      if (durationMs < MIN_SESSION_MS) return;
      recordSession({
        game: gameId,
        startedAt: new Date(started).toISOString(),
        endedAt: new Date().toISOString(),
        durationMs,
        outcome: "played",
        daily: isTodays,
      });
    };
  }, [gameId, isTodays]);

  if (!game || !Surface) return null;

  return (
    <div className="stage">
      <div className="stage__bar">
        <Link href="/" className="stage__back">
          <ArrowLeft />
          Board
        </Link>
        <h1 className="stage__title">{game.name}</h1>
        <span className="stage__spacer" />
        {isTodays && (
          <Tag tone="live" mark="live">
            Today&rsquo;s challenge
          </Tag>
        )}
      </div>

      <div className="stage__body">
        <Surface onResult={onResult} />
      </div>
    </div>
  );
}
