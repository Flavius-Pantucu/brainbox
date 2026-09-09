"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LEVELS,
  counts,
  legalMoves,
  other,
  outcomeOf,
  pickMove,
  play,
  resultText,
  start,
  turnAfter,
} from "../../../lib/reversi";
import { ReversiGrid } from "./grid";
import { useRoom } from "../use-room";
import { Peg } from "../../board/peg";
import { Tag } from "../../board/tag";
import { Verdict } from "../../board/verdict";
import { Copy, Cpu, Users } from "../../board/icons";

const MODES = [
  { id: "solo", label: "Solo" },
  { id: "local", label: "Two up" },
  { id: "online", label: "Online" },
];

const NAMES = { b: "Black", w: "White" };

const fresh = () => ({ board: start(), turn: "b", last: null, flipped: [], passed: false });

export default function Reversi({ onResult }) {
  const [mode, setMode] = useState("solo");
  const [level, setLevel] = useState("fair");
  const [game, setGame] = useState(fresh);
  const [score, setScore] = useState({ b: 0, w: 0, draw: 0 });
  const [thinking, setThinking] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const rounds = useRef(0);
  const room = useRoom("reversi");

  const local = mode !== "online";
  const online = room.state;
  const outcome = useMemo(() => outcomeOf(game.board), [game.board]);

  /* --- local play ------------------------------------------------------- */

  const reset = useCallback(() => {
    setGame(fresh());
    setThinking(false);
  }, []);

  useEffect(() => {
    reset();
    setScore({ b: 0, w: 0, draw: 0 });
    rounds.current = 0;
  }, [mode, reset]);

  const applyLocal = useCallback((board, point, disc) => {
    const played = play(board, point, disc);
    if (played.error) return;
    const next = turnAfter(played.board, disc);
    setGame({
      board: played.board,
      turn: next,
      last: point,
      flipped: played.flipped,
      // the turn coming straight back means the other side had nowhere to go
      passed: next === disc,
    });
  }, []);

  const playLocal = (point) => {
    if (!local || outcome || thinking || !game.turn) return;
    if (mode === "solo" && game.turn !== "b") return;
    applyLocal(game.board, point, game.turn);
  };

  // the machine answers
  useEffect(() => {
    if (mode !== "solo" || game.turn !== "w" || outcome) return undefined;
    setThinking(true);
    const id = setTimeout(() => {
      const point = pickMove(game.board, "w", level);
      if (point != null) applyLocal(game.board, point, "w");
      setThinking(false);
    }, 380);
    return () => clearTimeout(id);
  }, [mode, game.board, game.turn, outcome, level, applyLocal]);

  // a finished local round scores itself once
  useEffect(() => {
    if (!local || !outcome) return;
    setScore((s) => {
      if (outcome.winner === "draw") return { ...s, draw: s.draw + 1 };
      return { ...s, [outcome.winner]: s[outcome.winner] + 1 };
    });
    rounds.current += 1;
    onResult?.({
      outcome:
        outcome.winner === "draw"
          ? "drawn"
          : mode === "solo"
          ? outcome.winner === "b"
            ? "won"
            : "lost"
          : "played",
      meta: { mode, level: mode === "solo" ? level : null, rounds: rounds.current },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcome]);

  /* --- online play ------------------------------------------------------ */

  const onlineOutcome =
    online?.status === "won"
      ? { winner: online.winner, counts: online.counts }
      : online?.status === "draw"
      ? { winner: "draw", counts: online.counts }
      : null;

  const reportedRound = useRef(null);
  useEffect(() => {
    if (mode !== "online" || !online || !onlineOutcome) return;
    const stamp = `${online.code}-${online.version}`;
    if (reportedRound.current === stamp) return;
    reportedRound.current = stamp;
    onResult?.({
      outcome:
        onlineOutcome.winner === "draw"
          ? "drawn"
          : onlineOutcome.winner === online.seat
          ? "won"
          : "lost",
      meta: { mode: "online", room: online.code },
    });
  }, [mode, online, onlineOutcome, onResult]);

  const shareLink =
    typeof window !== "undefined" && room.code
      ? `${window.location.origin}/play/reversi?room=${room.code}`
      : "";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const invited = new URLSearchParams(window.location.search).get("room");
    if (!invited) return;
    setMode("online");
    setJoinCode(invited.toUpperCase());
  }, []);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  /* --- what the board shows --------------------------------------------- */

  const board = local ? game.board : online?.board ?? start();
  const turn = local ? game.turn : online?.turn ?? "b";
  const last = local ? game.last : online?.last ?? null;
  const flipped = local ? game.flipped : online?.flipped ?? [];
  const tally = useMemo(() => counts(board), [board]);
  const shownOutcome = local ? outcome : onlineOutcome;

  const yourTurn = local
    ? mode === "local" || turn === "b"
    : online?.status === "playing" && online?.turn === online?.seat;

  const moves = useMemo(() => {
    if (!turn || shownOutcome) return [];
    if (!local) return online?.moves ?? [];
    return [...legalMoves(board, turn).keys()];
  }, [board, turn, local, online, shownOutcome]);

  const boardDisabled = local
    ? !!outcome || thinking || (mode === "solo" && turn !== "b")
    : !yourTurn;

  useEffect(() => {
    if (!shownOutcome) setDismissed(false);
  }, [shownOutcome]);

  const you = local ? "b" : online?.seat;
  const tone = !shownOutcome
    ? "neutral"
    : shownOutcome.winner === "draw"
    ? "drawn"
    : mode === "local"
    ? "won"
    : shownOutcome.winner === you
    ? "won"
    : "lost";
  const title = !shownOutcome
    ? ""
    : shownOutcome.winner === "draw"
    ? "Level"
    : mode === "local"
    ? `${NAMES[shownOutcome.winner]} takes it`
    : shownOutcome.winner === you
    ? "You win"
    : "You lose";

  // a side with nowhere to play sits it out, which needs saying
  const passed = !shownOutcome && (local ? game.passed : !!online?.passed);

  const statusLine = () => {
    if (shownOutcome) return resultText(shownOutcome);
    if (local) {
      if (mode === "solo") {
        if (thinking) return "The machine is counting.";
        return turn === "b" ? "Your move." : "The machine to move.";
      }
      return `${NAMES[turn]} to move.`;
    }
    if (!online) return "Open a room or join one with a code.";
    if (online.status === "waiting") return "Waiting for someone to take the other seat.";
    return yourTurn ? "Your move." : `Waiting on ${online.names[turn] || NAMES[turn]}.`;
  };

  return (
    <div className="rev">
      <div className="rev__field">
        <ReversiGrid
          board={board}
          turn={turn}
          moves={moves}
          last={last}
          flipped={flipped}
          disabled={boardDisabled}
          onPlay={local ? playLocal : (point) => room.act("move", { point })}>
          <Verdict
            open={!!shownOutcome && !dismissed}
            tone={tone}
            title={title}
            line={resultText(shownOutcome)}
            actions={
              local
                ? [{ label: "Next round", onClick: reset }]
                : [{ label: "Play again", onClick: room.rematch }]
            }
            onClose={() => setDismissed(true)}
          />
        </ReversiGrid>
      </div>

      <div className="rev__side">
        <div className="stack" style={{ gap: 10 }}>
          <span className="zone-label" style={{ margin: 0 }}>
            Opponent
          </span>
          <Peg options={MODES} value={mode} onChange={setMode} label="Opponent" />
        </div>

        {mode === "solo" && (
          <div className="stack" style={{ gap: 10 }}>
            <span className="zone-label" style={{ margin: 0 }}>
              Machine
            </span>
            <Peg options={LEVELS} value={level} onChange={setLevel} label="Machine level" />
          </div>
        )}

        <p className="status">
          {mode === "solo" ? <Cpu size={16} /> : <Users size={16} />}
          <span>{statusLine()}</span>
        </p>

        {passed && (
          <p className="chalk chalk--tight">
            {NAMES[other(turn)]} had nowhere to play, so the turn came straight back.
          </p>
        )}

        <div className="readout">
          <div className="readout__item">
            <span className="readout__label">Black</span>
            <span className="readout__value">{tally.b}</span>
          </div>
          <div className="readout__item">
            <span className="readout__label">Open</span>
            <span className="readout__value">{64 - tally.b - tally.w}</span>
          </div>
          <div className="readout__item">
            <span className="readout__label">White</span>
            <span className="readout__value">{tally.w}</span>
          </div>
        </div>

        {local ? (
          <>
            <div className="readout">
              <div className="readout__item">
                <span className="readout__label">{mode === "solo" ? "You" : "Black"}</span>
                <span className="readout__value">{score.b}</span>
              </div>
              <div className="readout__item">
                <span className="readout__label">Level</span>
                <span className="readout__value">{score.draw}</span>
              </div>
              <div className="readout__item">
                <span className="readout__label">{mode === "solo" ? "Machine" : "White"}</span>
                <span className="readout__value">{score.w}</span>
              </div>
            </div>

            <button type="button" className="key" style={{ width: "100%" }} onClick={reset}>
              {outcome ? "Next round" : "Restart round"}
            </button>
          </>
        ) : (
          <div className="stack">
            {!online ? (
              <>
                <label className="field">
                  <span className="field__label">Your name</span>
                  <input
                    className="field__input"
                    value={name}
                    maxLength={18}
                    placeholder="Optional"
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>

                <button
                  type="button"
                  className="key"
                  style={{ width: "100%" }}
                  disabled={room.busy}
                  onClick={() => room.host(name)}>
                  {room.busy ? "Opening…" : "Open a room"}
                </button>

                <div className="rule">
                  <span>or</span>
                </div>

                <label className="field">
                  <span className="field__label">Room code</span>
                  <input
                    className="field__input field__input--code"
                    value={joinCode}
                    maxLength={4}
                    placeholder="ABCD"
                    onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                  />
                </label>

                <button
                  type="button"
                  className="key key--quiet"
                  style={{ width: "100%" }}
                  disabled={room.busy || joinCode.length !== 4}
                  onClick={() => room.join(joinCode, name)}>
                  Join that room
                </button>
              </>
            ) : (
              <>
                <div className="roomcode">
                  <span className="roomcode__label">Room</span>
                  <strong className="roomcode__value">{online.code}</strong>
                  <button
                    type="button"
                    className="roomcode__copy"
                    onClick={copyLink}
                    title="Copy the invite link">
                    <Copy size={16} />
                    <span className="sr-only">Copy the invite link</span>
                  </button>
                </div>

                {copied && (
                  <p className="chalk chalk--tight" role="status">
                    Invite link copied. Send it to whoever you want to play.
                  </p>
                )}

                <div className="seats">
                  {["b", "w"].map((seat) => (
                    <div key={seat} className={`seat ${online.seat === seat ? "is-you" : ""}`}>
                      <span className={`seat__stone seat__stone--${seat}`} />
                      <span className="seat__name">
                        {online.names[seat] || (online.status === "waiting" ? "Open seat" : "—")}
                      </span>
                      {online.turn === seat && online.status === "playing" && (
                        <Tag tone="live" mark="live">
                          Turn
                        </Tag>
                      )}
                    </div>
                  ))}
                </div>

                <div className="readout">
                  <div className="readout__item">
                    <span className="readout__label">Black</span>
                    <span className="readout__value">{online.score.b}</span>
                  </div>
                  <div className="readout__item">
                    <span className="readout__label">Level</span>
                    <span className="readout__value">{online.score.draw}</span>
                  </div>
                  <div className="readout__item">
                    <span className="readout__label">White</span>
                    <span className="readout__value">{online.score.w}</span>
                  </div>
                </div>

                {onlineOutcome && (
                  <button
                    type="button"
                    className="key"
                    style={{ width: "100%" }}
                    onClick={room.rematch}>
                    {online.rematch[online.seat] ? "Waiting for them…" : "Play again"}
                  </button>
                )}

                <div className="row" style={{ gap: 8 }}>
                  <Tag tone={room.live ? "live" : "off"} mark={room.live ? "live" : "off"}>
                    {room.live ? "Connected" : "Reconnecting"}
                  </Tag>
                  <button type="button" className="key key--quiet" onClick={room.leave}>
                    Leave
                  </button>
                </div>
              </>
            )}

            {room.error && (
              <p className="notice" role="alert">
                {room.error}
              </p>
            )}

            <p className="chalk chalk--tight">
              Rooms live in the server that is running this site, and close two hours after the
              last move. Nothing is stored anywhere else.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
