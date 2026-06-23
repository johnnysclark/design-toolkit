// crit-board — filesystem layout. The single source of truth for where data lives.
//
// All persistent state (the SQLite DB + uploaded images) lives under DATA_DIR.
// In production DATA_DIR MUST be a mounted persistent disk (e.g. /data), or images
// and the database are wiped on every redeploy. See README.
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

export const DATA_DIR = resolve(process.env.DATA_DIR || join(HERE, "data"));
export const DB_PATH = join(DATA_DIR, "board.db");
export const UPLOADS_DIR = join(DATA_DIR, "uploads");
export const PUBLIC_DIR = join(HERE, "public");

// Ensure the data directories exist on import (also used by the seed script).
mkdirSync(UPLOADS_DIR, { recursive: true }); // creates DATA_DIR too
