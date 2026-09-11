# BrainBox

A portal for browser-based logic games — chess, Go, backgammon, checkers, Reversi,
Connect Four, minesweeper, sudoku and tic-tac-toe — built with
[Next.js](https://nextjs.org/).

The interface is a hand-operated club board, painted in navy and steel: today's challenge,
your run, your bests and the standings all live on one board, and playing a game hangs a new
plate. A game takes the whole window below the head rail.

## Content

The application lives in a single Next.js project on the App Router. Routes are rendered
from `app/`, shared UI lives in `components/`, and the backend will be built inside
`app/api/`, which Next.js serves as server-side endpoints.

Games:

- [x] **Minesweeper** — beginner to expert, with a first click that is always safe
- [x] **Sudoku** — a fresh puzzle every game, generated in the browser, at four difficulties
- [x] **Go** — 9×9 to 19×19, against the machine, against the next chair, or online by room code
- [x] **Backgammon** — against the machine, against the next chair, or online by room code
- [x] **Checkers** — against the machine, against the next chair, or online by room code
- [x] **Reversi** — against the machine, against the next chair, or online by room code
- [x] **Connect Four** — against the machine, against the next chair, or online by room code
- [x] **Tic-Tac-Toe** — against the machine, against the next chair, or online by room code
- [x] **Chess** — an analysis board, a Stockfish opponent at five strengths, or online by room code

## Routes

| Route            | What it is                                                        |
| ---------------- | ----------------------------------------------------------------- |
| `/`              | The board — today's challenge, the three games, your run, standings |
| `/play/chess`    | Chess, inside the play frame                                       |
| `/play/connect4` | Connect Four, inside the play frame                                |
| `/play/go`       | Go, inside the play frame                                          |
| `/play/reversi`  | Reversi, inside the play frame                                     |
| `/play/checkers` | Checkers, inside the play frame                                    |
| `/play/minesweeper` | Minesweeper, inside the play frame                              |
| `/play/backgammon` | Backgammon, inside the play frame                                |
| `/play/sudoku`   | Sudoku, inside the play frame                                      |
| `/play/tictactoe`| Tic-Tac-Toe, inside the play frame                                 |
| `/standings`     | The ladder and your card — recent games, wins, day run             |
| `/api/health`    | Health check                                                       |
| `/api/rooms`     | Opens an online room                                               |
| `/api/rooms/:code` | Join, move, resign, draw, rematch, leave                        |
| `/api/rooms/:code/stream` | Server-sent events: the room pushes every change         |

## Chess

Three tables, one board: **Analysis** (both sides yours, load a FEN or PGN, engine lines on),
**Bot** (Stockfish at Learner / Casual / Club / Sharp / Brutal, pick your colour and clock), and
**Online** (open a room, send the invite link, the server validates every move and owns the
clock). Move list with navigation, eval bar, captured material, promotion picker, draw offers
and resignation, and a post-game review that scores each move against the engine and gives both
sides an accuracy.

The analysis board keeps a **tree**, not a list: play from any earlier move and it becomes a
variation under it, shown in brackets under the move it branched from. A variation can be
promoted to the main line or cut away. It also has a **set-up mode** — paint pieces onto squares,
drag them around, drag them off the board to remove them, choose the side to move, and castling
rights follow from where the kings and rooks stand. The engine only runs on the analysis table;
the bot and online games play without one, and the review runs after the game.

**Clocks** are 3+2, 5+0 or 10+5, or none. Online they run on the server — a player who stops
moving still flags, and a move that arrives after the flag does not land.

Rules come from [chess.js](https://github.com/jhlywa/chess.js). The engine is
[Stockfish.js](https://github.com/nmrugg/stockfish.js) (GPLv3), the lite single-threaded wasm
build, which needs no cross-origin isolation headers. `npm install` copies it into
`public/engine/` — it is 7 MB and is not in git, so a fresh clone needs that install before the
bot or the eval bar will run.

## Go

9×9, 13×13 or 19×19, against the machine, the next chair, or online by room code. Full rules in
`lib/go.js` — liberties, capture, suicide, simple ko — and **area (Chinese) scoring**: after both
players pass, the board goes into a counting phase where clicking a group marks it dead, the
territory and running count update live, and both players accept before the result stands.
Komi is 6.5.

The opponent is flat Monte-Carlo: it plays out hundreds of random games from each candidate move
and takes the one that wins most, on a time budget that grows with the board. It never fills its
own eyes and passes when it has nothing left. It is a real opponent on 9×9 and an honest one
above that. Not implemented: positional superko, and the search runs on the main thread rather
than in a worker.

## Backgammon

`lib/backgammon.js` holds the rules, including the one most implementations get wrong: **you
must use both dice if any order lets you, and if only one can be played it has to be the higher
one.** That is not a check you can make move by move — playing the low die first can strand the
high one — so a turn is generated whole. Every legal sequence for the roll is built, only the
longest survive, and the board offers you the first step of whatever is still open. Doubles are
played four times over. The bar comes before anything else, bearing off needs every checker home
with an over-roll allowed only from the furthest point, and a win is worth one, two for a gammon
or three for a backgammon.

The machine picks a whole turn rather than a move, scoring the position it would leave: pips,
checkers off and on the bar, points made at home, anchors in the opponent's home, and blots
weighted by how many of the thirty-six rolls could hit them. On an opening 3-1 it makes the
five-point, which is the book move.

Online, **the dice are the server's to roll** — a client that rolled its own would be choosing
them. No doubling cube.

## Checkers

English draughts on the dark squares, in `lib/checkers.js`. The rules that decide whether an
implementation is right are all here: a capture is compulsory, a capture that can continue must
continue, and a man crowned by a jump stops on the back row even with another jump waiting. A
game ends when a side has nothing left to move, or is drawn after forty moves each with nothing
taken and no man moved.

The machine is alpha-beta over whole moves — chains expanded, so it sees a triple jump as one
move — scoring men by how close they are to crowning, kings flat, and an edge or a held back row
slightly up. It plays its chains out one hop at a time on the board rather than teleporting.

## Reversi

Eight by eight, filled to the last square. Full rules in `lib/reversi.js` — a move must turn at
least one disc, a side with nowhere to play sits the turn out, and the game ends only when
neither side can move. The opponent is alpha-beta over a positional table where a corner is
worth 120 and the square diagonally inside one is worth −40, plus a mobility term; inside the
last ten empty squares it stops valuing position and counts discs, because nothing can be turned
back by then.

## Connect Four

Seven columns, six rows, four in a row in any direction. Three opponents: the machine (Loose /
Fair / Sharp — alpha-beta over every run of four, in `lib/connect4.js`), two people on one
device, and online by room code. Discs fall with a bounce, the winning four flashes, and the
machine always takes a win and blocks one whatever its level.

## Minesweeper

Beginner (9×9, 10), intermediate (16×16, 40) or expert (30×16, 99), in `lib/minesweeper.js`.
The mines are laid *after* the first click and kept off it and everything it touches, so the
first press is always safe and always opens a space rather than a lone number. Flags by
right-click or by holding the flag key on; a number that already has its flags opens everything
else it touches when pressed, and takes the consequences if a flag is in the wrong place. Only a
cleared field records a time.

## Sudoku

Puzzles are generated on the fly in `lib/sudoku.js` — a solved grid by randomised backtracking,
then clues dug out in symmetric pairs, each removal kept only while the grid still has exactly
one solution. Four difficulties: Easy (42 clues), Medium (~34), Hard (~29), Evil (~26).
Generation takes about a millisecond, so "new grid" really is a new grid.

Keyboard: arrows move, 1–9 place, 0 or backspace erases, `N` notes, `U` undo, `H` hint,
space pauses.

## Playing someone

Seven of the nine games take a second player: chess, go, backgammon, checkers, reversi,
connect four and tic-tac-toe. Sudoku and minesweeper are yours alone.

Open a private room from the board and you get a four-character code plus an invite link.
A room holds up to eight people; the game seats two, so the rest watch. Everyone in a chair
has to tick ready before the host can start, and the room outlives the game — finish one,
come back, set the table for something else. There is a chat, a running series score, and
a shared view of today's challenge.

Rooms live in Redis when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set and
answering, and in Postgres otherwise (`lib/rooms-store.js`). A Redis that dies mid-game drops
through to Postgres rather than taking the game with it. Either way they expire two hours
after the last thing that happens in them and hold no identity beyond a name typed for the
round. `/api/health` says which store a deployment actually picked.

### How a move reaches the other screen

The client holds the room's `version` and asks with it; a room that has not moved answers
`304` with no body. That loop is the floor, and on its own it puts a move on the other
screen somewhere between 1.2 and 8 seconds later, depending on how long the room has been
quiet.

Set `ABLY_API_KEY` and the server publishes a nudge — just the new version number — the
instant a room is written, and the other browser asks at once. About a tenth of a second in
practice, and far fewer reads, because nothing is fetched while nothing is happening.

Deliberately a nudge and not the state itself: `publicState` is computed per viewer, so one
broadcast payload would either leak one player's view to the other or need a channel each.
Sending the version keeps one shape of state, and means a dropped socket degrades to the
polling that was already there rather than to a dead board. The browser never holds the Ably
key — it asks `/api/live/token` for a short-lived one, subscribe only, scoped to its own room.

Without the key none of this runs and the board polls, which is a supported way to deploy,
not a broken one.

## Where the data lives

An account is optional. Signed out, everything a player accumulates stays in that one browser
exactly as it always did; signed in, the same board is read and written against Postgres. Which
one answered is decided per call inside `lib/board.js`, and nothing above it knows or cares.
Nothing is invented either way: a number the app cannot honestly produce shows an open hook.

```
lib/board.js         the data layer every screen calls. Picks a backing per call and
                     falls back to the local one whenever the server cannot be reached,
                     because a game that has just been played must not be lost to a
                     failed request
lib/store.js         localStorage read/write, versioned, SSR-safe — the signed-out path
lib/store-remote.js  the signed-in path, over /api/board
lib/db/schema.js     six tables: four Better Auth owns, plus play and room
lib/auth.js          Better Auth, email and password, no OAuth
lib/rooms-store.js   where a live room sits: Redis first, Postgres when it is not there
lib/daily.js         today's challenge, derived from the calendar date so no server is
                     needed for everyone to agree on what it is
lib/games.js         the catalog
```

Copy `.env.example` to `.env` and fill it in before either half will run. `npm run db:migrate`
creates the tables; `npm run check:backend` proves the whole thing works against the real
services, while `npm run check` stays offline and needs neither.

A game reports its outcome through an `onResult` prop; the play frame records the session
(with its duration) when the player leaves the surface, and ignores visits shorter than
twenty seconds.

## Project structure

```
app/                    routes, root layout, the global stylesheet
app/api/                backend endpoints
components/board/       the scoreboard design system — plates, hooks, slots, brass
components/games/       one folder per game
lib/                    data layer and derivation
public/                 images and sounds
PRODUCT.md              durable product truth
```

The design system is documented in `DESIGN.md`.

## Running it

- clone this repository;
- install the latest Node.js from the official website;
- run `npm install`;
- run `npm run dev` and open `http://localhost:3000`.

For a production build, run `npm run build` followed by `npm start`.
