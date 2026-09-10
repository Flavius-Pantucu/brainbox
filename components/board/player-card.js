"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Plate, ZoneLabel } from "./plate";
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

export function PlayerCard() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [range, setRange] = useState("season");
  const [board, setBoard] = useState(null);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);

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
  const figure = (value) => (loading ? null : value);

  const rename = async (value) => {
    setName(value);
    setSaved(false);
    await setPlayerName(value);
    setSaved(true);
  };

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
        <div className="play__head">
          <ZoneLabel>Your card</ZoneLabel>
        </div>
        <Plate className="you" hangKey="anonymous">
          <p className="chalk">
            You are not signed in, so this board lives in this browser alone — clear it, or open
            it somewhere else, and it is gone.
          </p>
          <div className="you__actions">
            <Link className="key" href="/sign-up">
              Open an account
            </Link>
            <Link className="key key--quiet" href="/sign-in">
              Sign in
            </Link>
          </div>
        </Plate>
      </div>
    );
  }

  const user = session?.user;

  return (
    <div className="board__inner page--mid">
      <div className="play__head">
        <ZoneLabel>Your card</ZoneLabel>
        <Peg options={PEG_OPTIONS} value={range} onChange={setRange} label="Range" />
      </div>

      {/* --- who --- */}
      <Plate className="you" hangKey={user?.id || "loading"}>
        <div className="you__who">
          <label className="field">
            <span className="field__label">Username</span>
            <input
              className="field__input"
              value={name}
              maxLength={18}
              placeholder="Unnamed"
              onChange={(e) => rename(e.target.value)}
              spellCheck={false}
            />
          </label>

          <div className="readout">
            <div className="readout__item">
              <span className="readout__label">Email</span>
              <span className="readout__value you__email">{user?.email || "—"}</span>
            </div>
            <div className="readout__item">
              <span className="readout__label">Since</span>
              <span className="readout__value">{since(user?.createdAt) || "—"}</span>
            </div>
            <div className="readout__item">
              <span className="readout__label">Board</span>
              <span className="readout__value">
                <Tag tone="on" mark="on">
                  Saved
                </Tag>
              </span>
            </div>
          </div>
        </div>

        {saved && (
          <p className="chalk chalk--tight">
            Kept. Your name shows on every plate you hang from now on.
          </p>
        )}

        <div className="you__actions">
          <button className="key key--quiet" type="button" onClick={leave}>
            Sign out
          </button>
          <button className="key key--quiet" type="button" onClick={wipe}>
            Clear the board
          </button>
        </div>
      </Plate>

      {/* --- the figures --- */}
      <ZoneLabel count={loading ? null : summary.played}>The figures</ZoneLabel>

      <div className="you__figures" aria-busy={loading}>
        {[
          ["Played", summary.played],
          ["Won", summary.wins],
          ["Minutes", summary.minutes],
          ["Day run", summary.streak.length],
        ].map(([label, value], i) => (
          <Plate
            key={label}
            className="you__figure"
            hangKey={loading ? `${label}-waiting` : `${label}-${value}`}
            index={i}>
            <span className="readout__label">{label}</span>
            {figure(value) === null ? (
              <span className="you__number you__number--waiting" aria-hidden="true">
                &nbsp;
              </span>
            ) : (
              <Counter className="you__number" value={value} />
            )}
          </Plate>
        ))}
      </div>

      {/* --- game by game --- */}
      <ZoneLabel count={loading ? null : played.length}>Game by game</ZoneLabel>

      {loading ? (
        <Plate className="you" empty hangKey="waiting">
          <p className="chalk">Fetching your board…</p>
        </Plate>
      ) : played.length === 0 ? (
        <Plate className="you" empty hangKey="nothing">
          <p className="chalk">
            Nothing hangs here yet. Finish a game and the figures start.{" "}
            <Link href="/">Pick one</Link>.
          </p>
        </Plate>
      ) : (
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
      )}
    </div>
  );
}
