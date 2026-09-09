"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LEVELS,
  applyStep,
  bestChainStep,
  colourOf,
  counts,
  other,
  outcomeOf,
  pickMove,
  resultText,
  start,
  stepsFor,
} from "../../../lib/checkers";
import { CheckersGrid } from "./grid";
import { useRoom } from "../use-room";
import { Peg } from "../../board/peg";
import { Tag } from "../../board/tag";
import { Verdict } from "../../board/verdict";
import { Copy, Cpu, Undo, Users } from "../../board/icons";

const MODES = [
  { id: "solo", label: "Solo" },
  { id: "local", label: "Two up" },
  { id: "online", label: "Online" },
];

const NAMES = { b: "Black", r: "Red" };
const IDLE_LIMIT = 80;
const HOP_MS = 260;

const fresh = () => ({
  board: start(),
  turn: "b",
  chain: null,
  path: [],
  idle: 0,
  outcome: null,
});

export default function Checkers({ onResult }) {
  const [mode, setMode] = useState("solo");
  const [level, setLevel] = useState("fair");
  const [game, setGame] = useState(fresh);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState({ b: 0, r: 0, draw: 0 });
  const [dismissed, setDismissed] = useState(false);
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const rounds = useRef(0);
  const room = useRoom("checkers");

  const local = mode !== "online";
  const online = room.state;

  /* --- local play ------------------------------------------------------- */

  const reset = useCallback(() => {
    setGame(fresh());
    setSelected(null);
  }, []);

  useEffect(() => {
    reset();
    setScore({ b: 0, r: 0, draw: 0 });
    rounds.current = 0;
  }, [mode, reset]);

  // One hop. A chain stays with the same player, so this is also how the
  // machine's multiple jumps are walked, one at a time.
  const hop = useCallback((current, from, to) => {
    const played = applyStep(current.board, from, to, current.chain);
    if (played.error) return current;

    const path = current.chain == null ? [from, to] : [...current.path, to];
    if (played.mustContinue) {
      return { ...current, board: played.board, chain: to, path };
    }

    const turn = other(current.turn);
    const idle = played.idle ? current.idle + 1 : 0;
    const outcome =
      idle >= IDLE_LIMIT ? { winner: "draw", reason: "idle" } : outcomeOf(played.board, turn);

    return { board: played.board, turn, chain: null, path, idle, outcome };
  }, []);

  // The machine answers one hop at a time: each hop changes the board, and
  // whichever of these two applies fires again. A chain therefore plays out on
  // the board rather than resolving in a single frame.
  useEffect(() => {
    if (mode !== "solo" || game.turn !== "r" || game.outcome || game.chain != null) {
      return undefined;
    }
    const id = setTimeout(() => {
      const move = pickMove(game.board, "r", level);
      if (move) setGame((current) => hop(current, move.path[0], move.path[1]));
    }, HOP_MS);
    return () => clearTimeout(id);
  }, [mode, game.board, game.turn, game.outcome, game.chain, level, hop]);

  useEffect(() => {
    if (mode !== "solo" || game.turn !== "r" || game.outcome || game.chain == null) {
      return undefined;
    }
    const id = setTimeout(() => {
      const step = bestChainStep(game.board, "r", game.chain);
      if (step) setGame((current) => hop(current, step.from, step.to));
    }, HOP_MS);
    return () => clearTimeout(id);
  }, [mode, game.board, game.turn, game.outcome, game.chain, hop]);

  // a finished local round scores itself once
  useEffect(() => {
    if (!local || !game.outcome) return;
    const winner = game.outcome.winner;
    setScore((s) => (winner === "draw" ? { ...s, draw: s.draw + 1 } : { ...s, [winner]: s[winner] + 1 }));
    rounds.current += 1;
    onResult?.({
      outcome:
        winner === "draw"
          ? "drawn"
          : mode === "solo"
          ? winner === "b"
            ? "won"
            : "lost"
          : "played",
      meta: { mode, level: mode === "solo" ? level : null, rounds: rounds.current },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.outcome]);

  /* --- online play ------------------------------------------------------ */

  const onlineOutcome =
    online?.status === "won"
      ? { winner: online.winner, reason: online.reason }
      : online?.status === "draw"
      ? { winner: "draw", reason: online.reason }
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
      ? `${window.location.origin}/play/checkers?room=${room.code}`
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
  const chain = local ? game.chain : online?.chain ?? null;
  const path = local ? game.path : online?.path ?? [];
  const tally = useMemo(() => counts(board), [board]);
  const shownOutcome = local ? game.outcome : onlineOutcome;

  const thinking = mode === "solo" && turn === "r" && !shownOutcome;

  const yourTurn = local
    ? mode === "local" || turn === "b"
    : online?.status === "playing" && online?.turn === online?.seat;

  const steps = useMemo(() => {
    if (shownOutcome) return [];
    if (!local) return online?.steps ?? [];
    return stepsFor(board, turn, chain);
  }, [board, turn, chain, local, online, shownOutcome]);

  const from = chain ?? selected;
  const targets = from == null ? [] : steps.filter((step) => step.from === from);
  const mustTake = steps.some((step) => step.captured != null);

  const boardDisabled = local
    ? !!shownOutcome || thinking || (mode === "solo" && turn !== "b")
    : !yourTurn;

  // One press does everything: pick a piece up, put it down, or take the next
  // jump in a chain. Mid-chain only the jumping piece answers.
  const press = (point) => {
    if (shownOutcome || boardDisabled) return;
    const origin = chain ?? selected;

    if (origin != null && targets.some((step) => step.to === point)) {
      if (local) setGame((current) => hop(current, origin, point));
      else room.act("move", { from: origin, to: point });
      setSelected(null);
      return;
    }

    if (chain != null) return;
    setSelected(colourOf(board[point]) === turn ? point : null);
  };

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
    ? "Drawn"
    : mode === "local"
    ? `${NAMES[shownOutcome.winner]} takes it`
    : shownOutcome.winner === you
    ? "You win"
    : "You lose";

  const statusLine = () => {
    if (shownOutcome) return resultText(shownOutcome, NAMES);
    if (chain != null) return "Keep jumping — that piece has another take.";
    if (local) {
      if (mode === "solo") {
        if (thinking) return "The machine is looking ahead.";
        return turn === "b" ? (mustTake ? "Your move — and you must take." : "Your move.") : "Red to move.";
      }
      return mustTake ? `${NAMES[turn]} to move, and must take.` : `${NAMES[turn]} to move.`;
    }
    if (!online) return "Open a room or join one with a code.";
    if (online.status === "waiting") return "Waiting for someone to take the other seat.";
    if (!yourTurn) return `Waiting on ${online.names[turn] || NAMES[turn]}.`;
    return mustTake ? "Your move — and you must take." : "Your move.";
  };

  const resign = () => {
    if (shownOutcome) return;
    if (mode === "online") {
      room.act("resign");
      return;
    }
    const loser = mode === "solo" ? "b" : turn;
    setGame((current) => ({
      ...current,
      outcome: { winner: other(loser), reason: "resignation" },
    }));
  };

  return (
    <div className="chk">
      <div className="chk__field">
        <CheckersGrid
          board={board}
          selected={from}
          targets={targets}
          path={path}
          chain={chain}
          disabled={boardDisabled}
          onPress={press}>
          <Verdict
            open={!!shownOutcome && !dismissed}
            tone={tone}
            title={title}
            line={resultText(shownOutcome, NAMES)}
            actions={
              local
                ? [{ label: "Next round", onClick: reset }]
                : [{ label: "Play again", onClick: room.rematch }]
            }
            onClose={() => setDismissed(true)}
          />
        </CheckersGrid>
      </div>

      <div className="chk__side">
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

        <div className="readout">
          <div className="readout__item">
            <span className="readout__label">Black</span>
            <span className="readout__value">{tally.b}</span>
          </div>
          <div className="readout__item">
            <span className="readout__label">Kings</span>
            <span className="readout__value">{tally.bKings + tally.rKings}</span>
          </div>
          <div className="readout__item">
            <span className="readout__label">Red</span>
            <span className="readout__value">{tally.r}</span>
          </div>
        </div>

        <div className="tools">
          <button type="button" className="tool" onClick={resign} disabled={!!shownOutcome}>
            <Undo size={16} />
            <em>Resign</em>
          </button>
        </div>

        {local ? (
          <>
            <div className="readout">
              <div className="readout__item">
                <span className="readout__label">{mode === "solo" ? "You" : "Black"}</span>
                <span className="readout__value">{score.b}</span>
              </div>
              <div className="readout__item">
                <span className="readout__label">Drawn</span>
                <span className="readout__value">{score.draw}</span>
              </div>
              <div className="readout__item">
                <span className="readout__label">{mode === "solo" ? "Machine" : "Red"}</span>
                <span className="readout__value">{score.r}</span>
              </div>
            </div>

            <button type="button" className="key" style={{ width: "100%" }} onClick={reset}>
              {shownOutcome ? "Next round" : "Restart round"}
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
                  {["b", "r"].map((seat) => (
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
                    <span className="readout__label">Drawn</span>
                    <span className="readout__value">{online.score.draw}</span>
                  </div>
                  <div className="readout__item">
                    <span className="readout__label">Red</span>
                    <span className="readout__value">{online.score.r}</span>
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
