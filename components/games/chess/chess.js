"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Board } from "./board";
import { EvalBar } from "./eval-bar";
import { MoveList } from "./move-list";
import { ReviewPanel, useReview } from "./review";
import { useEngine } from "./use-engine";
import { useRoom } from "../use-room";
import { Peg } from "../../board/peg";
import { Tag } from "../../board/tag";
import { Bulb, Copy, Cpu, Undo, Users } from "../../board/icons";
import {
  START_FEN,
  fenTurn,
  materialFrom,
  outcomeOf,
  pieceImage,
  resultLine,
  whiteScore,
} from "../../../lib/chess-core";

const MODES = [
  { id: "analysis", label: "Analysis" },
  { id: "bot", label: "Bot" },
  { id: "online", label: "Online" },
];

// Skill Level is Stockfish's own handicap: it plays weaker moves on purpose
// rather than simply searching less deeply.
const LEVELS = [
  { id: "learner", label: "Learner", skill: 0, depth: 1 },
  { id: "casual", label: "Casual", skill: 3, depth: 4 },
  { id: "club", label: "Club", skill: 8, depth: 8 },
  { id: "sharp", label: "Sharp", skill: 14, depth: 12 },
  { id: "brutal", label: "Brutal", skill: 20, depth: 16 },
];

const SIDES = [
  { id: "w", label: "White" },
  { id: "b", label: "Black" },
  { id: "random", label: "Random" },
];

const LIVE_DEPTH = 16;

function snapshot(game) {
  return {
    fen: game.fen(),
    moves: game.history({ verbose: true }),
    turn: game.turn(),
    check: game.isCheck(),
    outcome: outcomeOf(game),
  };
}

function kingSquare(chess, color) {
  for (const row of chess.board()) {
    for (const piece of row) {
      if (piece && piece.type === "k" && piece.color === color) return piece.square;
    }
  }
  return null;
}

// What one side has taken, and by how much they are up. The pile shows the
// opponent's pieces, so it is drawn in the opponent's colour.
function Taken({ seat, material }) {
  const types = material.taken[seat];
  const colour = seat === "w" ? "b" : "w";
  const lead = seat === "w" ? material.score : -material.score;
  if (!types.length) return <span className="taken" />;
  return (
    <span className="taken">
      {types.map((type, i) => (
        <img key={`${type}${i}`} src={pieceImage(colour, type)} alt="" />
      ))}
      {lead > 0 && <em>+{lead}</em>}
    </span>
  );
}

export default function ChessGame({ onResult }) {
  const [mode, setMode] = useState("analysis");
  const [levelId, setLevelId] = useState("club");
  const [sideChoice, setSideChoice] = useState("w");
  const [orientation, setOrientation] = useState("w");
  const [engineOn, setEngineOn] = useState(true);
  const [selected, setSelected] = useState(null);
  const [promotion, setPromotion] = useState(null);
  const [marks, setMarks] = useState([]);
  const [arrows, setArrows] = useState([]);
  const [cursor, setCursor] = useState(-1);
  const [score, setScore] = useState(null);
  const [pv, setPv] = useState([]);
  const [thinking, setThinking] = useState(false);
  const [botThinking, setBotThinking] = useState(false);
  const [botSide, setBotSide] = useState("b");
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [loadText, setLoadText] = useState("");
  const [loadError, setLoadError] = useState(null);
  const [showReview, setShowReview] = useState(false);

  const gameRef = useRef(null);
  if (gameRef.current === null) gameRef.current = new Chess();
  const [local, setLocal] = useState(() => snapshot(gameRef.current));

  const sounds = useRef(null);
  const seen = useRef(0);
  const reported = useRef(null);

  const engine = useEngine();
  const review = useReview(engine);
  const room = useRoom("chess");
  const level = LEVELS.find((l) => l.id === levelId) || LEVELS[2];
  const online = mode === "online" ? room.state : null;

  useEffect(() => {
    sounds.current = {
      move: new Audio("/sounds/move.mp3"),
      capture: new Audio("/sounds/capture.mp3"),
      castle: new Audio("/sounds/castle.mp3"),
    };
  }, []);

  /* ------------------------------------------------------------- the game --- */

  const view = useMemo(() => {
    if (online) {
      return {
        moves: online.moves || [],
        fen: online.fen || START_FEN,
        turn: online.turn || "w",
        check: !!online.check,
        status: online.status,
        winner: online.winner,
        reason: online.reason,
        names: { w: online.names.w || "White", b: online.names.b || "Black" },
        mySide: online.seat,
        over: online.status === "won" || online.status === "draw",
      };
    }
    const you = botSide === "w" ? "b" : "w";
    const names =
      mode === "bot"
        ? botSide === "w"
          ? { w: level.label, b: "You" }
          : { w: "You", b: level.label }
        : { w: "White", b: "Black" };
    return {
      moves: local.moves,
      fen: local.fen,
      turn: local.turn,
      check: local.check,
      status: local.outcome.status,
      winner: local.outcome.winner,
      reason: local.outcome.reason,
      names,
      mySide: mode === "bot" ? you : null, // analysis: both sides are yours
      over: local.outcome.over,
    };
  }, [online, local, mode, botSide, level]);

  // the board follows the newest move unless you have walked back through them
  useEffect(() => {
    setCursor(view.moves.length - 1);
  }, [view.moves.length]);

  const atLive = cursor >= view.moves.length - 1;
  const shownFen = !view.moves.length
    ? view.fen
    : atLive
    ? view.fen
    : cursor < 0
    ? view.moves[0].before
    : view.moves[cursor].after;

  const shown = useMemo(() => new Chess(shownFen), [shownFen]);
  const live = useMemo(() => new Chess(view.fen), [view.fen]);
  const board = useMemo(() => shown.board(), [shown]);
  const material = useMemo(() => materialFrom(board), [board]);

  const shownCheck = shown.isCheck() ? kingSquare(shown, shown.turn()) : null;
  const lastMove =
    cursor >= 0 && view.moves[cursor]
      ? { from: view.moves[cursor].from, to: view.moves[cursor].to }
      : null;

  const yourTurn = view.mySide == null || view.turn === view.mySide;
  const roomReady = mode !== "online" || online?.status === "playing";
  const canPlay = atLive && !view.over && yourTurn && roomReady && !botThinking;

  const targets = useMemo(() => {
    if (!selected || !canPlay) return [];
    return live.moves({ square: selected, verbose: true });
  }, [selected, canPlay, live]);

  const playSound = useCallback((move) => {
    const bank = sounds.current;
    if (!bank || !move) return;
    const clip = move.flags?.includes("k") || move.flags?.includes("q")
      ? bank.castle
      : move.captured
      ? bank.capture
      : bank.move;
    clip.currentTime = 0;
    clip.play().catch(() => {
      /* browsers refuse audio until the page has been clicked once */
    });
  }, []);

  useEffect(() => {
    const moves = view.moves;
    if (moves.length > seen.current) playSound(moves[moves.length - 1]);
    seen.current = moves.length;
  }, [view.moves, playSound]);

  /* ------------------------------------------------------------- moving --- */

  const applyLocal = useCallback((from, to, promote) => {
    const game = gameRef.current;
    try {
      game.move({ from, to, promotion: promote });
    } catch {
      return false;
    }
    setLocal(snapshot(game));
    return true;
  }, []);

  const attemptMove = useCallback(
    (from, to, promote) => {
      if (!canPlay) return;
      const legal = live.moves({ square: from, verbose: true }).filter((m) => m.to === to);
      if (!legal.length) return;
      if (legal[0].promotion && !promote) {
        setPromotion({ from, to, color: legal[0].color });
        return;
      }
      setSelected(null);
      setPromotion(null);
      setArrows([]);
      setMarks([]);
      if (mode === "online") room.act("move", { from, to, promotion: promote });
      else applyLocal(from, to, promote);
    },
    [canPlay, live, mode, room, applyLocal]
  );

  const pressSquare = useCallback(
    (square) => {
      if (!canPlay) {
        setSelected(null);
        return;
      }
      if (selected && targets.some((move) => move.to === square)) {
        attemptMove(selected, square);
        return;
      }
      const piece = live.get(square);
      const mine = piece && piece.color === view.turn && (view.mySide == null || piece.color === view.mySide);
      setSelected(mine ? square : null);
    },
    [canPlay, selected, targets, attemptMove, live, view.turn, view.mySide]
  );

  const toggleMark = (square) =>
    setMarks((current) =>
      current.includes(square) ? current.filter((s) => s !== square) : [...current, square]
    );

  const toggleArrow = ({ from, to }) =>
    setArrows((current) =>
      current.some((a) => a.from === from && a.to === to)
        ? current.filter((a) => !(a.from === from && a.to === to))
        : [...current, { from, to }]
    );

  /* ------------------------------------------------------------- engine --- */

  const engineIdle = engineOn && engine.ready && review.status !== "running";

  useEffect(() => {
    if (!engineIdle || (mode === "bot" && !view.over && botThinking)) return undefined;
    let alive = true;
    setThinking(true);
    engine.cancel();
    engine
      .analyse(shownFen, {
        depth: LIVE_DEPTH,
        onInfo: (info) => {
          if (!alive) return;
          setScore(whiteScore(info.score, fenTurn(shownFen)));
          setPv(info.pv);
        },
      })
      .then(() => {
        if (alive) setThinking(false);
      });
    return () => {
      alive = false;
    };
  }, [shownFen, engineIdle, engine, mode, view.over, botThinking]);

  useEffect(() => {
    if (!engineOn) {
      setScore(null);
      setPv([]);
    }
  }, [engineOn]);

  // the bot answers
  useEffect(() => {
    if (mode !== "bot" || !engine.ready || local.outcome.over || local.turn !== botSide) {
      return undefined;
    }
    let alive = true;
    setBotThinking(true);
    engine.play(local.fen, { skill: level.skill, depth: level.depth }).then((result) => {
      if (!alive) return;
      setBotThinking(false);
      if (!result?.best) return;
      applyLocal(result.best.slice(0, 2), result.best.slice(2, 4), result.best[4] || undefined);
    });
    return () => {
      alive = false;
    };
  }, [mode, engine, local.fen, local.turn, local.outcome.over, botSide, level, applyLocal]);

  const hintArrow = useMemo(() => {
    if (!engineOn || !pv.length || !atLive || view.over) return null;
    const best = pv[0];
    if (!best || best.length < 4) return null;
    return { from: best.slice(0, 2), to: best.slice(2, 4) };
  }, [engineOn, pv, atLive, view.over]);

  /* -------------------------------------------------------------- setup --- */

  const newLocalGame = useCallback(
    () => {
      gameRef.current = new Chess();
      setLocal(snapshot(gameRef.current));
      setSelected(null);
      setPromotion(null);
      setMarks([]);
      setArrows([]);
      setScore(null);
      setPv([]);
      setShowReview(false);
      review.clear();
      seen.current = 0;
      reported.current = null;
    },
    [review]
  );

  const startBotGame = () => {
    const side = sideChoice === "random" ? (Math.random() < 0.5 ? "w" : "b") : sideChoice;
    newLocalGame();
    setBotSide(side === "w" ? "b" : "w");
    setOrientation(side);
    setEngineOn(false);
  };

  useEffect(() => {
    setSelected(null);
    setPromotion(null);
    setMarks([]);
    setArrows([]);
    setShowReview(false);
    review.clear();
    if (mode === "analysis") setEngineOn(true);
    if (mode === "bot") setEngineOn(false);
    if (mode === "online") setEngineOn(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const takeback = () => {
    const game = gameRef.current;
    game.undo();
    if (mode === "bot") game.undo(); // both halves, so it is your move again
    setLocal(snapshot(game));
    setSelected(null);
    seen.current = game.history().length;
  };

  const loadPosition = () => {
    const text = loadText.trim();
    if (!text) return;
    const game = new Chess();
    try {
      if (text.includes("/") && text.split(" ").length >= 4) game.load(text);
      else game.loadPgn(text);
    } catch {
      setLoadError("That is not a FEN or a PGN this board can read.");
      return;
    }
    gameRef.current = game;
    setLocal(snapshot(game));
    setLoadError(null);
    setLoadText("");
    setSelected(null);
    setShowReview(false);
    review.clear();
    seen.current = game.history().length;
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  /* -------------------------------------------------------------- online --- */

  const shareLink =
    typeof window !== "undefined" && room.code
      ? `${window.location.origin}/play/chess?room=${room.code}`
      : "";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const invited = new URLSearchParams(window.location.search).get("room");
    if (!invited) return;
    setMode("online");
    setJoinCode(invited.toUpperCase());
  }, []);

  useEffect(() => {
    if (online?.seat) setOrientation(online.seat);
  }, [online?.seat]);

  /* -------------------------------------------------------------- result --- */

  useEffect(() => {
    if (!view.over) return;
    const stamp =
      mode === "online" ? `${online?.code}-${online?.version}` : `${mode}-${view.moves.length}`;
    if (reported.current === stamp) return;
    reported.current = stamp;
    onResult?.({
      outcome:
        view.status === "draw"
          ? "drawn"
          : view.mySide == null
          ? "played"
          : view.winner === view.mySide
          ? "won"
          : "lost",
      meta: {
        mode,
        moves: view.moves.length,
        level: mode === "bot" ? level.id : null,
        room: online?.code ?? null,
      },
    });
  }, [view, mode, online, level, onResult]);

  /* ---------------------------------------------------------------- keys --- */

  useEffect(() => {
    const onKey = (event) => {
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === "ArrowLeft") setCursor((c) => Math.max(-1, c - 1));
      if (event.key === "ArrowRight") setCursor((c) => Math.min(view.moves.length - 1, c + 1));
      if (event.key === "f") setOrientation((o) => (o === "w" ? "b" : "w"));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view.moves.length]);

  /* ---------------------------------------------------------------- copy --- */

  const statusLine = () => {
    if (view.over) return resultLine(view, view.names);
    if (mode === "online") {
      if (!online) return "Open a room, or join one with a code.";
      if (online.status === "waiting") return "Waiting for someone to take the other seat.";
      return yourTurn ? "Your move." : `Waiting on ${view.names[view.turn]}.`;
    }
    if (mode === "bot") {
      if (botThinking) return `${level.label} is thinking.`;
      return yourTurn ? "Your move." : `${level.label} to move.`;
    }
    if (view.check) return `${view.turn === "w" ? "White" : "Black"} is in check.`;
    return `${view.turn === "w" ? "White" : "Black"} to move.`;
  };

  const away = orientation === "w" ? "b" : "w";
  const drawOffered = online?.drawOffer && online.drawOffer !== online.seat;
  const canReview = view.moves.length > 1 && engine.ready;
  const currentVerdict = review.report?.verdicts?.[cursor] || null;

  return (
    <div className="chess">
      <div className="chess__field">
        <EvalBar
          score={score}
          orientation={orientation}
          thinking={thinking}
          hidden={!engineOn || !engine.ready}
        />

        <div className="chess__stack">
          <div className="chess__player">
            <span className="chess__who">{view.names[away]}</span>
            <Taken seat={away} material={material} />
          </div>

          <Board
            board={board}
            orientation={orientation}
            interactive={canPlay}
            selected={selected}
            targets={targets}
            lastMove={lastMove}
            checkSquare={shownCheck}
            marks={marks}
            arrows={arrows}
            hintArrow={hintArrow}
            promotion={promotion}
            onSelect={pressSquare}
            onMove={(from, to) => attemptMove(from, to)}
            onMark={toggleMark}
            onArrow={toggleArrow}
            onPromote={(type) => attemptMove(promotion.from, promotion.to, type)}
            onCancelPromotion={() => setPromotion(null)}
          />

          <div className="chess__player">
            <span className="chess__who">{view.names[orientation]}</span>
            <Taken seat={orientation} material={material} />
          </div>
        </div>
      </div>

      <div className="chess__side">
        <div className="stack" style={{ gap: 10 }}>
          <span className="zone-label" style={{ margin: 0 }}>
            Table
          </span>
          <Peg options={MODES} value={mode} onChange={setMode} label="How you are playing" />
        </div>

        <p className="status">
          {mode === "bot" ? <Cpu size={16} /> : mode === "online" ? <Users size={16} /> : <Bulb size={16} />}
          <span>{statusLine()}</span>
        </p>

        {engine.failed && (
          <p className="notice" role="alert">
            The engine did not load, so the bot and the eval bar are off. Run
            <code> npm install </code> to fetch it.
          </p>
        )}

        <MoveList
          moves={view.moves}
          cursor={cursor}
          onJump={(index) => setCursor(Math.max(-1, Math.min(view.moves.length - 1, index)))}
          verdicts={review.report?.verdicts || null}
          result={view.over ? resultLine(view, view.names) : null}
        />

        {currentVerdict?.bestSan && (
          <p className="chalk chalk--tight">
            Best was <b>{currentVerdict.bestSan}</b>.
          </p>
        )}

        {(showReview || review.status === "running") && (
          <ReviewPanel review={review} names={view.names} onClose={() => setShowReview(false)} />
        )}

        <div className="tools">
          <button type="button" className="tool" onClick={() => setOrientation((o) => (o === "w" ? "b" : "w"))}>
            <Undo size={16} />
            <em>Flip</em>
          </button>
          <button
            type="button"
            className={`tool ${engineOn ? "is-on" : ""}`}
            onClick={() => setEngineOn((on) => !on)}
            disabled={!engine.ready}>
            <Bulb size={16} />
            <em>Engine</em>
          </button>
          {mode !== "online" && (
            <button
              type="button"
              className="tool"
              onClick={takeback}
              disabled={!view.moves.length}>
              <Undo size={16} />
              <em>Take back</em>
            </button>
          )}
        </div>

        {view.over && canReview && (
          <button
            type="button"
            className="key"
            style={{ width: "100%" }}
            onClick={() => {
              setShowReview(true);
              review.run(view.moves);
            }}
            disabled={review.status === "running"}>
            {review.status === "done" ? "Review again" : "Review the game"}
          </button>
        )}

        {mode === "analysis" && (
          <div className="stack">
            <label className="field">
              <span className="field__label">Load a FEN or a PGN</span>
              <input
                className="field__input"
                value={loadText}
                placeholder="rnbq… or 1. e4 e5"
                onChange={(event) => {
                  setLoadText(event.target.value);
                  setLoadError(null);
                }}
              />
            </label>
            <div className="row" style={{ gap: 8 }}>
              <button type="button" className="key key--quiet" onClick={loadPosition}>
                Load
              </button>
              <button type="button" className="key key--quiet" onClick={() => copyText(gameRef.current.pgn())}>
                <Copy size={14} /> PGN
              </button>
              <button type="button" className="key key--quiet" onClick={() => copyText(view.fen)}>
                <Copy size={14} /> FEN
              </button>
            </div>
            {loadError && (
              <p className="notice" role="alert">
                {loadError}
              </p>
            )}
            <button type="button" className="key" style={{ width: "100%" }} onClick={newLocalGame}>
              Clear the board
            </button>
          </div>
        )}

        {mode === "bot" && (
          <div className="stack">
            <div className="stack" style={{ gap: 10 }}>
              <span className="zone-label" style={{ margin: 0 }}>
                Machine
              </span>
              <Peg options={LEVELS} value={levelId} onChange={setLevelId} label="Machine level" />
            </div>
            <div className="stack" style={{ gap: 10 }}>
              <span className="zone-label" style={{ margin: 0 }}>
                You play
              </span>
              <Peg options={SIDES} value={sideChoice} onChange={setSideChoice} label="Your colour" />
            </div>
            <button type="button" className="key" style={{ width: "100%" }} onClick={startBotGame}>
              New game
            </button>
          </div>
        )}

        {mode === "online" && (
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
                    You play
                  </span>
                  <Peg options={SIDES} value={sideChoice} onChange={setSideChoice} label="Your colour" />
                </div>

                <button
                  type="button"
                  className="key"
                  style={{ width: "100%" }}
                  disabled={room.busy}
                  onClick={() => room.host(name, { seat: sideChoice === "random" ? undefined : sideChoice })}>
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
                    onClick={() => copyText(shareLink)}
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
                      <span className="seat__mark">{seat === "w" ? "White" : "Black"}</span>
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
                    <span className="readout__label">White</span>
                    <span className="readout__value">{online.score.w}</span>
                  </div>
                  <div className="readout__item">
                    <span className="readout__label">Drawn</span>
                    <span className="readout__value">{online.score.draw}</span>
                  </div>
                  <div className="readout__item">
                    <span className="readout__label">Black</span>
                    <span className="readout__value">{online.score.b}</span>
                  </div>
                </div>

                {drawOffered && (
                  <div className="stack" style={{ gap: 8 }}>
                    <p className="chalk chalk--tight">
                      {view.names[online.drawOffer]} offers a draw.
                    </p>
                    <div className="row" style={{ gap: 8 }}>
                      <button type="button" className="key" onClick={() => room.act("accept-draw")}>
                        Accept
                      </button>
                      <button
                        type="button"
                        className="key key--quiet"
                        onClick={() => room.act("decline-draw")}>
                        Decline
                      </button>
                    </div>
                  </div>
                )}

                {online.status === "playing" && (
                  <div className="row" style={{ gap: 8 }}>
                    <button
                      type="button"
                      className="key key--quiet"
                      onClick={() => room.act("offer-draw")}
                      disabled={online.drawOffer === online.seat}>
                      {online.drawOffer === online.seat ? "Draw offered" : "Offer a draw"}
                    </button>
                    <button type="button" className="key key--quiet" onClick={() => room.act("resign")}>
                      Resign
                    </button>
                  </div>
                )}

                {view.over && (
                  <button type="button" className="key" style={{ width: "100%" }} onClick={room.rematch}>
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

        <p className="chalk chalk--tight">
          Drag or click to move. Right-click marks a square, right-drag draws an arrow. Arrow keys
          walk the moves, F flips the board.
        </p>
      </div>
    </div>
  );
}
