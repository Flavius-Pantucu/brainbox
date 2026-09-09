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
  TIME_CONTROLS,
  fenTurn,
  formatClock,
  materialFrom,
  outcomeOf,
  pieceImage,
  resultLine,
  timeControl,
  whiteScore,
} from "../../../lib/chess-core";
import {
  addMove,
  lineTo,
  mainLineFrom,
  newTree,
  promoteNode,
  removeNode,
  treeFromMoves,
} from "../../../lib/chess-tree";

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

// Re-renders while something is counting down. Nothing here owns the time —
// the clock's own numbers do — this only keeps the display honest.
function useTick(active, ms = 200) {
  const [, force] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => force((n) => (n + 1) % 1000), ms);
    return () => clearInterval(id);
  }, [active, ms]);
}

function Clock({ ms, running }) {
  if (ms == null) return null;
  return (
    <span className={`clock ${running ? "is-running" : ""} ${ms < 20000 ? "is-low" : ""}`}>
      {formatClock(ms)}
    </span>
  );
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
  const [timeId, setTimeId] = useState("none");
  const [orientation, setOrientation] = useState("w");
  const [engineOn, setEngineOn] = useState(true);
  const [selected, setSelected] = useState(null);
  const [promotion, setPromotion] = useState(null);
  const [marks, setMarks] = useState([]);
  const [arrows, setArrows] = useState([]);
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

  // the analysis board is a tree; the bot game is one chess.js instance
  const [tree, setTree] = useState(() => newTree(START_FEN));
  const [nodeId, setNodeId] = useState("0");
  const gameRef = useRef(null);
  if (gameRef.current === null) gameRef.current = new Chess();
  const [local, setLocal] = useState(() => snapshot(gameRef.current));

  // clocks: {w, b, increment, running, at} where `at` is a local timestamp
  const [clockBase, setClockBase] = useState(null);
  const [flagged, setFlagged] = useState(null);

  const sounds = useRef(null);
  const seen = useRef(0);
  const reported = useRef(null);

  const engine = useEngine();
  const review = useReview(engine);
  const room = useRoom("chess");
  const level = LEVELS.find((l) => l.id === levelId) || LEVELS[2];
  const online = mode === "online" ? room.state : null;
  const analysis = mode === "analysis";

  useEffect(() => {
    sounds.current = {
      move: new Audio("/sounds/move.mp3"),
      capture: new Audio("/sounds/capture.mp3"),
      castle: new Audio("/sounds/castle.mp3"),
    };
  }, []);

  /* --------------------------------------------------------- the position --- */

  // Bot and online games are one straight line of moves; the move list only
  // speaks tree, so they are handed one with no branches.
  const playedMoves = online ? online.moves || [] : local.moves;
  const linear = useMemo(() => treeFromMoves(playedMoves, START_FEN), [playedMoves]);

  const treeNow = analysis ? tree : linear.tree;
  const nodeNow = treeNow.nodes[nodeId] || treeNow.nodes[treeNow.root];
  const shownFen = nodeNow.fen;

  const position = useMemo(() => new Chess(shownFen), [shownFen]);
  const board = useMemo(() => position.board(), [position]);
  const material = useMemo(() => materialFrom(board), [board]);
  const line = useMemo(() => lineTo(treeNow, nodeNow.id), [treeNow, nodeNow.id]);

  // in a played game the newest move is where play happens
  useEffect(() => {
    if (!analysis) setNodeId(linear.tip);
  }, [analysis, linear.tip]);

  useEffect(() => {
    if (!treeNow.nodes[nodeId]) setNodeId(treeNow.root);
  }, [treeNow, nodeId]);

  const view = useMemo(() => {
    if (online) {
      return {
        fen: online.fen || START_FEN,
        turn: online.turn || "w",
        status: online.status,
        winner: online.winner,
        reason: online.reason,
        names: { w: online.names.w || "White", b: online.names.b || "Black" },
        mySide: online.seat,
        over: online.status === "won" || online.status === "draw",
      };
    }
    if (mode === "bot") {
      const outcome = local.outcome;
      return {
        fen: local.fen,
        turn: local.turn,
        status: flagged ? "won" : outcome.status,
        winner: flagged ? flagged.winner : outcome.winner,
        reason: flagged ? "time" : outcome.reason,
        names:
          botSide === "w" ? { w: level.label, b: "You" } : { w: "You", b: level.label },
        mySide: botSide === "w" ? "b" : "w",
        over: !!flagged || outcome.over,
      };
    }
    // the analysis board reads its state off whatever position is on it
    const outcome = outcomeOf(position);
    return {
      fen: shownFen,
      turn: position.turn(),
      status: outcome.status,
      winner: outcome.winner,
      reason: outcome.reason,
      names: { w: "White", b: "Black" },
      mySide: null, // both sides are yours
      over: outcome.over,
    };
  }, [online, mode, local, flagged, botSide, level, position, shownFen]);

  const atTip = analysis || nodeNow.id === linear.tip;
  const yourTurn = view.mySide == null || view.turn === view.mySide;
  const roomReady = mode !== "online" || online?.status === "playing";
  const canPlay = analysis
    ? !outcomeOf(position).over
    : atTip && !view.over && yourTurn && roomReady && !botThinking;

  const shownCheck = position.isCheck() ? kingSquare(position, position.turn()) : null;
  const lastMove = nodeNow.move ? { from: nodeNow.move.from, to: nodeNow.move.to } : null;

  const targets = useMemo(() => {
    if (!selected || !canPlay) return [];
    return position.moves({ square: selected, verbose: true });
  }, [selected, canPlay, position]);

  /* -------------------------------------------------------------- sounds --- */

  const playSound = useCallback((move) => {
    const bank = sounds.current;
    if (!bank || !move) return;
    const clip =
      move.flags?.includes("k") || move.flags?.includes("q")
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
    if (analysis) return;
    if (playedMoves.length > seen.current) playSound(playedMoves[playedMoves.length - 1]);
    seen.current = playedMoves.length;
  }, [analysis, playedMoves, playSound]);

  /* --------------------------------------------------------------- clock --- */

  useEffect(() => {
    if (mode !== "online") return;
    const clock = online?.clock;
    if (!clock) {
      setClockBase(null);
      return;
    }
    setClockBase({ ...clock, at: Date.now() });
  }, [mode, online?.version, online?.clock]);

  const remaining = useCallback(
    (seat) => {
      if (!clockBase) return null;
      const spent = clockBase.running === seat ? Date.now() - clockBase.at : 0;
      return Math.max(0, clockBase[seat] - spent);
    },
    [clockBase]
  );

  useTick(!!clockBase?.running && !view.over);

  // A local flag is one timer, not a poll: the clock's own numbers say when.
  useEffect(() => {
    if (mode !== "bot" || !clockBase?.running || view.over) return undefined;
    const seat = clockBase.running;
    const left = clockBase[seat] - (Date.now() - clockBase.at);
    const id = setTimeout(
      () => setFlagged({ winner: seat === "w" ? "b" : "w" }),
      Math.max(0, left)
    );
    return () => clearTimeout(id);
  }, [mode, clockBase, view.over]);

  const chargeClock = useCallback((mover) => {
    setClockBase((base) => {
      if (!base) return base;
      const spent = base.running === mover ? Date.now() - base.at : 0;
      return {
        ...base,
        [mover]: Math.max(0, base[mover] - spent) + base.increment,
        running: mover === "w" ? "b" : "w",
        at: Date.now(),
      };
    });
  }, []);

  /* -------------------------------------------------------------- moving --- */

  const applyLocal = useCallback(
    (from, to, promote) => {
      const game = gameRef.current;
      let move;
      try {
        move = game.move({ from, to, promotion: promote });
      } catch {
        return;
      }
      chargeClock(move.color);
      setLocal(snapshot(game));
    },
    [chargeClock]
  );

  const applyAnalysis = useCallback(
    (from, to, promote) => {
      const board = new Chess(shownFen);
      let move;
      try {
        move = board.move({ from, to, promotion: promote });
      } catch {
        return;
      }
      const added = addMove(treeNow, nodeNow.id, move);
      setTree(added.tree);
      setNodeId(added.id);
      playSound(move);
    },
    [shownFen, treeNow, nodeNow.id, playSound]
  );

  const attemptMove = useCallback(
    (from, to, promote) => {
      if (!canPlay) return;
      const legal = position.moves({ square: from, verbose: true }).filter((m) => m.to === to);
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
      else if (analysis) applyAnalysis(from, to, promote);
      else applyLocal(from, to, promote);
    },
    [canPlay, position, mode, analysis, room, applyAnalysis, applyLocal]
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
      const piece = position.get(square);
      const mine =
        piece && piece.color === view.turn && (view.mySide == null || piece.color === view.mySide);
      setSelected(mine ? square : null);
    },
    [canPlay, selected, targets, attemptMove, position, view.turn, view.mySide]
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

  /* -------------------------------------------------------------- engine --- */

  const engineIdle = engineOn && engine.ready && review.status !== "running";

  useEffect(() => {
    if (!engineIdle || (mode === "bot" && botThinking)) return undefined;
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
  }, [shownFen, engineIdle, engine, mode, botThinking]);

  useEffect(() => {
    if (!engineOn) {
      setScore(null);
      setPv([]);
    }
  }, [engineOn]);

  // the bot answers
  useEffect(() => {
    if (mode !== "bot" || !engine.ready || view.over || local.turn !== botSide) return undefined;
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
  }, [mode, engine, local.fen, local.turn, view.over, botSide, level, applyLocal]);

  const hintArrow = useMemo(() => {
    if (!engineOn || !pv.length || view.over) return null;
    const best = pv[0];
    if (!best || best.length < 4) return null;
    return { from: best.slice(0, 2), to: best.slice(2, 4) };
  }, [engineOn, pv, view.over]);

  /* --------------------------------------------------------------- setup --- */

  const resetBoards = useCallback(
    (fen = START_FEN) => {
      gameRef.current = new Chess(fen === START_FEN ? undefined : fen);
      setLocal(snapshot(gameRef.current));
      setTree(newTree(fen));
      setNodeId("0");
      setSelected(null);
      setPromotion(null);
      setMarks([]);
      setArrows([]);
      setScore(null);
      setPv([]);
      setShowReview(false);
      setFlagged(null);
      setClockBase(null);
      review.clear();
      seen.current = 0;
      reported.current = null;
    },
    [review]
  );

  const startBotGame = () => {
    const side = sideChoice === "random" ? (Math.random() < 0.5 ? "w" : "b") : sideChoice;
    resetBoards();
    setBotSide(side === "w" ? "b" : "w");
    setOrientation(side);
    setEngineOn(false);
    const control = timeControl(timeId);
    if (control.initial) {
      setClockBase({
        w: control.initial,
        b: control.initial,
        increment: control.increment,
        running: "w",
        at: Date.now(),
      });
    }
  };

  useEffect(() => {
    setSelected(null);
    setPromotion(null);
    setMarks([]);
    setArrows([]);
    setShowReview(false);
    setFlagged(null);
    setClockBase(null);
    review.clear();
    setEngineOn(mode === "analysis");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const takeback = () => {
    const game = gameRef.current;
    game.undo();
    game.undo(); // both halves, so it is your move again
    setLocal(snapshot(game));
    setSelected(null);
    seen.current = game.history().length;
  };

  const cutLine = () => {
    const cut = removeNode(treeNow, nodeNow.id);
    setTree(cut.tree);
    setNodeId(cut.id);
    setSelected(null);
  };

  const promoteLine = () => setTree(promoteNode(treeNow, nodeNow.id));

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
    const moves = game.history({ verbose: true });
    const built = treeFromMoves(moves, game.fen());
    gameRef.current = game;
    setLocal(snapshot(game));
    setTree(built.tree);
    setNodeId(built.tip);
    setLoadError(null);
    setLoadText("");
    setSelected(null);
    setShowReview(false);
    review.clear();
    seen.current = moves.length;
  };

  const pgnOfLine = () => line.map((node) => node.move.san).join(" ");

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
    if (analysis || !view.over) return;
    const stamp =
      mode === "online" ? `${online?.code}-${online?.version}` : `${mode}-${playedMoves.length}`;
    if (reported.current === stamp) return;
    reported.current = stamp;
    onResult?.({
      outcome:
        view.status === "draw"
          ? "drawn"
          : view.winner === view.mySide
          ? "won"
          : "lost",
      meta: {
        mode,
        moves: playedMoves.length,
        level: mode === "bot" ? level.id : null,
        time: mode === "bot" ? timeId : online?.clock?.control ?? null,
        room: online?.code ?? null,
      },
    });
  }, [analysis, view, mode, online, level, timeId, playedMoves.length, onResult]);

  /* ---------------------------------------------------------------- keys --- */

  useEffect(() => {
    const onKey = (event) => {
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === "ArrowLeft" && nodeNow.parent) setNodeId(nodeNow.parent);
      if (event.key === "ArrowRight" && nodeNow.children.length) setNodeId(nodeNow.children[0]);
      if (event.key === "f") setOrientation((o) => (o === "w" ? "b" : "w"));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nodeNow]);

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
    if (position.isCheck()) return `${view.turn === "w" ? "White" : "Black"} is in check.`;
    return `${view.turn === "w" ? "White" : "Black"} to move.`;
  };

  const away = orientation === "w" ? "b" : "w";
  const drawOffered = online?.drawOffer && online.drawOffer !== online.seat;
  const canReview = line.length > 1 && engine.ready;
  const verdictsById = useMemo(() => {
    if (!review.report) return null;
    return Object.fromEntries(
      review.report.verdicts.map((verdict, index) => [line[index]?.id, verdict]).filter(([id]) => id)
    );
  }, [review.report, line]);
  const currentVerdict = verdictsById?.[nodeNow.id] || null;
  const offMainLine = analysis && nodeNow.parent && treeNow.nodes[nodeNow.parent].children[0] !== nodeNow.id;

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
            <Clock ms={remaining(away)} running={clockBase?.running === away} />
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
            <Clock ms={remaining(orientation)} running={clockBase?.running === orientation} />
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
          {mode === "bot" ? (
            <Cpu size={16} />
          ) : mode === "online" ? (
            <Users size={16} />
          ) : (
            <Bulb size={16} />
          )}
          <span>{statusLine()}</span>
        </p>

        {engine.failed && (
          <p className="notice" role="alert">
            The engine did not load, so the bot and the eval bar are off. Run
            <code> npm install </code> to fetch it.
          </p>
        )}

        <MoveList
          tree={treeNow}
          current={nodeNow.id}
          onJump={(id) => id && setNodeId(id)}
          verdicts={verdictsById}
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
          <button
            type="button"
            className="tool"
            onClick={() => setOrientation((o) => (o === "w" ? "b" : "w"))}>
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
          {analysis ? (
            <>
              <button
                type="button"
                className="tool"
                onClick={cutLine}
                disabled={!nodeNow.parent}>
                <Undo size={16} />
                <em>Delete</em>
              </button>
              <button
                type="button"
                className="tool"
                onClick={promoteLine}
                disabled={!offMainLine}>
                <Undo size={16} />
                <em>Promote</em>
              </button>
            </>
          ) : (
            mode === "bot" && (
              <button
                type="button"
                className="tool"
                onClick={takeback}
                disabled={!!clockBase || playedMoves.length < 2}
                title={clockBase ? "Not with a clock running" : undefined}>
                <Undo size={16} />
                <em>Take back</em>
              </button>
            )
          )}
        </div>

        {(view.over || analysis) && canReview && (
          <button
            type="button"
            className="key"
            style={{ width: "100%" }}
            onClick={() => {
              setShowReview(true);
              review.run(line.map((node) => node.move));
            }}
            disabled={review.status === "running"}>
            {review.status === "done" ? "Review again" : "Review this line"}
          </button>
        )}

        {analysis && (
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
              <button type="button" className="key key--quiet" onClick={() => copyText(pgnOfLine())}>
                <Copy size={14} /> Line
              </button>
              <button type="button" className="key key--quiet" onClick={() => copyText(shownFen)}>
                <Copy size={14} /> FEN
              </button>
            </div>
            {loadError && (
              <p className="notice" role="alert">
                {loadError}
              </p>
            )}
            <button
              type="button"
              className="key"
              style={{ width: "100%" }}
              onClick={() => resetBoards()}>
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
            <div className="stack" style={{ gap: 10 }}>
              <span className="zone-label" style={{ margin: 0 }}>
                Clock
              </span>
              <Peg
                options={TIME_CONTROLS}
                value={timeId}
                onChange={setTimeId}
                label="Time control"
              />
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

                <div className="stack" style={{ gap: 10 }}>
                  <span className="zone-label" style={{ margin: 0 }}>
                    Clock
                  </span>
                  <Peg
                    options={TIME_CONTROLS}
                    value={timeId}
                    onChange={setTimeId}
                    label="Time control"
                  />
                </div>

                <button
                  type="button"
                  className="key"
                  style={{ width: "100%" }}
                  disabled={room.busy}
                  onClick={() =>
                    room.host(name, {
                      seat: sideChoice === "random" ? undefined : sideChoice,
                      time: timeId,
                    })
                  }>
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
          {analysis && " Playing from an earlier move starts a variation."}
        </p>
      </div>
    </div>
  );
}
