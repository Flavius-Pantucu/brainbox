"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLobby } from "./use-lobby";
import { GamePreview } from "./preview";
import { Tag } from "./tag";
import { ZoneLabel } from "./plate";
import { ArrowLeft, Check, Copy, GAME_MARKS, Users } from "./icons";
import { ONLINE, gameName } from "../../lib/games";
import { getBoard } from "../../lib/board";
import { useSession } from "../../lib/auth-client";

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
  const asked = useRef(false);
  const walking = useRef(false);
  const log = useRef(null);

  const state = lobby.state;
  const me = state?.members.find((m) => m.you);

  /* --- who you are: the board knows, or you say so once --- */

  useEffect(() => {
    let live = true;
    getBoard().then((board) => {
      if (!live) return;
      setName(board.player?.name || session?.user?.name || "");
    });
    return () => {
      live = false;
    };
  }, [session?.user?.name]);

  useEffect(() => {
    if (asked.current || !name) return;
    asked.current = true;
    lobby.join(name);
  }, [name, lobby]);

  /* --- the walk to the board and back --- */

  useEffect(() => {
    const play = state?.play;
    if (!play || walking.current) return;
    walking.current = true;
    lobby.keepSeat(play.code, play.token);
    const game = ONLINE.find((g) => g.id === play.game);
    router.push(
      `/play/${game?.slug || play.game}?room=${play.code}&join=1` +
        `&as=${encodeURIComponent(me?.name || name || "")}&lobby=${code}`
    );
  }, [state?.play, lobby, router, code, me?.name, name]);

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
  const short = state.members.length < state.minSeats;
  const crowded = state.members.length > state.seats;

  /* ------------------------------------------------------------- the room --- */

  return (
    <div className="board__inner">
      <div className="play__head">
        <div>
          <Link href="/" className="play__back">
            <ArrowLeft />
            Back to the board
          </Link>
          <h1 className="play__title">Your room</h1>
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
            Game on
          </Tag>
          <span>
            {gameName(state.play.game)} is running in room <b>{state.play.code}</b>.
          </span>
          <button type="button" className="key key--quiet" onClick={() => lobby.end()}>
            End it and come back
          </button>
        </div>
      )}

      <div className="parlour">
        {/* ---------------------------------------------------- the table --- */}
        <section className="parlour__table" aria-labelledby="zone-table">
          <ZoneLabel count={`${state.members.length} of ${state.seats}`}>
            <span id="zone-table">At the table</span>
          </ZoneLabel>

          <ul className="chairs">
            {state.members.map((member) => (
              <li key={member.id} className={`chair ${member.ready ? "is-ready" : ""}`}>
                <span className="chair__pip" aria-hidden="true" />
                <span className="chair__name">
                  {member.name}
                  {member.you && <em> (you)</em>}
                </span>
                {member.host && <span className="chair__role">Host</span>}
                <span className="chair__state">{member.ready ? "Ready" : "Waiting"}</span>
              </li>
            ))}

            {Array.from({ length: Math.max(0, state.seats - state.members.length) }).map((_, i) => (
              <li className="chair chair--open" key={`open-${i}`}>
                <span className="chair__pip" aria-hidden="true" />
                <span className="chair__name">Open chair</span>
                <span className="chair__state">Share the code</span>
              </li>
            ))}
          </ul>

          <div className="parlour__controls">
            <button
              type="button"
              className={`key ${me?.ready ? "key--quiet" : ""}`}
              onClick={() => lobby.ready(!me?.ready)}
              disabled={!!state.play}>
              {me?.ready ? "Not ready" : "I'm ready"}
            </button>

            {state.host && (
              <button
                type="button"
                className="key"
                onClick={() => lobby.start()}
                disabled={!state.canStart || !!state.play}>
                Start {picked?.name}
              </button>
            )}

            <button type="button" className="key key--quiet" onClick={() => lobby.leave().then(() => router.push("/"))}>
              Leave
            </button>
          </div>

          <p className="note">
            {state.play
              ? "A game is running. End it to set the table again."
              : short
              ? `${picked?.name} needs ${state.minSeats} people. One more to go.`
              : crowded
              ? `${picked?.name} seats ${state.seats}. Someone has to sit this one out.`
              : state.canStart
              ? state.host
                ? "Everyone is ready. Start when you like."
                : "Everyone is ready. Waiting on the host."
              : `${state.ready} of ${state.members.length} ready.`}
          </p>

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
