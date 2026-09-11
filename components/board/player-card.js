"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ZoneLabel } from "./plate";
import { Counter } from "./counter";
import { Peg } from "./peg";
import { Tag } from "./tag";
import { GAME_MARKS } from "./icons";
import { authClient, useSession } from "../../lib/auth-client";
import { forgetSession } from "../../lib/store-remote";
import { RANGES, clearBoard, getBoard, setPlayerName, summarise } from "../../lib/board";
import { gameName } from "../../lib/games";

const PEG_OPTIONS = RANGES.map((r) => ({ id: r.id, label: r.label }));

const since = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
};

// Two letters cut from whatever the player calls themselves. A photograph would
// need somewhere to keep it; initials need nothing at all.
function monogram(name, email) {
  const source = (name || email || "?").trim();
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : source.slice(0, 2);
  return letters.toUpperCase();
}

export function PlayerCard() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [range, setRange] = useState("season");
  const [board, setBoard] = useState(null);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const pending = useRef(null);

  useEffect(() => {
    let live = true;
    getBoard().then((next) => {
      if (!live) return;
      setBoard(next);
      setName(next.player?.name || "");
    });
    return () => {
      live = false;
    };
  }, [session?.user?.id]);

  const sessions = board?.sessions ?? [];
  const summary = useMemo(() => summarise(sessions, range), [sessions, range]);
  const played = summary.games.filter((g) => g.everPlayed > 0);

  // Until the board is back, nothing is known — and a confident 0 reads as
  // "you have played nothing", which is a different and wrong statement. The
  // database sleeps when idle, so this gap is measured in seconds, not frames.
  const loading = board === null;

  // One write per name, not one per keystroke: typing eight letters used to be
  // eight round trips to a database that is billed by the second it is awake.
  const rename = (value) => {
    setName(value);
    setSaved(false);
    clearTimeout(pending.current);
    pending.current = setTimeout(async () => {
      await setPlayerName(value);
      setSaved(true);
    }, 500);
  };

  useEffect(() => () => clearTimeout(pending.current), []);

  const leave = async () => {
    await authClient.signOut();
    forgetSession();
    router.push("/");
    router.refresh();
  };

  const wipe = async () => {
    if (!window.confirm("Clear every game on your board? This cannot be undone.")) return;
    await clearBoard();
    setBoard(await getBoard());
  };

  // Signed out is not an error. The board still has games in it; they simply
  // live in this browser, and saying so beats an empty page.
  if (!isPending && !session) {
    return (
      <div className="board__inner page--mid">
        <ZoneLabel>Your card</ZoneLabel>
        <div className="card card--quiet">
          <p className="chalk">
            You are not signed in, so this board lives in this browser alone — clear it, or open
            it somewhere else, and it is gone.
          </p>
          <div className="card__actions">
            <Link className="key" href="/sign-up">
              Open an account
            </Link>
            <Link className="key key--quiet" href="/sign-in">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const user = session?.user;

  return (
    <div className="board__inner page--mid">
      <div className="play__head">
        <div>
          <h1 className="play__title">Your card</h1>
        </div>
        <Peg options={PEG_OPTIONS} value={range} onChange={setRange} label="Range" />
      </div>

      {/* --- who --- */}
      <div className="card who">
        <span className="who__mark" aria-hidden="true">
          {monogram(name, user?.email)}
        </span>

        <div className="who__body">
          <label className="field who__field">
            <span className="field__label">Name on the board</span>
            <input
              className="field__input"
              value={name}
              maxLength={18}
              placeholder="Unnamed"
              onChange={(e) => rename(e.target.value)}
              spellCheck={false}
            />
          </label>

          <dl className="who__facts">
            <div>
              <dt>Email</dt>
              <dd className="who__email">{user?.email || "—"}</dd>
            </div>
            <div>
              <dt>Member since</dt>
              <dd>{since(user?.createdAt) || "—"}</dd>
            </div>
            <div>
              <dt>Board</dt>
              <dd>
                <Tag tone="on" mark="on">
                  {saved ? "Kept" : "Saved"}
                </Tag>
              </dd>
            </div>
          </dl>
        </div>

        <div className="card__actions who__actions">
          <button className="key key--quiet" type="button" onClick={leave}>
            Sign out
          </button>
          <button className="key key--quiet" type="button" onClick={wipe}>
            Clear the board
          </button>
        </div>
      </div>

      {/* --- the figures --- */}
      <ZoneLabel count={loading ? null : summary.played}>The figures</ZoneLabel>

      <div className="figures" aria-busy={loading}>
        {[
          ["Played", summary.played],
          ["Won", summary.wins],
          ["Minutes", summary.minutes],
          ["Day run", summary.streak.length],
        ].map(([label, value]) => (
          <div className="figure" key={label}>
            <span className="figure__value">
              {loading ? <i className="figure__wait" aria-hidden="true" /> : <Counter value={value} />}
            </span>
            <span className="figure__label">{label}</span>
          </div>
        ))}
      </div>

      {/* --- game by game --- */}
      <ZoneLabel count={loading ? null : played.length}>Game by game</ZoneLabel>

      {loading ? (
        <p className="chalk">Fetching your board…</p>
      ) : played.length === 0 ? (
        <p className="chalk">
          Nothing hangs here yet. Finish a game and the figures start.{" "}
          <Link href="/">Pick one</Link>.
        </p>
      ) : (
        <div className="scroller">
          <table className="ruled">
            <thead>
              <tr>
                <th scope="col">Game</th>
                <th scope="col">Played</th>
                <th scope="col">Won</th>
                <th scope="col">Rate</th>
                <th scope="col">Best</th>
              </tr>
            </thead>
            <tbody>
              {played.map((game) => {
                const Mark = GAME_MARKS[game.gameId];
                return (
                  <tr key={game.gameId}>
                    <th scope="row" className="ruled__name">
                      {Mark && <Mark size={16} />}
                      <Link href={`/play/${game.gameId}`}>{gameName(game.gameId)}</Link>
                    </th>
                    <td>{game.played}</td>
                    <td>{game.wins}</td>
                    <td>{game.winRate == null ? "—" : `${game.winRate}%`}</td>
                    <td>{game.bestTime || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
