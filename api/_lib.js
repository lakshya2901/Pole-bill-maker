import { neon } from '@neondatabase/serverless';

let sql;
let ready;

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function db() {
  if (!process.env.DATABASE_URL) throw new HttpError(503, 'Database is not configured (DATABASE_URL missing)');
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
    // One saved bill per (firm, invoice number). Skipped (with a warning) if old data already has duplicates.
    try {
      await q`CREATE UNIQUE INDEX IF NOT EXISTS invoices_firm_no_uniq ON invoices (firm, invoice_no) WHERE invoice_no <> ''`;
    } catch (e) {
      console.warn('Could not create unique index on (firm, invoice_no) — existing duplicates?', e.message);
    }
  })().catch(e => { ready = undefined; throw e; }));
}

// Wraps a handler: creates schema, maps errors to JSON with a sensible status.
export function route(handler) {
  return async (req, res) => {
    try {
      await ensureSchema();
      await handler(req, res, db());
    } catch (e) {
      const where = `${req.method} ${req.url}`;
      if (e instanceof HttpError) {
        if (e.status >= 500) console.error(where, e);
        return res.status(e.status).json({ error: e.message });
      }
      if (e?.code === '23505') return res.status(409).json({ error: 'A bill with this invoice number already exists for this firm' });
      console.error(where, e);
      res.status(500).json({ error: 'Server error' });
    }
  };
}
