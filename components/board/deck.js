"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Opening } from "./opening";
import { ZoneLabel } from "./plate";
import { Tag } from "./tag";
import { Counter } from "./counter";
import { GAME_MARKS } from "./icons";
import { GAMES } from "../../lib/games";
import { getBoard, summarise } from "../../lib/board";
import { dailyChallenge, isDoneToday } from "../../lib/daily";

function longDate(date) {
  return date.toLocaleDateString(undefined, { day: "numeric", month: "long" });
}

/* ---------------------------------------------------------------- today --- */

function Today({ challenge, done }) {
  const Mark = GAME_MARKS[challenge.game.id];
  return (
    <section className="today" aria-label="Today's challenge">
      <span className="today__day">{longDate(challenge.date)}</span>

      <p className="today__task">
        <Mark size={18} />
        <strong>{challenge.game.name}</strong>
        <span>{challenge.task}</span>
      </p>

      {done ? (
        <Tag tone="on" mark="on">
          Played
        </Tag>
      ) : (
        <Tag tone="off" mark="off">
          Open
        </Tag>
      )}

      <Link href={`/play/${challenge.game.slug}`} className="key today__key">
        {done ? "Play it again" : "Take it on"}
      </Link>
    </section>
  );
}

/* ----------------------------------------------------------------- line --- */

// One line of figures where there used to be a grid of panels holding one
// number each. The rest of the reading lives on the standings board.
function Tally({ summary }) {
  const { streak, played, minutes } = summary;

  if (summary.everPlayed === 0) {
    return (
      <p className="tally tally--empty">
        Nothing hangs on this board yet. Finish a game and the figures start.
      </p>
    );
  }

  return (
    <p className="tally">
      <span className="tally__figure">
        <Counter value={streak.length} />
        <span>day run</span>
      </span>
      <span className="tally__figure">
        <Counter value={played} />
        <span>{played === 1 ? "game" : "games"}</span>
      </span>
      <span className="tally__figure">
        <Counter value={minutes} />
        <span>minutes at the board</span>
      </span>
      {streak.alive ? (
        <Tag tone="on" mark="on">
          {streak.playedToday ? "Today is hung" : "Run alive"}
        </Tag>
      ) : (
        <Tag tone="off" mark="off">
          No run
        </Tag>
      )}
      <Link href="/standings" className="tally__more">
        The full reading
      </Link>
    </p>
  );
}

/* ----------------------------------------------------------------- deck --- */

export function Deck() {
  const [board, setBoard] = useState(null);
  const [entering, setEntering] = useState(null);

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
  const summary = useMemo(() => summarise(sessions, "all"), [sessions]);
  const challenge = useMemo(() => dailyChallenge(), []);
  const done = isDoneToday(sessions, challenge);

  return (
    <>
      <Today challenge={challenge} done={done} />
      <Tally summary={summary} />

      <section aria-labelledby="zone-games">
        <ZoneLabel count={`${GAMES.length} fitted`}>
          <span id="zone-games">The games</span>
        </ZoneLabel>

        <div className="doorways" data-entering={entering || undefined}>
          {GAMES.map((game) => (
            <Opening
              key={game.id}
              game={game}
              stats={summary.games.find((s) => s.gameId === game.id)}
              today={challenge.game.id === game.id}
              entering={entering === game.id}
              onEnter={setEntering}
            />
          ))}
        </div>
      </section>
    </>
  );
}
