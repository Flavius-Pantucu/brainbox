// Two libraries the browser loads from /public rather than from the bundle,
// copied here at install time so no commit has to carry them.
//
// Stockfish, because it is a worker script next to a 7 MB wasm binary.
//
// Ably, for a duller reason: its build uses an arrow function that closes over
// super(), and SWC downlevelling that produces a super() outside a method,
// which webpack will not parse. That happens in `next dev` whatever the
// browserslist says. Loading the UMD build with a script tag keeps the bundler
// out of it entirely — and it is only fetched when somebody opens a room.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

const JOBS = [
  {
    name: "engine",
    from: path.join(root, "node_modules", "stockfish", "bin"),
    to: path.join(root, "public", "engine"),
    files: ["stockfish-18-lite-single.js", "stockfish-18-lite-single.wasm"],
    missing: "the bot and the eval bar will not load",
  },
  {
    name: "live",
    from: path.join(root, "node_modules", "ably", "build"),
    to: path.join(root, "public", "live"),
    files: ["ably.min.js"],
    missing: "rooms will poll instead of being pushed to",
  },
];

for (const job of JOBS) {
  fs.mkdirSync(job.to, { recursive: true });
  for (const file of job.files) {
    const source = path.join(job.from, file);
    if (!fs.existsSync(source)) {
      console.warn(`[${job.name}] ${file} is missing — ${job.missing}.`);
      continue;
    }
    fs.copyFileSync(source, path.join(job.to, file));
  }
}
