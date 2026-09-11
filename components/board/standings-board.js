"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Tag } from "./tag";
import { Peg } from "./peg";
import { Counter } from "./counter";
import { ArrowLeft, GAME_MARKS } from "./icons";
import { ZoneLabel } from "./plate";
import { gameName } from "../../lib/games";
import { RANGES, getBoard, runOfDays, summarise, formatDuration } from "../../lib/board";

const PEG_OPTIONS = RANGES.map((r) => ({ id: r.id, label: r.label }));
const WEEKS = 12;
const FORM = 14;

const OUTCOME_LABEL = {
  won: ["Won", "on", "on"],
  lost: ["Lost", "on", "lost"],
  drawn: ["Drawn", "chalk", "off"],
  played: ["Played", "chalk", "off"],
};

// Four steps, because a heat map with a continuous scale is a colour anyone has
// to look up. Four is a thing you can count.
function heat(count) {
  if (!count) return 0;
  if (count === 1) return 1;
  if (count < 4) return 2;
  return 3;
}

/* ------------------------------------------------------------------ form --- */

// The last however-many results, newest on the right, the way a league table
// prints form. It answers "how is it going" without a single percentage.
function Form({ results }) {
  if (results.length === 0) {
    return <p className="chalk">No games recorded yet — the form line starts with the first one.</p>;
  }

  return (
    <div className="form" role="list" aria-label="Recent results, oldest first">
      {results.map((session) => (
        <span
          key={session.id}
          role="listitem"
          className={`form__pip form__pip--${session.outcome}`}
          title={`${gameName(session.game)} — ${session.outcome}`}>
          {session.outcome === "won" ? "W" : session.outcome === "lost" ? "L" : session.outcome === "drawn" ? "D" : "·"}
        </span>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- the map --- */

function Heat({ sessions }) {
  const days = useMemo(() => runOfDays(sessions, WEEKS * 7), [sessions]);

  // pad the first column so every row is one weekday all the way across
  const pad = useMemo(() => {
    const first = days[0]?.date ?? new Date();
    return (first.getDay() + 6) % 7;
  }, [days]);

  return (
    <div className="heat">
      <div className="heat__rows" aria-hidden="true">
        <span>Mon</span>
        <span>Wed</span>
        <span>Fri</span>
      </div>

      <div className="heat__grid">
        {Array.from({ length: pad }).map((_, i) => (
          <span className="heat__cell heat__cell--pad" key={`pad-${i}`} />
        ))}
        {days.map((day) => (
          <span
            key={day.key}
            className={`heat__cell heat__cell--${heat(day.count)} ${day.today ? "is-today" : ""}`}
            title={`${day.date.toLocaleDateString()} — ${day.count} played`}
          />
        ))}
      </div>

      <div className="heat__key" aria-hidden="true">
        <span>Quiet</span>
        {[0, 1, 2, 3].map((step) => (
          <span className={`heat__cell heat__cell--${step}`} key={step} />
        ))}
        <span>Busy</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- standings --- */

export function StandingsBoard() {
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
  const recent = useMemo(() => [...sessions].reverse().slice(0, 12), [sessions]);
  const form = useMemo(() => sessions.slice(-FORM), [sessions]);

  // The standing is over your own games: the one you win most sits at the top.
  // An undecided game has no rate and no place in the order, so it sinks.
  const table = useMemo(
    () =>
      summary.games
        .filter((g) => g.played > 0)
        .sort((a, b) => (b.winRate ?? -1) - (a.winRate ?? -1) || b.played - a.played),
    [summary.games]
  );

  const decided = summary.games.reduce((total, g) => total + g.decided, 0);
  const losses = decided - summary.wins;
  const loading = board === null;

  return (
    <div className="board__inner">
      <div className="play__head">
        <div>
          <Link href="/" className="play__back">
            <ArrowLeft />
            Back to the board
          </Link>
          <h1 className="play__title">Standings</h1>
        </div>
        <Peg options={PEG_OPTIONS} value={range} onChange={setRange} label="Reading range" />
      </div>

      {/* --- the four figures, as a band rather than four hung tiles --- */}
      <div className="figures" aria-busy={loading}>
        {[
          ["Finished", summary.played],
          ["Won", summary.wins],
          ["Lost", losses < 0 ? 0 : losses],
          ["Day run", summary.streak.length],
          ["Minutes", summary.minutes],
        ].map(([label, value]) => (
          <div className="figure" key={label}>
            <span className="figure__value">
              {loading ? <i className="figure__wait" aria-hidden="true" /> : <Counter value={value} />}
            </span>
            <span className="figure__label">{label}</span>
          </div>
        ))}

        <div className="figure figure--state">
          {summary.streak.alive ? (
            <Tag tone="on" mark="on">
              {summary.streak.playedToday ? "Today is hung" : "Run alive"}
            </Tag>
          ) : (
            <Tag tone="off" mark="off">
              No run
            </Tag>
          )}
        </div>
      </div>

      <section aria-labelledby="zone-form">
        <ZoneLabel count={form.length ? `last ${form.length}` : null}>
          <span id="zone-form">Form</span>
        </ZoneLabel>
        <Form results={form} />
      </section>

      <section aria-labelledby="zone-heat">
        <ZoneLabel count={`${WEEKS} weeks`}>
          <span id="zone-heat">The habit</span>
        </ZoneLabel>
        <Heat sessions={sessions} />
      </section>

      <section aria-labelledby="zone-table">
        <ZoneLabel count={table.length ? `${table.length} played` : "empty"}>
          <span id="zone-table">Game by game</span>
        </ZoneLabel>

        {table.length === 0 ? (
          <p className="chalk">
            Nothing in this range. <Link href="/">Pick a game</Link> and the order builds itself.
          </p>
        ) : (
          <ol className="standing">
            {table.map((game, i) => {
              const Mark = GAME_MARKS[game.gameId];
              return (
                <li className="standing__row" key={game.gameId}>
                  <span className="standing__no">{i + 1}</span>
                  <span className="standing__name">
                    {Mark && <Mark size={16} />}
                    <Link href={`/play/${game.gameId}`}>{gameName(game.gameId)}</Link>
                  </span>

                  <span className="standing__bar" aria-hidden="true">
                    <i style={{ width: `${game.winRate ?? 0}%` }} />
                  </span>

                  <span className="standing__rate">
                    {game.winRate == null ? "—" : `${game.winRate}%`}
                  </span>
                  <span className="standing__count">
                    {game.played} played{game.bestTime ? ` · best ${game.bestTime}` : ""}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section aria-labelledby="zone-recent">
        <ZoneLabel count={recent.length || null}>
          <span id="zone-recent">The last dozen</span>
        </ZoneLabel>

        {recent.length === 0 ? (
          <p className="chalk">
            Every finished game writes one line here — the day, the game, how it ended and how
            long it took.
          </p>
        ) : (
          <div className="scroller">
            <table className="ruled">
              <caption className="sr-only">Your most recent games</caption>
              <thead>
                <tr>
                  <th scope="col">Day</th>
                  <th scope="col">Game</th>
                  <th scope="col">Result</th>
                  <th scope="col" style={{ textAlign: "right" }}>
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {recent.map((session) => {
                  const [label, tone, mark] =
                    OUTCOME_LABEL[session.outcome] || OUTCOME_LABEL.played;
                  const Mark = GAME_MARKS[session.game];
                  return (
                    <tr key={session.id}>
                      <td className="num" style={{ textAlign: "left" }}>
                        {new Date(session.endedAt).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                        })}
                      </td>
                      <td>
                        <span className="ruled__name">
                          {Mark && <Mark size={16} />}
                          {gameName(session.game)}
                        </span>
                      </td>
                      <td>
                        <Tag tone={tone} mark={mark}>
                          {label}
                        </Tag>
                      </td>
                      <td className="num">{formatDuration(session.durationMs) ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
