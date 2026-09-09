# Rummy 45 (Romanian *Remi*) — Full Specification

**Status:** authoritative rule set for this repository.
**Visual reference:** the supplied mobile screenshot (4 seats, two-tier wooden racks, tile set in red / yellow / blue / black).
**Code reference:** [lib/remi.js](../lib/remi.js), [components/games/remi/](../components/games/remi/).

This document is written so that an agent can (1) look at a frame of the game, (2) reconstruct the state, (3) enumerate legal moves, (4) pick one, (5) execute it, and (6) update the state. It separates the **physical world** from the **digital model** and gives the mapping between them.

---

## 0. Rule provenance and open questions

Rummy 45 is not Gin Rummy, not Rummikub, and not Indian 13-card Rummy. Rules below are the Romanian *Remi* / *Remi 45* family, cross-checked against the screenshot and the shipped implementation. Where the reference material is silent or the screenshot admits two readings, the ambiguity is listed here rather than silently resolved.

| # | Ambiguity | Possible readings | Current assumption |
|---|---|---|---|
| A1 | **There is no trump card in Rummy 45.** The prompt asks for one. | (a) The prompt means the *joker indicator* — the face-up tile turned at deal time that designates which numbered tile acts as the second wild. (b) The prompt means the red `JOKER` control in the screenshot. (c) The prompt imported "trump" from a trick-taking game by mistake. | **(c) with (a) as the compatible object.** Part 5 documents the joker-indicator slot in the trump-shaped position and marks the whole concept `OPTIONAL_VARIANT`. The shipped code has no trump and no indicator: both jokers are fixed tiles 104 and 105. |
| A2 | `(45 p)` beside two names in the screenshot. Their melds total 51 and 48, not 45. | (a) A badge meaning "this seat has met the 45 opening" (a flag, not a sum). (b) The points *counted toward opening only*, capped/frozen at the opening lay. (c) Live meld total, and my tile reading is off. | **(a) — an opened flag rendered as `(45 p)`.** Seats without the badge have not opened. |
| A3 | The `2` on the face of the right-most stock back. | (a) Number of 7-stacks remaining. (b) Number of loose tiles beyond the last full 7-stack. (c) A face-up tile. | **(b) loose remainder**, matching `stacksOf()` which returns `{ full, loose }`. |
| A4 | Dealer's extra tile. | (a) Everyone gets 14. (b) Dealer gets 15 and throws first without drawing. | **(b) for the physical game** (it makes the stock exactly 7×7=49), **(a) in the shipped code** (`HAND = 14`, stock 50). See §4 note — this is a real divergence, not a documentation gap. |
| A5 | Taking from the discard line. | (a) Top tile only (classic). (b) Reach any index, paying with every tile thrown after it. | **(b)** — implemented in `takeFrom()` and shown by the "takes N tiles" hint in the UI. This is a house rule specific to this build. |
| A6 | Whether melds on the table may be broken and re-formed (Rummikub-style rearrangement). | (a) No — once down, a meld is frozen; you may only extend it. (b) Yes — the whole table may be re-solved. | **(a)** — `bestMelds()` carries a `ponytail:` note that a table-wide rearranger is the upgrade path, not present today. |
| A7 | Joker buy-back. | (a) Only the meld's owner may buy. (b) Any opened player may buy. (c) Not allowed at all. | **(b)** — `jokerSwap()` is not owner-scoped; the caller requires only that the buyer has opened. |

Everything below Part 0 assumes the rightmost column. Change a row and the affected parts are flagged with the row id.

---

## PART 1 — WHAT RUMMY 45 LOOKS LIKE

Camera directly above the table, looking straight down.

**The pieces.** 106 plastic or bakelite **tiles**, not cards. Each tile is a rounded rectangle, roughly 27 × 40 × 6 mm, white or cream on the face, with a small circular **peg** moulded at the foot of the face (visible in the screenshot as a pale circle under every number). The face carries a **number from 1 to 13** printed in one of four colours: **red, yellow, blue, black**. Every (number, colour) pair exists **twice** — two full 52-tile decks — plus **two jokers**, which carry a clown/face symbol instead of a number. 52 × 2 + 2 = 106.

**The table.** A rectangular table, felt or cloth, green in the screenshot. Its middle is the **shared field** where melds are laid face-up. The field is public; anything in it is committed and stays visible for the rest of the round.

**The racks.** Each player has a wooden **rack** (Romanian: *suport*) in front of them, angled towards them, with **two tiers** (two grooved shelves, one behind and above the other). The screenshot shows the local player's rack rendered as two orange wooden bars with metal end caps. A tier holds up to 13 tile positions. The rack face points at its owner; opponents see only the blank back edge of the rack, so **rack contents are private**.

**The stock.** The undealt tiles sit off to one side, **face-down**, gathered into **stacks of seven** with any remainder in a short loose stack. In the screenshot this is the fan of blank tile-backs at bottom-left with a `2` on the last one.

**The discard line.** Thrown tiles lie **face-up in a single row**, in throw order, left to right. It is not a pile — every tile ever thrown stays readable, and the row scrolls (the green ◀ ▶ arrows in the screenshot). This is what makes rule A5 possible.

**No trump card.** There is no trump in Rummy 45. See §0 A1 and Part 5.

**Score.** Kept on paper or in a header strip. In the screenshot, the four nameplates run across the top; `(45 p)` marks the seats that have opened. Running penalty totals live on the score sheet, not on the table.

**Ownership.**

| Object | Belongs to |
|---|---|
| Rack and the tiles on it | one player, private |
| Melds in the field | laid by one player, but visible to and extendable by all opened players |
| Stock | shared, hidden |
| Discard line | shared, fully public |
| Score sheet | shared, public |

---

## PART 2 — PLAYER POSITIONS

**Number of players: 2, 3, or 4.** Four is standard and is what the screenshot shows. The shipped rooms allow up to four seats.

```
                             PLAYER 2  (top / "across")
                    ┌────────────────────────────┐
                    │  RACK  tier A ▒▒▒▒▒▒▒▒▒▒   │
                    │        tier B ▒▒▒▒▒▒▒▒     │
                    └────────────────────────────┘

   PLAYER 3 (left)                                    PLAYER 1 (right)
  ┌──────────────┐          ┌──────────────┐         ┌──────────────┐
  │ R  tier A ▒▒ │          │              │         │ ▒▒ tier A  R │
  │ A          ▒▒│          │    SHARED    │         │▒▒          A │
  │ C  tier B ▒▒ │          │    FIELD     │         │ ▒▒ tier B  C │
  │ K            │          │              │         │            K │
  └──────────────┘          └──────────────┘         └──────────────┘

                    ┌────────────────────────────┐
                    │  RACK  tier A 6b 7b .. 13k │
                    │        tier B 12y 1y .. 2r │
                    └────────────────────────────┘
                          PLAYER 4  (bottom / YOU)
```

**Turn order and direction.** Play proceeds **counter-clockwise** in the Romanian game — from the dealer's right. In a screen rendering the seats are relabelled so that the local player is always the bottom seat, and the order runs bottom → right → top → left. The shipped code stores `players: [seat, ...]` and advances with `players[(at + 1) % players.length]`; the array order **is** the direction of play, so the renderer, not the engine, decides which physical chair each index is.

**First player.** The dealer is chosen by each player drawing one tile — highest number deals. The dealer deals and the player to the dealer's right plays first. Under §0 A4(b) the dealer holds 15 tiles and opens the round by discarding one without drawing. Under A4(a), as shipped, `players[0]` simply starts in the `draw` phase.

**How the AI identifies its own seat.** Not from the picture — from the session. `you` is a seat id supplied by the room. Visually it is corroborated by exactly one rack whose tile faces are legible; every other rack shows backs or nothing. If two racks are legible the frame is not a single-player view and the agent must report `UNCERTAIN` rather than guess.

**How the AI identifies opponents.** Every other nameplate in the header strip, in header order. Each opponent contributes: a name, an opened badge or its absence, a held-tile count if the UI shows one, and whatever melds sit in the field under their name.

---

## PART 3 — THE PLAYER RACK

**Count.** 14 tiles at the start of a round (15 for the dealer under A4(b)). During your own turn, between drawing and throwing, you hold 15 (or 16). You always end your turn back at your pre-draw count minus whatever you laid down.

**Geometry.** Two tiers, 13 slots each, 26 slots total (`TIERS = 2`, `SLOTS = 13`). Tiles sit in discrete slots left-to-right; they **do not overlap** — a real rack's groove is one tile deep. A slot may be **empty**, and an empty slot is meaningful: it is how you separate one group from the next.

**Arrangement is free and is itself information.** The player may move any tile to any free slot at any time during their turn, at no cost. The rack **reads itself**: `rackGroups(slots)` walks each tier, treats every unbroken run of occupied slots as a candidate meld, and brackets it with its point value if `readMeld()` accepts it. Nothing is "selected" and nothing is "declared" — you arrange, and the rack tells you what you have made. Tiles not part of any bracketed group render dimmed.

```
PLAYER RACK  (26 slots, two tiers; · = empty)

tier A  [ ·  ·  6b 7b ·  ·  ·  ·  11k 11r 13k ·  · ]
                 └──── 2 tiles, no bracket ────┘
tier B  [ ·  ·  12y ·  1y ·  ·  ·  ·  ·  ·  2r · ]

versus, once arranged:

tier A  [ 5r 6r 7r ·  11k 11r 11b ·  ·  ·  ·  ·  · ]
          └──18──┘     └────33────┘
tier B  [ ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  · ]
                     opening total = 51  ✓
```

**Visibility.** Faces towards the owner only. Opponents know **the count** of tiles on a rack (they can see how many are in the groove) and nothing else. That count is public and matters — it is the tell that someone is about to go out.

**Internal representation.**

```js
// The hand: an unordered multiset of tile ids. This is what the rules operate on.
hand: number[]                    // e.g. [5, 6, 7, 42, 55, 104, ...]

// The rack: the player's chosen arrangement. Purely presentational to the rules,
// but it is the input the human uses to declare melds.
slots: (number | null)[]          // length 26; index = tier * 13 + column
```

`seatTiles(slots, hand)` reconciles the two: it keeps every arrangement decision the player made, drops tiles that have left the hand, and finds a free slot for anything new. Never rebuild `slots` from `hand` by sorting — that destroys the player's work.

---

## PART 4 — THE STACKED DRAWING SYSTEM

**A stack is 7 tiles. Not 4.** The corrected diagram:

```
DRAWING AREA — the stock as it sits in the box, face-down

  stack 1   stack 2   stack 3   stack 4   stack 5   stack 6   stack 7   loose
  ┌─────┐   ┌─────┐   ┌─────┐   ┌─────┐   ┌─────┐   ┌─────┐   ┌─────┐   ┌───┐
  │▒▒▒▒▒│   │▒▒▒▒▒│   │▒▒▒▒▒│   │▒▒▒▒▒│   │▒▒▒▒▒│   │▒▒▒▒▒│   │▒▒▒▒▒│   │▒▒▒│
  │▒▒▒▒▒│   │▒▒▒▒▒│   │▒▒▒▒▒│   │▒▒▒▒▒│   │▒▒▒▒▒│   │▒▒▒▒▒│   │▒▒▒▒▒│   │ 2 │
  │▒▒▒▒▒│   │▒▒▒▒▒│   │▒▒▒▒▒│   │▒▒▒▒▒│   │▒▒▒▒▒│   │▒▒▒▒▒│   │▒▒▒▒▒│   └───┘
  │ 7   │   │ 7   │   │ 7   │   │ 7   │   │ 7   │   │ 7   │   │ 7   │   0..6
  └─────┘   └─────┘   └─────┘   └─────┘   └─────┘   └─────┘   └─────┘
   ↑ drawn from here, left to right, one tile at a time
```

They lie **side by side in a row**, not one on top of another. That matters for detection: the screenshot shows them as a horizontal fan at bottom-left, and the count text reads `N left / k of seven and r`.

**Why seven.** With four players and A4(b): 106 − (3 × 14 + 15) = 106 − 57 = **49 = 7 × 7**. Stacking the stock in sevens makes the remaining supply countable at a glance without touching it — seven visible stacks means 49 tiles, and each stack that disappears is exactly one seventh of the round gone. It is a counting affordance, not a rule.

> **Divergence, A4:** the shipped `deal()` gives every seat 14, so the stock is 106 − 56 = **50 = 7 stacks + 1 loose**. The physical 7×7 identity holds only if the dealer takes 15. Either give the dealer the extra tile or accept a permanent loose tile in the box.

**Face-down.** Every stock tile is face-down. Nobody, including the AI, may know any stock tile's identity. Inference over the *unseen set* is legitimate; asserting a specific stock tile is not.

**Drawing.** The active player takes **one tile from the top of the leftmost non-empty stack** and puts it on their rack. Physically any tile from any stack is equivalent since all are face-down; the leftmost-first convention exists so that the depletion is legible.

**After a draw.** The stack shrinks by one. When a stack reaches zero it is removed and the next stack becomes the active one. Nothing is ever returned to the stock.

**Recognising the active stack.** Leftmost stack with height ≥ 1. In the shipped renderer the stock is derived, not stateful: `stacksOf(count)` recomputes `{ full, loose }` from a single integer, and the loose stack renders last, on the right. So visually the *partial* stack is at the right end; a detector should read the total from the count label if one is present and only fall back to counting stacks.

**Counting remaining pieces.**

```
pieces_remaining = full_stacks * 7 + loose_count
```

**Layer exhausted:** cosmetic only. No event fires, no rule triggers.

**Entire stock exhausted:** the round ends immediately with **no winner**. Every player counts the tiles left on their rack as penalty points; nobody gets the going-out bonus. In code: `if (!next.stock.length) return score(next, null)`.

**Vocabulary the AI must keep distinct.**

| Term | Means |
|---|---|
| tile | one physical piece, one id 0–105 |
| stack (of seven) | a physical bundle of ≤7 face-down tiles in the box |
| stock / draw supply | all face-down undealt tiles; the sum of all stacks |
| discard line | the face-up row of thrown tiles — **not** part of the stock |
| meld | 3+ tiles in the field forming a valid group or run |
| field / table | all melds from all players |
| rack | one player's private two-tier holder |
| hand | the multiset of tiles on a rack |

---

## PART 5 — THE "TRUMP CARD" (there isn't one) `OPTIONAL_VARIANT`

**Rummy 45 has no trump.** No suit outranks another, no tile beats another, nothing is bid, no tricks are taken. Any specification that gives Rummy 45 a trump has imported it from a different game. See §0 A1.

The only object that occupies the "one shared face-up tile that changes how other tiles behave" role, and only in **some regional variants**, is the **joker indicator**:

```
              JOKER INDICATOR   (variant only — not in this build)
             ┌───────────┐
             │    7 r    │   turned face-up beside the stock at deal
             │     ○     │   → every 7 in every colour is also wild
             └───────────┘
```

| Question | Variant answer | This build |
|---|---|---|
| What is it? | One tile turned face-up at deal; every tile of that number and colour (or of that number in all colours, depending on region) becomes an extra wild. | Absent. |
| Where? | Beside the stock, in the field, face-up. | The dark empty panel at the bottom-centre of the screenshot occupies this position but is a **staging tray**, not an indicator. |
| Selected when / how? | Once, at the deal, by turning the top stock tile. Random. | n/a |
| Does it change other tiles? | Yes — that is its whole function. | n/a |
| Can it be drawn? | No. It stays face-up all round. | n/a |
| Can it join a meld? | No. It is a marker. | n/a |
| Visible all round? | Yes. | n/a |
| When does it change? | Never within a round; re-turned each new round. | n/a |
| End of round? | Returned to the bag with everything else. | n/a |

**In this build the wilds are fixed:** `JOKERS = [104, 105]`, `isJoker(t) => t >= 104`. Exactly two, always the same two, no indicator.

**Detection.** An agent analysing a frame of *this* game must emit `"trump_card": null` and must **not** map the red `JOKER` button to it. The `JOKER` control at x≈0.85 is a UI affordance (a joker-buy or joker-info action), not a game object with state. If a future variant adds an indicator, detect it as: a single face-up tile, isolated, adjacent to the stock, never adjacent to a meld, unchanged across every frame of a round.

---

## PART 6 — COMPLETE TABLE LAYOUT

Derived from the reference screenshot. Left/right/top thirds of the felt are drawn as they appear on screen; a physical table puts one rack on each edge.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ◀   SweetGirl44 (45 p)   alina17 (45 p)   Madalina8731   [CalinTomi ▓▓▓▓]  🔊│  header: names,
│                                                          ↑ live seat + timer  │  opened badges
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌11b 12b 13b┐    ┌10r 10b 10k┐                                              │
│  ├ 5k  5y  5r┤    ├ 5r  6r  7r┤          S H A R E D   F I E L D             │  melds, face-up,
│  └───────────┘    └───────────┘          (room for more melds)               │  clustered by
│   SweetGirl44's     alina17's                                                │  who laid them
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│ ◀ │ 1r  4b  9b  3y  9y  8k  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  · │ ▶ │  THE THROWS
│   └──────────────── oldest ──────────────────────────────► newest ────────┘   │  scrollable line
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌▒▒▒▒ 2┐   ┌────────────────────────────────────────┐   ┌──────────────┐     │
│ │ STOCK │   │        staging tray (empty)           │   │    JOKER     │     │
│ │ 7-stx │   └────────────────────────────────────────┘   └──────────────┘     │
│ └───────┘                                                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│╞═╡ ·  ·  6b 7b ·  ·  ·  ·  11k 11r 13k ·  ·                        [ ] ╞═╡   │  YOUR RACK
│╞═╡ ·  ·  12y ·  1y ·  ·  ·  ·  ·  ·  2r ·                          [ ] ╞═╡   │  tier A / tier B
└──────────────────────────────────────────────────────────────────────────────┘
   ▒ = face-down     [ ] = free landing slot     ╞═╡ = rack end cap
```

Opponent racks are off-screen in this rendering; on a physical table they sit at the left, top and right edges, backs towards the camera.

---

## PART 7 — VISUAL OBJECT IDENTIFICATION

**Player.** A player is not directly detectable in the digital view. Detect the **nameplate**: a text label in the top header strip. Attributes: name string; an `(N p)` suffix ⇒ opened; a coloured/filled background or progress bar ⇒ this seat is to move (`CalinTomi` in the reference). On a physical table, detect a rack edge plus a pair of hands.

**Rack.** A long horizontal wooden-textured bar with metal end caps, containing a single row of evenly spaced tile-sized cells, some empty. Two such bars stacked vertically with identical width and cell pitch = one rack, tier A above tier B. Distinguish from a meld: rack cells are **uniformly spaced with gaps**; meld tiles are **flush**.

**Tile.** A white rounded rectangle, aspect ratio ≈ 0.68 (w/h), bearing (a) a large numeral in red / yellow / blue / black, and (b) a small pale circle — the peg — near the bottom edge. The peg is the most reliable tile signature: it appears on every face and nothing else in the scene has it. A **joker** shows a face/clown glyph instead of a numeral. A **back** is a blank tile-shaped rectangle with no numeral and no peg.

**Stock.** A cluster of ≥2 blank tile-backs, overlapping/fanned, positioned outside both the field and any rack, usually with a numeric count label. Distinguish from the discard line: stock tiles are **face-down and overlapping**; discard tiles are **face-up and separated**.

**Stack of seven.** One visually cohesive bundle within the stock, ≤7 backs, separated from its neighbours by a gap larger than the within-bundle overlap. Count bundles left to right; the last bundle may be short (the loose remainder).

**Trump card.** None. Emit `null`. (Part 5.)

**Discard line.** A single-row, left-to-right sequence of **face-up, non-overlapping** tiles occupying a full-width lane between the field and the stock, with scroll arrows at both ends and often a label ("Thrown"). Order is throw order; index 0 is leftmost/oldest.

**Played meld.** A run of 3–4 **face-up, flush-abutting** tiles inside the field, isolated from other melds by whitespace. Melds cluster spatially by owner. A meld may carry a small value badge.

**Set (group).** All numerals **identical**, colours **all different**, length 3 or 4. Visually: `10 10 10` in red / blue / black.

**Sequence (run).** Numerals **consecutive and ascending left to right**, all one colour, length ≥ 3. Visually: `5 6 7` all red, or `11 12 13` all blue.

**Joker inside a meld.** A face glyph flush between numerals. Its implied value is read from the neighbours, never from the tile.

**Hidden / private tiles.** Anything the agent cannot see is represented as a **count plus a constraint set**, never as tile ids:

```json
{ "owner": "player_2", "known": [], "count": 11, "cannot_contain": [/* every tile seen elsewhere */] }
```

---

## PART 8 — COORDINATE SYSTEM

```
 0,0 ─────────────────────────────► X = 1.0
  │
  │            TOP OF TABLE
  │
  ▼
 Y = 1.0        BOTTOM (local player)
```

Normalised to the frame: `x = 0.0` far left, `x = 1.0` far right, `y = 0.0` top, `y = 1.0` bottom. `x`/`y` denote the **centre** of the object; `width`/`height` are its normalised extent.

Every detected object carries:

| Field | Values |
|---|---|
| `object_type` | `nameplate` \| `rack` \| `rack_tier` \| `tile` \| `tile_back` \| `stock` \| `stock_stack` \| `discard_line` \| `discard_tile` \| `meld` \| `staging_tray` \| `joker_control` \| `score_badge` |
| `owner` | seat id, or `"shared"` |
| `x`, `y`, `width`, `height` | normalised floats |
| `orientation` | `upright` \| `rotated_90` \| `rotated_180` \| `rotated_270` — how the face is turned relative to the camera |
| `visibility` | `face_up` \| `face_down` \| `occluded` \| `off_frame` |
| `state` | type-specific: `active`, `spent`, `selected`, `dimmed`, `live_turn`, `opened` |
| `confidence` | 0.0–1.0; below 0.75 the value must be reported as `UNCERTAIN` |

Measured from the reference frame:

```json
[
  { "object_type": "nameplate",     "owner": "player_4", "x": 0.80, "y": 0.036, "width": 0.16, "height": 0.04,
    "orientation": "upright", "visibility": "face_up", "state": "live_turn" },

  { "object_type": "meld",          "owner": "player_1", "x": 0.150, "y": 0.093, "width": 0.075, "height": 0.055,
    "orientation": "upright", "visibility": "face_up", "state": "active" },

  { "object_type": "discard_line",  "owner": "shared",   "x": 0.505, "y": 0.478, "width": 0.780, "height": 0.085,
    "orientation": "upright", "visibility": "face_up", "state": "active" },

  { "object_type": "stock",         "owner": "shared",   "x": 0.147, "y": 0.585, "width": 0.115, "height": 0.070,
    "orientation": "upright", "visibility": "face_down", "state": "active" },

  { "object_type": "joker_control", "owner": "shared",   "x": 0.852, "y": 0.587, "width": 0.125, "height": 0.065,
    "orientation": "upright", "visibility": "face_up", "state": "active" },

  { "object_type": "rack_tier",     "owner": "player_4", "x": 0.497, "y": 0.716, "width": 0.905, "height": 0.157,
    "orientation": "upright", "visibility": "face_up", "state": "active" },

  { "object_type": "rack_tier",     "owner": "player_4", "x": 0.497, "y": 0.882, "width": 0.905, "height": 0.157,
    "orientation": "upright", "visibility": "face_up", "state": "active" },

  { "object_type": "trump_card",    "owner": "shared",   "x": null, "y": null,
    "visibility": "absent", "state": "not_in_ruleset" }
]
```

---

## PART 9 — GAME STATE

```
GameState
├── players[]                seat ids, in turn order; index = direction of play
│   ├── player_id            string, stable for the game
│   ├── position             "bottom" | "right" | "top" | "left"  (render only)
│   ├── hand                 number[]   — tile ids; PRIVATE, present only for `you`
│   ├── hand_count           int        — PUBLIC for every seat
│   ├── slots                (number|null)[26] — rack arrangement; own seat only
│   ├── score                int        — cumulative PENALTY points; low is good
│   └── has_opened           bool       — has this seat laid ≥45 this round
├── stock                    number[]   — face-down; only `.length` is public
│   ├── pieces_remaining     = stock.length
│   ├── full_stacks          = floor(len / 7)
│   └── loose                = len % 7
├── discard                  number[]   — face-up, index 0 = oldest
├── trump_card               null       — not in this rule set (§0 A1)
├── table                    Meld[]     — { seat, tiles: number[] }
├── turn                     seat id of the player to move
├── phase                    "draw" | "play"
├── turn_number              int, increments on every phase→draw transition
├── round_number             int
├── status                   "waiting" | "playing" | "round_over" | "game_over"
├── result                   { winner: seat|null, scores: {seat:int} } | null
└── winner                   seat id with the lowest score once someone passes 100
```

**Field definitions.**

- `hand` — the authoritative multiset. The rules never read `slots`.
- `slots` — presentation and declaration. Length 26. `slots[i]` is a tile id or `null`. Index → `tier = floor(i/13)`, `column = i % 13`.
- `has_opened` — latches true on the first successful `meld` action worth ≥ 45 and never resets within a round. Resets to false at the start of each round.
- `score` — **penalty**. Starts at 0, only ever rises. `LIMIT = 100`: when any seat reaches 100 the game ends and the **lowest** score wins.
- `phase` — `draw` means the player must take exactly one tile before doing anything else. `play` means they have drawn and must eventually discard.
- `turn_number` — total turns played this round, useful for logging and for detecting stalls.

**Derived, never stored:** stack counts, meld values, rack brackets, legal-move lists. Recompute them; they cannot go stale.

---

## PART 10 — PUBLIC vs PRIVATE vs UNKNOWN

**Public — every player and every agent may use these.**
- Every tile in the field, and which seat laid each meld.
- Every tile in the discard line, and its index/order.
- `pieces_remaining`, and therefore stacks and loose count.
- Whose turn it is, and the phase.
- Each seat's `hand_count`.
- Each seat's `has_opened`.
- All scores.

**Private — one seat only.**
- That seat's `hand` and `slots`.
- Its own intentions, evaluations, planned melds.

**Unknown — nobody knows, and the agent must model it as a distribution.**
- The identity and order of every face-down stock tile.
- The identity of every tile on an opponent's rack.

The correct model of unknowns is the **unseen set**:

```
unseen = full_bag(106) − my_hand − field_tiles − discard_tiles
```

Every unseen tile is either in the stock or on some opponent's rack. `|unseen| = pieces_remaining + Σ(opponent hand_counts)`. The probability that a specific needed tile is the next draw is `copies_unseen / |unseen| × (pieces_remaining / |unseen|)` under a uniform prior — refine it with the discard history, never replace it with certainty.

**Hard rule:** the agent must never write a concrete tile id into an opponent's hand or into the stock. Doing so is a correctness bug, not a heuristic. Any inference must be expressed as a probability or a constraint (`player_2 does not hold 5r — both copies are on the table`).

---

## PART 11 — LEGAL ACTIONS

Actions available to the seat whose turn it is. Every action is rejected if `turn !== actor` or `result !== null`.

### `DRAW_STOCK`
```
PRECONDITIONS  phase === "draw";  stock.length > 0
INPUT          none
EFFECT         tile = stock.pop();  hand.push(tile);  phase = "play"
ILLEGAL IF     already drawn this turn; stock empty (round ends instead)
REVEALS        pieces_remaining decreases by 1. The tile's identity is revealed
               to the drawer only.
```

### `DRAW_DISCARD(at)`
```
PRECONDITIONS  phase === "draw";  0 <= at < discard.length
INPUT          at — index into the discard line
EFFECT         { taken, left } = takeFrom(discard, at)
               hand.push(...taken);  discard = left;  phase = "play"
ILLEGAL IF     at out of range; not integer; already drawn
REVEALS        Everything. Every seat sees exactly which tiles you took and how
               many you paid for. Reaching to index `at` costs `discard.length - at`
               tiles, all of which count against you if you do not lay them.
NOTE           House rule A5. `at = discard.length - 1` is the classic top-tile draw.
```

### `MELD(melds[])`
```
PRECONDITIONS  phase === "play"
               every tile in every meld is in hand, used at most once
               every meld satisfies readMeld() !== null
               IF NOT has_opened:  Σ meldValue(meld) >= 45   ← the 45 rule
               IF has_opened:      no minimum
INPUT          melds: number[][]  — one or more disjoint groups/runs
EFFECT         remove all listed tiles from hand
               append { seat, tiles } to table for each meld
               has_opened = true
ILLEGAL IF     any meld invalid; any tile not held; a tile listed twice;
               opening lay totals < 45; the seat has already opened and is
               re-submitting an opening
REVEALS        The tiles laid, permanently and publicly.
```

### `ADD_TO_MELD(meld_index, tile)`
```
PRECONDITIONS  phase === "play";  has_opened === true
               tile is in hand
               extendedWith(table[meld_index].tiles, tile) !== null
INPUT          meld_index, tile
EFFECT         table[meld_index].tiles = extendedWith(...)
               hand.remove(tile)
ILLEGAL IF     not opened; tile does not fit at any position; meld_index invalid
REVEALS        one tile
NOTE           Works on ANY seat's meld, not only your own. This is how you shed
               tiles cheaply late in a round.
```

### `REPLACE_JOKER(meld_index, tile)`
```
PRECONDITIONS  phase === "play";  has_opened === true
               the meld contains a joker
               jokerSwap(meld.tiles, tile) !== null  — i.e. `tile` is exactly the
               tile the joker was standing in for
INPUT          meld_index, tile
EFFECT         meld.tiles[joker_position] = tile
               hand.remove(tile);  hand.push(the freed joker)
ILLEGAL IF     no joker in that meld; the offered tile does not restore validity;
               the seat has not opened
REVEALS        the swapped tile; the joker returns to a private hand
NOTE           Owner-agnostic (§0 A7). The freed joker may be used the same turn.
```

### `DISCARD(tile)`
```
PRECONDITIONS  phase === "play";  tile is in hand
INPUT          tile
EFFECT         hand.remove(tile);  discard.push(tile)
               IF hand is now empty      → the actor goes out; score the round
               ELSE IF stock is empty    → the round ends with no winner; score it
               ELSE turn = next seat;  phase = "draw";  turn_number += 1
ILLEGAL IF     not yet drawn (phase === "draw"); tile not held
REVEALS        one tile, permanently and publicly
NOTE           Discarding is MANDATORY and is the only way to end a turn.
```

### `REARRANGE(slots)`
```
PRECONDITIONS  it is your turn (any phase) — purely local
INPUT          slots: (number|null)[26]
EFFECT         slots = input; hand unchanged
ILLEGAL IF     the multiset of non-null entries !== hand
REVEALS        nothing
```

### `REARRANGE_MELDS` — **not available** (§0 A6). Melds on the table are frozen; you may extend them, never break them.

### `END_TURN` — **not a separate action.** `DISCARD` ends the turn. There is no pass.

---

## PART 12 — LEGAL MOVE VALIDATION

```js
function validate(move, state, actor) {
  // 1. turn
  if (state.result) return no("The round is over.");
  if (state.turn !== actor) return no(`It is ${state.turn}'s turn, not ${actor}'s.`);

  // 2. phase
  const drawing = move.type === "draw";
  if (drawing && state.phase !== "draw") return no("You have already drawn this turn.");
  if (!drawing && state.phase !== "play") return no("You must draw before you do anything else.");

  const hand = state.hands[actor];

  // 3. possession
  const used = tilesTouchedBy(move);
  for (const t of used) if (!hand.includes(t)) return no(`You do not hold ${tileName(t)}.`);
  if (new Set(used).size !== used.length) return no("The same tile is used twice.");

  // 4. combination validity
  if (move.type === "meld")
    for (const m of move.melds)
      if (!readMeld(m)) return no(`${m.map(tileName).join(" ")} is not a group or a run.`);

  // 5. the opening requirement
  if (move.type === "meld" && !state.opened[actor]) {
    const worth = move.melds.reduce((s, m) => s + meldValue(m), 0);
    if (worth < OPENING) return no(`An opening lay must be worth ${OPENING}; this is worth ${worth}.`);
  }
  if ((move.type === "add" || move.type === "swap") && !state.opened[actor])
    return no("You must open with 45 of your own before you touch the table.");

  // 6. joker legality
  if (move.type === "meld")
    for (const m of move.melds)
      if (m.filter(isJoker).length > 1) return no("A meld takes at most one joker.");
  if (move.type === "swap" && !jokerSwap(state.table[move.index].tiles, move.tile))
    return no("That tile is not what the joker is standing in for.");

  // 7. trump — no such rule in Rummy 45; nothing to check.

  // 8. resulting table still valid
  if (move.type === "add" && !extendedWith(state.table[move.index].tiles, move.tile))
    return no("That tile does not fit that meld at any position.");

  // 9. discard obligation
  if (move.type === "discard" && !hand.includes(move.tile))
    return no("You cannot throw a tile you are not holding.");

  // 10. round end is a consequence, never a request — there is no "go out" action.
  return { legal: true };
}
```

Return shape:

```json
{ "legal": false,
  "reason": "An opening lay must be worth 45; this is worth 33.",
  "rule": "OPENING_45",
  "offending": [26, 27, 28] }
```

---

## PART 13 — COMBINATION VALIDATION

```js
validate_combination(tiles, combination_type /* "auto"|"group"|"run" */,
                     player_state, game_state)
```

### Group (set)
- Length **3 or 4**.
- All real tiles share **one number**.
- All real tiles have **distinct colours** — four colours exist, so `11r 11r 11b` is invalid (duplicate colour) even though the two `11r` are different physical tiles.
- **At most one joker.**
- Value = `number × length`. A four-tile group of 10s is worth 40, not 30.

### Run (sequence)
- Length **≥ 3**, no upper bound short of 14.
- All real tiles share **one colour**.
- Numbers **consecutive**.
- The **1 is bivalent**: it may sit *below the 2* (worth 1) or *above the 13* (worth 14). `13 1` therefore means `13 14`. `13 1 2` is **not** a run — the sequence does not wrap.
- **At most one joker**, filling exactly one gap.
- Value = the sum of the positions occupied, including the joker's position and including a high ace as 14. `11 12 13 1(=14)` = 50.

### Jokers
- Exactly two exist (`104`, `105`).
- One per meld, maximum.
- A joker's **value is positional**: the value of the slot it fills, not a fixed number.
- Held at scoring time, a joker costs **25 penalty points** (`JOKER_PENALTY`).
- On the table, a joker can be bought back by the tile it represents (`REPLACE_JOKER`).

### Trump combinations
None. No combination in Rummy 45 depends on a trump. (§0 A1.)

### Opening
Not a combination type — a **constraint over a set of combinations**. See Part 14.

### Extensions
`extendedWith(meld, tile)` tries the tile at every insertion point and accepts the first arrangement `readMeld()` validates. Consequences worth knowing: a 3-group becomes a 4-group only with the missing colour; a run extends at either end; a run extended past 13 accepts a 1 as the 14.

### Rearrangements
Rack-side only. `rackGroups(slots)` re-reads the arrangement on every change. Table-side rearrangement is out of scope (§0 A6).

### Return shape

```json
{ "valid": true, "kind": "run", "start": 5, "colour": "r", "points": 18,
  "tiles": ["5r", "6r", "7r"] }
```

```json
{ "valid": false,
  "reason": "A run must be one colour; this mixes red and blue.",
  "rule": "RUN_SINGLE_COLOUR" }
```

```json
{ "valid": false,
  "reason": "A group takes one tile of each colour; this has two reds.",
  "rule": "GROUP_DISTINCT_COLOURS" }
```

---

## PART 14 — OPENING WITH 45

**The rule the game is named for.** Until you have laid melds worth **45 or more in a single turn**, you may not put anything on the table, may not extend anyone's meld, and may not buy a joker. `OPENING = 45`.

```js
function openingValue(melds) {
  // every meld must stand on its own; the 45 is their sum
  if (melds.some((m) => !readMeld(m))) return { ok: false, reason: "not all melds are valid" };
  const value = melds.reduce((s, m) => s + meldValue(m), 0);
  return { ok: value >= OPENING, value, needed: Math.max(0, OPENING - value) };
}
```

| Question | Answer |
|---|---|
| Which tiles count? | Only tiles **from your own rack**, laid this turn. |
| Which combinations count? | Any valid group or run. No restriction on kind. |
| Can several combinations be summed? | **Yes.** The 45 is the total across all melds laid in that one turn. This is the usual way to open — a single meld rarely reaches 45 (the maximum group is 13×4 = 52; the maximum 3-run is 12+13+14 = 39). |
| Must it be one turn? | **Yes.** Value does not accumulate across turns. 33 this turn and 20 next turn is not an opening. |
| Does trump affect it? | No trump exists. |
| Do jokers count? | **Yes**, at the positional value of the slot they fill. A joker standing in for the 13 in `11 12 J` contributes 13. Opening on a joker is legal but expensive — it is worth 25 against you if the round dies. |
| Do tiles already on the table count? | **No.** Extending an existing meld is forbidden before you open, so it cannot contribute to opening. |
| May the player rearrange while opening? | On the **rack**, freely and at no cost, before committing. Once `MELD` is submitted it is irreversible. |

**Examples.**

```
✓ 11b 12b 13b (36)  +  5k 5y 5r (15)                        = 51  ≥ 45   OPENS
✓ 10r 10b 10k (30)  +  5r 6r 7r (18)                        = 48  ≥ 45   OPENS
✓ 11k 12k 13k 1k(=14) (50)                                  = 50  ≥ 45   OPENS  (single meld)
✓ 13r 13y 13b 13k (52)                                      = 52  ≥ 45   OPENS  (single meld)
✓ 11y 12y J(=13y) (36) + 4r 4y 4b (12)                      = 48  ≥ 45   OPENS  (joker counts 13)
✗ 5r 6r 7r (18) + 4k 4y 4b (12)                             = 30  < 45   refused
✗ 11b 12b 13b (36), then 4r 4b 4k (12) next turn            = never; 45 must be one turn
✗ 1r 2r 3r (6) + 1y 1b 1k (3)                               = 9   < 45   refused
✗ extend alina17's 10r 10b 10k with your 10y                = illegal before opening
```

---

## PART 15 — AI OBSERVATION PIPELINE

```
FRAME
  ↓  1. FRAME VALIDATION      is this the game screen? is it mid-animation? is it modal-blocked?
  ↓  2. REGION SEGMENTATION   header strip | field | discard lane | box row | rack
  ↓  3. OBJECT DETECTION      tiles, backs, plates, bundles, controls
  ↓  4. TILE CLASSIFICATION   numeral OCR + colour classification + joker glyph
  ↓  5. SEAT BINDING          plates → seats; the legible rack → `you`
  ↓  6. GROUPING              flush tiles → melds; spaced tiles → rack slots; row → discard
  ↓  7. COUNTING              stock bundles → pieces_remaining; rack cells → hand_count
  ↓  8. STATE ASSEMBLY        emit GameState with per-field confidence
  ↓  9. CONSISTENCY CHECK     see below
  ↓ 10. REASONING             only now: legal moves, evaluation, choice
```

**Order matters.** Do not attempt step 10 before step 9 passes. A hallucinated tile in the field changes what is legal.

**Step 9 — the consistency check.** These are cheap and catch most misreads:

1. Every tile id appears **at most twice** across field + discard + own rack. A third copy of any (number, colour) is proof of a misread.
2. `field + discard + own_hand + stock_count + Σ opponent_counts === 106`.
3. Every meld in the field must satisfy `readMeld()`. A meld that does not validate is a misread, not an illegal game.
4. Every seat with an opened badge must have ≥ 45 in melds attributed to it. (Under §0 A2(a) this is a soft check — the badge is a flag.)
5. `own_hand_count` is 14, or 15 while `phase === "play"`.

Any failure ⇒ mark the affected fields `UNCERTAIN` and either re-observe or restrict reasoning to the fields that passed.

---

## PART 16 — VISUAL GAME-STATE JSON

Output for the reference screenshot. Seats numbered in header order; the local player is the bottom rack, bound to `player_4` (`CalinTomi`, the live seat).

```json
{
  "schema": "rummy45.observation.v1",
  "frame_ok": true,
  "current_player": "player_4",
  "phase": "draw",
  "round_number": 1,
  "turn_number": 12,

  "you": "player_4",

  "players": {
    "player_1": { "name": "SweetGirl44",  "position": "left",   "has_opened": true,
                  "hand_count": null, "hand": null, "private": true, "score": null },
    "player_2": { "name": "alina17",      "position": "top",    "has_opened": true,
                  "hand_count": null, "hand": null, "private": true, "score": null },
    "player_3": { "name": "Madalina8731", "position": "right",  "has_opened": false,
                  "hand_count": null, "hand": null, "private": true, "score": null },
    "player_4": { "name": "CalinTomi",    "position": "bottom", "has_opened": false,
                  "hand_count": 8, "private": false, "score": null,
                  "hand": ["6b","7b","11k","11r","13k","12y","1y","2r"],
                  "slots": [null,null,"6b","7b",null,null,null,null,"11k","11r","13k",null,null,
                            null,null,"12y",null,"1y",null,null,null,null,null,"2r",null,null] }
  },

  "trump_card": null,
  "trump_note": "Rummy 45 has no trump card. The red JOKER control is a UI action, not a game object.",

  "stock": {
    "pieces_remaining": "UNCERTAIN",
    "full_stacks": 4,
    "loose": 2,
    "note": "4 bundles of backs plus a badge reading 2; no numeric total shown in this frame"
  },

  "discard": {
    "tiles": ["1r","4b","9b","3y","9y","8k"],
    "count": 6,
    "top_piece": "8k",
    "reachable": true,
    "cost_to_reach": { "5": 1, "4": 2, "3": 3, "2": 4, "1": 5, "0": 6 }
  },

  "table": {
    "melds": [
      { "seat": "player_1", "kind": "run",   "tiles": ["11b","12b","13b"], "points": 36 },
      { "seat": "player_1", "kind": "group", "tiles": ["5k","5y","5r"],    "points": 15 },
      { "seat": "player_2", "kind": "group", "tiles": ["10r","10b","10k"], "points": 30 },
      { "seat": "player_2", "kind": "run",   "tiles": ["5r","6r","7r"],    "points": 18 }
    ],
    "totals": { "player_1": 51, "player_2": 48 }
  },

  "status": "playing",
  "result": null,

  "confidence": {
    "tiles": 0.93,
    "seat_binding": 0.71,
    "stock_count": 0.40,
    "scores": 0.0
  },
  "uncertain": [
    "seat_binding: the header order is left-to-right; mapping it to table edges is a convention, not an observation",
    "stock_count: no total label visible in this frame",
    "scores: running penalty totals are not rendered on this screen"
  ]
}
```

Note what is **not** in this output: no opponent hands, no stock contents, no invented scores. Unknown is reported as `null` or `UNCERTAIN`.

---

## PART 17 — AI DECISION MAKING

Inputs: legal moves, own hand, `bestMelds()` over the hand, the opening flag, the discard history, the unseen set, opponent hand counts, `pieces_remaining`, and the score sheet.

### Draw decision (phase `draw`)

```
1. Would any discard-line tile complete a meld I can lay THIS turn?
     → compute for each index `at`: value gained vs. `discard.length - at` tiles taken on.
     → take the shallowest index that pays for itself. Deep reaches are almost always
       a trap: 6 tiles for one useful tile is +5 dead tiles and, if the round dies,
       +30ish penalty.
2. Am I unopened and does some `at` push me from <45 to ≥45?
     → take it, nearly regardless of cost. Opening is worth more than tidiness.
3. Otherwise draw from the stock.
```

`wantsDiscard()` implements a simplified version of this: it takes the top tile if it grows the best-meld tile-count, or if it unlocks opening.

### Play decision (phase `play`) — hierarchy, in order

```
1. Can I go out this turn?
     lay everything + one thrown tile empties the rack → do it. Nothing else scores.
2. Am I unopened and can I reach 45?
     → open. Every turn spent unopened is a turn where the whole table is closed to you
       and every tile you hold is live penalty. Open even at a slightly suboptimal shape.
3. Am I opened and holding a joker I can place safely?
     → a joker in hand costs 25. A joker on the table costs 0 and can be bought back.
       Place it once the round shows signs of ending (stock < ~10, or a rival's hand_count ≤ 4).
4. Can I shed high tiles onto existing melds (ADD_TO_MELD, any seat's)?
     → cheapest possible risk reduction. Do it greedily once opened, subject to rule 5.
5. Should I hold melds back?
     If I am opened, the round is young, and my hand is flexible, holding a run lets it
     grow. If any rival's hand_count ≤ 3, stop holding — dump everything you legally can.
6. Which discard?
     a. never a joker;
     b. prefer a tile with two copies already visible (dead — nobody wants it);
     c. prefer a tile adjacent to nothing in my hand (`helpfulness()` = 0);
     d. among equals, throw the HIGHEST number — penalty is face value;
     e. penalise any tile that visibly extends a meld on the table or matches the
        colour/number neighbourhood of a rival's recent takes.
```

`pickDiscard()` implements 6a–6d: it keeps everything `bestMelds(hand,"tiles")` wants, and from the rest throws the tile whose removal costs the fewest melded tiles, breaking ties by highest number.

### Endgame

When `pieces_remaining < 7` (one stack left), the round is likely to die without a winner. Switch the objective from *win* to *minimise the tiles left on the rack*: lay everything legal, extend everything extendable, throw high.

**Never** take the first legal move. Enumerate, score, then commit.

---

## PART 18 — AI TURN LOOP

```
OBSERVE ─────────────► capture a frame; run Part 15 to step 9
   ↓
UPDATE GAME STATE ───► merge the observation into the tracked state; carry forward
   ↓                   anything the frame could not see; refresh the unseen set
VERIFY CURRENT PLAYER► if turn !== me: idle, re-observe, do nothing. Acting out of
   ↓                   turn is the single worst failure mode.
DRAW ────────────────► §17 draw decision → DRAW_STOCK or DRAW_DISCARD(at)
   ↓
UPDATE HAND ─────────► append drawn tile(s); seatTiles() to preserve the arrangement;
   ↓                   re-run bestMelds()
GENERATE LEGAL MOVES─► all MELD subsets, all ADD_TO_MELD, all REPLACE_JOKER,
   ↓                   all DISCARD. Prune: only maximal meld sets are worth scoring.
EVALUATE ────────────► score each by the §17 hierarchy: going out ≫ opening ≫
   ↓                   joker safety ≫ shed value ≫ hand flexibility ≫ risk
SELECT ──────────────► argmax; ties broken towards the lower-variance move
   ↓
PLAY COMBINATIONS ───► submit MELD, then ADD_TO_MELD / REPLACE_JOKER, in that order —
   ↓                   opening must land before anything else is legal
REARRANGE ───────────► rack only; tidy so the next turn reads cleanly
   ↓
DISCARD ─────────────► mandatory; §17 rule 6
   ↓
UPDATE STATE ────────► my hand, discard, my melds. Do NOT guess what opponents drew.
   ↓
CHECK ROUND END ─────► hand empty → I went out. stock empty → dead round.
   ↓                   Either way: score, then round_number += 1
PASS TURN ───────────► turn = next seat; phase = "draw"; go back to OBSERVE
```

**Every stage re-validates.** The observation may have been wrong; the server may reject a move. A rejected action means the model is stale — re-observe from scratch rather than retrying.

---

## PART 19 — EDGE CASES

| Situation | Correct behaviour |
|---|---|
| **Stock empty at draw time** | The round ends immediately, no winner. Everyone counts their rack as penalty. `score(next, null)`. |
| **Stock empties mid-turn** (after a discard) | Same: the round ends before the next player can draw. |
| **Discard line empty** | `DRAW_DISCARD` has no legal index. Only `DRAW_STOCK` is available. |
| **Opening lay < 45** | Reject the whole submission atomically. Nothing goes down, no tile leaves the hand, `has_opened` stays false. |
| **Invalid run** (mixed colours, gap, wrap-around `13 1 2`) | `readMeld` returns null. Reject with `RUN_*` reason. |
| **Invalid group** (duplicate colour, length 2 or 5) | `readMeld` returns null. Reject with `GROUP_*` reason. |
| **Two jokers in one meld** | Illegal. `jokers > 1 → null`. |
| **Joker placed where no single tile fits** | Illegal — the joker must stand for exactly one identifiable tile, or the run/group would be ambiguous. |
| **Trump interaction** | No trump exists. Any request referencing trump is `ILLEGAL: NO_SUCH_RULE`. |
| **Draw twice** | Second draw rejected: `phase !== "draw"`. |
| **Discard without drawing** | Rejected: `phase !== "play"`. |
| **Using a tile the player does not hold** | Rejected before any state change. Also the signature of a desynced client — re-observe. |
| **Rearranging the table into an invalid state** | Cannot happen: table rearrangement is not an action (§0 A6). `ADD_TO_MELD` is validated against `readMeld` before it lands. |
| **Player tries to go out without discarding** | Not an action. You go out *by* discarding your last tile. A hand that empties via melds alone still owes a discard, so a player must always keep one throwable tile — plan for it. |
| **Going out while unopened** | Impossible: emptying the rack requires laying, and laying requires opening. |
| **Stack holds ≠ 7 tiles** | Only the last stack may be short. A short stack anywhere else means the bundle detector merged or split; recount from the total, not the bundles. |
| **Missing tile** (bag sums to ≠ 106) | Consistency check 2 fails ⇒ the observation is wrong, not the game. Re-observe. Never "correct" the state by inventing a tile. |
| **Unknown tile** in a place it should be known | Report `UNCERTAIN`; exclude it from meld reasoning; keep it in the count. |
| **Occluded tile** (a hand, a drag ghost, a tooltip over it) | `visibility: "occluded"`. It counts toward totals, contributes nothing to reasoning. |
| **Two tiles visually overlapping** | If flush and inside the field → one meld, both tiles real. If overlapping and face-down → stock. If overlapping and face-up outside the field → a drag in flight; wait one frame. |
| **Cannot classify a tile** | Emit `"UNCERTAIN"` in place of the tile string. **Never** guess a number or a colour to complete a plausible meld — that is exactly the failure that produces confidently illegal moves. |
| **Animation mid-frame** | Detect motion blur / a carried tile (`rack__carry`) and re-observe rather than parse. |
| **Rule ambiguity encountered at runtime** | Fail closed: pick the interpretation that forbids the move, log the ambiguity, and surface it. Never silently choose the permissive reading. |

---

## PART 20 — COMPLETE SIMULATED ROUND

Four players. Notation `5r` = red 5, `J` = joker. Under A4(a): 14 tiles each, stock 50.

### Initial state

```
players  P1 SweetGirl44 · P2 alina17 · P3 Madalina8731 · P4 CalinTomi(you)
round 1   turn 1   turn = P1   phase = draw   opened: none
stock 50  → 7 stacks of seven and 1 loose
discard   (empty)
table     (empty)
trump     — none —

  ┌7┐┌7┐┌7┐┌7┐┌7┐┌7┐┌7┐┌1┐      THROWS: nothing yet
  └─┘└─┘└─┘└─┘└─┘└─┘└─┘└─┘

YOUR RACK
 A [ 5r 6r 7r ·  11k 11r ·  ·  13k ·  ·  ·  · ]   brackets: 5r6r7r = 18
 B [ 12y ·  1y ·  2r ·  9b ·  3y ·  ·  ·  · ]     no other group yet
 hand_count 14   opened: no   best lay: 18  (needs 27 more)
```

### Turn 1 — P1 draws stock, discards `1r`

```
stock 49 (7×7 exactly)   discard [1r]   table (empty)
visible to you: P1 threw a low red. Nothing inferable yet.
turn → P2, phase draw
```

### Turn 2 — P2 draws stock, discards `4b`

```
stock 48   discard [1r, 4b]   turn → P3
```

### Turn 3 — P3 draws stock, discards `9b`

```
stock 47   discard [1r, 4b, 9b]
YOU: 9b would pair with your 9b… you hold one 9b. Two 9b now known: yours + this.
turn → P4 (you)
```

### Turn 4 — YOU

```
phase draw.  Legal: DRAW_STOCK | DRAW_DISCARD(0..2)
  DRAW_DISCARD(2) → take 9b, cost 1 tile. You would hold 9b 9b — same colour twice,
                    which is NOT a group. Worthless. Reject.
  DRAW_DISCARD(0) → take 1r,4b,9b, cost 3. 1r extends nothing. Reject.
→ DRAW_STOCK.  You draw 11b.

hand: 5r 6r 7r 11k 11r 11b 13k 12y 1y 2r 9b 3y + 2 others   (15 tiles)

 A [ 5r 6r 7r ·  11k 11r 11b ·  13k ·  ·  ·  · ]
      └──18──┘     └────33────┘
 opening total = 18 + 33 = 51 ≥ 45  ✓  YOU CAN OPEN

phase play.  Legal: MELD([5r6r7r],[11k11r11b]) | DISCARD(any) | REARRANGE
→ MELD both.  has_opened[P4] = true.
→ DISCARD 13k  (highest tile doing nothing; 13 is the worst thing to be caught with)
```

```
BOARD AFTER TURN 4

 header   SweetGirl44 · alina17 · Madalina8731 · CalinTomi (45 p)
 table    [11k 11r 11b]=33  [5r 6r 7r]=18        ← both yours
 discard  [1r, 4b, 9b, 13k]
 stock    46  (6 of seven and 4)

 YOUR RACK
 A [ ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  · ]
 B [ 12y ·  1y ·  2r ·  9b ·  3y ·  ·  ·  · ]  + 4 others   hand_count 9
 turn → P1, phase draw
```

### Turn 5 — P1 takes `13k` from the discard (index 3, cost 1), opens with `13r 13y 13k` (39) + `2k 3k 4k` (9) = 48

```
table    [11k 11r 11b] [5r 6r 7r] [13r 13y 13k]=39 [2k 3k 4k]=9
discard  [1r, 4b, 9b]           ← 13k was taken off the end
header   SweetGirl44 (45 p) …
P1 discards 6y  →  discard [1r, 4b, 9b, 6y]
stock 46 (P1 drew from the discard, not the stock)
```

### Turn 6 — P2 draws stock, cannot reach 45, discards `12y`

```
stock 45   discard [1r, 4b, 9b, 6y, 12y]
YOU: you hold 12y. A second 12y is now dead in the line. Your 12y is worth less
     as a group tile (only 2 colours left available).
turn → P3
```

### Turn 7 — P3 draws stock, discards `1y`

```
stock 44   discard [1r, 4b, 9b, 6y, 12y, 1y]   turn → P4
```

### Turn 8 — YOU, opened

```
phase draw.  You hold 12y 1y 2r 9b 3y + 4.
  DRAW_DISCARD(4) → 12y,1y  cost 2, gives you 12y 12y and 1y 1y. Duplicated colours.
                    Worthless. Reject.
→ DRAW_STOCK.  You draw 3r.

phase play.  You are opened, so the whole table is open to you.
  ADD_TO_MELD: is there a home for anything?
    3r → [2k 3k 4k]? no, wrong colour.  → any red run? [5r 6r 7r] needs 4r or 8r. No.
    2r → [5r 6r 7r]? needs 4r first. No.
  Nothing fits yet. Hold.
→ DISCARD 9b  (helpfulness 0; the other 9b is already dead in the line, so nobody
                is collecting 9b; low risk of feeding anyone)
```

### … turns 9–20 elapse …

### Turn 21 — endgame

```
stock 6  → 0 full stacks and 6 loose        ← ONE short stack left; the round is dying
discard [ … 14 tiles … ]
table   [11k 11r 11b] [5r 6r 7r 8r] [13r 13y 13k] [2k 3k 4k 5k] [9y 9b 9k] [J 7y 8y]
hand_counts  P1: 3   P2: 6   P3: 8   P4(you): 4
opened       P1 ✓  P2 ✓  P3 ✗  P4 ✓

YOUR RACK
 A [ 4r ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  · ]
 B [ 2r ·  12y ·  3y ·  ·  ·  ·  ·  ·  ·  · ]      hand_count 4

Objective switch: P1 has 3 tiles. The round ends within 2 turns either way.
Minimise what is left on the rack.
```

### Turn 22 — YOU

```
DRAW_STOCK → 6r  (a second red 6; useless as a group, but…)

Legal moves:
  ADD_TO_MELD(1, 4r)   → [5r 6r 7r 8r] extends down to [4r 5r 6r 7r 8r]   ✓ sheds 4
  ADD_TO_MELD(?, 2r)   → nothing red starts at 3. No.
  REPLACE_JOKER(5, 6y) → [J 7y 8y]: the joker stands for 6y. You do not hold 6y. No.
  DISCARD(2r | 12y | 3y | 6r)

Evaluate:
  1. Go out? hand would be 4r,2r,12y,3y,6r = 5; lay 4r, throw one → 3 left. No.
  2. Open? already open.
  3. Joker safety? no joker held.
  4. Shed? YES — ADD_TO_MELD(1, 4r) removes 4 penalty points for free.
  5. Discard: 12y is the highest and helps nothing → throw 12y (12 points saved).

→ ADD_TO_MELD(1, 4r);  DISCARD 12y
   hand: 2r, 3y, 6r   =  2 + 3 + 6 = 11 penalty if the round dies now
   stock 5
```

### Turn 23 — P1 draws, lays, discards their last tile → **P1 goes out**

```
ROUND OVER.  winner = P1.

SCORING  (penalty = sum of tiles left on the rack; joker = 25; winner scores 0)

  P1 SweetGirl44   went out                                        +0    total  0
  P2 alina17       6y 8b 10k 11y 1k 4y      = 6+8+10+11+1+4        +40   total 40
  P3 Madalina8731  never opened; 8 tiles incl. a joker
                   3r 7k 9y 10y 12b 13y 2b J = 3+7+9+10+12+13+2+25 +81   total 81
  P4 CalinTomi     2r 3y 6r                 = 2+3+6                +11   total 11

  LIMIT = 100.  Nobody has passed 100.  Deal round 2; scores carry.
  If P3 passes 100 next round, the game ends and the LOWEST total wins.
```

---

## PART 21 — FINAL RULEBOOK

**1. Objective.** Be the first to empty your rack by forming valid melds, and over the game to hold the **lowest** cumulative penalty score. The game ends when any player passes 100 penalty points; the player with the fewest points wins.

**2. Equipment.** 106 tiles — the numbers 1–13 in red, yellow, blue and black, two of each, plus 2 jokers. One two-tier rack per player.

**3. Players.** 2, 3 or 4. Four is standard.

**4. Setup.** Shuffle face-down. Deal **14 tiles** to each player (the dealer takes 15 and starts by discarding, in the variant that balances the stock to 7×7). Stand the tiles on your own rack, faces towards you. Gather the rest face-down into **stacks of seven**, with the remainder loose.

**5. Table layout.** Racks on each edge, faces inward. The centre is the shared field where melds go. The stock sits to one side; the discard line runs across the table in a single face-up row, oldest to newest.

**6. Racks.** Two tiers, 13 slots each. Yours is private — opponents see only how many tiles you hold. Rearrange freely on your own turn; a gap between tiles is how you separate one group from the next.

**7. The seven-stacks.** The stock is bundled in sevens purely so the remaining supply is countable at a glance. Draw one tile at a time from the leftmost bundle. When a bundle is gone, start the next.

**8. Trump.** There is none.

**9. Turn order.** Counter-clockwise from the dealer's right.

**10. Drawing.** Start every turn by taking exactly one tile from the stock — **or** by reaching into the discard line. Reaching to a tile costs you that tile **and every tile thrown after it**.

**11. Discarding.** End every turn by throwing exactly one tile face-up onto the end of the line. You may not pass.

**12. Groups (sets).** Three or four tiles of the **same number** in **different colours**. Worth number × count.

**13. Runs (sequences).** Three or more tiles of **consecutive numbers** in **one colour**. The 1 counts as 1 below the 2, or as 14 above the 13. No wrap-around. Worth the sum of the positions.

**14. Jokers.** Two exist. One per meld, standing in for exactly one identifiable tile at that slot's value. On the table, a joker may be bought back by any opened player holding the exact tile it represents. Left on your rack at the end of a round, a joker costs **25**.

**15. Opening with 45.** Your first lay of the round must total **45 or more, in a single turn**, from tiles on your own rack. Several melds may be summed. Until you open you may lay nothing, extend nothing, and buy no joker. Value never carries over between turns.

**16. Extending.** Once opened, you may add tiles to **any** meld on the table, yours or anyone's, whenever they fit.

**17. Rearranging.** Freely on your own rack. Never on the table — a meld, once down, is frozen.

**18. Ending a round.** A round ends when a player discards their **last** tile — they go out and score 0 — or when the stock runs dry, in which case nobody goes out and everybody counts.

**19. Scoring.** Penalty points, low is good. Each tile left on your rack costs its face value (1 as 1); each joker costs 25. The player who went out scores 0. Totals accumulate across rounds.

**20. Special cases.** You always need a tile to throw, so you cannot empty your rack by melding alone — keep one throwable tile. You cannot go out without having opened. A round that dies on an empty stock has no winner and everybody pays.

**21. Winning.** When any player's total reaches or passes **100**, the game ends. The **lowest** total wins.

---

## APPENDIX — PHYSICAL → DIGITAL MAPPING

The mapping the agent must hold continuously:

```
VISUAL OBJECT                  OBJECT TYPE        GAME ENTITY              STATE PATH
──────────────────────────────────────────────────────────────────────────────────────
white tile, numeral + peg      tile               Tile (id 0..103)         —
white tile, face glyph         tile               Joker (id 104|105)       —
blank rectangle                tile_back          unknown tile             stock (count only)
7 fanned backs                 stock_stack        one bundle               floor(stock/7)
all fanned backs               stock              draw supply              state.stock.length
face-up row, spaced            discard_line       the throws               state.discard[]
one tile in that row, index i  discard_tile       throw #i                 state.discard[i]
3–4 flush face-up tiles        meld               a group or a run         state.table[n]
wooden bar, spaced cells       rack_tier          half a rack              state.slots[0..12] / [13..25]
one cell, tile present         rack_slot          a held tile              state.slots[i]
one cell, empty                rack_slot          a separator              state.slots[i] === null
header label                   nameplate          a seat                   state.players[n]
"(45 p)" suffix                score_badge        opened flag              state.opened[seat]
highlighted nameplate          nameplate          the live seat            state.turn
red JOKER button               joker_control      a UI action              — (no state)
dark centre panel              staging_tray       a UI surface             — (no state)
(nothing)                      —                  trump                    null — not a rule
```

Tile id encoding, for the record:

```
id 0..51    copy 1      id 52..103  copy 2      id 104,105  jokers
number  = (id % 13) + 1
colour  = ["r","y","b","k"][ floor(id / 13) % 4 ]
copy    = floor(id / 52)
```

`0 = 1r`, `12 = 13r`, `13 = 1y`, `26 = 1b`, `39 = 1k`, `51 = 13k`, `52 = 1r` (second copy), `104/105 = joker`.
