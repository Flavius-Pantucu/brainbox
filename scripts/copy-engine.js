// Stockfish ships as a worker script next to a 7 MB wasm binary. The browser
// loads both from /public, and they are far too big to keep in git, so the
// install step puts them there instead of a commit doing it.
const fs = require("fs");
const path = require("path");

const FILES = ["stockfish-18-lite-single.js", "stockfish-18-lite-single.wasm"];
const from = path.join(__dirname, "..", "node_modules", "stockfish", "bin");
const to = path.join(__dirname, "..", "public", "engine");

fs.mkdirSync(to, { recursive: true });

for (const file of FILES) {
  const source = path.join(from, file);
  if (!fs.existsSync(source)) {
    console.warn(`[engine] ${file} is missing — the bot and the eval bar will not load.`);
    continue;
  }
  fs.copyFileSync(source, path.join(to, file));
}
