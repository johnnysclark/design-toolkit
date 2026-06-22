// Archive-level config: the editable controlled vocabulary of entry `type`s.
// Stored in .precedent/config.json so it travels with the archive and stays
// inspectable. Created with sensible defaults on first run.

import { readFile, writeFile } from "node:fs/promises";
import {
  SCHEMA_VERSION, PRECEDENT_DIR, CONFIG_FILE, resolveInArchive, ensureDir
} from "./archive.js";

export const DEFAULT_TYPES = [
  "precedent", "project", "detail", "material",
  "diagram", "reference", "screenshot", "inspiration"
];

export async function loadConfig() {
  try {
    const raw = await readFile(resolveInArchive(CONFIG_FILE), "utf8");
    const cfg = JSON.parse(raw);
    const types = Array.isArray(cfg.types) && cfg.types.length ? cfg.types : DEFAULT_TYPES;
    return { ...cfg, schemaVersion: SCHEMA_VERSION, types };
  } catch {
    const cfg = { schemaVersion: SCHEMA_VERSION, types: DEFAULT_TYPES };
    await saveConfig(cfg);
    return cfg;
  }
}

export async function saveConfig(cfg) {
  await ensureDir(resolveInArchive(PRECEDENT_DIR));
  await writeFile(resolveInArchive(CONFIG_FILE), JSON.stringify(cfg, null, 2) + "\n");
}

export async function setTypes(types) {
  const cfg = await loadConfig();
  cfg.types = [...new Set((types || []).map((s) => String(s).trim()).filter(Boolean))];
  if (!cfg.types.length) cfg.types = DEFAULT_TYPES;
  await saveConfig(cfg);
  return cfg.types;
}
