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

// Run a parameterized query. Returns the pg result; callers read `.rows`.
export function query(text, params) {
  return pool.query(text, params);
}

// Convenience: first row or null.
export async function one(text, params) {
  const { rows } = await pool.query(text, params);
  return rows[0] || null;
}

// Run fn inside a transaction with a dedicated client.
export async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
