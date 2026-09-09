"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KOMI,
  LEVELS,
  SIZES,
  emptyBoard,
  groupAt,
  other,
  pickMove,
  play,
  resultText,
  score,
  territoryOf,
} from "../../../lib/go";
import { Goban } from "./goban";
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

const NAMES = { b: "Black", w: "White" };

const fresh = (size) => ({
  board: emptyBoard(size),
  turn: "b",
  ko: null,
  last: null,
  passes: 0,
  captures: { b: 0, w: 0 },
});

export default function Go({ onResult }) {
  const [mode, setMode] = useState("solo");
  const [level, setLevel] = useState("fair");
  const [sizeId, setSizeId] = useState(9);
  const [game, setGame] = useState(() => fresh(9));
  const [history, setHistory] = useState([]);
  const [phase, setPhase] = useState("playing"); // playing | scoring | done
  const [dead, setDead] = useState([]);
  const [ended, setEnded] = useState(null); // { winner, reason, result }
  const [thinking, setThinking] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const rounds = useRef(0);
  const reported = useRef(null);

  const room = useRoom("go");
  const online = mode === "online" ? room.state : null;
  const local = mode !== "online";

  /* ------------------------------------------------------- what is shown --- */

  const view = useMemo(() => {
    if (online) {
      return {
        size: online.size,
        komi: online.komi,
        board: online.board,
        turn: online.turn,
        ko: online.ko,
        last: online.last,
        passes: online.passes,
        captures: online.captures,
        dead: online.dead,
        phase:
          online.status === "scoring"
            ? "scoring"
            : online.status === "won" || online.status === "draw"
            ? "done"
            : "playing",
        winner: online.winner,
        reason: online.reason,
        result: online.result,
        mySide: online.seat,
      };
    }
    return {
      size: sizeId,
      komi: KOMI,
      board: game.board,
      turn: game.turn,
      ko: game.ko,
      last: game.last,
      passes: game.passes,
      captures: game.captures,
      dead,
      phase,
      winner: ended?.winner ?? null,
      reason: ended?.reason ?? null,
      result: ended?.result ?? null,
      mySide: mode === "solo" ? "b" : null,
    };
  }, [online, sizeId, game, dead, phase, ended, mode]);

  const counting = view.phase === "scoring";
  const over = view.phase === "done";

  // what the count says right now, so both players can see it move
  const running = useMemo(
    () => (counting || over ? score(view.board, view.size, view.komi, view.dead) : null),
    [counting, over, view.board, view.size, view.komi, view.dead]
  );
  const territory = useMemo(
    () => (counting || over ? territoryOf(view.board, view.size, view.dead).owner : null),
    [counting, over, view.board, view.size, view.dead]
  );

  const yourTurn = view.mySide == null || view.turn === view.mySide;
  const roomReady = mode !== "online" || online?.status === "playing";
  const canPlay = view.phase === "playing" && yourTurn && roomReady && !thinking;

  /* ------------------------------------------------------------ playing --- */

  const newGame = useCallback((size) => {
    setGame(fresh(size));
    setHistory([]);
    setPhase("playing");
    setDead([]);
    setEnded(null);
    setThinking(false);
  }, []);

  useEffect(() => {
    newGame(sizeId);
    rounds.current = 0;
  }, [mode, sizeId, newGame]);

  // The updater form would run twice in development and push two history
  // entries, so both of these read the current game and write once.
  const applyLocal = useCallback(
    (point, colour) => {
      const played = play(game.board, sizeId, point, colour, game.ko);
      if (played.error) return;
      setHistory((past) => [...past, game]);
      setGame({
        board: played.board,
        turn: other(colour),
        ko: played.ko,
        last: point,
        passes: 0,
        captures: {
          ...game.captures,
          [colour]: game.captures[colour] + played.captured.length,
        },
      });
    },
    [game, sizeId]
  );

  const passLocal = useCallback(
    (colour) => {
      const passes = game.passes + 1;
      setHistory((past) => [...past, game]);
      setGame({ ...game, turn: other(colour), ko: null, last: null, passes });
      if (passes >= 2) setPhase("scoring");
    },
    [game]
  );

  const onPoint = (point) => {
    if (counting) {
      toggleDead(point);
      return;
    }
    if (!canPlay) return;
    if (mode === "online") {
      room.act("move", { point });
      return;
    }
    applyLocal(point, view.turn);
  };

  const onPass = () => {
    if (view.phase !== "playing" || !yourTurn) return;
    if (mode === "online") room.act("pass");
    else passLocal(view.turn);
  };

  const onResign = () => {
    if (over) return;
    if (mode === "online") {
      room.act("resign");
      return;
    }
    const loser = mode === "solo" ? "b" : view.turn;
    setEnded({ winner: other(loser), reason: "resignation", result: null });
    setPhase("done");
  };

  const undo = () => {
    if (!local || !history.length) return;
    // in solo play both halves come back, so it is your move again
    const steps = mode === "solo" && history.length > 1 ? 2 : 1;
    setGame(history[history.length - steps]);
    setHistory(history.slice(0, -steps));
    setPhase("playing");
    setDead([]);
    setEnded(null);
  };

  // the machine answers
  useEffect(() => {
    if (mode !== "solo" || view.phase !== "playing" || view.turn !== "w") return undefined;
    setThinking(true);
    const id = setTimeout(() => {
      const point = pickMove(game.board, sizeId, "w", level, game.ko, KOMI);
      if (point == null) passLocal("w");
      else applyLocal(point, "w");
      setThinking(false);
    }, 260);
    return () => clearTimeout(id);
  }, [mode, view.phase, view.turn, game.board, game.ko, sizeId, level, applyLocal, passLocal]);

  /* ----------------------------------------------------------- counting --- */

  const toggleDead = (point) => {
    if (!view.board[point]) return;
    if (mode === "online") {
      room.act("mark", { point });
      return;
    }
    const group = groupAt(view.board, view.size, point);
    if (!group) return;
    const marked = new Set(dead);
    const off = group.stones.every((stone) => marked.has(stone));
    for (const stone of group.stones) {
      if (off) marked.delete(stone);
      else marked.add(stone);
    }
    setDead([...marked]);
  };

  const acceptCount = () => {
    if (mode === "online") {
      room.act("accept");
      return;
    }
    const scored = score(view.board, view.size, view.komi, dead);
    setEnded({ winner: scored.winner, reason: "the count", result: scored });
    setPhase("done");
  };

  /* ------------------------------------------------------------- result --- */

  useEffect(() => {
    if (!over) return;
    const stamp =
      mode === "online" ? `${online?.code}-${online?.version}` : `local-${rounds.current}`;
    if (reported.current === stamp) return;
    reported.current = stamp;
    rounds.current += 1;
    onResult?.({
      outcome:
        !view.winner
          ? "drawn"
          : view.mySide == null
          ? "played"
          : view.winner === view.mySide
          ? "won"
          : "lost",
      meta: {
        mode,
        size: view.size,
        level: mode === "solo" ? level : null,
        room: online?.code ?? null,
      },
    });
  }, [over, view, mode, online, level, onResult]);

  useEffect(() => {
    if (!over) setDismissed(false);
  }, [over]);

  /* ------------------------------------------------------------- online --- */

  const shareLink =
    typeof window !== "undefined" && room.code
      ? `${window.location.origin}/play/go?room=${room.code}`
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

  /* --------------------------------------------------------------- copy --- */

  const statusLine = () => {
    if (over) {
      if (view.reason === "resignation") {
        return `${NAMES[view.winner]} wins by resignation.`;
      }
      return view.result ? resultText(view.result) : "The game is over.";
    }
    if (counting) {
      return "Click a group to mark it dead, then accept the count.";
    }
    if (mode === "online") {
      if (!online) return "Open a room, or join one with a code.";
      if (online.status === "waiting") return "Waiting for someone to take the other seat.";
      return yourTurn ? "Your move." : `Waiting on ${online.names[view.turn] || NAMES[view.turn]}.`;
    }
    if (mode === "solo") {
      if (thinking) return "The machine is reading.";
      return yourTurn ? "Your move." : "White to move.";
    }
    if (view.passes === 1) return `${NAMES[view.turn]} to move — one pass already.`;
    return `${NAMES[view.turn]} to move.`;
  };

  const tone = !over
    ? "neutral"
    : !view.winner
    ? "drawn"
    : view.mySide == null
    ? "won"
    : view.winner === view.mySide
    ? "won"
    : "lost";
  const title = !over
    ? ""
    : !view.winner
    ? "Drawn"
    : view.mySide == null
    ? `${NAMES[view.winner]} takes it`
    : view.winner === view.mySide
    ? "You win"
    : "You lose";

  const accepted = online?.accepted;

  return (
    <div className="go">
      <div className="go__field">
        <Goban
          board={view.board}
          size={view.size}
          turn={view.turn}
          ko={view.ko}
          last={view.last}
          dead={view.dead}
          territory={territory}
          disabled={!canPlay && !counting}
          onPlay={onPoint}>
          <Verdict
            open={over && !dismissed}
            tone={tone}
            title={title}
            line={statusLine()}
            actions={
              local
                ? [{ label: "New game", onClick: () => newGame(sizeId) }]
                : [{ label: "Play again", onClick: room.rematch }]
            }
            onClose={() => setDismissed(true)}
          />
        </Goban>
      </div>

      <div className="go__side">
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

        {local && (
          <div className="stack" style={{ gap: 10 }}>
            <span className="zone-label" style={{ margin: 0 }}>
              Board
            </span>
            <Peg
              options={SIZES.map((s) => ({ id: s.id, label: s.label }))}
              value={view.size}
              onChange={setSizeId}
              label="Board size"
            />
          </div>
        )}

        <p className="status">
          {mode === "solo" ? <Cpu size={16} /> : <Users size={16} />}
          <span>{statusLine()}</span>
        </p>

        <div className="readout">
          <div className="readout__item">
            <span className="readout__label">Black</span>
            <span className="readout__value">
              {running ? running.b.toFixed(0) : view.captures.b}
            </span>
          </div>
          <div className="readout__item">
            <span className="readout__label">Komi</span>
            <span className="readout__value">{view.komi}</span>
          </div>
          <div className="readout__item">
            <span className="readout__label">White</span>
            <span className="readout__value">
              {running ? running.w.toFixed(1) : view.captures.w}
            </span>
          </div>
        </div>

        <p className="chalk chalk--tight">
          {running
            ? "Area scoring: stones on the board plus the empty points only you surround."
            : "Stones captured so far. The count comes after both players pass."}
        </p>

        {counting ? (
          <div className="stack">
            <button type="button" className="key" style={{ width: "100%" }} onClick={acceptCount}>
              {mode === "online" && accepted?.[view.mySide]
                ? "Waiting for them…"
                : "Accept the count"}
            </button>
            {mode === "online" && (
              <p className="chalk chalk--tight">
                {accepted?.b ? "Black has accepted. " : ""}
                {accepted?.w ? "White has accepted." : ""}
              </p>
            )}
          </div>
        ) : (
          <div className="tools">
            <button
              type="button"
              className="tool"
              onClick={onPass}
              disabled={view.phase !== "playing" || !yourTurn}>
              <Undo size={16} />
              <em>Pass</em>
            </button>
            {local && (
              <button type="button" className="tool" onClick={undo} disabled={!history.length}>
                <Undo size={16} />
                <em>Undo</em>
              </button>
            )}
            <button type="button" className="tool" onClick={onResign} disabled={over}>
              <Undo size={16} />
              <em>Resign</em>
            </button>
          </div>
        )}

        {local ? (
          <button
            type="button"
            className="key"
            style={{ width: "100%" }}
            onClick={() => newGame(sizeId)}>
            New game
          </button>
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

                <div className="stack" style={{ gap: 10 }}>
                  <span className="zone-label" style={{ margin: 0 }}>
                    Board
                  </span>
                  <Peg
                    options={SIZES.map((s) => ({ id: s.id, label: s.label }))}
                    value={sizeId}
                    onChange={setSizeId}
                    label="Board size"
                  />
                </div>

                <button
                  type="button"
                  className="key"
                  style={{ width: "100%" }}
                  disabled={room.busy}
                  onClick={() => room.host(name, { size: sizeId })}>
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

                {over && (
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
