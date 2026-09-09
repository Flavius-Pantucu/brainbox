"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LEVELS,
  advance,
  applyPlay,
  isOver,
  nextPlays,
  other,
  pickSequence,
  pipCount,
  resultText,
  roll,
  start,
  turnOptions,
} from "../../../lib/backgammon";
import { BackgammonBoard } from "./board";
import { Dice } from "./dice";
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

const NAMES = { w: "White", b: "Black" };
const HOP_MS = 520;
const THROW_MS = 820; // long enough for the dice to land before anything moves

const fresh = () => ({
  state: start(),
  turn: Math.random() < 0.5 ? "w" : "b",
  dice: [],
  used: [],
  sequences: [],
  played: [],
  opened: null, // the position the turn started from, for taking it back
  outcome: null,
});

// Which die a play spends: the first one of that number still on the table.
function spend(used, dice, die) {
  const next = used.slice();
  for (let i = 0; i < dice.length; i += 1) {
    if (dice[i] === die && !next[i]) {
      next[i] = true;
      break;
    }
  }
  return next;
}

const turnDone = (sequences) => !sequences.length || sequences.every((path) => !path.length);

export default function Backgammon({ onResult }) {
  const [mode, setMode] = useState("solo");
  const [level, setLevel] = useState("fair");
  const [game, setGame] = useState(fresh);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState({ w: 0, b: 0 });
  const [dismissed, setDismissed] = useState(false);
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const rounds = useRef(0);
  const room = useRoom("backgammon");

  const local = mode !== "online";
  const online = room.state;

  const reset = useCallback(() => {
    setGame(fresh());
    setSelected(null);
  }, []);

  useEffect(() => {
    reset();
    setScore({ w: 0, b: 0 });
    rounds.current = 0;
  }, [mode, reset]);

  /* --- the turn --------------------------------------------------------- */

  const rollFor = useCallback((current) => {
    const dice = roll();
    return {
      ...current,
      dice,
      used: dice.map(() => false),
      sequences: turnOptions(current.state, current.turn, dice),
      played: [],
      opened: current.state,
    };
  }, []);

  const playOne = useCallback((current, from, to) => {
    const play = nextPlays(current.sequences).find((p) => p.from === from && p.to === to);
    if (!play) return current;

    const state = applyPlay(current.state, current.turn, play);
    const sequences = advance(current.sequences, from, to);
    const outcome = isOver(state);

    return {
      ...current,
      state,
      sequences,
      used: spend(current.used, current.dice, play.die),
      played: [...current.played, play],
      outcome,
    };
  }, []);

  // rolling, and handing the dice over when there is nothing to do with them
  useEffect(() => {
    if (!local || game.outcome) return undefined;
    if (game.dice.length) return undefined;
    const id = setTimeout(() => setGame((current) => rollFor(current)), 260);
    return () => clearTimeout(id);
  }, [local, game.outcome, game.dice.length, rollFor]);

  useEffect(() => {
    if (!local || game.outcome || !game.dice.length) return undefined;
    if (!turnDone(game.sequences)) return undefined;
    const wait = game.played.length ? HOP_MS : THROW_MS + 500; // a blocked roll is worth seeing
    const id = setTimeout(() => {
      setGame((current) => ({
        ...current,
        turn: other(current.turn),
        dice: [],
        used: [],
        sequences: [],
        opened: null,
      }));
      setSelected(null);
    }, wait);
    return () => clearTimeout(id);
  }, [local, game.outcome, game.dice.length, game.sequences, game.played.length]);

  // the machine takes its whole turn, one checker at a time
  useEffect(() => {
    if (mode !== "solo" || game.outcome || game.turn !== "b") return undefined;
    if (!game.dice.length || turnDone(game.sequences)) return undefined;

    const id = setTimeout(() => {
      setGame((current) => {
        if (current.turn !== "b" || turnDone(current.sequences)) return current;
        const path = pickSequence(current.state, "b", current.dice.filter((_, i) => !current.used[i]), level);
        const play = path?.[0] ?? nextPlays(current.sequences)[0];
        if (!play) return current;
        return playOne(current, play.from, play.to);
      });
    }, game.played.length ? HOP_MS : THROW_MS);
    return () => clearTimeout(id);
  }, [
    mode,
    game.outcome,
    game.turn,
    game.dice,
    game.used,
    game.sequences,
    game.played.length,
    level,
    playOne,
  ]);

  /* --- results ---------------------------------------------------------- */

  useEffect(() => {
    if (!local || !game.outcome) return;
    setScore((s) => ({ ...s, [game.outcome.winner]: s[game.outcome.winner] + game.outcome.value }));
    rounds.current += 1;
    onResult?.({
      outcome:
        mode === "solo" ? (game.outcome.winner === "w" ? "won" : "lost") : "played",
      meta: { mode, level: mode === "solo" ? level : null, value: game.outcome.value },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.outcome]);

  const onlineOutcome =
    online?.status === "won" ? { winner: online.winner, value: online.value, reason: online.reason } : null;

  const reportedRound = useRef(null);
  useEffect(() => {
    if (mode !== "online" || !online || !onlineOutcome) return;
    const stamp = `${online.code}-${online.version}`;
    if (reportedRound.current === stamp) return;
    reportedRound.current = stamp;
    onResult?.({
      outcome: onlineOutcome.winner === online.seat ? "won" : "lost",
      meta: { mode: "online", room: online.code, value: onlineOutcome.value },
    });
  }, [mode, online, onlineOutcome, onResult]);

  /* --- online ----------------------------------------------------------- */

  const shareLink =
    typeof window !== "undefined" && room.code
      ? `${window.location.origin}/play/backgammon?room=${room.code}`
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

  const board = local ? game.state : online?.state ?? start();
  const turn = local ? game.turn : online?.turn ?? "w";
  const dice = local ? game.dice : online?.dice ?? [];
  const used = local ? game.used : online?.used ?? [];
  const played = local ? game.played : online?.played ?? [];
  const shownOutcome = local ? game.outcome : onlineOutcome;
  const mySide = local ? (mode === "solo" ? "w" : null) : online?.seat ?? null;

  const yourTurn = mySide == null || turn === mySide;
  const roomReady = mode !== "online" || online?.status === "playing";
  const plays = useMemo(() => {
    if (shownOutcome || !yourTurn || !roomReady) return [];
    if (!local) return online?.plays ?? [];
    return nextPlays(game.sequences);
  }, [shownOutcome, yourTurn, roomReady, local, online, game.sequences]);

  const press = (point) => {
    if (!plays.length) return;
    if (selected != null) {
      const play = plays.find((p) => p.from === selected && p.to === point);
      if (play) {
        if (local) setGame((current) => playOne(current, selected, point));
        else room.act("move", { from: selected, to: point });
        setSelected(null);
        return;
      }
    }
    setSelected(plays.some((p) => p.from === point) ? point : null);
  };

  const takeBack = () => {
    if (local) {
      setGame((current) => {
        if (!current.opened || !current.played.length) return current;
        return {
          ...current,
          state: current.opened,
          sequences: turnOptions(current.opened, current.turn, current.dice),
          used: current.dice.map(() => false),
          played: [],
          outcome: null,
        };
      });
    } else {
      room.act("undo");
    }
    setSelected(null);
  };

  useEffect(() => {
    if (!shownOutcome) setDismissed(false);
  }, [shownOutcome]);

  const tone = !shownOutcome
    ? "neutral"
    : mySide == null
    ? "won"
    : shownOutcome.winner === mySide
    ? "won"
    : "lost";
  const title = !shownOutcome
    ? ""
    : mySide == null
    ? `${NAMES[shownOutcome.winner]} takes it`
    : shownOutcome.winner === mySide
    ? "You win"
    : "You lose";

  const statusLine = () => {
    if (shownOutcome) return resultText(shownOutcome, NAMES);
    if (mode === "online" && !online) return "Open a room or join one with a code.";
    if (mode === "online" && online?.status === "waiting") {
      return "Waiting for someone to take the other seat.";
    }
    if (!local && online?.blocked) {
      return `${NAMES[online.blocked.colour]} rolled ${online.blocked.dice
        .slice(0, 2)
        .join(" and ")} and could not move.`;
    }
    if (!dice.length) return `${NAMES[turn]} to roll.`;
    if (!plays.length && yourTurn) return "Nothing to play with that roll.";
    if (!yourTurn) return mode === "solo" ? "The machine is moving." : `Waiting on ${NAMES[turn]}.`;
    return selected == null ? "Pick a checker." : "And where it goes.";
  };

  return (
    <div className="bg">
      <div className="bg__field">
        <BackgammonBoard
          state={board}
          plays={plays}
          selected={selected}
          last={played}
          disabled={!plays.length}
          onPress={press}>
          <div className="bg__dice">
            <Dice dice={dice} used={used} />
          </div>
          <Verdict
            open={!!shownOutcome && !dismissed}
            tone={tone}
            title={title}
            line={resultText(shownOutcome, NAMES)}
            actions={
              local
                ? [{ label: "New game", onClick: reset }]
                : [{ label: "Play again", onClick: room.rematch }]
            }
            onClose={() => setDismissed(true)}
          />
        </BackgammonBoard>
      </div>

      <div className="bg__side">
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
            <span className="readout__label">White pips</span>
            <span className="readout__value">{pipCount(board, "w")}</span>
          </div>
          <div className="readout__item">
            <span className="readout__label">Bar</span>
            <span className="readout__value">{board.bar.w + board.bar.b}</span>
          </div>
          <div className="readout__item">
            <span className="readout__label">Black pips</span>
            <span className="readout__value">{pipCount(board, "b")}</span>
          </div>
        </div>

        <div className="tools">
          <button
            type="button"
            className="tool"
            onClick={takeBack}
            disabled={!played.length || !yourTurn || !!shownOutcome}>
            <Undo size={16} />
            <em>Take back</em>
          </button>
          {mode === "online" && online?.status === "playing" && (
            <button type="button" className="tool" onClick={() => room.act("resign")}>
              <Undo size={16} />
              <em>Resign</em>
            </button>
          )}
        </div>

        {local ? (
          <>
            <div className="readout">
              <div className="readout__item">
                <span className="readout__label">{mode === "solo" ? "You" : "White"}</span>
                <span className="readout__value">{score.w}</span>
              </div>
              <div className="readout__item">
                <span className="readout__label">Games</span>
                <span className="readout__value">{rounds.current}</span>
              </div>
              <div className="readout__item">
                <span className="readout__label">{mode === "solo" ? "Machine" : "Black"}</span>
                <span className="readout__value">{score.b}</span>
              </div>
            </div>

            <button type="button" className="key" style={{ width: "100%" }} onClick={reset}>
              {shownOutcome ? "New game" : "Start over"}
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
                  {["w", "b"].map((seat) => (
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

                {shownOutcome && (
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
              The dice are the server&rsquo;s to roll. Rooms live in the server running this site
              and close two hours after the last move.
            </p>
          </div>
        )}

        <p className="chalk chalk--tight">
          Press a checker, then where it goes. Both dice must be played if any order allows it,
          and if only one can be, it is the higher one. No doubling cube.
        </p>
      </div>
    </div>
  );
}
