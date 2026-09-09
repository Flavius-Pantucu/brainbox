---
name: BrainBox
description: A hand-operated club board, relit in navy and cobalt and rounded off, where every number is a plate somebody hung.
colors:
  paint-navy: "#0c1725"
  paint-slate: "#24384f"
  paint-steel: "#8fa2b8"
  paint-bone: "#e8edf4"
  paint-cobalt: "#4f8ce8"
  fault: "#b3241a"
  ground: "var(--paint-navy)"
  ink: "var(--paint-bone)"
  ink-quiet: "color-mix(in srgb, var(--paint-bone) 76%, var(--paint-navy))"
  ink-faint: "color-mix(in srgb, var(--paint-bone) 56%, var(--paint-navy))"
  plate-face: "color-mix(in srgb, var(--paint-bone) 90%, var(--paint-steel))"
  plate-ink: "var(--paint-navy)"
  plate-ink-quiet: "color-mix(in srgb, var(--paint-navy) 78%, var(--plate-face))"
  panel: "var(--paint-slate)"
  signal: "var(--paint-cobalt)"
  signal-on: "var(--paint-navy)"
  signal-ink: "color-mix(in srgb, var(--paint-cobalt) 88%, var(--paint-bone))"
  routed: "color-mix(in srgb, var(--paint-navy) 64%, #000)"
  keyline: "color-mix(in srgb, var(--paint-bone) 16%, transparent)"
  keyline-strong: "color-mix(in srgb, var(--paint-bone) 32%, transparent)"
typography:
  display:
    fontFamily: "Fredoka, ui-sans-serif, sans-serif"
    fontSize: "clamp(2.6rem, 6vw, 4.2rem)"
    fontWeight: 600
    lineHeight: 0.88
    letterSpacing: "-0.015em"
    fontFeature: "tabular-nums"
  headline:
    fontFamily: "Fredoka, ui-sans-serif, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3.2rem)"
    fontWeight: 600
    lineHeight: 0.9
    letterSpacing: "-0.01em"
  numeral:
    fontFamily: "Fredoka, ui-sans-serif, sans-serif"
    fontSize: "clamp(1.9rem, 4.5vw, 2.6rem)"
    fontWeight: 600
    lineHeight: 0.9
    fontFeature: "tabular-nums"
  numeral-wide:
    fontFamily: "Fredoka, ui-sans-serif, sans-serif"
    fontSize: "clamp(1.7rem, 3.4vw, 2.3rem)"
    fontWeight: 600
    lineHeight: 0.86
    fontFeature: "tabular-nums"
  numeral-small:
    fontFamily: "Fredoka, ui-sans-serif, sans-serif"
    fontSize: "clamp(1.4rem, 2.4vw, 1.9rem)"
    fontWeight: 600
    lineHeight: 1
    fontFeature: "tabular-nums"
  stage-title:
    fontFamily: "Fredoka, ui-sans-serif, sans-serif"
    fontSize: "clamp(1.4rem, 2.6vw, 2rem)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.01em"
  wordmark:
    fontFamily: "Fredoka, ui-sans-serif, sans-serif"
    fontSize: "clamp(1.3rem, 2.3vw, 1.6rem)"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.005em"
  title:
    fontFamily: "Nunito, ui-sans-serif, sans-serif"
    fontSize: "0.86rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.14em"
  body:
    fontFamily: "Nunito, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tabular-nums"
  chalk:
    fontFamily: "Nunito, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.82rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Nunito, ui-sans-serif, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.14em"
  micro:
    fontFamily: "Nunito, ui-sans-serif, sans-serif"
    fontSize: "0.62rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.12em"
  nano:
    fontFamily: "Nunito, ui-sans-serif, sans-serif"
    fontSize: "0.56rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.13em"
  cell:
    fontFamily: "Fredoka, ui-sans-serif, sans-serif"
    fontSize: "5.4cqmin"
    fontWeight: 600
    lineHeight: 1
    fontFeature: "tabular-nums"
rounded:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  pill: "999px"
spacing:
  unit: "8px"
  half: "4px"
  one: "8px"
  one-half: "12px"
  two: "16px"
  two-half: "20px"
  three: "24px"
  four: "32px"
  six: "48px"
  gutter: "clamp(16px, 3.2vw, 40px)"
  rail: "68px"
components:
  key:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.signal-on}"
    rounded: "{rounded.sm}"
    padding: "14px 26px"
    typography: "{typography.micro}"
  key-large:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.signal-on}"
    rounded: "{rounded.sm}"
    padding: "18px 32px"
  key-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.ink-quiet}"
    rounded: "{rounded.sm}"
    padding: "14px 26px"
  key-disabled:
    backgroundColor: "transparent"
    textColor: "{colors.ink-faint}"
    rounded: "{rounded.sm}"
  plate:
    backgroundColor: "{colors.plate-face}"
    textColor: "{colors.plate-ink}"
    rounded: "{rounded.md}"
    padding: "20px 20px 18px"
  plate-notch:
    backgroundColor: "{colors.routed}"
    textColor: "{colors.ink-faint}"
    rounded: "{rounded.md}"
  slot:
    backgroundColor: "{colors.routed}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "16px"
  readout:
    backgroundColor: "{colors.routed}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "12px 14px"
  pad-key:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "10px 0"
  tool:
    backgroundColor: "transparent"
    textColor: "{colors.ink-quiet}"
    rounded: "{rounded.sm}"
    padding: "9px 10px"
  tool-on:
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
  peg-option-selected:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.signal-on}"
    rounded: "{rounded.pill}"
    padding: "7px 15px"
  field-input:
    backgroundColor: "{colors.routed}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "9px 12px"
  roomcode:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.signal-on}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
  notice:
    backgroundColor: "color-mix(in srgb, #b3241a 14%, transparent)"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
  tag-live:
    backgroundColor: "color-mix(in srgb, var(--paint-cobalt) 14%, transparent)"
    textColor: "{colors.signal}"
    rounded: "{rounded.xs}"
    padding: "5px 9px 4px"
  nameplate:
    backgroundColor: "{colors.plate-face}"
    textColor: "{colors.plate-ink}"
    rounded: "{rounded.xs}"
    padding: "7px 12px 6px"
  lamp:
    backgroundColor: "transparent"
    textColor: "{colors.ink-quiet}"
    rounded: "{rounded.xs}"
    size: "38px"
---

# Design System: BrainBox

## Overview

**Creative North Star: "The Club Scoreboard"**

BrainBox is a hand-operated board in a club back room, painted in navy and cobalt. Nothing on it is generated: every figure sits on an enamel plate that somebody screwed to a hook, every region is a channel routed into the panel, every label is painted on. The interface reads as fabricated hardware rather than rendered software — plates catch a hard offset shadow, slots sink into an inset channel, and cobalt appears only where a fitting would be metal.

The hardware is rounded, not machined. Corners run on a soft scale (8/12/16/20px), the display face is curvy and capped at semibold, and the mark is a brain in a soft-cornered box. The board is friendly and it does not shout — the tone commitment is carried by the corner scale and the weight ceiling, not by adding color.

The board is lit two ways. The night coat is the navy ground with bone ink; the day coat relights the same board without touching the paint tin — roles swap, paints do not. There are five paints and no sixth. Every tone between them is a `color-mix` of two paints, never a new pigment and never a gradient. What separates two adjacent surfaces is a printed speckle, a routed keyline, or a shadow — never a blend.

Density is high but the voice is warm. Numbers are large, rounded and tabular; supporting text is small, quiet and short. Game play takes the whole window: a route that plays something claims the full viewport below the rail and sizes its board to that space rather than growing the page. Confirmed rejection: no gradients, no soft glassy translucency as a surface, no decorative color that is not also a fitting.

**Key Characteristics:**
- Five paints, closed; every other tone is a mix of two of them
- Two coats that swap roles, not paints (night is default; day is a relight)
- One rounded corner scale (8/12/16/20/999px); nothing gets a bespoke radius
- Two faces, two-and-a-half roles: Fredoka is the voice, Nunito is the reading and, set in caps and tracked, the labels
- Display weight is capped at 600 — the board never shouts
- Depth is offset-plus-blur shadow standing off the board, or an inset routed channel cut into it — never both directions in one element
- A single fixed speckle layer over the whole window; no per-element texture
- State is a written word plus a drawn mark, never color alone
- Play routes own the window: a fixed-height stage, a board that fits it

## Colors

Cold, printed enamel: a near-black navy ground, a bone plate face, a steel grey between them, and one cobalt fitting.

### Primary
- **Signal Cobalt** (`--paint-cobalt`): the one live paint. It is fittings and marks: the hook, the active nav underline, the primary key face, the selected peg, the tic-tac-toe O, the room-code plate, the brain inside the mark, the focus ring, the scrollbar thumb. On the night coat it measures roughly 4.4:1 on the navy ground — enough for a fill or a large drawn stroke, not enough for body text.
- **Signal Ink** (`--signal-ink`): the text-safe cobalt. Cobalt pushed toward bone on the night coat and toward navy on the day coat, so accent-colored *words* (warn readouts, the tool shortcut hint, the seat mark, the strike line) stay legible in both coats.
- **Signal On** (`--signal-on`): whatever sits on top of a cobalt fill. It flips per coat — navy on the night coat, bone on the day coat — so a cobalt key never has to guess its own label color.

### Neutral
- **Board Navy** (`--paint-navy`): the night ground, the plate ink on enamel, the heavy 2px sudoku box rules, the icon ground, and the base of every routed mix.
- **Panel Slate** (`--paint-slate`): the raised secondary face. It is the number-pad key and, on the day coat, the same role mixed toward bone. It is a surface, never text.
- **Steel** (`--paint-steel`): the between-tone. It cools the plate face away from pure bone and draws the tic-tac-toe hash strokes. Never used as text.
- **Bone** (`--paint-bone`): the night ink, the day ground, and the box of the mark. All keylines are bone at low alpha on the night coat.
- **Routed Channel** (`--routed`): navy driven toward black (night) or barely tinted bone (day). Every sunken surface — slot, readout, status, field, peg groove — is this color plus the inset cut shadow.

### Tertiary
- **Fault Red** (`fault`, `#b3241a`): the only literal color outside the five paints. It marks a wrong sudoku entry (text plus a 16% wash, 30% when that cell is also selected) and outlines the error notice at 14% fill. It is a fault state, not a palette member: it never appears as decoration, never as a heading, never on a control that is working.

### Named Rules
**The Five Paints Rule.** The palette is closed at five: navy, slate, steel, bone, cobalt. Any new tone is a `color-mix` of two of them. A sixth pigment requires a palette decision, not a component decision. Fault red is the single documented exception and is reserved for error.

**The Repaint Rule.** The day coat swaps roles, not paints. `[data-paint="day"]` reassigns `--ground`, `--ink`, `--signal`, `--signal-on`, `--panel`, `--routed` and the shadow tokens; it never introduces a hex. Anything built with role tokens relights for free. Anything built with a raw paint breaks the day coat — audit test: if a component reads `--paint-*` directly for a fill or a text color, it must look right in both coats or be rewritten onto a role token. The one licensed exception is a static asset that cannot read a variable: `app/icon.svg` and `app/apple-icon.svg` hardcode navy, bone and cobalt because a favicon has no CSS context.

**The Signal Is Not Text Rule.** Cobalt at ~4.4:1 on navy is a fill, a stroke, and large display type — never body text, never a small label. Words in the accent use `--signal-ink`.

**The Computed Contrast Rule.** `--ink-quiet`, `--ink-faint`, `--plate-ink-quiet` and every keyline mix are computed to clear 4.5:1 against their own ground in both coats. Changing a mix percentage means recomputing, not eyeballing.

## Typography

**Display Font:** Fredoka (self-hosted via `next/font`, `--font-display`, weights 400/500/600)
**Body Font:** Nunito (self-hosted via `next/font`, `--font-text`, weights 400/500/600/700)
**Label Font:** Nunito, aliased as `--font-label` — labels are the body face set in caps and tracked, not a third family.

**Character:** Two faces, warm on both sides of the pairing. Fredoka is geometric and soft-cornered — the voice, carrying every large figure and every title. Nunito is humanist with rounded terminals; it reads at 16px, sets every sentence, and — uppercased and letterspaced — does the board's own painted labelling. The rounder faces made the old heavy tracking unnecessary, so label tracking was eased across the sheet.

### Hierarchy
- **Display** (600, `clamp(2.6rem, 6vw, 4.2rem)`, 0.88, `-0.015em`): the day's game on the oversized dashboard plate. One per screen.
- **Headline** (600, up to `clamp(2rem, 5vw, 3.2rem)`, 0.9): the play title (`clamp(2rem, 5vw, 3.1rem)`) and the game-over verdict on a stage veil.
- **Numeral wide** (600, `clamp(1.7rem, 3.4vw, 2.3rem)`, 0.86): the streak count on the dashboard.
- **Numeral** (600, `clamp(1.9rem, 4.5vw, 2.6rem)`, 0.9): personal-best values on plates. Drops to a flat `1.45rem` under 720px.
- **Stage title** (600, `clamp(1.4rem, 2.6vw, 2rem)`, 1): the game name in the stage bar. Deliberately smaller than the dashboard display — inside a game, the board yields to the board.
- **Fixed figures** (600, `1.1rem`–`1.7rem`): readout values and day plates at `1.5rem`, room code at `1.7rem`/`0.15em`, ladder score at `1.15rem`, ladder number at `1.1rem`, seat mark at `1.2rem`, number-pad digits at `clamp(1.4rem, 2.4vw, 1.9rem)`.
- **Cell figures** (600, `5.4cqmin`; notes `1.9cqmin`): sudoku digits size to their own container, not to the viewport, so the grid stays typographically correct at any board size.
- **Wordmark** (Fredoka 500, `clamp(1.3rem, 2.3vw, 1.6rem)`, `0.005em`): the rail mark only. Mixed case, near-neutral tracking — the name is spoken, not stamped.
- **Title** (600, `0.86rem`, `0.14em`, uppercase): game names on slot plates; ladder names at `0.76rem`/`0.12em`.
- **Body** (400, `16px`, 1.5): the document default, with `tabular-nums` set on `body`.
- **Chalk** (400, `0.82rem`, 1.45): the annotation voice — game one-liners, notes, empty-state explanation. Tight variant `0.76rem`. Max measure 46–62ch.
- **Label** (600, `0.72rem`, `0.14em`, uppercase; `.label` / `.zone-label` at `0.12em`): zone labels.
- **Micro** (600, `0.6rem`–`0.68rem`, `0.12em`–`0.14em`, uppercase): tags, table headers, foot, peg options, key faces (`0.82rem`/`0.14em`; large key `0.95rem`), tools (`0.64rem`).
- **Nano** (600, `0.56rem`–`0.58rem`, `0.13em`–`0.15em`, uppercase): readout labels, field labels, room-code label, the divider rule.

### Named Rules
**The Two Faces Rule.** Fredoka and Nunito, both self-hosted through `next/font`, no third family and no system display stack. `--font-label` is an alias of `--font-text`, not a new face. A new weight inside the loaded set is allowed; a new family is a system change.

**The Quiet Ceiling Rule.** Display type stops at 600. No 700, 800 or 900 anywhere in the display role — the ramp gets its emphasis from size, never from mass. Nunito's 700 exists for inline body emphasis only.

**The Caps-For-Labels Rule.** The label role is the body face uppercased and tracked: wordmarkless labelling — zone labels, tags, button faces, column headers, unit lines. It is always uppercase, always letterspaced between `0.12em` and `0.16em`, and never sets a sentence.

**The Tabular Rule.** Figures are tabular. `font-variant-numeric: tabular-nums` is set on `body` and re-asserted on every numeral class, so a score never shifts width as it changes.

**The Every-Zone-Names-Itself Rule.** Every region of the board opens with a zone label whose trailing hairline runs to the edge of the region. Wayfinding is reading, not iconography.

## Layout

The board is a vertical shell: a sticky 68px rail (60px under 720px), a `flex: 1` main, and a foot pinned to the bottom. **Pages own their own container** — the root layout renders a bare `.board__main` and nothing else. The dashboard and standings wrap themselves in the 1360px centered `.board__inner` with a `clamp(16px, 3.2vw, 40px)` gutter; play routes wrap themselves in `.stage` instead.

Rhythm is an 8px unit (`--u`) used exclusively in `calc()` multiples: 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3.5, 4, 5, 6, 8. No arbitrary pixel padding on a container.

The dashboard is a 12-column grid at 24px gutters: today spans 5, games 7, the run 7, standings 5; everything collapses to 12 under 1000px. The run is seven equal day columns; game slots are three columns collapsing to one under 620px; bests are three columns.

The stage is the second layout model and the one every future game uses. It is exactly `calc(100dvh - var(--rail-h))` with `flex: none` and `overflow: hidden`, so its own content can never grow it. Inside: a `.stage__bar` header, then a `.stage__body` grid of `minmax(0, 1fr)` field plus a `minmax(240px, 300px)` side rail, with `grid-template-rows: minmax(0, 1fr)` so a square board sizes itself to the available space instead of pushing the page taller. Under 900px it becomes one column with auto rows and releases to `height: auto`; under 620px tall it releases to `height: auto` and scrolls rather than clipping controls.

### Named Rules
**The Stage Owns The Window Rule.** A play route claims the window below the rail and nothing inside it may grow that height. Boards fit the stage; the stage never fits the board. Audit test: with the game running at 1280×800, the page must not scroll.

**The Page Owns Its Container Rule.** The layout supplies no width and no padding. Every page states its own container — `.board__inner` for reading surfaces, `.stage` for play.

## Elevation & Depth

Depth is physical and has exactly two directions. Something either stands off the board — a hard offset shadow plus a short blur — or is cut into it — an inset channel with a light lip on the bottom edge. Nothing is ambiently floating and nothing uses a soft diffuse drop shadow alone. Both coats define their own shadow values; the day coat rebuilds them from navy mixes so shadows stay in the paint family rather than going grey.

Tone between two surfaces is a single fixed `feTurbulence` speckle: one `body::before` layer, `position: fixed`, `mix-blend-mode: overlay`, at 0.4 opacity on the night coat and 0.3 on the day coat. It is the entire texture budget.

### Shadow Vocabulary
- **Lift 1** (`--lift-1`, night `0 2px 0 rgba(0,0,0,0.34), 0 6px 12px -6px rgba(0,0,0,0.62)`): plates, the nameplate, the room-code fitting. The resting elevation.
- **Lift 2** (`--lift-2`, night `0 3px 0 rgba(0,0,0,0.38), 0 14px 26px -12px rgba(0,0,0,0.7)`): the sudoku board, the play surface, the legacy panel. A whole game surface.
- **Cut** (`--cut`, night `inset 0 3px 7px rgba(0,0,0,0.62), inset 0 -1px 0 rgba(232,237,244,0.07)`): every routed channel — slots, readouts, status lines, fields, the peg groove.
- **Key press** (`0 3px 0 rgba(0,0,0,0.4), 0 10px 18px -10px rgba(0,0,0,0.8)`): the primary key, deepening to 4px on hover and collapsing to 1px on active.
- **Rail seat** (`0 1px 0 rgba(0,0,0,0.3), 0 10px 20px -18px rgba(0,0,0,0.9)`): the sticky rail sitting on the board.

### Named Rules
**The Two Directions Rule.** Every depth effect either stands off the board (offset + blur) or is cut into it (inset). Never both on one element, and never a shadow with zero offset.

**The No-Gradient Rule.** No gradient anywhere. An apparent tone shift is a `color-mix` of two paints, the speckle layer, or a shadow.

**The One Speckle Rule.** One fixed speckle layer for the whole window. Components do not carry their own texture, noise, or backdrop except the stage veil's single 3px blur.

## Shapes

Corners are rounded on one shared scale and nothing sits off it: `--radius-xs` 8px (fittings — tags, the nameplate, the lamp, the focus ring), `--radius-sm` 12px (controls — keys, pad keys, tools, fields, the room code, seats, the notice, tic-tac-toe cells), `--radius` 16px (surfaces — plates, the play surface, the sudoku board, aliased as `--radius-plate`), `--radius-lg` 20px (routed channels — slots, readouts, aliased as `--radius-slot`), and `--radius-pill` 999px for the peg groove and the scrollbar thumb. Radius carries hierarchy: the deeper the cut, the softer the corner.

Edges are stated, not implied. Plates carry a 1px dark border plus a second painted enamel keyline inset 4px inside the edge (6px on the play surface), and that inner keyline steps one stop down the scale to 12px so it stays concentric. The sudoku board draws its structure at two weights: 1px cell rules at 22% navy, 2px navy rules on box edges and the outer frame. Tic-tac-toe refuses a box entirely — the board is four drawn SVG hash strokes in steel-over-ground at 1.1 stroke width, with no cell borders at all.

Drawn marks are stroked, never filled or typeset: `.mark--x` and `.mark--o` are SVG strokes at width 9 with round caps, animated in with a `draw-mark` dash reveal (340ms), and the winning line strikes through afterwards at 1.6 non-scaling stroke (420ms, 160ms delay). Both are disabled under `prefers-reduced-motion`.

Icons are authored in `components/board/icons.js` on a 24×24 box at a single 1.6 stroke weight, round cap and join, `currentColor`. There are no glyph icons and no icon font.

### Named Rules
**The One Corner Scale Rule.** Every corner on the board comes from `--radius-xs / -sm / --radius / -lg / -pill`. No component declares its own radius literal. Audit test: a `border-radius` in the sheet that is not a `var(--radius*)` reference is a bug, with the two documented exceptions — the 12px concentric inner keyline and the 50% drilled hole in the hung plate.

**The One Stroke Rule.** Every mark on the board is drawn at one weight in one file, so hardware and game marks read as a single set of fittings. A new icon is added there or not at all.

## Components

### The mark
The BrainBox mark is a brain in a box: a soft-cornered square (32-unit box, `rx 8.6`, 2.3 stroke in `currentColor`) holding a two-lobed brain stroked at 2.1 in `var(--signal)`. Its interior is exactly three strokes — a centre division plus one lobe path per side. That count is a legibility finding, not a style preference: a denser draft of parallel folds smudged into a solid at 16px, and a single serpentine path read as the digit 2. It ships in `components/board/logo.js` as `BrainBoxMark`, sits in the rail at 30px via `.rail__logo` inheriting `--ink` for its box, and is duplicated as static favicons in `app/icon.svg` and `app/apple-icon.svg` with the paints hardcoded (navy ground, bone box, cobalt brain) because a static SVG cannot read CSS variables. The mark and the wordmark travel together in `.rail__mark` and nothing sits between or beneath them.

### Buttons — the key
The primary action is a pressed fitting, not a button.
- **Shape:** rounded control (12px) with a 1px dark border.
- **Primary (`.key`):** cobalt face, `--signal-on` label, label face 600 at `0.82rem`/`0.14em` uppercase, 14px × 26px padding, sitting on a 3px hard shadow.
- **Large (`.key--large`):** 18px × 32px, `0.95rem`. The one call to action on a plate.
- **Hover / Active:** hover mixes 18% bone into the face and lifts 1px, deepening the shadow; active drops 2px and collapses the shadow to 1px. It behaves like a key being pressed.
- **Quiet (`.key--quiet`):** transparent face, quiet ink, strong keyline border, no shadow; on hover the border goes cobalt and nothing moves.
- **Disabled:** the fitting is removed — transparent face, faint ink, dashed keyline border, no shadow.

### Chips — the tag
State is a written word plus a drawn 7px mark inside a `currentColor` 1px border at 8px radius.
- **`.tag--on`** plate ink on a 12% navy wash; **`.tag--live`** cobalt on a 14% cobalt wash; **`.tag--off`** faint ink with a dashed border; **`.tag--chalk`** quiet ink.
- The mark is never optional. Color is the third channel, after word and form.

### Cards / Containers — plate and slot
Two container species, and only two.
- **Plate (`.plate`):** raised enamel — plate face, 16px radius, 1px dark border, inset enamel keyline at 12px, `--lift-1`, 20px body padding (26/28/24 on `.plate--tall`). Empty variants are honest: `.plate--empty` is a dashed outline with no face; `.plate--notch` is the routed channel with the cut shadow, showing an open hook rather than a ghost plate.
- **Slot (`.slot`):** cut channel — routed color, 20px radius, `--cut`, 16px padding (20px deep). Everything that reads as recessed (`.readout`, `.status`, `.field__input`, the peg groove) uses the same channel treatment.

### Inputs / Fields
- **Style:** `.field__input` is a routed channel — routed background, strong keyline border, 12px radius, inset cut shadow, inherited body font, 9px × 12px padding. The label above it is nano caps.
- **Focus:** the border goes cobalt; the outline is suppressed in favor of it. Everywhere else, focus is the global 2px cobalt ring at 3px offset with an 8px radius.
- **Code variant (`--code`):** display 600 at `1.5rem`, `0.3em` tracking, centered and uppercased — a code being read aloud.
- **Error:** `.notice` — a fault-red 1px border over a 14% fault wash, body ink, `0.82rem`. The message carries the meaning; the red confirms it.
- **Nameplate:** local identity styled as a screwed-on plate with a borderless transparent input inside; focus tightens the border to navy.

### Navigation — the rail
Sticky, ground-colored, strong keyline beneath, seated with the rail shadow. It opens with the 30px mark and the Fredoka 500 wordmark, and nothing else identifies the product. Links are the label face at 600, `0.76rem`/`0.13em` uppercase in quiet ink, going full ink on hover. The current page is marked by a 3px cobalt underline sitting on the rail's bottom edge with its own 1px hard shadow — the one place cobalt fills a bar. Under 720px the rail shrinks to 60px, the nameplate drops out, and links tighten.

### Game furniture (shared by every game)
The stage side rail is assembled from a fixed vocabulary, and a new game should reuse it rather than invent:
- **`.readout` / `.readout__item`** — a three-up cut channel of nano label over a `1.5rem` display figure; `.is-warn` turns the figure to `--signal-ink`.
- **`.pad` / `.pad__key`** — a 3-column number pad on slate panel keys with a strong keyline; hover mixes 24% cobalt into the panel and turns the border cobalt; active drops 1px; a small remaining-count sits top-right. Under 900px it becomes a single 9-across strip and the count hides.
- **`.tools` / `.tool`** — a 2-column (3 under 900px) grid of quiet caps toggles with a keyline border; `.is-on` fills 20% cobalt and turns border and ink up. The shortcut hint inside is `--signal-ink`.
- **`.status`, `.rule`, `.seats` / `.seat`, `.roomcode`, `.notice`** — the online room set. `.seat.is-you` is a cobalt border over a 12% cobalt wash; `.roomcode` is the one solid cobalt plate on the board, carrying `--signal-on` and `--lift-1`.

### Sudoku board
A container-query grid: `container-type: size` on the board, so cell type is sized in `cqmin` and the grid is correct at any dimension. Enamel face at 16px radius, 2px navy frame, 1px 22%-navy cell rules with 2px navy box rules on the third edges. Highlight steps escalate in one hue: peer 8% navy, match 30% cobalt, selected 46% cobalt. Givens are navy 600; entries are `--signal-ink`; a wrong entry is fault red on a 16% fault wash (30% when selected). Pencil notes are a 3×3 sub-grid at `1.9cqmin`. `.sud__veil` covers the board for dealing, paused, won and lost with an 88% ground wash, a 3px blur, a label line and a display verdict.

### Tic-tac-toe board
No box. Four SVG hash strokes in steel-mixed-with-ground at 1.1 width sit above a bare 3×3 grid; cells are transparent with a 12px radius and only appear on interaction — hover washes 16% cobalt and reveals a ghost mark at 26% ink, a winning cell holds a 22% cobalt wash. X is drawn in `--ink`, O in `--signal`, both stroked at width 9 with the `draw-mark` dash reveal; the winning line strikes through in `--signal-ink`.

### The hung plate (signature — under review)
Every figure on the dashboard hangs from a drawn hook: a `.hang` wrapper with 13px of top padding, the cobalt `Hook` icon absolutely centered (or 22px from the left on `.hang--left`), and a plate below with a drilled hole punched through its face and its transform origin set 6px above its own top edge. When data changes the outgoing plate lifts off the hook (`hang-lift`, 340ms) while the incoming plate waits 200ms for the hook to clear and then drops onto it (`hang-drop`, 620ms on `--swing`), each plate staggered 55ms by index. Both animations are removed entirely under `prefers-reduced-motion`.

**Status: this is what ships today and is documented as the current system, but it is under review.** The user has reported that the hung-plate device does not read as an intentional design and that the hooks are misplaced. Do not extend the hang mechanic to new surfaces, and do not treat the hook geometry as settled.

### Legacy panel (transitional)
Chess still runs its pre-rebuild interface and is marked `legacy: true` in `lib/games.js`. It renders inside `.legacy`: a full-width enamel panel on the stage with `--lift-2` and a note beneath, with a targeted override forcing the old Tailwind `text-white` / `text-slate-100` utilities to navy so the legacy UI is at least legible on enamel. This is a holding pattern, not a pattern. New games use the stage furniture; the override disappears when chess is rebuilt.

## Do's and Don'ts

### Do:
- **Do** build from role tokens (`--ground`, `--ink`, `--signal`, `--signal-on`, `--panel`, `--routed`) so a component relights in both coats for free.
- **Do** use `--signal-ink` for any word in the accent color, and reserve `--signal` for fills, strokes and large display type.
- **Do** take every corner from `--radius-xs / -sm / --radius / -lg / -pill`.
- **Do** express every space as a `calc(var(--u) * n)` multiple of the 8px unit.
- **Do** set labels in the body face, uppercased and tracked `0.12em`–`0.16em`, via `--font-label`.
- **Do** give each new game a `.stage` with a `.stage__bar` and a `.stage__body`, and assemble its side rail from the existing furniture (`.readout`, `.pad`, `.tools`, `.status`, `.field`, `.notice`).
- **Do** size a game board to the stage — container queries or `cqmin` type, `min-height: 0` on the grid track — so the page never scrolls during play.
- **Do** state every status with a word plus a drawn form; color confirms it, it does not carry it.
- **Do** draw new marks in `components/board/icons.js` at the 1.6 stroke weight on the 24×24 box.
- **Do** open every region with a zone label.
- **Do** keep the mark's interior at three strokes; it is a tested legibility floor at 16px.

### Don't:
- **Don't** introduce a sixth paint. New tones are `color-mix` of the five. Fault red is the single documented exception and is only for error.
- **Don't** use a gradient anywhere, on any surface, in any coat.
- **Don't** set body text, small labels or long copy in `--signal`.
- **Don't** set display type above 600, and don't reach for weight where size is the correct emphasis.
- **Don't** write a bespoke `border-radius` literal; if the scale is wrong, change the scale.
- **Don't** add a second texture, noise or backdrop layer; the fixed speckle is the whole budget.
- **Don't** let a play route's content determine the page height, and don't put a page container in the root layout.
- **Don't** add a third font family or fall back to a system display face.
- **Don't** ship a glyph icon, an icon font, or an icon at a stroke weight other than 1.6.
- **Don't** redraw the mark's brain as a single continuous path (it reads as a "2") or as dense parallel folds (it fills in at 16px).
- **Don't** extend the hung-plate mechanic to new surfaces while it is under review.
- **Don't** treat `.legacy` as a component to reuse; it exists only until chess is rebuilt.
