"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  COLS,
  EMPTY,
  LEVELS,
  ROWS,
  drop,
  landingRow,
  outcomeOf,
  pickMove,
} from "../../../lib/connect4";
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

const NAMES = { R: "Red", Y: "Yellow" };

/* ----------------------------------------------------------------- grid --- */

function Grid({ board, line, last, onDrop, disabled, ghost, children }) {
  const [over, setOver] = useState(null);
  const landing = over == null ? -1 : landingRow(board, over);

  return (
    <div className="c4__gridwrap">
      <div className="c4__grid" role="grid" aria-label="Connect Four board" onPointerLeave={() => setOver(null)}>
        {Array.from({ length: ROWS * COLS }, (_, cell) => {
          const row = Math.floor(cell / COLS);
          const col = cell % COLS;
          const disc = board[cell];
          const win = line?.includes(cell);
          return (
            <button
              key={cell}
              type="button"
              role="gridcell"
              className={[
                "c4__cell",
                over === col ? "is-column" : "",
                win ? "is-win" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={disabled || landingRow(board, col) < 0}
              onPointerEnter={() => setOver(col)}
              onFocus={() => setOver(col)}
              onClick={() => onDrop(col)}
              aria-label={`Column ${col + 1}, row ${ROWS - row}${
                disc ? `, ${NAMES[disc]}` : ", empty"
              }`}>
              <span className="c4__hole">
                {disc && (
                  <span
                    className={`c4__disc c4__disc--${disc.toLowerCase()} ${
                      cell === last ? "is-dropping" : ""
                    }`}
                    style={{ "--fall": row + 1 }}
                  />
                )}
                {!disc && ghost && row === landing && !disabled && (
                  <span className={`c4__disc c4__disc--${ghost.toLowerCase()} is-ghost`} />
                )}
              </span>
            </button>
          );
        })}
      </div>
      {children}
    </div>
  );
}

/* ----------------------------------------------------------------- game --- */

export default function Connect4({ onResult }) {
  const [mode, setMode] = useState("solo");
  const [level, setLevel] = useState("fair");
  const [board, setBoard] = useState(EMPTY);
  const [turn, setTurn] = useState("R");
  const [last, setLast] = useState(null);
  const [score, setScore] = useState({ R: 0, Y: 0, draw: 0 });
  const [thinking, setThinking] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);
  const rounds = useRef(0);
  const room = useRoom("connect4");

  const local = mode !== "online";
  const outcome = useMemo(() => outcomeOf(board), [board]);
  const online = room.state;

  /* --- local play ------------------------------------------------------- */

  const reset = useCallback((opener = "R") => {
    setBoard(EMPTY());
    setTurn(opener);
    setLast(null);
    setThinking(false);
  }, []);

  useEffect(() => {
    reset("R");
    setScore({ R: 0, Y: 0, draw: 0 });
    rounds.current = 0;
  }, [mode, reset]);

  const play = (col) => {
    if (!local || outcome || thinking) return;
    const played = drop(board, col, turn);
    if (!played) return;
    setBoard(played.board);
    setLast(played.at);
    setTurn(turn === "R" ? "Y" : "R");
  };

  // the machine answers
  useEffect(() => {
    if (mode !== "solo" || turn !== "Y" || outcome) return undefined;
    setThinking(true);
    const id = setTimeout(() => {
      setBoard((current) => {
        if (outcomeOf(current)) return current;
        const col = pickMove(current, "Y", level);
        if (col < 0) return current;
        const played = drop(current, col, "Y");
        if (!played) return current;
        setLast(played.at);
        return played.board;
      });
      setTurn("R");
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
          ? outcome.winner === "R"
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
      ? `${window.location.origin}/play/connect4?room=${room.code}`
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

  const shownBoard = local ? board : online?.board ?? EMPTY();
  const shownOutcome = local ? outcome : onlineOutcome;
  const shownLine = shownOutcome?.line ?? null;
  const shownLast = local ? last : online?.last ?? null;
  const yourTurn = local
    ? mode === "local" || turn === "R"
    : online?.status === "playing" && online?.turn === online?.seat;
  const boardDisabled = local
    ? !!outcome || thinking || (mode === "solo" && turn === "Y")
    : !yourTurn;

  useEffect(() => {
    if (!shownOutcome) setDismissed(false);
  }, [shownOutcome]);

  const you = local ? "R" : online?.seat;
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
    ? "Drawn"
    : mode === "local"
    ? `${NAMES[shownOutcome.winner]} takes it`
    : shownOutcome.winner === you
    ? "You win"
    : "You lose";

  const statusLine = () => {
    if (local) {
      if (outcome?.winner === "draw") return "Drawn. The grid is full.";
      if (outcome) return `${NAMES[outcome.winner]} takes the round.`;
      if (mode === "solo") return turn === "R" ? "Your move." : "The machine is thinking.";
      return `${NAMES[turn]} to move.`;
    }
    if (!online) return "Open a room or join one with a code.";
    if (online.status === "waiting") return "Waiting for someone to take the other seat.";
    if (online.status === "won")
      return online.winner === online.seat ? "You take the round." : "They take the round.";
    if (online.status === "draw") return "Drawn. The grid is full.";
    return yourTurn ? "Your move." : `Waiting on ${online.names[online.turn] || online.turn}.`;
  };

  return (
    <div className="c4">
      <div className="c4__field">
        <Grid
          board={shownBoard}
          line={shownLine}
          last={shownLast}
          onDrop={local ? play : (col) => room.move({ col })}
          disabled={boardDisabled}
          ghost={local ? turn : online?.seat}>
          <Verdict
            open={!!shownOutcome && !dismissed}
            tone={tone}
            title={title}
            line={statusLine()}
            actions={
              local
                ? [
                    {
                      label: "Next round",
                      onClick: () => reset(outcome?.winner === "R" ? "Y" : "R"),
                    },
                  ]
                : [{ label: "Play again", onClick: room.rematch }]
            }
            onClose={() => setDismissed(true)}
          />
        </Grid>
      </div>

      <div className="c4__side">
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
                <span className="readout__label">{mode === "solo" ? "You" : "Red"}</span>
                <span className="readout__value">{score.R}</span>
              </div>
              <div className="readout__item">
                <span className="readout__label">Drawn</span>
                <span className="readout__value">{score.draw}</span>
              </div>
              <div className="readout__item">
                <span className="readout__label">{mode === "solo" ? "Machine" : "Yellow"}</span>
                <span className="readout__value">{score.Y}</span>
              </div>
            </div>

            <button
              type="button"
              className="key"
              style={{ width: "100%" }}
              onClick={() => reset(outcome?.winner === "R" ? "Y" : "R")}>
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
                  {["R", "Y"].map((seat) => (
                    <div key={seat} className={`seat ${online.seat === seat ? "is-you" : ""}`}>
                      <span className={`seat__disc seat__disc--${seat.toLowerCase()}`} />
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
                    <span className="readout__label">Red</span>
                    <span className="readout__value">{online.score.R}</span>
                  </div>
                  <div className="readout__item">
                    <span className="readout__label">Drawn</span>
                    <span className="readout__value">{online.score.draw}</span>
                  </div>
                  <div className="readout__item">
                    <span className="readout__label">Yellow</span>
                    <span className="readout__value">{online.score.Y}</span>
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
