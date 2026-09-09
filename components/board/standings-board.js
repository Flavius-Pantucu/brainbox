"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plate, ZoneLabel } from "./plate";
import { Tag } from "./tag";
import { Peg } from "./peg";
import { Counter } from "./counter";
import { ArrowLeft, Dash, GAME_MARKS } from "./icons";
import { NamePlate } from "./nameplate";
import { Ladder, buildRungs } from "./ladder";
import { gameName } from "../../lib/games";
import { RANGES, getBoard, summarise, formatDuration } from "../../lib/board";

const PEG_OPTIONS = RANGES.map((r) => ({ id: r.id, label: r.label }));
const RUNGS = 8;

const OUTCOME_LABEL = {
  won: ["Won", "on", "on"],
  lost: ["Lost", "on", "lost"],
  drawn: ["Drawn", "chalk", "off"],
  played: ["Played", "chalk", "off"],
};

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
  const name = board?.player?.name || "You";
  const ranked = summary.played > 0;
  const sudoku = summary.games.find((g) => g.gameId === "sudoku");

  const rungs = buildRungs({ count: RUNGS, name, score: summary.played });

  return (
    <>
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

      <div className="deck">
        <section className="deck__today" aria-labelledby="zone-ladder">
          <ZoneLabel count={ranked ? "1 of 8 hung" : "all open"}>
            <span id="zone-ladder">The ladder</span>
          </ZoneLabel>

          <div className="slot slot--deep">
            <Ladder rungs={rungs} />
          </div>

          <p className="note" style={{ marginTop: 20 }}>
            Rungs are ranked by games finished. Seven of them stay open because there are no
            other players to hang: accounts and a shared ladder arrive when the board is
            wired to a server, and nothing here is invented in the meantime.
          </p>
        </section>

        <section className="deck__games" aria-labelledby="zone-card">
          <ZoneLabel count={summary.everPlayed ? `${summary.everPlayed} total` : "empty"}>
            <span id="zone-card">Your card</span>
          </ZoneLabel>

          <div
            className="row"
            style={{ justifyContent: "space-between", marginBottom: 22 }}>
            <NamePlate />
            <span className="chalk chalk--tight" style={{ maxWidth: "34ch" }}>
              Your name is engraved here and kept in this browser.
            </span>
          </div>

          <div className="bests" style={{ marginTop: 0, marginBottom: 28 }}>
            <Plate hangKey={`${range}-${summary.played}`} empty={summary.played === 0}>
              <span className="best__value">
                <Counter value={summary.played} />
              </span>
              <span className="best__unit">Finished</span>
            </Plate>
            <Plate index={1} hangKey={`${range}-${summary.wins}`} empty={summary.wins === 0}>
              <span className="best__value">
                <Counter value={summary.wins} />
              </span>
              <span className="best__unit">Won</span>
            </Plate>
            <Plate index={2} hangKey={`${range}-${summary.streak.length}`} empty={summary.streak.length === 0}>
              <span className="best__value">
                <Counter value={summary.streak.length} />
              </span>
              <span className="best__unit">Day run</span>
            </Plate>
            <Plate index={3} hangKey={`${range}-${sudoku?.bestTime ?? ""}`} empty={!sudoku?.bestTime}>
              {sudoku?.bestTime ? (
                <span className="best__value">{sudoku.bestTime}</span>
              ) : (
                <span className="best__value--unset">Not set</span>
              )}
              <span className="best__unit">Best sudoku</span>
            </Plate>
          </div>

          {/* the last seven days, one peg each — moved off the board itself */}
          <div className="run" role="list" aria-label="The last seven days">
            {summary.run.map((day, i) => (
              <div className="day" key={day.key} role="listitem">
                <p className="day__label">{day.weekday.slice(0, 2)}</p>
                <Plate
                  index={4 + i}
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

          <p className="note" style={{ margin: "20px 0 28px" }}>
            {summary.minutes > 0
              ? `${summary.minutes} minutes at the board in this range.`
              : "Nothing timed in this range yet."}
          </p>

          {recent.length === 0 ? (
            <div className="slot">
              <p className="chalk" style={{ margin: 0 }}>
                No games recorded yet. Every finished game writes one line here — the day, the
                game, how it ended and how long it took.
              </p>
            </div>
          ) : (
            <div className="slot slot--deep" style={{ overflowX: "auto" }}>
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
                    const [label, tone, mark] = OUTCOME_LABEL[session.outcome] || OUTCOME_LABEL.played;
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
                          <span className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
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
    </>
  );
}
