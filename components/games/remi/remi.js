"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LEVELS,
  LIMIT,
  OPENING,
  bestMelds,
  deal,
  emptyRack,
  extendedWith,
  handValue,
  jokerSwap,
  meldValue,
  pickDiscard,
  rackGroups,
  readMeld,
  seatTiles,
  sortTiles,
  tileName,
  wantsDiscard,
} from "../../../lib/remi";
import { RemiTable } from "./table";
import { useRoom } from "../use-room";
import { Peg } from "../../board/peg";
import { Tag } from "../../board/tag";
import { Verdict } from "../../board/verdict";
import { Copy, Cpu, Users } from "../../board/icons";

const MODES = [
  { id: "solo", label: "Solo" },
  { id: "online", label: "Online" },
];

const TABLE_SIZES = [
  { id: 2, label: "Two" },
  { id: 3, label: "Three" },
  { id: 4, label: "Four" },
];

const NAMES = { a: "You", b: "Machine one", c: "Machine two", d: "Machine three" };
const BEAT = 780;

function freshGame(players, scores) {
  const dealt = deal(players);
  return {
    ...dealt,
    table: [],
    opened: Object.fromEntries(players.map((seat) => [seat, false])),
    scores: scores || Object.fromEntries(players.map((seat) => [seat, 0])),
    players,
    turn: players[0],
    phase: "draw",
    result: null,
    winner: null,
  };
}

export default function Remi({ onResult }) {
  const [mode, setMode] = useState("solo");
  const [level, setLevel] = useState("fair");
  const [size, setSize] = useState(3);
  const [game, setGame] = useState(() => freshGame(["a", "b", "c"]));
  const [slots, setSlots] = useState(emptyRack);
  const [picked, setPicked] = useState(null);
  const [note, setNote] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const reported = useRef(null);
  const room = useRoom("remi");

  const local = mode !== "online";
  const online = room.state;

  const reset = useCallback((players) => {
    setGame(freshGame(players));
    setSlots(emptyRack());
    setPicked(null);
    setNote(null);
    setDismissed(false);
    reported.current = null;
  }, []);

  useEffect(() => {
    reset(["a", "b", "c", "d"].slice(0, size));
  }, [mode, size, reset]);

  /* --- the local table --------------------------------------------------- */

  const score = useCallback((current, winner) => {
    const scores = { ...current.scores };
    for (const seat of current.players) {
      if (seat === winner) continue;
      scores[seat] += handValue(current.hands[seat]);
    }
    const over = current.players.some((seat) => scores[seat] >= LIMIT);
    const best = current.players.reduce((low, seat) => (scores[seat] < scores[low] ? seat : low));
    return {
      ...current,
      scores,
      result: { winner },
      winner: over ? best : null,
    };
  }, []);

  const step = useCallback(
    (current, action) => {
      const seat = current.turn;
      const hand = current.hands[seat];

      if (action.type === "draw") {
        if (current.phase !== "draw") return current;
        const from = action.from;
        if (from === "discard" && !current.discard.length) return current;
        if (from === "stock" && !current.stock.length) return current;
        const pile = from === "discard" ? current.discard.slice() : current.stock.slice();
        const tile = pile.pop();
        return {
          ...current,
          [from]: pile,
          hands: { ...current.hands, [seat]: sortTiles([...hand, tile]) },
          phase: "play",
        };
      }

      if (action.type === "open" || action.type === "lay") {
        const melds = action.melds;
        const all = melds.flat();
        if (all.some((tile) => !hand.includes(tile))) return current;
        if (melds.some((meld) => !readMeld(meld))) return current;
        if (action.type === "open") {
          if (current.opened[seat]) return current;
          const worth = melds.reduce((sum, meld) => sum + meldValue(meld), 0);
          if (worth < OPENING) return current;
        } else if (!current.opened[seat]) return current;

        return {
          ...current,
          hands: { ...current.hands, [seat]: hand.filter((tile) => !all.includes(tile)) },
          table: [...current.table, ...melds.map((meld) => ({ seat, tiles: meld }))],
          opened: { ...current.opened, [seat]: true },
        };
      }

      if (action.type === "add") {
        if (!current.opened[seat]) return current;
        const meld = current.table[action.meld];
        const grown = meld && extendedWith(meld.tiles, action.tile);
        if (!grown) return current;
        const table = current.table.slice();
        table[action.meld] = { ...meld, tiles: grown };
        return {
          ...current,
          table,
          hands: { ...current.hands, [seat]: hand.filter((tile) => tile !== action.tile) },
        };
      }

      if (action.type === "swap") {
        if (!current.opened[seat]) return current;
        const meld = current.table[action.meld];
        const swapped = meld && jokerSwap(meld.tiles, action.tile);
        if (!swapped) return current;
        const table = current.table.slice();
        table[action.meld] = { ...meld, tiles: swapped.meld };
        return {
          ...current,
          table,
          hands: {
            ...current.hands,
            [seat]: sortTiles([...hand.filter((tile) => tile !== action.tile), swapped.joker]),
          },
        };
      }

      if (action.type === "discard") {
        if (current.phase !== "play" || !hand.includes(action.tile)) return current;
        const left = hand.filter((tile) => tile !== action.tile);
        const next = {
          ...current,
          hands: { ...current.hands, [seat]: left },
          discard: [...current.discard, action.tile],
        };
        if (!left.length) return score(next, seat);
        if (!next.stock.length) return score(next, null);
        const at = current.players.indexOf(seat);
        return { ...next, turn: current.players[(at + 1) % current.players.length], phase: "draw" };
      }

      return current;
    },
    [score]
  );

  // the machines take their turns
  useEffect(() => {
    if (!local || game.result || game.turn === "a") return undefined;

    const id = setTimeout(() => {
      setGame((current) => {
        if (current.turn === "a" || current.result) return current;
        const seat = current.turn;
        let next = current;

        // draw: take the discard only if it helps
        const top = next.discard[next.discard.length - 1];
        const take =
          top != null && wantsDiscard(next.hands[seat], top, next.opened[seat], level)
            ? "discard"
            : "stock";
        next = step(next, { type: "draw", from: take });

        // lay what can be laid
        const hand = next.hands[seat];
        if (!next.opened[seat]) {
          const best = bestMelds(hand, "value");
          if (best.value >= OPENING) next = step(next, { type: "open", melds: best.melds });
        } else {
          const best = bestMelds(hand, "tiles");
          for (const meld of best.melds) next = step(next, { type: "lay", melds: [meld] });
          // and push anything else onto what is already down
          let pushing = true;
          while (pushing) {
            pushing = false;
            for (const tile of next.hands[seat]) {
              const at = next.table.findIndex((meld) => extendedWith(meld.tiles, tile));
              if (at >= 0 && next.hands[seat].length > 1) {
                next = step(next, { type: "add", meld: at, tile });
                pushing = true;
                break;
              }
            }
          }
        }

        const out = pickDiscard(next.hands[seat], level);
        return step(next, { type: "discard", tile: out });
      });
    }, BEAT);

    return () => clearTimeout(id);
  }, [local, game.result, game.turn, level, step]);

  /* --- results ----------------------------------------------------------- */

  useEffect(() => {
    if (!local || !game.winner) return;
    if (reported.current === "done") return;
    reported.current = "done";
    onResult?.({
      outcome: game.winner === "a" ? "won" : "lost",
      meta: { mode, level, players: game.players.length, scores: game.scores },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.winner]);

  const onlineWinner = online?.status === "won" ? online.winner : null;
  const reportedRoom = useRef(null);
  useEffect(() => {
    if (mode !== "online" || !online || !onlineWinner) return;
    const stamp = `${online.code}-${online.version}`;
    if (reportedRoom.current === stamp) return;
    reportedRoom.current = stamp;
    onResult?.({
      outcome: onlineWinner === online.seat ? "won" : "lost",
      meta: { mode: "online", room: online.code },
    });
  }, [mode, online, onlineWinner, onResult]);

  /* --- online ------------------------------------------------------------ */

  const shareLink =
    typeof window !== "undefined" && room.code
      ? `${window.location.origin}/play/remi?room=${room.code}`
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

  /* --- what is on the table ---------------------------------------------- */

  const you = local ? "a" : online?.seat ?? null;
  const hand = local ? game.hands.a : online?.hand ?? [];
  const table = local ? game.table : online?.table ?? [];
  const discard = local ? game.discard : online?.discard ?? [];
  const stock = local ? game.stock.length : online?.stock ?? 0;
  const turn = local ? game.turn : online?.turn ?? null;
  const phase = local ? game.phase : online?.phase ?? "draw";
  const opened = local ? game.opened : online?.opened ?? {};
  const scores = local ? game.scores : online?.scores ?? {};
  const result = local ? game.result : online?.result ?? null;
  const winner = local ? game.winner : onlineWinner;
  const heldCounts = local
    ? Object.fromEntries(game.players.map((seat) => [seat, game.hands[seat].length]))
    : { ...(online?.others || {}), ...(you ? { [you]: hand.length } : {}) };

  const others = local
    ? Object.fromEntries(game.players.filter((s) => s !== "a").map((s) => [s, game.hands[s].length]))
    : online?.others ?? {};

  const names = local
    ? NAMES
    : Object.fromEntries(
        (online?.playing || []).map((seat) => [seat, online.names?.[seat] || seat])
      );

  const yours = turn === you && (mode !== "online" || online?.status === "playing");
  const canDraw = yours && phase === "draw" && !result;
  const canPlay = yours && phase === "play" && !result;

  // the rack holds your arrangement; the hand holds what you own. Seating keeps
  // the first in step with the second without ever rearranging it for you.
  useEffect(() => {
    setSlots((current) => seatTiles(current, hand));
  }, [hand]);

  const groups = useMemo(() => rackGroups(slots), [slots]);
  const bracketed = useMemo(() => groups.reduce((sum, group) => sum + group.value, 0), [groups]);
  const iAmOpen = you ? !!opened[you] : false;
  const canOpen = !iAmOpen && bracketed >= OPENING;

  const act = (action, payload) => {
    if (local) setGame((current) => step(current, { type: action, ...payload }));
    else room.act(action, payload);
  };

  const layDown = () => {
    if (!groups.length) {
      setNote("Put three or more tiles side by side to make a meld.");
      return;
    }
    const melds = groups.map((group) => group.tiles);
    if (!iAmOpen) {
      if (bracketed < OPENING) {
        setNote(`Your first lay has to reach ${OPENING}. The rack is showing ${bracketed}.`);
        return;
      }
      act("open", { melds });
      return;
    }
    for (const meld of melds) act("lay", local ? { melds: [meld] } : { tiles: meld });
  };

  // a tile dragged out of the rack either joins a meld or goes in the well
  const dropOut = (kind, tile, index) => {
    setNote(null);
    if (kind === "discard") {
      if (!canPlay) return;
      act("discard", { tile });
      setPicked(null);
      return;
    }
    if (kind !== "meld") return;
    if (!iAmOpen) {
      setNote("Open with forty-five before you build on the table.");
      return;
    }
    const at = Number(index);
    const meld = table[at];
    if (!meld) return;
    if (extendedWith(meld.tiles, tile)) act("add", { meld: at, tile });
    else if (jokerSwap(meld.tiles, tile)) act("swap", { meld: at, tile });
    else setNote("That tile does not fit there.");
    setPicked(null);
  };

  const throwPicked = () => {
    if (picked == null) {
      setNote("Pick the tile you want to throw, or drag it into the well.");
      return;
    }
    act("discard", { tile: picked });
    setPicked(null);
  };

  useEffect(() => {
    if (!winner) setDismissed(false);
  }, [winner]);

  const statusLine = () => {
    if (winner) return winner === you ? "You finish lightest." : `${names[winner] || winner} finishes lightest.`;
    if (result) {
      return result.winner
        ? `${result.winner === you ? "You" : names[result.winner] || result.winner} went out.`
        : "The stock ran out. Everybody counts.";
    }
    if (mode === "online" && !online) return "Open a room or join one with a code.";
    if (mode === "online" && online?.status === "waiting") {
      return online.host
        ? `${online.taken} of ${online.seats.length} seats taken. Start when you are ready.`
        : "Waiting for the host to start.";
    }
    if (!yours) return `${names[turn] || turn} is playing.`;
    if (phase === "draw") return "Take from the stock, or the discard.";
    if (!iAmOpen) return `Lay ${OPENING} or more to open, then throw one.`;
    return "Lay what you can, then throw one.";
  };

  return (
    <div className="remi">
      <div className="remi__field">
        <RemiTable
          seats={local ? game.players : online?.playing || []}
          names={names}
          table={table}
          held={heldCounts}
          opened={opened}
          scores={scores}
          you={you}
          turn={turn}
          slots={slots}
          discard={discard}
          stock={stock}
          picked={picked}
          disabled={!canDraw && !canPlay}
          onArrange={setSlots}
          onPick={setPicked}
          onDropOut={dropOut}
          onTake={(from) => (canDraw ? act("draw", { from }) : null)}>
          <Verdict
            open={!!winner && !dismissed}
            tone={winner === you ? "won" : "lost"}
            title={winner === you ? "You win" : "You lose"}
            line={statusLine()}
            actions={
              local
                ? [{ label: "New game", onClick: () => reset(game.players) }]
                : [{ label: "Play again", onClick: room.rematch }]
            }
            onClose={() => setDismissed(true)}
          />
        </RemiTable>
      </div>

      <div className="remi__side">
        <div className="stack" style={{ gap: 10 }}>
          <span className="zone-label" style={{ margin: 0 }}>
            Opponent
          </span>
          <Peg options={MODES} value={mode} onChange={setMode} label="Opponent" />
        </div>

        {mode === "solo" && (
          <>
            <div className="stack" style={{ gap: 10 }}>
              <span className="zone-label" style={{ margin: 0 }}>
                Table
              </span>
              <Peg options={TABLE_SIZES} value={size} onChange={setSize} label="How many play" />
            </div>
            <div className="stack" style={{ gap: 10 }}>
              <span className="zone-label" style={{ margin: 0 }}>
                Machine
              </span>
              <Peg options={LEVELS} value={level} onChange={setLevel} label="Machine level" />
            </div>
          </>
        )}

        <p className="status">
          {mode === "solo" ? <Cpu size={16} /> : <Users size={16} />}
          <span>{statusLine()}</span>
        </p>

        {canPlay && (
          <>
            <div className="opening">
              <span className="opening__reading">
                <b>{bracketed}</b>
                {iAmOpen ? " on the rack" : ` of ${OPENING}`}
              </span>
              {!iAmOpen && (
                <span className="opening__meter" aria-hidden="true">
                  <i style={{ width: `${Math.min(100, (bracketed / OPENING) * 100)}%` }} />
                </span>
              )}
            </div>

            <div className="row" style={{ gap: 8 }}>
              <button
                type="button"
                className="key"
                onClick={layDown}
                disabled={!groups.length || (!iAmOpen && !canOpen)}>
                {iAmOpen ? "Lay them down" : "Open"}
              </button>
              <button
                type="button"
                className="key key--quiet"
                onClick={throwPicked}
                disabled={picked == null}>
                Throw it
              </button>
            </div>
          </>
        )}

        {note && (
          <p className="notice" role="alert">
            {note}
          </p>
        )}

        {result && !winner && (
          <button
            type="button"
            className="key"
            style={{ width: "100%" }}
            onClick={() => (local ? reset(game.players) : room.act("next"))}>
            Next hand
          </button>
        )}

        <div className="readout">
          {Object.keys(scores).length === 0 ? (
            <div className="readout__item">
              <span className="readout__label">Penalties</span>
              <span className="readout__value">—</span>
            </div>
          ) : (
            Object.entries(scores).map(([seat, value]) => (
              <div className="readout__item" key={seat}>
                <span className="readout__label">{seat === you ? "You" : names[seat] || seat}</span>
                <span className={`readout__value ${value >= LIMIT ? "is-warn" : ""}`}>{value}</span>
              </div>
            ))
          )}
        </div>

        <p className="chalk chalk--tight">
          Slide tiles along the rack to build. Anything sitting together that reads as a run or a
          group is bracketed with what it is worth; leave a gap to keep two apart. Drag a tile
          onto a meld to add it, or into the well to throw it.
        </p>

        <p className="chalk chalk--tight">
          Lowest total wins. A hand costs you whatever is left on your rack, and a joker left
          there costs 25. The game ends when somebody passes {LIMIT}.
        </p>

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
                  {room.busy ? "Opening…" : "Open a table"}
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
                  Join that table
                </button>
              </>
            ) : (
              <>
                <div className="roomcode">
                  <span className="roomcode__label">Table</span>
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
                  {online.seats.map((seat) => (
                    <div key={seat} className={`seat ${online.seat === seat ? "is-you" : ""}`}>
                      <span className="seat__name">
                        {online.names?.[seat] || (online.seated?.[seat] ? seat : "Open seat")}
                      </span>
                      {online.turn === seat && online.status === "playing" && (
                        <Tag tone="live" mark="live">
                          Turn
                        </Tag>
                      )}
                    </div>
                  ))}
                </div>

                {online.status === "waiting" && online.host && (
                  <button
                    type="button"
                    className="key"
                    style={{ width: "100%" }}
                    disabled={online.taken < online.minSeats}
                    onClick={() => room.act("start")}>
                    Start with {online.taken}
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
              Two to four at a table. The tiles are the server&rsquo;s, and your rack is only ever
              sent to you.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
