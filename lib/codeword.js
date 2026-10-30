// Codeword: find a hidden word. Each guess is scored with two numbers only —
// how many of its letters stand in the right place, and how many more are in
// the word somewhere else — the old pen-and-paper "bulls and cows" read on
// words. Which letters those are is for the player to work out.
//
// Answers come from the hand-picked common words below. Guesses are checked
// against a dictionary built from Webster's Second (public domain, the BSD
// `web2` list) and served from public/words/, fetched only when a game starts.

export const LEVELS = [
  { id: "easy", label: "4 letters", length: 4, guesses: 12 },
  { id: "medium", label: "5 letters", length: 5, guesses: 12 },
  { id: "hard", label: "6 letters", length: 6, guesses: 12 },
];

export const levelOf = (id) => LEVELS.find((l) => l.id === id) || LEVELS[1];

const COMMON = `
able acid aged also area army away baby back ball band bank base bath bear beat bell belt best
bird blow blue boat body bone book born both bowl burn bush busy cake call calm came camp card
care cart case cash cast cell chat chip city clay club coal coat code cold come cook cool copy
cord core corn cost crew crop dark data date dawn deal dear debt deck deep deer desk dial diet
dirt dish dock door dose down draw drop drum duck dust duty each earn ease east easy edge even
ever exit face fact fade fair fall farm fast fate fear feed feel fern file fill film find fine
fire firm fish five flag flat flow foam fold folk food foot form fort four free frog fuel full
fund gain game gate gear gift girl give glad glow glue goal gold golf good grab gray grew grid
grin grip grow gulf hair half hall hand hang hard harm hate have head heal heap hear heat held
help herb hero hide high hill hint hire hold hole home hope horn host hour huge hunt idea inch
iron item jazz join joke jump jury keen keep kind king kite knee knot know lace lady lake lamp
land lane last late lawn lead leaf lean left lend lens life lift like lime line link lion list
live load loan lock loft long look loop lord lose loud love luck lung made mail main make many
mark mask mass meal mean meat meet melt menu mild milk mind mine mint miss mist mode mood moon
more moss most move much must nail name near neat neck need nest news next nice nine none noon
nose note oven over pace pack page paid pain pair palm park part pass past path peak pear pick
pile pine pink pipe plan play plot plug plum poem poet pole pond pool poor port pose post pour
pull pump pure push quiz race rain rank rare rate read real rely rest rice rich ride ring rise
risk road rock role roll roof room root rope rose rule rush safe sail salt same sand save seal
seat seed seek self sell send ship shoe shop shot show shut side sign silk sing sink site size
skin slow snow soap sock soft soil sold sole song soon sort soul soup spin spot star stay step
stir stop suit sure swim tail take tale talk tall tank tape task team tear tell tent term test
text than then thin tide tile time tiny tone tool tour town tree trip true tube tune turn twin
type unit upon vast verb very vine vote wage wait wake walk wall want warm wash wave weak wear
week well west wide wife wild wind wine wing wire wise wish wolf wood wool word work yard yarn
year zero zone

about above actor acute adopt adult after again agent agree ahead alarm album alert alike alive
allow alone along alter amber among angle angry apple apply arena argue arise armor aside asset
audio avoid awake award aware badge baker basic beach beard beast begin bench berry birth black
blade blame blank blast blend bless blind block bloom board boast bonus boost brain brake brand
brave bread break brick bride brief bring broad brook brown brush build bunch burst cabin cable
camel candy cargo carry catch cause chain chair chalk charm chart chase cheap check cheek chess
chest chief child chill choir civic claim class clean clear clerk click cliff climb clock close
cloth cloud coach coast coral couch count court cover craft crane crash cream crisp crowd crown
crust curve cycle daily dairy dance delay depth diary dodge doubt dough draft drain drama dream
dress drift drink drive eager early earth eight elbow elder empty enjoy enter equal error essay
event exact exist extra fable faint faith false fancy feast fence ferry fever field fifth fifty
fight final flame flash fleet flock flood floor flour fluid focus force forge forth forum found
frame fresh front frost fruit funny giant glass globe glory glove grace grade grain grand grant
grape graph grass great green greet grief grill group guard guess guest guide habit happy harsh
heart heavy hedge honey horse hotel house human humor hurry ideal image index inner input irony
issue ivory jelly jewel joint judge juice knife knock label labor laser later laugh layer learn
lemon level lever light limit linen local lodge logic loose lucky lunar lunch magic major maple
march match mayor medal metal meter might minor model money month moral motor mount mouse mouth
movie music naval nerve never night noble noise north novel nurse ocean offer often olive onion
opera orbit order organ other otter outer owner paint panel paper party pasta patch pause peace
pearl pedal penny phase phone photo piano piece pilot pitch pizza place plain plane plant plate
plaza point polar porch pound power press price pride prime print prize proof proud pulse punch
pupil quiet quilt quite radar radio raise rally range rapid raven reach ready realm rebel relax
reply rider ridge right rival river roast robin robot rocky round route royal ruler rural salad
sauce scale scarf scene scent scout screw sense serve seven shade shake shape share shark sharp
sheep sheet shelf shell shift shine shirt shock shore short shout sight skill skirt slate sleep
slice slide slope small smart smile smoke snack snake solar solid solve sound south space spare
spark speak speed spell spend spice spine spoon sport spray squad stack staff stage stair stamp
stand start state steam steel steep stick still stone stool store storm story stove straw strip
study style sugar suite sunny super swamp sweet swift sword table taste teach thank theme thick
thing think third thumb tiger title toast today topic torch total touch tower trace track trade
trail train treat trend trial tribe trick truck truly trunk trust truth tulip twist uncle under
unity upper upset urban usual valid value vapor vault video visit vital vivid vocal voice wagon
waste watch water whale wheat wheel while white whole woman world worry worth wrist write yacht
yield young youth zebra

absorb accent accept access action active actual advice afford almost always amount animal answer
anyway appeal appear arctic around arrive artist aspect assist attach attend autumn bakery ballet
banana barrel basket battle beauty become before behind belief better beyond bishop bottle bounce
branch breath bridge bright broken bronze bubble bucket budget burden butter button camera candle
canvas carbon carpet castle casual cattle center cereal chance change charge cheese cherry choice
choose church circle circus client clinic closet coffee collar colony column combat comedy common
copper corner cotton county couple course cousin create credit crisis custom damage danger dealer
debate decade decide defend degree demand depend desert design detail device dinner direct divide
doctor dollar donkey double dragon drawer driver during easily editor effect effort eighty either
eleven empire enable energy engine enough entire escape estate evolve exceed except excuse expand
expect expert export extend fabric factor family famous farmer father fellow figure finger finish
flight flower follow forest forget formal fossil friend frozen future galaxy garage garden garlic
gentle ginger glance golden govern ground growth guitar hammer handle harbor health heaven height
helmet hidden honest hunger hunter impact income indeed inform injury insect inside invite island
jacket jungle junior kettle kidney kitten ladder launch lawyer leader legend lesson letter liquid
listen little lizard locker manner marble margin market master matter meadow medium memory mental
middle mirror mobile modern moment monkey mother motion museum muscle narrow nation native nature
nearby needle nephew number object office oyster palace parade parent pencil people pepper period
permit person pickle planet player please plenty pocket poetry polish potato powder prefer pretty
prince prison profit public puzzle rabbit racket random reason record reduce reform refuse region
relief remain remote repair repeat report rescue result return reward rhythm ribbon rocket rubber
saddle safety salmon sample school screen script season second secret select senior series settle
shadow shield shower signal silent silver simple singer sister sketch slight smooth soccer social
source spider spirit spread spring square stable statue steady stream street stress strike string
strong studio submit sudden summer summit supply survey switch symbol system tablet talent target
temple tennis thirty thread throat ticket timber tomato tongue toward travel treaty tunnel turtle
twelve unique update valley velvet vessel viewer violin visual volume walnut wander warmth weekly
weight window winner winter wizard wonder wooden worker writer yellow
`
  .split(/\s+/)
  .filter(Boolean);

export const ANSWERS = Object.fromEntries(
  LEVELS.map((l) => [l.length, [...new Set(COMMON.filter((w) => w.length === l.length))]])
);

export function pick(levelId, random = Math.random) {
  const { length } = levelOf(levelId);
  const list = ANSWERS[length];
  return list[Math.floor(random() * list.length)];
}

// How many letters of `guess` stand where they stand in `secret`, and how many
// more are in `secret` somewhere else. Repeated letters count as often as both
// words hold them, no more.
export function score(secret, guess) {
  let inPlace = 0;
  const left = {};
  const tried = {};
  for (let i = 0; i < secret.length; i += 1) {
    if (guess[i] === secret[i]) inPlace += 1;
    else {
      left[secret[i]] = (left[secret[i]] || 0) + 1;
      tried[guess[i]] = (tried[guess[i]] || 0) + 1;
    }
  }
  let elsewhere = 0;
  for (const letter of Object.keys(tried)) elsewhere += Math.min(tried[letter], left[letter] || 0);
  return { inPlace, elsewhere };
}

// The dictionary lists base forms only, so a plural or a past tense of a word
// it holds is a word too.
export function isWord(word, dictionary, answers = []) {
  if (answers.includes(word) || dictionary.has(word)) return true;
  const stems = [];
  if (word.endsWith("s")) stems.push(word.slice(0, -1));
  if (word.endsWith("es")) stems.push(word.slice(0, -2));
  if (word.endsWith("ed")) stems.push(word.slice(0, -1), word.slice(0, -2));
  return stems.some((stem) => stem.length >= 3 && dictionary.has(stem));
}

const loaded = new Map();

// One fetch per length per visit; the file is about 50 KB for five letters.
// The stems of a plural are one letter shorter, so a length loads with the
// list below it as well.
export function loadDictionary(length) {
  if (!loaded.has(length)) {
    const one = (n) =>
      fetch(`/words/${n}.txt`)
        .then((res) => (res.ok ? res.text() : Promise.reject(new Error(`words ${n}`))))
        .then((text) => text.split("\n").filter(Boolean));
    loaded.set(
      length,
      Promise.all([one(length), one(length - 1).catch(() => []), one(length - 2).catch(() => [])])
        .then((lists) => new Set(lists.flat()))
        .catch(() => {
          loaded.delete(length);
          return null;
        })
    );
  }
  return loaded.get(length);
}

// What a score proves about letters, without any guessing: a guess that
// scores nothing rules all its letters out, and a guess whose two numbers add
// up to the word's length holds exactly the word's letters.
export function deduce(guess, { inPlace, elsewhere }) {
  if (inPlace + elsewhere === 0) return { out: [...new Set(guess)], in: [] };
  if (inPlace + elsewhere === guess.length) return { out: [], in: [...new Set(guess)] };
  return { out: [], in: [] };
}
