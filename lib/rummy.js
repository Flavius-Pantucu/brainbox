// Gin rummy rules. Pure functions — the same logic runs in the browser for
// local play and on the server for online rooms, where the deck is the
// server's and a hand is only ever sent to the player holding it.
//
// A card is 0..51: rank = card % 13 (0 is an ace, 12 a king), suit = the rest.
// Aces are low only, so A-2-3 is a run and Q-K-A is not.

export const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
export const SUITS = ["s", "h", "d", "c"];

export const HAND = 10;
export const KNOCK_AT = 10; // knock with ten points of deadwood or less
export const GIN_BONUS = 25;
export const UNDERCUT_BONUS = 25;
export const TARGET = 100;

export const rankOf = (card) => card % 13;
export const suitOf = (card) => Math.floor(card / 13);
export const cardName = (card) => `${RANKS[rankOf(card)]}${SUITS[suitOf(card)]}`;

// Court cards are ten, an ace is one, everything else is its own number.
export const valueOf = (card) => Math.min(rankOf(card) + 1, 10);

export function deck() {
  return Array.from({ length: 52 }, (_, i) => i);
}

export function shuffle(cards, random = Math.random) {
  const out = cards.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function sortHand(hand) {
  return hand
    .slice()
    .sort((a, b) => suitOf(a) - suitOf(b) || rankOf(a) - rankOf(b));
}

/* ------------------------------------------------------------------ melds --- */

// Every set and run the hand could use. Sub-runs count: a five-card run can be
// worth breaking, and only the search below knows whether it is.
export function meldsIn(hand) {
  const melds = [];

  const byRank = new Map();
  for (const card of hand) {
    const rank = rankOf(card);
    if (!byRank.has(rank)) byRank.set(rank, []);
    byRank.get(rank).push(card);
  }
  for (const cards of byRank.values()) {
    if (cards.length < 3) continue;
    if (cards.length === 3) {
      melds.push(cards.slice());
      continue;
    }
    melds.push(cards.slice());
    for (let skip = 0; skip < cards.length; skip += 1) {
      melds.push(cards.filter((_, i) => i !== skip));
    }
  }

  for (let suit = 0; suit < 4; suit += 1) {
    const ranks = hand.filter((card) => suitOf(card) === suit).sort((a, b) => a - b);
    for (let i = 0; i < ranks.length; i += 1) {
      for (let j = i + 2; j < ranks.length; j += 1) {
        // contiguous means every step is exactly one
        let run = true;
        for (let k = i; k < j; k += 1) {
          if (ranks[k + 1] - ranks[k] !== 1) {
            run = false;
            break;
          }
        }
        if (run) melds.push(ranks.slice(i, j + 1));
      }
    }
  }

  return melds;
}

// The best a hand can be laid out: the melds that leave the least deadwood.
export function bestArrangement(hand) {
  const melds = meldsIn(hand);
  const index = new Map(hand.map((card, i) => [card, i]));
  const masks = melds.map((meld) => meld.reduce((m, card) => m | (1 << index.get(card)), 0));
  const total = hand.reduce((sum, card) => sum + valueOf(card), 0);

  let bestValue = total;
  let bestPicked = [];
  const seen = new Map();

  const walk = (from, used, picked, left) => {
    if (left < bestValue) {
      bestValue = left;
      bestPicked = picked.slice();
    }
    if (left === 0) return;
    const key = `${from}:${used}`;
    if (seen.get(key) <= left) return;
    seen.set(key, left);

    for (let i = from; i < melds.length; i += 1) {
      if (used & masks[i]) continue;
      const worth = melds[i].reduce((sum, card) => sum + valueOf(card), 0);
      picked.push(i);
      walk(i + 1, used | masks[i], picked, left - worth);
      picked.pop();
    }
  };

  walk(0, 0, [], total);

  const laid = bestPicked.map((i) => melds[i]);
  const inMeld = new Set(laid.flat());
  return {
    melds: laid,
    deadwood: hand.filter((card) => !inMeld.has(card)),
    value: bestValue,
  };
}

export const deadwoodValue = (hand) => bestArrangement(hand).value;

/* -------------------------------------------------------------- laying off --- */

// Whether a card extends one of these melds. A set takes the fourth of its
// rank; a run takes the card at either end.
export function extendsMeld(card, meld) {
  if (meld.length >= 3 && meld.every((c) => rankOf(c) === rankOf(meld[0]))) {
    return meld.length < 4 && rankOf(card) === rankOf(meld[0]);
  }
  if (suitOf(card) !== suitOf(meld[0])) return false;
  const ranks = meld.map(rankOf).sort((a, b) => a - b);
  const rank = rankOf(card);
  return rank === ranks[0] - 1 || rank === ranks[ranks.length - 1] + 1;
}

// The defender puts what it can onto the knocker's melds. A defender would
// always do this, so the engine does it rather than asking.
export function layOff(deadwood, melds) {
  const board = melds.map((meld) => meld.slice());
  const left = [];
  const placed = [];

  // biggest cards first: they are the ones worth getting rid of
  for (const card of deadwood.slice().sort((a, b) => valueOf(b) - valueOf(a))) {
    const target = board.find((meld) => extendsMeld(card, meld));
    if (target) {
      target.push(card);
      placed.push(card);
    } else {
      left.push(card);
    }
  }

  return { left, placed, value: left.reduce((sum, card) => sum + valueOf(card), 0) };
}

/* ---------------------------------------------------------------- scoring --- */

// Who scores what when somebody knocks. Gin is never laid off against.
export function scoreKnock(knockerHand, defenderHand) {
  const knocker = bestArrangement(knockerHand);
  const defender = bestArrangement(defenderHand);
  const gin = knocker.value === 0;

  const after = gin
    ? { left: defender.deadwood, placed: [], value: defender.value }
    : layOff(defender.deadwood, knocker.melds);

  if (gin) {
    return { winner: "knocker", points: after.value + GIN_BONUS, gin: true, laidOff: [] };
  }
  if (after.value > knocker.value) {
    return {
      winner: "knocker",
      points: after.value - knocker.value,
      gin: false,
      laidOff: after.placed,
    };
  }
  // level or better is an undercut, and it pays the defender
  return {
    winner: "defender",
    points: knocker.value - after.value + UNDERCUT_BONUS,
    gin: false,
    undercut: true,
    laidOff: after.placed,
  };
}

/* ------------------------------------------------------------------- deal --- */

export function deal(random = Math.random) {
  const cards = shuffle(deck(), random);
  return {
    hands: { a: sortHand(cards.slice(0, HAND)), b: sortHand(cards.slice(HAND, HAND * 2)) },
    discard: [cards[HAND * 2]],
    stock: cards.slice(HAND * 2 + 1),
  };
}

// Two cards left in the stock and nobody has knocked: the hand is dead.
export const STOCK_FLOOR = 2;

/* --------------------------------------------------------------- opponent --- */

// What the hand would be worth after taking this card and throwing the best one.
function afterTaking(hand, card) {
  const held = [...hand, card];
  let best = Infinity;
  let throwing = null;
  for (const out of held) {
    const value = deadwoodValue(held.filter((c) => c !== out));
    if (value < best) {
      best = value;
      throwing = out;
    }
  }
  return { value: best, discard: throwing };
}

export const LEVELS = [
  { id: "easy", label: "Loose", chaos: 0.45, knockAt: KNOCK_AT },
  { id: "fair", label: "Fair", chaos: 0.12, knockAt: KNOCK_AT },
  // holds out for a better hand early rather than knocking on ten
  { id: "sharp", label: "Sharp", chaos: 0, knockAt: KNOCK_AT, patient: true },
];

const setting = (level) => LEVELS.find((l) => l.id === level) || LEVELS[1];

// Take the upcard only if it actually helps.
export function wantsUpcard(hand, upcard, level) {
  const rule = setting(level);
  if (rule.chaos && Math.random() < rule.chaos) return Math.random() < 0.5;
  return afterTaking(hand, upcard).value < deadwoodValue(hand);
}

// Throw whatever leaves the least behind, and the biggest card when it makes no
// difference.
export function bestDiscard(hand, level) {
  const rule = setting(level);
  if (rule.chaos && Math.random() < rule.chaos) {
    return hand[Math.floor(Math.random() * hand.length)];
  }

  let best = Infinity;
  let picks = [];
  for (const card of hand) {
    const value = deadwoodValue(hand.filter((c) => c !== card));
    if (value < best) {
      best = value;
      picks = [card];
    } else if (value === best) {
      picks.push(card);
    }
  }
  return picks.sort((a, b) => valueOf(b) - valueOf(a))[0];
}

// Knocking on ten early hands the other side an undercut. Sharp waits.
export function shouldKnock(hand, level, turnsPlayed) {
  const rule = setting(level);
  const value = deadwoodValue(hand);
  if (value === 0) return true;
  if (value > rule.knockAt) return false;
  if (rule.patient && turnsPlayed < 6 && value > 4) return false;
  if (rule.chaos && Math.random() < rule.chaos) return false;
  return true;
}
