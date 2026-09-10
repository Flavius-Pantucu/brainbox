// Read .env when we are not inside Next, which loads it itself. Only the
// drizzle CLI and one-off scripts need this.
import { readFileSync } from "node:fs";

try {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const at = line.indexOf("=");
    if (at < 1 || line.trimStart().startsWith("#")) continue;
    const key = line.slice(0, at).trim();
    // `in`, not truthiness: FOO="" is a deliberate "unset this", and the file
    // must not quietly put the value back.
    if (key in process.env) continue;
    process.env[key] = line
      .slice(at + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
} catch {
  // no .env is fine; the environment may already carry everything
}
