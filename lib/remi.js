// Romanian rummy — Remi — on tiles rather than cards.
//
// 106 tiles: the numbers 1 to 13 in four colours, twice over, and two jokers.
// A tile is 0..105: the two jokers are 104 and 105, and the rest carry a copy,
// a colour and a number.
//
// The rule the game is named for: your first lay must be worth at least 45.

export const COLOURS = ["r", "y", "b", "k"];
export const TILES = 106;
export const JOKERS = [104, 105];
export const OPENING = 45;
export const HAND = 14;
export const JOKER_PENALTY = 25;
export const LIMIT = 100; // penalty points; whoever passes it ends the game

export const isJoker = (tile) => tile >= 104;
export const numberOf = (tile) => (isJoker(tile) ? 0 : (tile % 13) + 1);
export const colourOf = (tile) => (isJoker(tile) ? null : COLOURS[Math.floor(tile / 13) % 4]);
export const copyOf = (tile) => (isJoker(tile) ? tile - 104 : Math.floor(tile / 52));

export function tileName(tile) {
  return isJoker(tile) ? "joker" : `${numberOf(tile)}${colourOf(tile)}`;
}

export function bag() {
  return Array.from({ length: TILES }, (_, i) => i);
}

export function shuffle(tiles, random = Math.random) {
  const out = tiles.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function sortTiles(tiles) {
  return tiles.slice().sort((a, b) => {
    if (isJoker(a) !== isJoker(b)) return isJoker(a) ? 1 : -1;
    if (isJoker(a)) return a - b;
    const ca = COLOURS.indexOf(colourOf(a));
    const cb = COLOURS.indexOf(colourOf(b));
    return ca - cb || numberOf(a) - numberOf(b);
  });
}

/* ------------------------------------------------------------------ melds --- */

// A group: the same number in three or four different colours.
function readGroup(tiles) {
  const jokers = tiles.filter(isJoker).length;
  const real = tiles.filter((tile) => !isJoker(tile));
  if (tiles.length < 3 || tiles.length > 4) return null;
  if (jokers > 1) return null; // one joker to a meld
  if (!real.length) return null;

  const number = numberOf(real[0]);
  if (real.some((tile) => numberOf(tile) !== number)) return null;

  const colours = new Set(real.map(colourOf));
  if (colours.size !== real.length) return null; // one of each colour, no more

  return { kind: "group", value: number * tiles.length, number };
}

// A run: consecutive numbers in one colour. The 1 may sit below the 2 or above
// the 13, and it is worth 14 when it does.
function readRun(tiles) {
  const jokers = tiles.filter(isJoker).length;
  const real = tiles.filter((tile) => !isJoker(tile));
  if (tiles.length < 3) return null;
  if (jokers > 1) return null;
  if (!real.length) return null;

  const colour = colourOf(real[0]);
  if (real.some((tile) => colourOf(tile) !== colour)) return null;

  const length = tiles.length;
  for (let start = 1; start + length - 1 <= 14; start += 1) {
    const left = real.slice();
    let spent = 0;
    let ok = true;

    for (let p = start; p < start + length; p += 1) {
      // a 1 can stand at 14, above the 13
      const at = left.findIndex(
        (tile) => numberOf(tile) === p || (p === 14 && numberOf(tile) === 1)
      );
      if (at >= 0) {
        left.splice(at, 1);
        continue;
      }
      spent += 1;
      if (spent > jokers) {
        ok = false;
        break;
      }
    }

    if (!ok || left.length || spent !== jokers) continue;
    let value = 0;
    for (let p = start; p < start + length; p += 1) value += p;
    return { kind: "run", value, start, colour };
  }

  return null;
}

// What a set of tiles is, and what it is worth. Null means it is not a meld.
export function readMeld(tiles) {
  if (!tiles || tiles.length < 3) return null;
  if (new Set(tiles).size !== tiles.length) return null;
  return readGroup(tiles) || readRun(tiles);
}

export const meldValue = (tiles) => readMeld(tiles)?.value ?? 0;

/* ------------------------------------------------------- adding to a meld --- */

// Whether a tile can join a meld already on the table, and where it goes.
export function extendedWith(meld, tile) {
  for (let at = 0; at <= meld.length; at += 1) {
    const next = [...meld.slice(0, at), tile, ...meld.slice(at)];
    if (readMeld(next)) return next;
  }
  return null;
}

// A joker on the table can be bought with the tile it is standing in for.
export function jokerSwap(meld, tile) {
  const at = meld.findIndex(isJoker);
  if (at < 0) return null;
  const swapped = meld.slice();
  swapped[at] = tile;
  return readMeld(swapped) ? { meld: swapped, joker: meld[at] } : null;
}

/* ---------------------------------------------------------------- the deal --- */

export function deal(players, random = Math.random) {
  const tiles = shuffle(bag(), random);
  const hands = {};
  let at = 0;
  for (const seat of players) {
    hands[seat] = sortTiles(tiles.slice(at, at + HAND));
    at += HAND;
  }
  return { hands, stock: tiles.slice(at), discard: [] };
}

export const handValue = (tiles) =>
  tiles.reduce((sum, tile) => sum + (isJoker(tile) ? JOKER_PENALTY : numberOf(tile)), 0);

/* --------------------------------------------------------------- solving --- */

// Every meld the tiles in a hand could form, jokers included as wildcards.
export function candidates(tiles) {
  const out = [];
  const jokers = tiles.filter(isJoker);
  const real = tiles.filter((tile) => !isJoker(tile));

  // groups: one of each colour, three or four of them
  for (let number = 1; number <= 13; number += 1) {
    const byColour = new Map();
    for (const tile of real) {
      if (numberOf(tile) !== number) continue;
      if (!byColour.has(colourOf(tile))) byColour.set(colourOf(tile), tile);
    }
    const picks = [...byColour.values()];
    const combos = (size) => {
      const found = [];
      const walk = (from, chosen) => {
        if (chosen.length === size) {
          found.push(chosen.slice());
          return;
        }
        for (let i = from; i < picks.length; i += 1) {
          chosen.push(picks[i]);
          walk(i + 1, chosen);
          chosen.pop();
        }
      };
      walk(0, []);
      return found;
    };
    for (const size of [3, 4]) for (const combo of combos(size)) out.push(combo);
    if (jokers.length) for (const combo of combos(2)) out.push([...combo, jokers[0]]);
  }

  // runs: a window of consecutive numbers in one colour, with at most one gap
  // for a joker to stand in
  for (const colour of COLOURS) {
    const at = new Map();
    for (const tile of real) {
      if (colourOf(tile) !== colour) continue;
      const number = numberOf(tile);
      if (!at.has(number)) at.set(number, tile);
      if (number === 1 && !at.has(14)) at.set(14, tile);
    }
    for (let start = 1; start <= 14; start += 1) {
      for (let length = 3; start + length - 1 <= 14; length += 1) {
        const picked = [];
        let gaps = 0;
        for (let p = start; p < start + length; p += 1) {
          if (at.has(p)) picked.push(at.get(p));
          else gaps += 1;
        }
        if (new Set(picked).size !== picked.length) continue; // the 1 counted twice
        if (gaps === 0) out.push(picked);
        else if (gaps === 1 && jokers.length) out.push([...picked, jokers[0]]);
      }
    }
  }

  return out.filter((meld) => readMeld(meld));
}

// The best set of melds that do not share a tile. ponytail: a depth-first
// search over the candidates with a visited set, which is exact for a hand this
// size; a table-wide rearrangement solver is the upgrade if the game ever lets
// you break melds already down.
export function bestMelds(hand, objective = "value") {
  const melds = candidates(hand);
  const index = new Map(hand.map((tile, i) => [tile, i]));
  const masks = melds.map((meld) => meld.reduce((m, tile) => m | (1n << BigInt(index.get(tile))), 0n));
  const worth = melds.map((meld) =>
    objective === "tiles" ? meld.length * 100 + meldValue(meld) : meldValue(meld)
  );

  let best = 0;
  let bestPick = [];
  const seen = new Set();

  const walk = (from, used, picked, total) => {
    if (total > best) {
      best = total;
      bestPick = picked.slice();
    }
    const key = `${from}:${used}`;
    if (seen.has(key)) return;
    seen.add(key);

    for (let i = from; i < melds.length; i += 1) {
      if (used & masks[i]) continue;
      picked.push(i);
      walk(i + 1, used | masks[i], picked, total + worth[i]);
      picked.pop();
    }
  };

  walk(0, 0n, [], 0);

  const chosen = bestPick.map((i) => melds[i]);
  return {
    melds: chosen,
    value: chosen.reduce((sum, meld) => sum + meldValue(meld), 0),
    tiles: chosen.flat(),
  };
}

/* -------------------------------------------------------------- opponent --- */

export const LEVELS = [
  { id: "easy", label: "Loose", chaos: 0.4 },
  { id: "fair", label: "Fair", chaos: 0.12 },
  { id: "sharp", label: "Sharp", chaos: 0 },
];

const setting = (level) => LEVELS.find((l) => l.id === level) || LEVELS[1];

// How much of the hand a tile is helping with: what the best lay is worth with
// it, against what it is worth without.
function helpfulness(hand, tile) {
  const without = bestMelds(hand.filter((t) => t !== tile), "tiles").tiles.length;
  const with_ = bestMelds(hand, "tiles").tiles.length;
  return with_ - without;
}

export function wantsDiscard(hand, tile, opened, level) {
  if (tile == null) return false;
  const rule = setting(level);
  if (rule.chaos && Math.random() < rule.chaos) return Math.random() < 0.3;
  const now = bestMelds(hand, "tiles");
  const after = bestMelds([...hand, tile], "tiles");
  if (!opened && after.value >= OPENING && now.value < OPENING) return true;
  return after.tiles.length > now.tiles.length;
}

export function pickDiscard(hand, level) {
  const rule = setting(level);
  if (rule.chaos && Math.random() < rule.chaos) {
    return hand[Math.floor(Math.random() * hand.length)];
  }
  const keeping = new Set(bestMelds(hand, "tiles").tiles);
  const loose = hand.filter((tile) => !keeping.has(tile) && !isJoker(tile));
  const pool = loose.length ? loose : hand.filter((tile) => !isJoker(tile));
  if (!pool.length) return hand[0];
  // the dearest tile that is doing the least
  return pool
    .slice()
    .sort((a, b) => helpfulness(hand, a) - helpfulness(hand, b) || numberOf(b) - numberOf(a))[0];
}

/* ------------------------------------------------------------------ rack --- */

export const TIERS = 2;
export const SLOTS = 13; // per tier, so there is always room to spread out

// A rack reads itself: tiles sitting next to each other are one group, and a
// gap is how you say two groups are two groups. Nothing is selected, nothing is
// declared — you arrange, and the rack tells you what you have made.
export function rackGroups(slots) {
  const groups = [];

  for (let tier = 0; tier < TIERS; tier += 1) {
    let run = [];

    const close = (end) => {
      if (run.length >= 3) {
        const tiles = run.map((at) => slots[at]);
        if (readMeld(tiles)) {
          groups.push({ tier, from: run[0] - tier * SLOTS, to: end, tiles, value: meldValue(tiles) });
        }
      }
      run = [];
    };

    for (let column = 0; column < SLOTS; column += 1) {
      const at = tier * SLOTS + column;
      if (slots[at] == null) {
        close(column - 1);
        continue;
      }
      run.push(at);
    }
    close(SLOTS - 1);
  }

  return groups;
}

export const emptyRack = () => new Array(TIERS * SLOTS).fill(null);

// Keeps the arrangement you made and finds a slot for anything new, dropping
// whatever has left your hand.
export function seatTiles(slots, tiles) {
  const next = slots.slice();
  const held = new Set(tiles);

  for (let at = 0; at < next.length; at += 1) {
    if (next[at] != null && !held.has(next[at])) next[at] = null;
  }

  const already = new Set(next.filter((tile) => tile != null));
  for (const tile of tiles) {
    if (already.has(tile)) continue;
    const free = next.indexOf(null);
    if (free >= 0) next[free] = tile;
  }

  return next;
}

/* ------------------------------------------------------------ the throws --- */

// The thrown tiles lie in a line, and you may reach into it — but a tile from
// further back costs you every tile thrown after it. Reaching for the 3 you
// need six throws ago means taking all six that followed it.
export function takeFrom(discard, at) {
  if (!Number.isInteger(at) || at < 0 || at >= discard.length) return null;
  return {
    taken: discard.slice(at),
    left: discard.slice(0, at),
  };
}

// How the stock sits in the box: stacks of seven, and whatever is over.
export const STACK = 7;

export function stacksOf(count) {
  return {
    full: Math.floor(count / STACK),
    loose: count % STACK,
  };
}
