// Apply schema.sql, then seed a class from CLASS_CODE so students can join on
// first boot. Idempotent — runs on every deploy via `npm run migrate && npm start`.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { pool, query } from "./db.js";

const here = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const sql = await readFile(join(here, "schema.sql"), "utf8");
  await query(sql);
  console.log("✓ schema applied");

  const code = process.env.CLASS_CODE;
  if (code) {
    const name = process.env.CLASS_NAME || "Class";
    await query(
      `INSERT INTO class_sessions (class_code, name)
       VALUES ($1, $2)
       ON CONFLICT (class_code) DO UPDATE SET name = EXCLUDED.name`,
      [code.trim(), name]
    );
    console.log(`✓ class seeded: ${code}`);
  } else {
    console.log("• CLASS_CODE not set — no class seeded");
  }
}

migrate()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("migration failed:", err.message);
    process.exit(1);
  });
