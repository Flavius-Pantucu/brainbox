"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Opening } from "./opening";
import { ZoneLabel } from "./plate";
import { Tag } from "./tag";
import { Counter } from "./counter";
import { GAME_MARKS, Users } from "./icons";
import { GAMES } from "../../lib/games";
import { getBoard, summarise } from "../../lib/board";
import { dailyChallenge, isDoneToday } from "../../lib/daily";
import { openLobby } from "./use-lobby";

function longDate(date) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// Midnight is when the challenge turns over, so the board says how long that is
// rather than making anyone work it out.
function untilMidnight(now = new Date()) {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  const mins = Math.round((next - now) / 60000);
  const h = Math.floor(mins / 60);
  return h >= 1 ? `${h}h left` : `${mins}m left`;
}

/* ---------------------------------------------------------------- today --- */

// The band across the top: what today asks, how the week has gone, and one way
// in. Everything else on this page is a choice; this is the suggestion.
function Today({ challenge, done, summary, loading }) {
  const Mark = GAME_MARKS[challenge.game.id];
  const [left, setLeft] = useState(null);

  // rendered on the client only, because the server's midnight is not yours
  useEffect(() => {
    setLeft(untilMidnight());
    const id = setInterval(() => setLeft(untilMidnight()), 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="today" aria-label="Today">
      <div className="today__main">
        <p className="today__day">
          {longDate(challenge.date)}
          {left && <span className="today__left">{left}</span>}
        </p>

        <h1 className="today__task">
          <Mark size={22} />
          <span>{challenge.task}</span>
        </h1>

        <p className="today__sub">
          {challenge.game.name}
          {done ? (
            <Tag tone="on" mark="on">
              Played today
            </Tag>
          ) : (
            <Tag tone="live" mark="live">
              Open
            </Tag>
          )}
        </p>

        <Link href={`/play/${challenge.game.slug}`} className="key today__key">
          {done ? "Play it again" : "Take it on"}
        </Link>
      </div>

      {/* the week, one peg a day — the only figure on this page */}
      <div className="today__week" aria-label="The last seven days">
        <div className="week">
          {summary.run.map((day) => (
            <span
              key={day.key}
              className={`week__day ${day.count ? "is-hung" : ""} ${day.today ? "is-today" : ""}`}
              title={`${day.weekday}: ${day.count} played`}>
              <i aria-hidden="true" />
              <em>{day.weekday.slice(0, 1)}</em>
            </span>
          ))}
        </div>

        <p className="today__run">
          {loading ? (
            <span className="today__runwait" aria-hidden="true" />
          ) : (
            <>
              <Counter value={summary.streak.length} />
              <span>{summary.streak.length === 1 ? "day run" : "day run"}</span>
            </>
          )}
        </p>

        <Link href="/standings" className="today__more">
          The full reading
        </Link>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- rooms --- */

// A private room is the other reason to be here, and it was buried inside each
// game's own panel. It belongs on the way in.
function Rooms() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // A link with the code already in it should not ask for it again.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const invited = new URLSearchParams(window.location.search).get("code");
    if (invited) setCode(invited.toUpperCase().slice(0, 6));
  }, []);

  const open = async () => {
    setBusy(true);
    setError(null);
    try {
      const board = await getBoard();
      router.push(`/room/${await openLobby(board.player?.name || "")}`);
    } catch {
      setError("Could not open a room. Try again.");
      setBusy(false);
    }
  };

  const enter = (event) => {
    event.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length < 4) {
      setError("A room code is four characters.");
      return;
    }
    router.push(`/room/${clean}`);
  };

  return (
    <section className="rooms" aria-label="Play someone">
      <span className="rooms__mark" aria-hidden="true">
        <Users size={18} />
      </span>

      <div className="rooms__say">
        <b>Play someone</b>
        <span>Open a room, send the code, talk while you wait.</span>
      </div>

      <button type="button" className="key" onClick={open} disabled={busy}>
        {busy ? "Opening…" : "Open a room"}
      </button>

      <form className="rooms__join" onSubmit={enter}>
        <input
          className="field__input field__input--code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
          placeholder="CODE"
          aria-label="Room code"
          spellCheck={false}
        />
        <button type="submit" className="key key--quiet" disabled={code.trim().length < 4}>
          Join
        </button>
      </form>

      {error && <p className="rooms__error">{error}</p>}
    </section>
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
      <Today challenge={challenge} done={done} summary={summary} loading={board === null} />
      <Rooms />

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
