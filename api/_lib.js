import { neon } from '@neondatabase/serverless';

let sql;
let ready;

export function db() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  return (sql ??= neon(process.env.DATABASE_URL));
}

// Creates tables on first use (cheap no-op afterwards).
export function ensureSchema() {
  return (ready ??= (async () => {
    const q = db();
    await q`CREATE TABLE IF NOT EXISTS invoices (
      id SERIAL PRIMARY KEY,
      firm TEXT NOT NULL DEFAULT '',
      invoice_no TEXT NOT NULL DEFAULT '',
      invoice_date TEXT NOT NULL DEFAULT '',
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
    await q`CREATE TABLE IF NOT EXISTS firm_profiles (
      firm TEXT PRIMARY KEY,
      gstin TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT ''
    )`;
  })().catch(e => { ready = undefined; throw e; }));
}

// Wraps a handler: creates schema, maps errors to JSON.
export function route(handler) {
  return async (req, res) => {
    try {
      await ensureSchema();
      await handler(req, res, db());
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error' });
    }
  };
}
