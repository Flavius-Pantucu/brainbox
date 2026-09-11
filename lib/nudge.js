// Two small nudges, both off until somebody asks for them.
//
// The turn notification is deliberately the cheap version: a Notification
// raised by the tab that is already polling, not a pushed one. No keys, no
// service worker, no subscriptions table — and it covers the case that
// actually happens, which is a room left open in a background tab.
//
// ponytail: a closed tab is nudged by nothing. Real Web Push is the upgrade,
// and it needs VAPID keys and somewhere to keep subscriptions.

const SOUND_KEY = "brainbox.sound";
const NUDGE_KEY = "brainbox.nudge";

function flag(key) {
  try {
    return window.localStorage.getItem(key) === "on";
  } catch {
    return false;
  }
}

function setFlag(key, on) {
  try {
    window.localStorage.setItem(key, on ? "on" : "off");
  } catch {
    /* the choice simply does not survive the visit */
  }
}

export const soundOn = () => flag(SOUND_KEY);
export const setSound = (on) => setFlag(SOUND_KEY, on);
export const nudgeOn = () => flag(NUDGE_KEY);

// Permission has to be asked for from a gesture, so turning the switch on is
// the ask. Refusing it leaves the switch off rather than lying about it.
export async function setNudge(on) {
  if (!on) {
    setFlag(NUDGE_KEY, false);
    return false;
  }
  if (typeof Notification === "undefined") return false;
  const granted =
    Notification.permission === "granted"
      ? true
      : (await Notification.requestPermission()) === "granted";
  setFlag(NUDGE_KEY, granted);
  return granted;
}

export function nudge(title, body) {
  if (!nudgeOn() || typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  // a tab you are looking at does not need telling
  if (typeof document !== "undefined" && !document.hidden) return;
  try {
    new Notification(title, { body, tag: "brainbox-turn", renotify: false });
  } catch {
    /* some browsers refuse outside a service worker; the board plays on */
  }
}

// One short blip, made rather than loaded: a file would be a request, a cache
// entry and a licence for eighty milliseconds of sound.
export function tick() {
  if (!soundOn()) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
    osc.onended = () => ctx.close();
  } catch {
    /* no audio here; nothing else changes */
  }
}
