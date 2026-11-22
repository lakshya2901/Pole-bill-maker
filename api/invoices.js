import { route } from './_lib.js';

export default route(async (req, res, sql) => {
  if (req.method === 'GET') {
    const rows = await sql`SELECT id, firm, invoice_no, invoice_date, updated_at, data
                           FROM invoices ORDER BY updated_at DESC LIMIT 200`;
    return res.json(rows);
  }
  if (req.method === 'POST') {
    const { id, data } = req.body ?? {};
    if (!data || typeof data !== 'object') return res.status(400).json({ error: 'data required' });
    const firm = String(data.firmName ?? '').slice(0, 200);
    const no = String(data.invNo ?? '').slice(0, 100);
    const date = String(data.date ?? '').slice(0, 50);
    let rows;
    if (id) {
      rows = await sql`UPDATE invoices SET firm=${firm}, invoice_no=${no}, invoice_date=${date},
                         data=${JSON.stringify(data)}::jsonb, updated_at=now()
                       WHERE id=${Number(id)} RETURNING id`;
      if (!rows.length) return res.status(404).json({ error: 'Invoice not found' });
    } else {
      rows = await sql`INSERT INTO invoices (firm, invoice_no, invoice_date, data)
                       VALUES (${firm}, ${no}, ${date}, ${JSON.stringify(data)}::jsonb) RETURNING id`;
    }
    return res.json({ id: rows[0].id });
  }
  res.setHeader('Allow', 'GET, POST').status(405).json({ error: 'Method not allowed' });
});
