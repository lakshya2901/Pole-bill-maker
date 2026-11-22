import { route } from './_lib.js';

export default route(async (req, res, sql) => {
  if (req.method === 'GET') {
    return res.json(await sql`SELECT firm, gstin, phone FROM firm_profiles`);
  }
  if (req.method === 'PUT') {
    const { firm, gstin = '', phone = '' } = req.body ?? {};
    if (!firm || typeof firm !== 'string') return res.status(400).json({ error: 'firm required' });
    await sql`INSERT INTO firm_profiles (firm, gstin, phone) VALUES (${firm}, ${String(gstin)}, ${String(phone)})
              ON CONFLICT (firm) DO UPDATE SET gstin=EXCLUDED.gstin, phone=EXCLUDED.phone`;
    return res.json({ ok: true });
  }
  res.setHeader('Allow', 'GET, PUT').status(405).json({ error: 'Method not allowed' });
});
