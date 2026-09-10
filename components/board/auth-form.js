"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plate, ZoneLabel } from "./plate";
import { signIn, signUp } from "../../lib/auth-client";
import { forgetSession, pushLocal } from "../../lib/store-remote";
import { read } from "../../lib/store";

// Better Auth answers with codes; these are the ones a player can actually do
// something about. Anything else falls back to what the server said.
const SAID = {
  USER_ALREADY_EXISTS: "There is already an account on that email. Sign in instead.",
  INVALID_EMAIL_OR_PASSWORD: "That email and password do not go together.",
  INVALID_EMAIL: "That does not look like an email address.",
  PASSWORD_TOO_SHORT: "A password needs at least eight characters.",
  USER_NOT_FOUND: "No account on that email yet.",
};

export function AuthForm({ mode }) {
  const joining = mode === "sign-up";
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [moved, setMoved] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    // whatever this browser has been keeping, before signing in stops it being
    // read — it goes up in a moment
    const local = read().sessions;

    const result = joining
      ? await signUp.email({ email, password, name: name.trim() || email.split("@")[0] })
      : await signIn.email({ email, password });

    if (result?.error) {
      setError(SAID[result.error.code] || result.error.message || "That did not work.");
      setBusy(false);
      return;
    }

    // the session just changed, so the cached answer is stale
    forgetSession();

    // Games played before signing up are still that player's games. Every one
    // carries the id it already had and the insert ignores conflicts, so doing
    // this twice cannot double-count anything.
    if (local.length) {
      const { sent } = await pushLocal(local);
      if (sent) setMoved(sent);
    }

    router.push("/you");
    router.refresh();
  };

  return (
    <div className="board__inner">
      <div className="play__head">
        <ZoneLabel>{joining ? "Open an account" : "Sign in"}</ZoneLabel>
      </div>

      <Plate className="auth" hangKey={mode}>
        <form className="auth__form" onSubmit={submit}>
          {joining && (
            <label className="field">
              <span className="field__label">Username</span>
              <input
                className="field__input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={18}
                autoComplete="username"
                placeholder="What the board should call you"
                spellCheck={false}
              />
            </label>
          )}

          <label className="field">
            <span className="field__label">Email</span>
            <input
              className="field__input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              spellCheck={false}
            />
          </label>

          <label className="field">
            <span className="field__label">Password</span>
            <input
              className="field__input"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={joining ? "new-password" : "current-password"}
              placeholder={joining ? "At least eight characters" : ""}
            />
          </label>

          {error && (
            <p className="auth__error" role="alert">
              {error}
            </p>
          )}

          <button className="key" type="submit" disabled={busy}>
            {busy ? "One moment" : joining ? "Open it" : "Sign in"}
          </button>

          {moved != null && (
            <p className="chalk chalk--tight">
              {moved} game{moved === 1 ? "" : "s"} from this browser came with you.
            </p>
          )}

          <p className="chalk chalk--tight auth__swap">
            {joining ? (
              <>
                Already have one? <Link href="/sign-in">Sign in</Link>.
              </>
            ) : (
              <>
                No account yet? <Link href="/sign-up">Open one</Link>.
              </>
            )}
          </p>

          <p className="chalk chalk--tight">
            An account is optional. Without one the board still keeps your games — in this
            browser only, and only until you clear it.
          </p>
        </form>
      </Plate>
    </div>
  );
}
