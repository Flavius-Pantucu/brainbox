"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLobby } from "./use-lobby";
import { GamePreview } from "./preview";
import { Tag } from "./tag";
import { ZoneLabel } from "./plate";
import { ArrowLeft, Check, Copy, GAME_MARKS, Replay, Users } from "./icons";
import { ONLINE, gameName } from "../../lib/games";
import { getBoard } from "../../lib/board";
import { dailyChallenge, isDoneToday } from "../../lib/daily";
import { nudgeOn, setNudge, setSound, soundOn, tick } from "../../lib/nudge";
import { useSession } from "../../lib/auth-client";

const REACTIONS = ["👍", "😂", "😮", "🔥", "gg", "your move"];

const clock = (at) =>
  new Date(at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

// The room. People come in by code, talk, tick ready, and the host sets the
// table — then everyone is walked to the same game and back here afterwards.
export function Parlour({ code }) {
  const router = useRouter();
  const lobby = useLobby(code);
  const { data: session } = useSession();

  const [name, setName] = useState(null); // null until the board has answered
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(null);
  const [titling, setTitling] = useState(false);
  const [sound, setSoundState] = useState(false);
  const [notify, setNotify] = useState(false);
  const [backIn, setBackIn] = useState(0);
  const asked = useRef(false);
  const walking = useRef(null); // set once the query string has been read
  const toldDaily = useRef(false);
  const wasReady = useRef(false);
  const log = useRef(null);

  const state = lobby.state;
  const me = state?.members.find((m) => m.you);
  const challenge = useMemo(() => dailyChallenge(), []);

  useEffect(() => {
    setSoundState(soundOn());
    setNotify(nudgeOn());
    // Walking back in from a running game is a deliberate visit to the room,
    // not a wrong turn. Bouncing them straight back to the board would make
    // "Room" in the stage bar do nothing at all.
    walking.current = new URLSearchParams(window.location.search).get("from") === "game";
  }, []);

  /* --- who you are: the board knows, or you say so once --- */

  useEffect(() => {
    let live = true;
    getBoard().then((board) => {
      if (!live) return;
      setName(board.player?.name || session?.user?.name || "");
      // whether today's challenge is cleared is known here and nowhere else
      if (isDoneToday(board.sessions ?? [], challenge)) toldDaily.current = "yes";
    });
    return () => {
      live = false;
    };
  }, [session?.user?.name, challenge]);

  useEffect(() => {
    if (asked.current || !name) return;
    asked.current = true;
    lobby.join(name);
  }, [name, lobby]);

  // told once, after there is a seat to hang it on
  useEffect(() => {
    if (!me || toldDaily.current !== "yes") return;
    toldDaily.current = "sent";
    lobby.daily(true);
  }, [me, lobby]);

  /* --- the chime when the last person ticks --- */

  useEffect(() => {
    const now = !!state?.canStart;
    if (now && !wasReady.current) tick();
    wasReady.current = now;
  }, [state?.canStart]);

  /* --- the walk to the board and back --- */

  useEffect(() => {
    const play = state?.play;
    if (!play || walking.current !== false) return;
    walking.current = true;

    const game = ONLINE.find((g) => g.id === play.game);
    const to = `/play/${game?.slug || play.game}`;

    if (play.watching) {
      router.push(`${to}?room=${play.code}&watch=1&lobby=${code}`);
      return;
    }
    lobby.keepSeat(play.code, play.token);
    router.push(
      `${to}?room=${play.code}&join=1&as=${encodeURIComponent(me?.name || name || "")}&lobby=${code}`
    );
  }, [state?.play, lobby, router, code, me?.name, name, backIn]);

  /* --- the chat sticks to the bottom --- */

  const chat = state?.chat ?? [];
  useEffect(() => {
    const node = log.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [chat.length]);

  const invite = useMemo(
    () => (typeof window === "undefined" ? "" : `${window.location.origin}/room/${code}`),
    [code]
  );

  const copy = async (text, what) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  };

  const send = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    lobby.say(text);
  };

  /* ----------------------------------------------------------- the gates --- */

  if (lobby.gone) {
    return (
      <div className="board__inner page--mid">
        <ZoneLabel>Private room</ZoneLabel>
        <div className="card card--quiet">
          <p className="chalk">
            Room <b>{code}</b> has closed, or never existed. Rooms keep for two hours after the
            last thing that happens in them.
          </p>
          <Link className="key" href="/">
            Back to the board
          </Link>
        </div>
      </div>
    );
  }

  if (name === "") {
    return (
      <div className="board__inner page--narrow">
        <ZoneLabel>Private room {code}</ZoneLabel>
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            const value = new FormData(e.currentTarget).get("name");
            setName(String(value || "").trim() || "Player");
          }}>
          <label className="field">
            <span className="field__label">What are you called in here?</span>
            <input className="field__input" name="name" maxLength={18} autoFocus />
          </label>
          <button className="key" type="submit">
            Come in
          </button>
        </form>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="board__inner page--mid">
        <ZoneLabel>Private room {code}</ZoneLabel>
        <p className="chalk">Opening the door…</p>
      </div>
    );
  }

  const picked = ONLINE.find((g) => g.id === state.game);
  const lastGame = state.lastPlay ? ONLINE.find((g) => g.id === state.lastPlay.game) : null;
  const short = state.playing < state.minSeats;
  const watchers = state.members.filter((m) => !m.playing);
  const series = state.series || { played: 0, draws: 0 };

  /* ------------------------------------------------------------- the room --- */

  return (
    <div className="board__inner">
      <div className="play__head">
        <div>
          <Link href="/" className="play__back">
            <ArrowLeft />
            Back to the board
          </Link>

          {titling ? (
            <form
              className="titling"
              onSubmit={(e) => {
                e.preventDefault();
                lobby.title(String(new FormData(e.currentTarget).get("title") || ""));
                setTitling(false);
              }}>
              <input
                className="field__input"
                name="title"
                defaultValue={state.title}
                maxLength={32}
                placeholder="Thursday club"
                autoFocus
              />
              <button className="key" type="submit">
                Name it
              </button>
            </form>
          ) : (
            <h1 className="play__title">
              {state.title || "Your room"}
              {state.host && (
                <button type="button" className="titling__edit" onClick={() => setTitling(true)}>
                  Rename
                </button>
              )}
            </h1>
          )}
        </div>

        <div className="roomcode roomcode--head">
          <span className="roomcode__label">Code</span>
          <button
            type="button"
            className="roomcode__value roomcode__value--button"
            onClick={() => copy(state.code, "code")}
            title="Copy the code">
            {state.code}
          </button>
          <button
            type="button"
            className="roomcode__copy"
            onClick={() => copy(invite, "link")}
            title="Copy the invite link">
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied === "link" ? "Link copied" : copied === "code" ? "Code copied" : "Invite"}
          </button>
        </div>
      </div>

      {state.play && (
        <div className="parlour__onair">
          <Tag tone="live" mark="live">
            {state.play.watching ? "Watching" : "Game on"}
          </Tag>
          <span>
            {gameName(state.play.game)} is running in room <b>{state.play.code}</b>.
          </span>
          <button
            type="button"
            className="key"
            onClick={() => {
              walking.current = false;
              setBackIn((n) => n + 1);
            }}>
            Rejoin
          </button>
          <button type="button" className="key key--quiet" onClick={() => lobby.end()}>
            End it and come back
          </button>
        </div>
      )}

      {/* today's challenge, taken together */}
      <div className="parlour__daily">
        <span className="parlour__dailymark" aria-hidden="true">
          {GAME_MARKS[challenge.game.id] &&
            (() => {
              const M = GAME_MARKS[challenge.game.id];
              return <M size={16} />;
            })()}
        </span>
        <span className="parlour__dailytask">
          <b>Today:</b> {challenge.task}
        </span>
        <span className="parlour__dailywho">
          {state.members.filter((m) => m.daily).length} of {state.members.length} cleared it
        </span>
        <Link className="key key--quiet" href={`/play/${challenge.game.slug}`}>
          Take it on
        </Link>
      </div>

      <div className="parlour">
        {/* ---------------------------------------------------- the table --- */}
        <section className="parlour__table" aria-labelledby="zone-table">
          <ZoneLabel count={`${state.playing} of ${state.seats} in chairs`}>
            <span id="zone-table">At the table</span>
          </ZoneLabel>

          <ul className="chairs">
            {state.members
              .filter((m) => m.playing)
              .map((member) => (
                <li key={member.id} className={`chair ${member.ready ? "is-ready" : ""}`}>
                  <span className="chair__pip" aria-hidden="true" />
                  <span className="chair__name">
                    {member.name}
                    {member.you && <em> (you)</em>}
                  </span>
                  {member.host && <span className="chair__role">Host</span>}
                  {member.daily && (
                    <span className="chair__daily" title="Cleared today's challenge">
                      <Check size={11} />
                      <span className="sr-only">Cleared today&rsquo;s challenge</span>
                    </span>
                  )}
                  {series.played > 0 && <span className="chair__wins">{member.wins}</span>}
                  <span className="chair__state">
                    {member.away ? "Away" : member.ready ? "Ready" : "Waiting"}
                  </span>
                  {state.host && !state.play && !member.you && (
                    <button
                      type="button"
                      className="chair__move"
                      onClick={() => lobby.seat(member.id)}>
                      Sit out
                    </button>
                  )}
                </li>
              ))}

            {Array.from({ length: Math.max(0, state.seats - state.playing) }).map((_, i) => (
              <li className="chair chair--open" key={`open-${i}`}>
                <span className="chair__pip" aria-hidden="true" />
                <span className="chair__name">Open chair</span>
                <span className="chair__state">Share the code</span>
              </li>
            ))}
          </ul>

          {watchers.length > 0 && (
            <>
              <p className="parlour__rail">Watching</p>
              <ul className="chairs">
                {watchers.map((member) => (
                  <li key={member.id} className="chair chair--watcher">
                    <span className="chair__pip" aria-hidden="true" />
                    <span className="chair__name">
                      {member.name}
                      {member.you && <em> (you)</em>}
                    </span>
                    {member.daily && (
                      <span className="chair__daily" title="Cleared today's challenge">
                        <Check size={11} />
                      </span>
                    )}
                    <span className="chair__state">{member.away ? "Away" : "Watching"}</span>
                    {state.host && !state.play && (
                      <button
                        type="button"
                        className="chair__move"
                        onClick={() => lobby.seat(member.id)}>
                        Sit them down
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}

          {series.played > 0 && (
            <p className="parlour__series">
              {gameName(series.game)} series — {series.played} played
              {series.draws ? `, ${series.draws} drawn` : ""}
            </p>
          )}

          <div className="parlour__controls">
            {me?.playing ? (
              <button
                type="button"
                className={`key ${me?.ready ? "key--quiet" : ""}`}
                onClick={() => lobby.ready(!me?.ready)}
                disabled={!!state.play}>
                {me?.ready ? "Not ready" : "I'm ready"}
              </button>
            ) : (
              <span className="parlour__watching">You are watching this one.</span>
            )}

            {state.host && (
              <button
                type="button"
                className="key"
                onClick={() => lobby.start()}
                disabled={!state.canStart}>
                Start {picked?.name}
              </button>
            )}

            {state.host && state.lastPlay && !state.play && (
              <button type="button" className="key key--quiet" onClick={() => lobby.again()}>
                <Replay size={14} />
                Same again
              </button>
            )}

            <button
              type="button"
              className="key key--quiet"
              onClick={() => lobby.leave().then(() => router.push("/"))}>
              Leave
            </button>
          </div>

          <p className="note">
            {state.play
              ? "A game is running. End it to set the table again."
              : short
              ? `${picked?.name} needs ${state.minSeats} in chairs.`
              : state.canStart
              ? state.host
                ? "Everyone is ready. Start when you like."
                : "Everyone is ready. Waiting on the host."
              : `${state.ready} of ${state.playing} ready.`}
          </p>

          {lastGame && !state.play && (
            <p className="note">
              <Link href={`/play/${lastGame.slug}?room=${state.lastPlay.code}&watch=1&lobby=${code}`}>
                Watch the last {lastGame.name} game back
              </Link>{" "}
              — rooms keep for two hours.
            </p>
          )}

          {/* the two nudges, both off until asked for */}
          <div className="parlour__switches">
            <label className="switch">
              <input
                type="checkbox"
                checked={sound}
                onChange={(e) => {
                  setSound(e.target.checked);
                  setSoundState(e.target.checked);
                  if (e.target.checked) tick();
                }}
              />
              <span>Chime when everyone is ready</span>
            </label>
            <label className="switch">
              <input
                type="checkbox"
                checked={notify}
                onChange={async (e) => setNotify(await setNudge(e.target.checked))}
              />
              <span>Tell me when it is my move</span>
            </label>
          </div>

          {lobby.error && <p className="notice">{lobby.error}</p>}
        </section>

        {/* ----------------------------------------------------- the chat --- */}
        <section className="parlour__chat" aria-labelledby="zone-chat">
          <ZoneLabel count={<Users size={14} />}>
            <span id="zone-chat">Talk</span>
          </ZoneLabel>

          <div className="talk" ref={log} role="log" aria-live="polite">
            {chat.length === 0 ? (
              <p className="chalk">Nobody has said anything yet.</p>
            ) : (
              chat.map((line) => (
                <p key={line.id} className={`talk__line ${line.name ? "" : "talk__line--house"}`}>
                  {line.name && <b className="talk__who">{line.name}</b>}
                  <span className="talk__text">{line.text}</span>
                  <span className="talk__at">{clock(line.at)}</span>
                </p>
              ))
            )}
          </div>

          <div className="talk__quick">
            {REACTIONS.map((mark) => (
              <button
                key={mark}
                type="button"
                className="talk__react"
                onClick={() => lobby.say(mark)}>
                {mark}
              </button>
            ))}
          </div>

          <form className="talk__form" onSubmit={send}>
            <input
              className="field__input"
              value={draft}
              maxLength={240}
              placeholder="Say something"
              onChange={(e) => setDraft(e.target.value)}
            />
            <button className="key" type="submit" disabled={!draft.trim()}>
              Send
            </button>
          </form>
        </section>
      </div>

      {/* ------------------------------------------------- setting a table --- */}
      <section aria-labelledby="zone-pick">
        <ZoneLabel count={state.host ? "host picks" : gameName(state.game)}>
          <span id="zone-pick">The table</span>
        </ZoneLabel>

        <div className="picker">
          {ONLINE.map((game) => {
            const Mark = GAME_MARKS[game.id];
            const on = game.id === state.game;
            return (
              <button
                key={game.id}
                type="button"
                className={`tile tile--pick ${on ? "is-on" : ""}`}
                aria-pressed={on}
                disabled={!state.host || !!state.play}
                onClick={() => lobby.pick(game.id)}>
                <span className="tile__mouth">
                  <span className="tile__room">
                    <GamePreview gameId={game.id} />
                  </span>
                </span>
                <span className="tile__name">
                  <Mark size={16} />
                  {game.name}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
