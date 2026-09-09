# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Existing codebase: Next.js 15 with React 18, Tailwind CSS 3, deployed as a single project.
Confirmed decision (2026-09-08): migrate the interface from the Pages Router to the App
Router (`app/`), with real per-surface routes. Game logic in `components/games/**` is
existing product truth and is carried over, not rewritten, during this migration.

Legacy dependencies present but not load-bearing for the redesign: flowbite, flowbite-react,
@headlessui/react, @heroicons/react, react-transition-group, axios, cookies-next,
react-hook-form, modulo-x.

## Users

Primary user: a person who wants a short, self-contained session of a classic logic game
(chess, Go, backgammon, Remi, checkers, Reversi, Connect Four,
minesweeper, sudoku, tic-tac-toe) in the browser, with no install and no lobby wait. They arrive
on a break or in an idle moment, want to be inside a game within a few seconds, and want a
reason to come back tomorrow.

Secondary user: the same person in a returning mood — checking whether they kept a streak,
whether a personal best improved, and where they stand against others.

## Product Purpose

BrainBox is a portal for browser-based logic games. Success is: the player reaches a game
quickly, finishes a session, and has a visible reason to return — a streak, a daily
challenge, a rank, or a personal best that is one attempt away from improving.

## Positioning

Most single-game sites give a player one game and no memory of them; most large game portals
bury quality logic games under ad-heavy catalogs. BrainBox is a small, curated set of
hand-built logic games that share one account, one progression surface, and one daily ritual —
so the portal itself, not any individual game, is the thing the player returns to.

## Operating Context

- Sessions are short and interruptible; a player may leave mid-game and return.
- Play happens on desktop and mobile browsers. Chess and sudoku boards need real touch
  targets and must remain fully playable at small widths.
- Sudoku and chess include audio feedback (`public/sounds/`).
- Games are single-player against local rules or a local opponent; no realtime server play
  exists today.

## Capabilities and Constraints

Shipped and working today (product truth to preserve):
- **Sudoku** — puzzles are generated in the browser per game (`lib/sudoku.js`): a solved grid by
  randomised backtracking, then symmetric digging that keeps exactly one solution, at four
  difficulties (Easy 42 clues, Medium ~34, Hard ~29, Evil ~26). Notes, undo, hints, erase,
  pause, a clock, three mistakes, and full keyboard control.
- **Tic-Tac-Toe** — three opponents: the machine (Loose / Fair / Perfect, minimax with
  alpha-beta in `lib/ttt.js`), two people on one device, and **online play by room code**.
- **Connect Four** — the same three opponents, over `lib/connect4.js` (alpha-beta scored on runs
  of four, three levels), with online rooms on the same server.
- **Minesweeper** — `lib/minesweeper.js`: three field sizes, mines laid after the first click so
  that click is always safe, flood opening, flags, and chording. Solo — no rooms, no opponent.
- **Remi** — Romanian rummy on 106 tiles in `lib/remi.js`: groups, runs, one joker to a meld, the
  one low or high, the 45-point opening, building on anyone's melds, buying jokers off the table,
  and penalty scoring to 100. Two to four players. The first game with hidden information and the
  first that seats more than two: the room builds its payload per viewer, and a table that can be
  played by different numbers waits for its host to start it.
- **Backgammon** — `lib/backgammon.js`: whole-turn move generation so that the must-use-both and
  higher-die rules hold, doubles, the bar, bearing off, and gammon/backgammon scoring. The
  machine picks a turn by evaluating the position it leaves. Online the server rolls the dice.
  No doubling cube.
- **Checkers** — English draughts in `lib/checkers.js`: compulsory captures, forced chains, a man
  crowned by a jump stopping there, and a forty-move idle draw. Alpha-beta over whole moves.
  Online rooms carry chains one hop at a time.
- **Reversi** — `lib/reversi.js`: turning, forced passes, and a game that ends only when neither
  side can move. The opponent is alpha-beta over a corner-weighted table with a disc-count
  endgame. Online rooms on the same server.
- **Go** — 9×9 / 13×13 / 19×19 in `lib/go.js`: liberties, capture, suicide, simple ko, area
  scoring with a dead-stone marking phase both players accept. The opponent is flat Monte-Carlo
  on a time budget. Online rooms carry the counting phase too.
- **Chess** under `components/games/chess/**`: an analysis board, a Stockfish opponent at five
  strengths, and online play by room code. chess.js holds the rules, Stockfish (wasm, in a
  worker) holds the engine — eval bar, best-move hints, and a post-game review with per-move
  verdicts and accuracy. The analysis board holds a move tree with variations (`lib/chess-tree.js`);
  clocks are 3+2 / 5+0 / 10+5, run on the server for online games; a set-up mode builds any legal
  position by hand. The engine runs on the analysis table only.
- Every game ends on the same **verdict overlay** (`components/board/verdict.js`) — a result card
  lowered over the board, marked and animated by outcome, dismissible so the board stays readable.
- Light and dark theme, previously persisted in a `site_theme` cookie.
- Auth, register, and password-reset modals — presentational only, wired to nothing.
- `pages/api/health.js` is the only endpoint.

Confirmed constraints (2026-09-08, amended 2026-09-09):
- **No database and no accounts.** Player stats, streaks, leaderboards and challenge history
  have no server behind them and live in one browser.
- **One server-side feature exists: online rooms for tic-tac-toe, chess, Connect Four, Go, Reversi, checkers, backgammon and Remi** (Remi seats up to four; the rest seat two) (`lib/rooms.js`, `app/api/rooms/**`).
  Rooms are held in the node process's memory and pushed to both players over SSE. This works
  under `npm run dev` and a self-hosted `npm start`; a serverless deploy with more than one
  instance would need that one module swapped for a shared store. Rooms hold no identity beyond
  a name typed for the round, and expire two hours after the last move.
- The redesign must therefore route all player data through one explicit client data layer
  with local persistence, so that swapping in real endpoints later is a contained change.
- Any surface that would show numbers the product cannot truthfully produce must render an
  honest empty or "not yet" state rather than invented figures. Leaderboards must not display
  fabricated rival players, and stats must not display invented history.
- The catalog grows. More games will be added over time (confirmed 2026-09-09), so every
  surface that lists games must scale past three without being redesigned.
- `NEXT_PUBLIC_GRID` and `NEXT_PUBLIC_SOLUTION` are retired: sudoku generates its own puzzles.

Undecided, not to be invented: account model, whether leaderboards are global or friends-only,
monetization, multiplayer.

## Brand Commitments

- Name: **BrainBox** (renamed from GameHub, 2026-09-09). The name is the brief for the mark:
  a brain, in a box.
- Identity assets, all authored in this repository: the mark in `components/board/logo.js`
  and the icons at `app/icon.svg` and `app/apple-icon.svg` — a soft-cornered box holding a
  two-lobed brain. The old GameHub logo and favicon are deleted.
- Binding game assets: the chess piece SVGs (`wK.svg`, `bQ.svg`, and the rest of the set) and
  the move/capture/castle sounds in `public/sounds/` — chess depends on both.
- Palette: **blue and grey** — a navy ground with steel mid-tones and a cobalt signal
  (confirmed 2026-09-09, replacing the board-green world shipped a day earlier).
- Tone: **friendly, not shouted** (confirmed 2026-09-09). Rounded corners throughout, a curvy
  display face, and weights held below the heavy end of the ramp. The condensed industrial
  stencil voice that shipped first is retired.
- No confirmed voice guide beyond that. `.impeccable/surfaces/app-page-js.md` carries the
  open dashboard revision the user deferred to the end of the current run of work.

## Evidence on Hand

Real: the three working game implementations, the asset set above, this repository's history.
Absent — must not be fabricated: user counts, testimonials, ratings, download or play numbers,
press mentions, real leaderboard rivals, historical player statistics.

## Product Principles

1. **Time-to-play is the headline metric.** Every surface is judged by how fast it puts the
   player inside a game.
2. **The portal is the product.** Shared identity, shared progression, and one daily ritual are
   what make three games into a hub.
3. **Never fake the data.** Empty states are honest, specific, and designed — not placeholders
   waiting for a backend.
4. **The board is sacred.** A game takes the whole window below the rail; chrome yields to the
   play surface, and game clarity and touch targets outrank decoration at every breakpoint.
5. **Returning must be rewarded visibly.** Streaks, bests, and daily progress are surfaced
   where the player already looks, not buried in a profile page.

## Accessibility & Inclusion

No product-specific standard was established. Baseline expectations apply: keyboard-operable
game boards and navigation, visible focus, sufficient contrast in both themes, and respect for
`prefers-reduced-motion`.
