"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plate, ZoneLabel } from "./plate";
import { Ladder, buildRungs } from "./ladder";
import { Tag } from "./tag";
import { Peg } from "./peg";
import { Counter } from "./counter";
import { GAME_MARKS, Dash } from "./icons";
import { GAMES } from "../../lib/games";
import { RANGES, getBoard, summarise } from "../../lib/board";
import { dailyChallenge, isDoneToday } from "../../lib/daily";

const PEG_OPTIONS = RANGES.map((r) => ({ id: r.id, label: r.label }));
const LADDER_RUNGS = 6;

function longDate(date) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function sinceLabel(date) {
  if (!date) return null;
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/* ---------------------------------------------------------------- today --- */

function Today({ challenge, done, index }) {
  const Mark = GAME_MARKS[challenge.game.id];
  return (
    <section className="deck__today" aria-labelledby="zone-today">
      <ZoneLabel>
        <span id="zone-today">Today&rsquo;s challenge</span>
      </ZoneLabel>

      <Plate tall hookAt="left" index={index} hangKey={challenge.key + String(done)}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="today__date">{longDate(challenge.date)}</span>
          {done ? (
            <Tag tone="on" mark="on">
              Played
            </Tag>
          ) : (
            <Tag tone="off" mark="off">
              Open
            </Tag>
          )}
        </div>

        <p className="today__game">{challenge.game.name}</p>

        <p className="chalk" style={{ maxWidth: "38ch" }}>
          {challenge.task}
        </p>

        <div className="today__rule" />

        <div className="today__foot">
          <Link
            href={`/play/${challenge.game.slug}`}
            className="key key--large"
            style={{ textDecoration: "none" }}>
            <Mark size={18} />
            {done ? "Play again" : "Take it on"}
          </Link>
          <p className="chalk chalk--tight" style={{ maxWidth: "24ch", margin: 0 }}>
            Hung by the calendar. The same challenge for everyone, all day.
          </p>
        </div>
      </Plate>
    </section>
  );
}

/* ---------------------------------------------------------------- games --- */

function GameSlot({ game, stats, range, index }) {
  const Mark = GAME_MARKS[game.id];
  const never = stats.everPlayed === 0;
  const since = sinceLabel(stats.lastPlayedAt);

  return (
    <div className="slot gameslot">
      <Plate
        index={index}
        hangKey={`${range}-${stats.played}-${stats.bestTime ?? ""}`}
        empty={never}
        className="gameslot__plate"
        style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div className="gameslot__head">
          <span className="gameslot__name" style={never ? { color: "inherit" } : undefined}>
            {game.name}
          </span>
          <Mark className="gameslot__mark" size={22} style={never ? { color: "inherit" } : undefined} />
        </div>

        {never ? (
          <p className="chalk chalk--tight" style={{ margin: 0 }}>
            No plate hung yet. {game.line}
          </p>
        ) : (
          <>
            <p className="gameslot__stat">
              <span>Played</span>
              <b>{stats.played}</b>
            </p>
            {game.outcomes && (
              <p className="gameslot__stat">
                <span>Won</span>
                <b>{stats.winRate == null ? "—" : `${stats.winRate}%`}</b>
              </p>
            )}
            <p className="gameslot__stat">
              <span>{game.measure === "time" ? "Best" : "Last"}</span>
              <b>{game.measure === "time" ? stats.bestTime ?? "—" : since ?? "—"}</b>
            </p>
            {game.measure === "moves" && (
              <p className="gameslot__stat">
                <span>Longest</span>
                <b>{stats.longest ?? "—"}</b>
              </p>
            )}
          </>
        )}

        <div className="gameslot__foot">
          <Link href={`/play/${game.slug}`} className="key" style={{ textDecoration: "none" }}>
            Play
          </Link>
        </div>
      </Plate>
    </div>
  );
}

function Games({ summary, range, startIndex }) {
  return (
    <section className="deck__games" aria-labelledby="zone-games">
      <ZoneLabel count={`${GAMES.length} fitted`}>
        <span id="zone-games">The games</span>
      </ZoneLabel>
      <div className="slots">
        {GAMES.map((game, i) => (
          <GameSlot
            key={game.id}
            game={game}
            range={range}
            index={startIndex + i}
            stats={summary.games.find((s) => s.gameId === game.id)}
          />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ run --- */

function runLine(streak) {
  if (!streak.alive) {
    return "A run starts the first day you finish a game, and lasts as long as you keep coming back.";
  }
  if (!streak.playedToday) {
    return "Today's hook is still empty. Finish one game to keep the run going.";
  }
  return `Today is hung. Come back tomorrow and this reads ${streak.length + 1}.`;
}

function Run({ summary, range, startIndex }) {
  const { streak, run } = summary;
  const sudoku = summary.games.find((g) => g.gameId === "sudoku");

  return (
    <section className="deck__run" aria-labelledby="zone-run">
      <ZoneLabel>
        <span id="zone-run">The run</span>
      </ZoneLabel>

      <div className="stack">
        <Plate
          hookAt="left"
          index={startIndex}
          hangKey={`${streak.length}-${streak.alive}`}
          empty={streak.length === 0}>
          <div className="streak">
            <span className="streak__count">
              <span
                className="numerals"
                style={{ fontSize: "clamp(2.6rem, 7vw, 3.6rem)", display: "block" }}>
                <Counter value={streak.length} />
              </span>
              <span className="best__unit">
                {streak.length === 1 ? "consecutive day" : "consecutive days"}
              </span>
            </span>

            <p className="chalk streak__line">{runLine(streak)}</p>

            {streak.alive ? (
              <Tag tone="on" mark="on">
                Run alive
              </Tag>
            ) : (
              <Tag tone="off" mark="off">
                No run
              </Tag>
            )}
          </div>
        </Plate>

        <div className="bests">
          <Plate index={startIndex + 8} hangKey={`${range}-${sudoku.bestTime ?? ""}`} empty={!sudoku.bestTime}>
            {sudoku.bestTime ? (
              <span className="best__value">{sudoku.bestTime}</span>
            ) : (
              <span className="best__value--unset">Not set</span>
            )}
            <span className="best__unit">Best sudoku</span>
          </Plate>
          <Plate index={startIndex + 9} hangKey={`${range}-${summary.played}`} empty={summary.played === 0}>
            <span className="best__value">
              <Counter value={summary.played} />
            </span>
            <span className="best__unit">Games finished</span>
          </Plate>
          <Plate index={startIndex + 10} hangKey={`${range}-${summary.minutes}`} empty={summary.minutes === 0}>
            <span className="best__value">
              <Counter value={summary.minutes} />
            </span>
            <span className="best__unit">Minutes at the board</span>
          </Plate>
        </div>
        <div className="run" role="list" aria-label="The last seven days">
          {run.map((day, i) => (
            <div className="day" key={day.key} role="listitem">
              <p className="day__label">{day.weekday.slice(0, 2)}</p>
              <Plate
                index={startIndex + 1 + i}
                hangKey={`${range}-${day.key}-${day.count}`}
                empty={day.count === 0}
                className={day.count === 0 ? "plate--notch" : ""}>
                <span className="day__plate">
                  {day.count > 0 ? (
                    day.count
                  ) : (
                    <>
                      <Dash className="day__mark" size={16} />
                      <span className="sr-only">
                        {day.today ? "Nothing played today yet" : "Nothing played"}
                      </span>
                    </>
                  )}
                </span>
              </Plate>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

/* ------------------------------------------------------------ standings --- */

function Standings({ summary, playerName }) {
  const you = summary.played;
  const rungs = buildRungs({ count: LADDER_RUNGS, name: playerName, score: you });

  return (
    <section className="deck__standings" aria-labelledby="zone-standings">
      <ZoneLabel count={you > 0 ? "1 hung" : "all open"}>
        <span id="zone-standings">Standings</span>
      </ZoneLabel>

      <div className="slot slot--deep">
        <Ladder rungs={rungs} />
      </div>

      <p className="note" style={{ marginTop: 20 }}>
        Standings need rivals, and rivals need accounts. Until the board is wired to a
        server, the only rung that can honestly hang here is your own — counted from the
        games finished in this browser.
      </p>
    </section>
  );
}

/* ----------------------------------------------------------------- deck --- */

export function Deck() {
  const [range, setRange] = useState("season");
  const [board, setBoard] = useState(null);

  useEffect(() => {
    let live = true;
    getBoard().then((next) => {
      if (live) setBoard(next);
    });
    return () => {
      live = false;
    };
  }, []);

  const sessions = board?.sessions ?? [];
  const summary = useMemo(() => summarise(sessions, range), [sessions, range]);
  const challenge = useMemo(() => dailyChallenge(), []);
  const done = isDoneToday(sessions, challenge);
  const fresh = summary.everPlayed === 0;

  return (
    <>
      <div
        className="row"
        style={{
          justifyContent: "space-between",
          paddingTop: 28,
          borderBottom: "1px solid var(--keyline)",
          paddingBottom: 20,
        }}>
        <p className="chalk" style={{ margin: 0, maxWidth: "46ch" }}>
          {fresh
            ? "Nothing hangs on this board yet. Finish a game and the plates start going up."
            : `Reading the board ${range === "all" ? "over everything you have played" : `for the last ${range === "week" ? "seven days" : "thirty days"}`}.`}
        </p>
        <Peg options={PEG_OPTIONS} value={range} onChange={setRange} label="Reading range" />
      </div>

      <div className="deck">
        <Today challenge={challenge} done={done} index={0} />
        <Games summary={summary} range={range} startIndex={1} />
        <Run summary={summary} range={range} startIndex={4} />
        <Standings summary={summary} playerName={board?.player?.name} />
      </div>
    </>
  );
}
