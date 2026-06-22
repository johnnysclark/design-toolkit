// Postgres access — a single pooled connection, raw parameterized SQL, no ORM.
// Matches the "read the code, no heavy framework" ethos of the existing tools.
//
// Render's managed Postgres requires SSL; local Postgres does not. We sniff the
// host and enable SSL for anything that isn't localhost.

import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn(
    "\n⚠  DATABASE_URL is not set. The server will start but any DB call will fail.\n" +
      "   Set e.g.  DATABASE_URL=postgres://localhost:5432/workshop\n"
  );
}

const isRemote =
  !!connectionString &&
  !/@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);

export const pool = new Pool({
  connectionString,
  ssl: isRemote ? { rejectUnauthorized: false } : undefined
});

// An idle backend connection can die (DB restart, network blip, Render Postgres
// maintenance). Without a listener pg's 'error' event would crash the process.
pool.on("error", (err) => {
  console.error("idle pg client error (ignored, pool will recover):", err.message);
});

// Run a parameterized query. Returns the pg result; callers read `.rows`.
export function query(text, params) {
  return pool.query(text, params);
}

// Convenience: first row or null.
export async function one(text, params) {
  const { rows } = await pool.query(text, params);
  return rows[0] || null;
}
