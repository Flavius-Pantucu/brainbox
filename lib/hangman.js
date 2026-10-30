// Hangman: a hidden word, its category for a clue, and six wrong letters
// before the figure is finished. Words are hand-picked from eight categories.
//
// Length sets the difficulty, and backwards from what one would think: a long
// word has many letters to land on, so it gives itself away; a short one gives
// almost nothing, so it is the hard one.

export const LIVES = 6;

export const LEVELS = [
  { id: "easy", label: "Easy", min: 8, max: 99 },
  { id: "medium", label: "Medium", min: 6, max: 7 },
  { id: "hard", label: "Hard", min: 3, max: 5 },
];

export const levelOf = (id) => LEVELS.find((l) => l.id === id) || LEVELS[1];

export const CATEGORIES = {
  Animals: `cat dog owl fox bear wolf deer frog lion duck goat seal crab zebra tiger horse camel otter
    panda koala shark whale eagle raven moose bison rabbit turtle monkey donkey parrot beaver badger
    falcon jaguar lizard salmon spider giraffe penguin dolphin octopus hamster leopard buffalo cheetah
    gorilla lobster peacock kangaroo elephant flamingo squirrel antelope crocodile butterfly armadillo
    chameleon porcupine hedgehog tortoise ostrich pelican walrus`,
  Food: `pie jam egg rice soup cake bread pasta pizza salad lemon mango olive onion bacon toast honey
    sushi waffle muffin cookie noodle pepper carrot cheese butter garlic potato tomato pretzel biscuit
    pancake popcorn avocado broccoli sandwich dumpling meatball cucumber pineapple croissant spaghetti
    chocolate blueberry marshmallow watermelon strawberry`,
  Sports: `golf polo judo chess rugby hockey tennis soccer boxing skiing rowing karate fencing archery
    cycling cricket sailing bowling surfing climbing baseball football handball lacrosse marathon
    swimming volleyball badminton gymnastics basketball skateboarding`,
  Instruments: `drum harp flute tuba banjo cello organ piano bugle guitar violin trumpet ukulele
    clarinet trombone accordion xylophone saxophone harmonica bagpipes tambourine harpsichord`,
  Weather: `fog rain snow hail mist wind storm cloud frost flood breeze sleet thunder tornado rainbow
    drizzle blizzard drought monsoon lightning hurricane avalanche`,
  Jobs: `chef cook nurse pilot judge baker clerk farmer doctor dentist lawyer artist sailor plumber
    teacher painter surgeon soldier cashier janitor architect astronaut carpenter scientist librarian
    detective firefighter electrician`,
  Home: `cup mug bed sofa lamp door desk fork oven sink chair table shelf spoon towel pillow mirror
    carpet candle teapot kettle blanket curtain cushion toaster drawer bathtub wardrobe dishwasher
    refrigerator`,
  Places: `farm park city port lake beach cliff river ocean forest desert valley island castle harbor
    museum airport library village volcano canyon glacier mountain stadium lighthouse`,
};

const WORDS = Object.entries(CATEGORIES).flatMap(([category, list]) =>
  list
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => ({ word, category }))
);

export function poolFor(levelId) {
  const { min, max } = levelOf(levelId);
  return WORDS.filter(({ word }) => word.length >= min && word.length <= max);
}

// Never the same word twice in a row.
export function pick(levelId, last = null, random = Math.random) {
  const pool = poolFor(levelId).filter(({ word }) => word !== last);
  return pool[Math.floor(random() * pool.length)];
}

export const misses = (word, guessed) => [...guessed].filter((l) => !word.includes(l)).length;

export const isWon = (word, guessed) => [...word].every((l) => guessed.has(l));
