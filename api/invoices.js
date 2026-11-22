import { route } from './_lib.js';

const LIMIT = 200;
const STR_FIELDS = ['firm','firmCustom','firmName','gstin','phone','invNo','date','customer','tn','toText','consType','consPlace',
  'consText','consDate1','consDate2','qty','poleRate','spec','chart','km','from','to','tcRate','tcNo','tcDate','taxMode','layout'];
const BOOL_FIELDS = ['incGoods','incTc','minC','tcRateManual'];

// Keep only known fields, as capped strings/booleans, so one bad record can't break the app.
function cleanData(d) {
  const out = {};
  for (const k of STR_FIELDS) out[k] = d[k] == null ? '' : String(d[k]).slice(0, k.endsWith('Text') ? 1000 : 200);
  for (const k of BOOL_FIELDS) out[k] = !!d[k];
  if (!['round', 'trunc'].includes(out.taxMode)) out.taxMode = 'round';
  if (!['p1', 'l2', 'p2'].includes(out.layout)) out.layout = 'p1';
  if (!['A', 'B'].includes(out.chart)) out.chart = 'A';
  return out;
}

export default route(async (req, res, sql) => {
  if (req.method === 'GET') {
    const rows = await sql`SELECT id, firm, invoice_no, invoice_date, updated_at, data
                           FROM invoices ORDER BY updated_at DESC LIMIT ${LIMIT}`;
    res.setHeader('X-Limit', String(LIMIT));
    return res.json(rows);
  }
  if (req.method === 'POST') {
    const { id, data: raw } = req.body ?? {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return res.status(400).json({ error: 'data required' });
    if (id != null && id !== '' && (!Number.isInteger(Number(id)) || Number(id) <= 0)) return res.status(400).json({ error: 'Invalid id' });
    const data = cleanData(raw);
    const firm = (data.firmName || (data.firm === '__custom__' ? data.firmCustom : data.firm)).slice(0, 200);
    const no = data.invNo.slice(0, 100);
    const date = data.date.slice(0, 50);
    const json = JSON.stringify({ ...data, firmName: firm });
    let rows;
    if (id != null && id !== '') {
      rows = await sql`UPDATE invoices SET firm=${firm}, invoice_no=${no}, invoice_date=${date},
                         data=${json}::jsonb, updated_at=now()
                       WHERE id=${Number(id)} RETURNING id`;
      if (!rows.length) return res.status(404).json({ error: 'Invoice not found' });
    } else {
      rows = await sql`INSERT INTO invoices (firm, invoice_no, invoice_date, data)
                       VALUES (${firm}, ${no}, ${date}, ${json}::jsonb) RETURNING id`;
    }
    return res.json({ id: rows[0].id });
  }
  res.setHeader('Allow', 'GET, POST').status(405).json({ error: 'Method not allowed' });
});
