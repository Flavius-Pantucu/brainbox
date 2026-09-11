// Telling the other browsers that something moved.
//
// Not a transport: the room still lives in Redis or Postgres and the client
// still fetches it over HTTP. All that goes down this channel is a version
// number — "there is something past N" — and the client asks for it the same
// way it always has. That keeps one shape of state instead of two, and means a
// dropped connection degrades to the polling that was already there.
//
// Publishing is only ever the server's job, so this file holds the secret and
// the browser gets a short-lived token instead — see app/api/live/token.
//
// Unset ABLY_API_KEY and every call here is a no-op. That is a supported way
// to run, not a broken one.

import Ably from "ably";

export const liveOn = () => !!process.env.ABLY_API_KEY;

export const roomChannel = (code) => `room:${String(code).toUpperCase()}`;
export const lobbyChannel = (code) => `lobby:${String(code).toUpperCase()}`;

// Only a name and a code can appear in a channel, so a client cannot ask for a
// capability on anything else by dressing the parameter up.
const SHAPE = /^(room|lobby):[A-Z0-9]{4,6}$/;
export const validChannel = (name) => SHAPE.test(String(name || ""));

let rest = null;

function client() {
  if (!liveOn()) return null;
  // Rest, not Realtime: a serverless function publishes over HTTP and exits.
  // It has no business holding a socket open, and could not keep one if it did.
  if (!rest) rest = new Ably.Rest(process.env.ABLY_API_KEY);
  return rest;
}

// Awaited on purpose. A serverless function can be frozen the moment it
// answers, so a publish left in flight is a publish that may never leave.
export async function announce(channel, version) {
  const ably = client();
  if (!ably) return;
  try {
    await ably.channels.get(channel).publish("moved", { version });
  } catch (error) {
    // A room that cannot be announced is still a room: the other side polls.
    console.warn(`[live] could not announce ${channel}: ${error.message}`);
  }
}
