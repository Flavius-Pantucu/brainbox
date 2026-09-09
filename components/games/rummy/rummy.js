"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  HAND,
  KNOCK_AT,
  LEVELS,
  STOCK_FLOOR,
  TARGET,
  bestArrangement,
  bestDiscard,
  cardName,
  deal,
  deadwoodValue,
  scoreKnock,
  shouldKnock,
  sortHand,
  wantsUpcard,
} from "../../../lib/rummy";
import { RummyTable } from "./table";
import { useRoom } from "../use-room";
import { Peg } from "../../board/peg";
import { Tag } from "../../board/tag";
import { Verdict } from "../../board/verdict";
import { Copy, Cpu, Users } from "../../board/icons";

const MODES = [
  { id: "solo", label: "Solo" },
  { id: "online", label: "Online" },
];

const NAMES = { a: "You", b: "Them" };
const BEAT = 700;

function freshHand(scores = { a: 0, b: 0 }, opener = "a") {
  const dealt = deal();
  return {
    ...dealt,
    turn: opener,
    phase: "draw",
    took: null,
    scores,
    result: null, // the hand just finished
    outcome: null, // the whole game
    turns: 0,
  };
}

export default function Rummy({ onResult }) {
  const [mode, setMode] = useState("solo");
  const [level, setLevel] = useState("fair");
  const [game, setGame] = useState(() => freshHand());
  const [picked, setPicked] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const reported = useRef(null);
  const room = useRoom("rummy");

  const local = mode !== "online";
  const online = room.state;

  const reset = useCallback(() => {
    setGame(freshHand());
    setPicked(null);
  }, []);

  useEffect(() => {
    reset();
  }, [mode, reset]);

  /* --- one hand --------------------------------------------------------- */

  const finishHand = useCallback((current, knocker) => {
    const defender = knocker === "a" ? "b" : "a";
    const score = scoreKnock(current.hands[knocker], current.hands[defender]);
    const winner = score.winner === "knocker" ? knocker : defender;
    const scores = { ...current.scores, [winner]: current.scores[winner] + score.points };
    return {
      ...current,
      scores,
      result: { ...score, knocker, winner },
      outcome: scores[winner] >= TARGET ? { winner, scores } : null,
    };
  }, []);

  const draw = useCallback((from) => {
    setGame((current) => {
      if (current.result || current.phase !== "draw") return current;
      const seat = current.turn;

      if (from === "discard") {
        const discard = current.discard.slice();
        const card = discard.pop();
        return {
          ...current,
          discard,
          hands: { ...current.hands, [seat]: sortHand([...current.hands[seat], card]) },
          phase: "discard",
          took: card,
        };
      }

      if (!current.stock.length) return current;
      const stock = current.stock.slice();
      const card = stock.pop();
      return {
        ...current,
        stock,
        hands: { ...current.hands, [seat]: sortHand([...current.hands[seat], card]) },
        phase: "discard",
        took: card,
      };
    });
  }, []);

  const discard = useCallback(
    (card, knock) => {
      setGame((current) => {
        if (current.result || current.phase !== "discard") return current;
        const seat = current.turn;
        const hand = current.hands[seat].filter((c) => c !== card);
        const next = {
          ...current,
          hands: { ...current.hands, [seat]: hand },
          discard: [...current.discard, card],
          phase: "draw",
          took: null,
          turns: current.turns + 1,
        };

        if (knock && deadwoodValue(hand) <= KNOCK_AT) return finishHand(next, seat);
        // two cards left and nobody knocked: the hand is dead
        if (next.stock.length <= STOCK_FLOOR) {
          return { ...next, result: { winner: null, points: 0, dead: true } };
        }
        return { ...next, turn: seat === "a" ? "b" : "a" };
      });
      setPicked(null);
    },
    [finishHand]
  );

  // the machine takes its turn
  useEffect(() => {
    if (mode !== "solo" || game.result || game.turn !== "b") return undefined;

    const id = setTimeout(() => {
      setGame((current) => {
        if (current.turn !== "b" || current.result) return current;

        if (current.phase === "draw") {
          const top = current.discard[current.discard.length - 1];
          const takeUp = top != null && wantsUpcard(current.hands.b, top, level);
          if (takeUp) {
            const pile = current.discard.slice();
            const card = pile.pop();
            return {
              ...current,
              discard: pile,
              hands: { ...current.hands, b: sortHand([...current.hands.b, card]) },
              phase: "discard",
              took: card,
            };
          }
          if (!current.stock.length) return current;
          const stock = current.stock.slice();
          const card = stock.pop();
          return {
            ...current,
            stock,
            hands: { ...current.hands, b: sortHand([...current.hands.b, card]) },
            phase: "discard",
            took: card,
          };
        }

        const out = bestDiscard(current.hands.b, level);
        const hand = current.hands.b.filter((c) => c !== out);
        const next = {
          ...current,
          hands: { ...current.hands, b: hand },
          discard: [...current.discard, out],
          phase: "draw",
          took: null,
          turns: current.turns + 1,
        };
        if (shouldKnock(hand, level, current.turns)) return finishHand(next, "b");
        if (next.stock.length <= STOCK_FLOOR) {
          return { ...next, result: { winner: null, points: 0, dead: true } };
        }
        return { ...next, turn: "a" };
      });
    }, BEAT);

    return () => clearTimeout(id);
  }, [mode, game.result, game.turn, game.phase, level, finishHand]);

  const nextHand = () => {
    setGame((current) =>
      freshHand(current.scores, current.result?.winner === "a" ? "b" : "a")
    );
    setPicked(null);
    setDismissed(false);
  };

  /* --- results ---------------------------------------------------------- */

  useEffect(() => {
    if (!local || !game.outcome) return;
    if (reported.current === "local") return;
    reported.current = "local";
    onResult?.({
      outcome: game.outcome.winner === "a" ? "won" : "lost",
      meta: { mode, level, scores: game.outcome.scores },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.outcome]);

  const onlineOutcome = online?.status === "won" ? { winner: online.winner } : null;
  const reportedRoom = useRef(null);
  useEffect(() => {
    if (mode !== "online" || !online || !onlineOutcome) return;
    const stamp = `${online.code}-${online.version}`;
    if (reportedRoom.current === stamp) return;
    reportedRoom.current = stamp;
    onResult?.({
      outcome: onlineOutcome.winner === online.seat ? "won" : "lost",
      meta: { mode: "online", room: online.code },
    });
  }, [mode, online, onlineOutcome, onResult]);

  /* --- online ----------------------------------------------------------- */

  const shareLink =
    typeof window !== "undefined" && room.code
      ? `${window.location.origin}/play/rummy?room=${room.code}`
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

  /* --- what is on the table --------------------------------------------- */

  const you = local ? "a" : online?.seat ?? "a";
  const them = you === "a" ? "b" : "a";

  const hand = local ? game.hands[you] : online?.hand ?? [];
  const theirCount = local ? game.hands[them].length : online?.theirs ?? 0;
  const pile = local ? game.discard : online?.discard ?? [];
  const stockLeft = local ? game.stock.length : online?.stock ?? 0;
  const turn = local ? game.turn : online?.turn ?? "a";
  const phase = local ? game.phase : online?.phase ?? "draw";
  const result = local ? game.result : online?.result ?? null;
  const scores = local ? game.scores : online?.scores ?? { a: 0, b: 0 };
  const outcome = local ? game.outcome : onlineOutcome;

  const yours = turn === you && (mode !== "online" || online?.status === "playing");
  const arrangement = useMemo(() => bestArrangement(hand), [hand]);
  const inMeld = useMemo(() => new Set(arrangement.melds.flat()), [arrangement]);

  // what the hand would be worth once the picked card goes
  const after = useMemo(
    () => (picked == null ? arrangement.value : deadwoodValue(hand.filter((c) => c !== picked))),
    [picked, hand, arrangement]
  );
  const canKnock = phase === "discard" && yours && picked != null && after <= KNOCK_AT;

  const play = (card) => {
    if (!yours || phase !== "discard" || result) return;
    setPicked((current) => (current === card ? null : card));
  };

  const send = (knock) => {
    if (picked == null) return;
    if (local) discard(picked, knock);
    else {
      room.act("discard", { card: picked, knock });
      setPicked(null);
    }
  };

  const take = (from) => {
    if (!yours || phase !== "draw" || result) return;
    if (local) draw(from);
    else room.act("draw", { from });
  };

  useEffect(() => {
    if (!outcome) setDismissed(false);
  }, [outcome]);

  const statusLine = () => {
    if (outcome) {
      return outcome.winner === you
        ? `You reach ${TARGET} first.`
        : `They reach ${TARGET} first.`;
    }
    if (result) {
      if (result.dead) return "The stock ran out. Nobody scores.";
      const who = result.winner === you ? "You" : "They";
      if (result.gin) return `${who} went gin for ${result.points}.`;
      if (result.undercut) return `${who} undercut for ${result.points}.`;
      return `${who} knocked for ${result.points}.`;
    }
    if (mode === "online" && !online) return "Open a room or join one with a code.";
    if (mode === "online" && online?.status === "waiting") {
      return "Waiting for someone to take the other seat.";
    }
    if (!yours) return mode === "solo" ? "They are thinking." : "Waiting on them.";
    if (phase === "draw") return "Draw from the stock, or take the discard.";
    return picked == null ? "Pick a card to throw." : `Throwing ${cardName(picked)}.`;
  };

  const top = pile[pile.length - 1];

  return (
    <div className="rum">
      <div className="rum__field">
        <RummyTable
          hand={hand}
          theirs={theirCount}
          discard={pile}
          stock={stockLeft}
          picked={picked}
          canDraw={yours && phase === "draw" && !result}
          canThrow={yours && phase === "discard" && !result}
          onTake={take}
          onPick={play}
          names={{
            you: local ? NAMES[you] : online?.names?.[you] || "You",
            them: local ? NAMES[them] : online?.names?.[them] || "Them",
          }}>
          <Verdict
            open={!!outcome && !dismissed}
            tone={outcome?.winner === you ? "won" : "lost"}
            title={outcome?.winner === you ? "You win" : "You lose"}
            line={statusLine()}
            actions={
              local
                ? [{ label: "New game", onClick: reset }]
                : [{ label: "Play again", onClick: room.rematch }]
            }
            onClose={() => setDismissed(true)}
          />
        </RummyTable>
      </div>

      <div className="rum__side">
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

        {phase === "discard" && yours && !result && (
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="key" onClick={() => send(false)} disabled={picked == null}>
              Throw it
            </button>
            <button type="button" className="key key--quiet" onClick={() => send(true)} disabled={!canKnock}>
              {after === 0 ? "Gin" : "Knock"}
            </button>
          </div>
        )}

        {result && !outcome && (
          <button type="button" className="key" style={{ width: "100%" }} onClick={local ? nextHand : () => room.act("next")}>
            Next hand
          </button>
        )}

        <div className="readout">
          <div className="readout__item">
            <span className="readout__label">You</span>
            <span className="readout__value">{scores[you]}</span>
          </div>
          <div className="readout__item">
            <span className="readout__label">Stock</span>
            <span className="readout__value">{stockLeft}</span>
          </div>
          <div className="readout__item">
            <span className="readout__label">Them</span>
            <span className="readout__value">{scores[them]}</span>
          </div>
        </div>

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
              The deck is the server&rsquo;s, and your hand is only ever sent to you.
            </p>
          </div>
        )}

        <p className="chalk chalk--tight">
          Ten cards each. Draw, then throw. Knock with {KNOCK_AT} points of deadwood or less, or go
          gin for {25} more. Undercut the knocker and you take the difference and {25}. First to{" "}
          {TARGET} wins. Melds are worked out for you; laying off happens on its own.
        </p>
      </div>
    </div>
  );
}
