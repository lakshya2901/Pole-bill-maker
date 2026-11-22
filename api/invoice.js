import { route } from './_lib.js';

// GET /api/invoice?id=1  |  DELETE /api/invoice?id=1
export default route(async (req, res, sql) => {
  const id = Number(req.query.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id required' });
  if (req.method === 'GET') {
    const rows = await sql`SELECT id, data FROM invoices WHERE id=${id}`;
    return rows.length ? res.json(rows[0]) : res.status(404).json({ error: 'Not found' });
  }
  if (req.method === 'DELETE') {
    const rows = await sql`DELETE FROM invoices WHERE id=${id} RETURNING id`;
    return rows.length ? res.json({ ok: true }) : res.status(404).json({ error: 'Not found (already deleted?)' });
  }
  res.setHeader('Allow', 'GET, DELETE').status(405).json({ error: 'Method not allowed' });
});
