// Add a class code by hand:  node lib/seed.js CODE "Class name"
// Useful for running more than one studio section off one deployment.

import { pool, query } from "./db.js";

const [code, name = "Class"] = process.argv.slice(2);

if (!code) {
  console.error('usage: node lib/seed.js <class_code> ["Class name"]');
  process.exit(1);
}

query(
  `INSERT INTO class_sessions (class_code, name)
   VALUES ($1, $2)
   ON CONFLICT (class_code) DO UPDATE SET name = EXCLUDED.name`,
  [code.trim(), name]
)
  .then(() => console.log(`✓ class ready: ${code}`))
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("seed failed:", err.message);
    process.exit(1);
  });
