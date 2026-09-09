---
version: 1
slug: "app-page-js"
primary_target: "app/page.js"
related_targets: ["app/layout.js","app/play"]
---

Scope: the GameHub dashboard at `/`, its head rail and game frame, shared across every route.
Visitor mode: Operate. Job: reach a game in seconds; see whether the board still remembers you.
Constraints: no backend, no real rivals, no invented figures — every absent number is a designed empty hook.

## Direction contract

THESIS: GameHub is one hand-operated club scoreboard where every number is a plate somebody hung. It refuses the dark neon cover-art library and its calm pastel opposite.

OWN-WORLD: Painted board green #12302a, chalk #f0e7d4, enamel-cream plates #e2c98f, oxblood #8f2417, brass #b08a3e. Five paints, no gradient anywhere; any intermediate tone is printed speckle. Routed slots, brass hooks, stencil caps, tabular plate numerals. Every zone wears its own painted stencil header; states are stenciled words plus form, never paint colour alone.

STORY: The player reads today's challenge and their live streak in one glance, believes the board kept their record, and presses a brass plate into a game.

FIRST VIEWPORT: Full-bleed board. Stenciled head rail across the top. Today's challenge as one oversized plate, left, with the brass PLAY plate on it. Three game slots to its right, each hung with its own state. Streak and personal-best plates in the lower-left channel; standings on the lower right, hooks empty and labelled.

FORM: Club scoreboard; candidate 4 of my 7 ordered grounded directions; seed key 8faf03d3.

SIGNATURE INTERACTION: Hanging the plate — a changed value lifts off its hook and the new plate drops in and swings once to rest, staggered by column, orchestrated once for the whole board. The range selector re-hangs every plate at once while the tabular readout counts. Reduced motion swaps instantly.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Deferred: dashboard revision (user feedback, 2026-09-09)

The user reviewed the shipped board and deferred a revision to the end of the current run of
work. Do not act on these during game work; they are the agenda for the final dashboard pass.

1. **Palette rejected.** The board-green world reads wrong to them. Replace with blue and grey —
   navy ground, steel/slate mid-tones. Acted on immediately (tokens only, 2026-09-09) because two
   games were about to be built in it; the five-paint discipline and the two-coat role swap are
   preserved, only the paints changed.
2. **Too many boxes of stats.** The grid of same-shaped panels, each holding one number and one
   label, reads as generated template regardless of skin. The final pass must cut the number of
   stat containers and find a form that is not "panel with a figure in it".
3. **Game access should use depth.** They want entering a game to feel like looking through an
   opened door into the room beyond — a preview of the game surface itself, set back in space,
   with depth as the effect. This replaces the current flat game slots.
4. ~~**The hung system does not read.**~~ **Resolved 2026-09-09.** The hook was replaced by a
   lug-and-peg fixing: a peg fixed to the board, and a punched lug in the plate's own face that
   drops over it. Two hook designs were built and rejected first; DESIGN.md records both and the
   reason each failed. The don't-extend rule is lifted — the fixing is now the settled device.

Also confirmed 2026-09-09: the catalog grows — more games will be added over time, so every
surface that lists games must scale past three without redesign.
