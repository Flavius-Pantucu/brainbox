# GameHub

A portal for browser-based logic games — chess, sudoku and tic-tac-toe — built with
[Next.js](https://nextjs.org/).

The interface is a hand-operated club scoreboard, painted in navy and steel: today's challenge,
your run, your bests and the standings all live on one board, and playing a game hangs a new
plate. A game takes the whole window below the head rail.

## Content

The application lives in a single Next.js project on the App Router. Routes are rendered
from `app/`, shared UI lives in `components/`, and the backend will be built inside
`app/api/`, which Next.js serves as server-side endpoints.

Games:

- [x] **Sudoku** — a fresh puzzle every game, generated in the browser, at four difficulties
- [x] **Tic-Tac-Toe** — against the machine, against the next chair, or online by room code
- [ ] **Chess** — playable, but still on the pre-rebuild interface and with no endgame detection

## Routes

| Route            | What it is                                                        |
| ---------------- | ----------------------------------------------------------------- |
| `/`              | The board — today's challenge, the three games, your run, standings |
| `/play/chess`    | Chess, inside the play frame                                       |
| `/play/sudoku`   | Sudoku, inside the play frame                                      |
| `/play/tictactoe`| Tic-Tac-Toe, inside the play frame                                 |
| `/standings`     | The ladder and your card — recent games, wins, day run             |
| `/api/health`    | Health check                                                       |
| `/api/rooms`     | Opens an online room                                               |
| `/api/rooms/:code` | Join, move, rematch, leave                                       |
| `/api/rooms/:code/stream` | Server-sent events: the room pushes every change         |

## Sudoku

Puzzles are generated on the fly in `lib/sudoku.js` — a solved grid by randomised backtracking,
then clues dug out in symmetric pairs, each removal kept only while the grid still has exactly
one solution. Four difficulties: Easy (42 clues), Medium (~34), Hard (~29), Evil (~26).
Generation takes about a millisecond, so "new grid" really is a new grid.

Keyboard: arrows move, 1–9 place, 0 or backspace erases, `N` notes, `U` undo, `H` hint,
space pauses.

## Online tic-tac-toe

One player opens a room and gets a four-character code plus an invite link; the other joins
with either. Both boards stay in step over server-sent events — no polling.

Rooms live in the memory of the node process serving the site (`lib/rooms.js`), which is enough
for `npm run dev` and a self-hosted `npm start`. They expire two hours after the last move, hold
no identity beyond a name typed for the round, and are stored nowhere else. Deploying to a
serverless platform with more than one instance means replacing that one module with a shared
store; nothing above it changes.

## Where the data lives

There is no database and there are no accounts. Nothing is invented to cover for that: a number
the app cannot honestly produce shows an open hook instead. (The one server-side feature is the
online tic-tac-toe room above, and it stores nothing beyond the round in play.)

Everything a player accumulates is kept in one browser under one versioned localStorage key,
and every read and write in the app goes through a single module:

```
lib/store.js    localStorage read/write, versioned, SSR-safe
lib/board.js    the data layer every screen calls — already async, already the only
                place the shape of a session is known. Swap these bodies for fetches
                when the server arrives and nothing above them changes.
lib/daily.js    today's challenge, derived from the calendar date so no server is
                needed for everyone to agree on what it is
lib/games.js    the catalog
```

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
