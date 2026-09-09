"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LEVELS, outcomeOf, pickMove } from "../../../lib/ttt";
import { Board } from "./board";
import { useRoom } from "../use-room";
import { Peg } from "../../board/peg";
import { Tag } from "../../board/tag";
import { Copy, Cpu, Users } from "../../board/icons";
import { Verdict } from "../../board/verdict";

const MODES = [
  { id: "solo", label: "Solo" },
  { id: "local", label: "Two up" },
  { id: "online", label: "Online" },
];

const EMPTY = () => new Array(9).fill(null);

/* ------------------------------------------------------------------ game --- */

export default function TicTacToe({ onResult, onStatus }) {
  const [mode, setMode] = useState("solo");
  const [level, setLevel] = useState("fair");
  const [board, setBoard] = useState(EMPTY);
  const [turn, setTurn] = useState("X");
  const [score, setScore] = useState({ X: 0, O: 0, draw: 0 });
  const [thinking, setThinking] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);
  const rounds = useRef(0);
  const room = useRoom();

  const local = mode !== "online";
  const outcome = useMemo(() => outcomeOf(board), [board]);
  const online = room.state;

  // --- local play ---------------------------------------------------------

  const reset = useCallback((opener = "X") => {
    setBoard(EMPTY());
    setTurn(opener);
    setThinking(false);
  }, []);

  useEffect(() => {
    reset("X");
    setScore({ X: 0, O: 0, draw: 0 });
    rounds.current = 0;
  }, [mode, reset]);

  const play = (index) => {
    if (!local || outcome || board[index] || thinking) return;
    const next = board.slice();
    next[index] = turn;
    setBoard(next);
    setTurn(turn === "X" ? "O" : "X");
  };

  // the machine answers
  useEffect(() => {
    if (mode !== "solo" || turn !== "O" || outcome) return undefined;
    setThinking(true);
    const id = setTimeout(() => {
      setBoard((current) => {
        if (outcomeOf(current)) return current;
        const index = pickMove(current, "O", level);
        if (index < 0) return current;
        const next = current.slice();
        next[index] = "O";
        return next;
      });
      setTurn("X");
      setThinking(false);
    }, 420);
    return () => clearTimeout(id);
  }, [mode, turn, outcome, level]);

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
          ? outcome.winner === "X"
            ? "won"
            : "lost"
          : "played",
      meta: { mode, level: mode === "solo" ? level : null, rounds: rounds.current },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcome]);

  useEffect(() => {
    onStatus?.({ mode, turn, outcome: outcome?.winner ?? null });
  }, [mode, turn, outcome, onStatus]);

  // --- online play --------------------------------------------------------

  const onlineOutcome =
    online?.status === "won"
      ? { winner: online.winner, line: online.line }
      : online?.status === "draw"
      ? { winner: "draw", line: null }
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
      ? `${window.location.origin}/play/tictactoe?room=${room.code}`
      : "";

  // deep link straight into a room
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

  // --- what the board shows -----------------------------------------------

  const shownBoard = local ? board : online?.board ?? EMPTY();
  const shownLine = local ? outcome?.line : onlineOutcome?.line;
  const yourTurn = local
    ? mode === "local" || turn === "X"
    : online?.status === "playing" && online?.turn === online?.seat;
  const boardDisabled = local
    ? !!outcome || thinking || (mode === "solo" && turn === "O")
    : !yourTurn;

  const shownOutcome = local ? outcome : onlineOutcome;
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (!shownOutcome) setDismissed(false);
  }, [shownOutcome]);

  const you = local ? "X" : online?.seat;
  const verdictTone = !shownOutcome
    ? "neutral"
    : shownOutcome.winner === "draw"
    ? "drawn"
    : mode === "local"
    ? "won"
    : shownOutcome.winner === you
    ? "won"
    : "lost";
  const verdictTitle = !shownOutcome
    ? ""
    : shownOutcome.winner === "draw"
    ? "Drawn"
    : mode === "local"
    ? `${shownOutcome.winner} takes it`
    : shownOutcome.winner === you
    ? "You win"
    : "You lose";

  const statusLine = () => {
    if (local) {
      if (outcome?.winner === "draw") return "Drawn. Nobody takes it.";
      if (outcome) return `${outcome.winner} takes the round.`;
      if (mode === "solo") return turn === "X" ? "Your move." : "The machine is thinking.";
      return `${turn} to move.`;
    }
    if (!online) return "Open a room or join one with a code.";
    if (online.status === "waiting") return "Waiting for someone to take the other seat.";
    if (online.status === "won")
      return online.winner === online.seat ? "You take the round." : "They take the round.";
    if (online.status === "draw") return "Drawn. Nobody takes it.";
    return yourTurn ? "Your move." : `Waiting on ${online.names[online.turn] || online.turn}.`;
  };

  return (
    <div className="ttt">
      <div className="ttt__field">
        <Board
          board={shownBoard}
          line={shownLine}
          onPlay={local ? play : room.move}
          disabled={boardDisabled}
          ghost={local ? (mode === "local" ? turn : "X") : online?.seat}>
          <Verdict
            open={!!shownOutcome && !dismissed}
            tone={verdictTone}
            title={verdictTitle}
            line={statusLine()}
            actions={
              local
                ? [
                    {
                      label: "Next round",
                      onClick: () => reset(outcome?.winner === "X" ? "O" : "X"),
                    },
                  ]
                : [{ label: "Play again", onClick: room.rematch }]
            }
            onClose={() => setDismissed(true)}
          />
        </Board>
      </div>

      <div className="ttt__side">
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

        {local ? (
          <>
            <div className="readout">
              <div className="readout__item">
                <span className="readout__label">{mode === "solo" ? "You" : "X"}</span>
                <span className="readout__value">{score.X}</span>
              </div>
              <div className="readout__item">
                <span className="readout__label">Drawn</span>
                <span className="readout__value">{score.draw}</span>
              </div>
              <div className="readout__item">
                <span className="readout__label">{mode === "solo" ? "Machine" : "O"}</span>
                <span className="readout__value">{score.O}</span>
              </div>
            </div>

            <button
              type="button"
              className="key"
              style={{ width: "100%" }}
              onClick={() => reset(outcome?.winner === "X" ? "O" : "X")}>
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
                    onChange={(e) => setName(e.target.value)}
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
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
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
                  <div className={`seat ${online.seat === "X" ? "is-you" : ""}`}>
                    <span className="seat__mark">X</span>
                    <span className="seat__name">{online.names.X || "—"}</span>
                    {online.turn === "X" && online.status === "playing" && (
                      <Tag tone="live" mark="live">
                        Turn
                      </Tag>
                    )}
                  </div>
                  <div className={`seat ${online.seat === "O" ? "is-you" : ""}`}>
                    <span className="seat__mark">O</span>
                    <span className="seat__name">
                      {online.names.O || (online.status === "waiting" ? "Open seat" : "—")}
                    </span>
                    {online.turn === "O" && online.status === "playing" && (
                      <Tag tone="live" mark="live">
                        Turn
                      </Tag>
                    )}
                  </div>
                </div>

                <div className="readout">
                  <div className="readout__item">
                    <span className="readout__label">X</span>
                    <span className="readout__value">{online.score.X}</span>
                  </div>
                  <div className="readout__item">
                    <span className="readout__label">Drawn</span>
                    <span className="readout__value">{online.score.draw}</span>
                  </div>
                  <div className="readout__item">
                    <span className="readout__label">O</span>
                    <span className="readout__value">{online.score.O}</span>
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
              Rooms live in the server that is running this site, and close two hours after
              the last move. Nothing is stored anywhere else.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
