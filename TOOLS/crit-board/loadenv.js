// crit-board — minimal .env loader (zero dependency).
//
// Reads KEY=VALUE lines from a .env file next to this module and sets process.env
// for any key NOT already set (real environment variables always win — which is what
// you want on a hosting platform where env vars are injected and no .env is shipped).
// Import this FIRST in entrypoints so config is in place before other modules read it.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const envPath = join(dirname(fileURLToPath(import.meta.url)), ".env");
try {
  for (const raw of readFileSync(envPath, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key && !(key in process.env)) process.env[key] = val;
  }
} catch {
  // No .env file — rely on real environment variables (the production path).
}
