/* ================= Transport rate charts (Rs per pole) =================
   Built from the printed transport lists. Each chart: Min C, then a fixed
   increment per KM that changes at slab boundaries. All values in paise. */
function buildChart(minC, slabs) {
  const r = { 'Min C': Math.round(minC * 100) };
  let prev = r['Min C'];
  for (let km = 1; km <= 400; km++) {
    const slab = slabs.find(s => km <= s[0]);
    prev += Math.round(slab[1] * 100);
    r[km] = prev;
  }
  return r;
}
const CHARTS = {
  A: buildChart(76.95, [[25,1.05],[50,2.11],[100,2.36],[200,2.61],[400,2.20]]),
  B: buildChart(85.05, [[25,1.18],[50,3.56],[100,3.28],[200,2.97],[250,2.87],[400,2.36]])
};

/* ================= Helpers ================= */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const ONES = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const TENS = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
function below100(n){ return n<20 ? ONES[n] : TENS[Math.floor(n/10)] + (n%10 ? ' '+ONES[n%10] : ''); }
function below1000(n){ const h=Math.floor(n/100), r=n%100; return (h? ONES[h]+' Hundred'+(r?' ':''):'') + (r?below100(r):''); }
function words(n) { // Indian numbering
  n = Math.floor(n); if (n === 0) return 'Zero';
  const parts = [];
  const crore = Math.floor(n/10000000); n %= 10000000;
  const lakh = Math.floor(n/100000); n %= 100000;
  const thou = Math.floor(n/1000); n %= 1000;
  if (crore) parts.push(below1000(crore)+' Crore');
  if (lakh) parts.push(below100(lakh)+' Lakh');
  if (thou) parts.push(below100(thou)+' Thousand');
  if (n) parts.push(below1000(n));
  return parts.join(' ');
}
const rsPart = p => String(Math.floor(p/100));
const pPart = p => String(p%100).padStart(2,'0');
const fmt = p => '₹ ' + (p/100).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});

/* ================= State ================= */
const FIRMS = ['Gaurav Cement Works','Peeyush Cement Works','Babel Cement','Babel Udhyog','Babel Poles'];
const FIRM_GSTIN = {
  'Gaurav Cement Works':'08AHWPB2206Q1ZX',
  'Peeyush Cement Works':'08BXPPB8953C1Z9',
  'Babel Cement':'08AGKPB8389F1Z2',
  'Babel Udhyog':'08ACQPB4258F1ZK',
  'Babel Poles':'08CFIPB2304B2Z8'
};
const FIRM_PHONE = {
  'Gaurav Cement Works':'94142 59198',
  'Peeyush Cement Works':'94619 80801',
  'Babel Cement':'70147 36433',
  'Babel Udhyog':'80056 96021',
  'Babel Poles':'94601 94198'
};
const CUSTOMERS = {
  AVVNL:  { city:'Ajmer',   gstin:'08AACCA8562E1ZP' },
  JDVVNL: { city:'Jodhpur', gstin:'08AAACJ8578R1ZJ' }
};
const toTextFor = (c, tn) => `The Sr..A.O.(CPC)\n${c},${CUSTOMERS[c].city}\nGSTIN:-${CUSTOMERS[c].gstin}\n${c}/SE(MM)TN-${tn}`;
const consTextFor = (c, type, place) => `THE AEN (${type})\n${c} ${place}`;
const CUSTOM = '__custom__';
const FIELDS = ['firm','firmCustom','gstin','phone','invNo','date','customer','tn','toText','consType','consPlace','consText','consDate1','consDate2','qty','poleRate','spec','chart','km','from','to','tcRate','tcNo','tcDate','taxMode','layout'];
const CHECKS = ['incGoods','incTc'];
const today = (() => { const d=new Date(); const p=n=>String(n).padStart(2,'0'); return `${p(d.getDate())}.${p(d.getMonth()+1)}.${String(d.getFullYear()).slice(2)}`; })();
const DEFAULTS = {
  firm:'Babel Cement', firmCustom:'', gstin:'', phone:'', invNo:'', date:today,
  customer:'AVVNL', tn:'', consType:'Rural', consPlace:'Kuchaman',
  toText:toTextFor('AVVNL',''),
  consText:consTextFor('AVVNL','Rural','Kuchaman'), consDate1:'', consDate2:'',
  qty:'', poleRate:'', spec:'9 mtr 200 kg', chart:'A', km:'', from:'Delwara', to:'Kuchaman',
  tcRate:'', tcNo:'', tcDate:'', taxMode:'round', layout:'p1', incGoods:true, incTc:true
};
let state = Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem('billState') || '{}'));
let minC = JSON.parse(localStorage.getItem('billMinC') || 'false');
let tcRateManual = !!state.tcRateManual;            // user typed their own transport rate
let profiles = JSON.parse(localStorage.getItem('billProfiles') || '{}'); // gstin/phone per firm
if (!profiles['Babel Cement']) profiles['Babel Cement'] = { gstin:'08AGKPB8389F1Z2', phone:'94142-59198' };

const FIRM_SHORT = { 'Gaurav Cement Works':'GCW', 'Peeyush Cement Works':'PCW', 'Babel Cement':'BCW' };
function firmShort() {
  const f = firmName().trim();
  return FIRM_SHORT[f] || f.split(/\s+/).map(w => w[0] || '').join('').toUpperCase();
}
function fileBase() { return `${firmShort()} ${state.invNo || 'draft'}`.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_'); }
function printNamed() {
  const old = document.title; document.title = fileBase();
  const restore = () => { document.title = old; window.removeEventListener('afterprint', restore); };
  window.addEventListener('afterprint', restore);
  window.print();
}
function firmName() { return state.firm === CUSTOM ? (state.firmCustom || '') : state.firm; }
function save() {
  localStorage.setItem('billState', JSON.stringify(Object.assign({}, state, { tcRateManual })));
  localStorage.setItem('billMinC', JSON.stringify(minC));
  localStorage.setItem('billProfiles', JSON.stringify(profiles));
}

/* ================= Calculation ================= */
function gstOf(base, mode = state.taxMode) {
  const v = base * 9 / 100;                       // paise (may be fractional)
  return mode === 'trunc' ? Math.floor(v + 1e-9) : Math.round(v);
}
function computeBill(qty, ratePaise, mode = state.taxMode) {
  const base = qty * ratePaise;
  const gst = gstOf(base, mode);
  const total = base + 2 * gst;
  const say = Math.round(total / 100) * 100;
  return { base, gst, total, say };
}
function chartRate() {
  const c = CHARTS[state.chart];
  if (minC) return c['Min C'];
  const km = Number(state.km);
  if (state.km !== '' && Number.isInteger(km) && km >= 1 && km <= 400) return c[km];
  return null;
}
function kmLabel() { return minC ? 'Min C' : String(state.km); }

/* ================= Bill HTML ================= */
function amountRows(calc, upper) {
  const row = (label, p, leftExtra) => `
    <tr><td class="c-sno"></td>
      <td><div style="display:flex;justify-content:space-between;align-items:flex-end">
        <span>${leftExtra || ''}</span><span class="right" style="padding-right:${upper ? '2.2em' : '3em'}">${label}</span></div></td>
      <td class="c-rs amt">${rsPart(p)}</td><td class="c-p pcol">${pPart(p)}</td></tr>`;
  return row('SGST 9%', calc.gst) +
         row('CGST 9%', calc.gst) +
         row(upper ? 'TOTAL' : 'Total', calc.total) +
         row(upper ? 'SAY' : 'Say', calc.say);
}
function billHTML(kind) {
  const isTc = kind === 'tc';
  const qty = Math.max(0, Math.floor(Number(state.qty) || 0));
  const firm = firmName();
  const invNo = isTc && state.tcNo.trim() ? state.tcNo : state.invNo;
  const date = isTc && state.tcDate.trim() ? state.tcDate : state.date;
  const ratePaise = isTc ? Math.round((Number(effectiveTcRate()) || 0) * 100)
                         : Math.round((Number(state.poleRate) || 0) * 100);
  const calc = computeBill(qty, ratePaise);
  const consDate = isTc ? state.consDate2 : state.consDate1;
  const consLines = esc(state.consText).split('\n');
  const consLast = consLines.pop();
  const consHTML = (consLines.length ? consLines.join('\n') + '\n' : '') +
                   consLast.replace(/(\S+)\s*$/, '<b><u>$1</u></b>');
  const qtyWords = `${qty}( ${words(qty)}${isTc ? '' : ' '}) Nos. of P.C.C. Poles Of ${esc(state.spec)}`;
  const sayWords = `( Rupees ${words(calc.say/100)} Only)`;

  const descBlock = isTc
    ? `<tr><td class="c-sno">1.</td><td class="descr">${qtyWords} . Long distance\n${esc(state.from)} to  ${esc(state.to)} Total Km=${esc(kmLabel())}</td><td class="c-rs"></td><td class="c-p"></td></tr>
       <tr><td class="c-sno"></td><td class="descr" style="padding-top:.5em">Rs ${(ratePaise/100).toFixed(2)} X ${qty} pole</td>
           <td class="c-rs amt">${rsPart(calc.base)}</td><td class="c-p pcol">${pPart(calc.base)}</td></tr>`
    : `<tr><td class="c-sno">1.</td><td class="descr">${qtyWords} Long</td><td class="c-rs"></td><td class="c-p"></td></tr>
       <tr><td class="c-sno"></td><td class="descr" style="padding-left:12em;padding-top:.4em">@ Rs ${(ratePaise/100).toFixed(2)} per pole</td>
           <td class="c-rs amt">${rsPart(calc.base)}</td><td class="c-p pcol">${pPart(calc.base)}</td></tr>`;

  return `
  <div class="bill">
    <div class="top">
      <span>GSTIN:-${esc(state.gstin)}</span>
      <span class="inv">INVOICE</span>
      <span>ORIGINAL/DUPLICATE</span>
      <span>☎${esc(state.phone)}</span>
    </div>
    <div class="firm">${esc(firm)}</div>
    <div class="sub">Mfgrs. Of –All Types P.C.C. Poles</div>
    <div class="invno">${isTc ? 'TC ' : ''}Invoice No/Challan .${esc(invNo)}</div>
    <div class="invno">Dated:- ${esc(date)}</div>
    <div class="head">
      <div class="to">To,\n${esc(state.toText)}</div>
      <div class="cons"><u>Consigned to :-</u>\n${consHTML}\n${consDate ? 'Dt:-' + esc(consDate) : ''}</div>
    </div>
    <table class="items">
      <colgroup><col style="width:4.4em"><col><col style="width:6.2em"><col style="width:2.4em"></colgroup>
      <thead>
        <tr><th rowspan="2" style="text-align:left">S.No.</th><th rowspan="2">DESCRIPTION OF GOODS</th><th colspan="2">AMOUNT</th></tr>
        <tr><th style="text-align:left">Rs.</th><th style="text-align:left">P.</th></tr>
      </thead>
      <tbody>
        ${descBlock}
        <tr><td class="c-sno" style="height:1.2em"></td><td></td><td></td><td></td></tr>
        ${amountRows(calc, isTc)}
        <tr><td class="c-sno pay">Payment<br>Recieved</td><td class="descr" style="padding-left:1.2em;padding-top:.5em;vertical-align:top">${sayWords}</td><td></td><td></td></tr>
        <tr class="fill"><td></td><td></td><td></td><td></td></tr>
      </tbody>
    </table>
    <div class="sig">
      <div class="eoe">E.&amp;O.E</div>
      <div class="for"><div>FOR :-${esc(firm).toUpperCase()}</div><div>PROPRIETOR</div></div>
    </div>
  </div>`;
}
function effectiveTcRate() {
  if (tcRateManual && state.tcRate !== '') return state.tcRate;
  const p = chartRate();
  return p == null ? '' : (p/100).toFixed(2);
}

/* ================= Render ================= */
function sheetsFromBills(bills, layout) {
  const sheets = [];
  if (layout === 'p1') bills.forEach(b => sheets.push(`<div class="sheet p1">${b}</div>`));
  else for (let i = 0; i < bills.length; i += 2)
    sheets.push(`<div class="sheet ${layout}">${bills.slice(i, i+2).map(b => `<div class="cell">${b}</div>`).join('')}</div>`);
  return sheets;
}
function render() {
  // firm profile (gstin / phone)
  const kmNum = Number(state.km);
  const kmStatus = $('kmStatus');
  const p = chartRate();
  if (minC) { kmStatus.textContent = 'Min C rate: ' + fmt(p); kmStatus.className = 'status ok'; }
  else if (state.km === '') { kmStatus.textContent = 'Enter KM (1–400) or tap Min C'; kmStatus.className = 'status'; }
  else if (p == null) { kmStatus.textContent = 'Enter a whole number between 1 and 400'; kmStatus.className = 'status err'; }
  else { kmStatus.textContent = kmNum + ' KM → ' + fmt(p) + ' per pole'; kmStatus.className = 'status ok'; }
  if (!tcRateManual) { state.tcRate = p == null ? '' : (p/100).toFixed(2); if (document.activeElement !== $('tcRate')) $('tcRate').value = state.tcRate; }
  $('mincBtn').classList.toggle('on', minC);

  const kinds = [];
  if ($('incGoods').checked) kinds.push('goods');
  if ($('incTc').checked) kinds.push('tc');
  const bills = kinds.map(billHTML);

  // sheets
  const layout = state.layout;
  const sheets = sheetsFromBills(bills, layout);
  $('sheets').innerHTML = sheets.join('') || '<p style="color:#64748b">Tick at least one bill to print.</p>';
  $('sheetInfo').textContent = `${bills.length} bill(s) • ${sheets.length} A4 sheet(s)`;

  $('pageStyle').textContent = `@page { size: A4 ${layout === 'l2' ? 'landscape' : 'portrait'}; margin: 0; }`;
  fit();
  save();
}
function fit() {
  const el = $('sheets');
  const first = el.querySelector('.sheet');
  el.style.transform = ''; el.style.width = ''; el.style.height = '';
  if (!first) return;
  const avail = el.parentElement.clientWidth;
  if (avail <= 0) return;                         // preview tab hidden on mobile
  const w = first.offsetWidth;
  const s = Math.min(1, avail / w);
  el.style.transform = `scale(${s})`;
  el.style.width = w + 'px';
  el.style.height = (el.scrollHeight * s) + 'px';
}

/* ================= Wiring ================= */
function loadFirmProfile() {
  const pr = profiles[firmName()] || { gstin:'', phone:'' };
  state.gstin = FIRM_GSTIN[firmName()] || pr.gstin; state.phone = FIRM_PHONE[firmName()] || pr.phone;
  $('gstin').value = state.gstin; $('phone').value = state.phone;
}
function missingRequired() {
const m = [];
if (!firmName().trim()) m.push('Firm name');
if (!state.gstin.trim()) m.push('GSTIN');
if (!state.phone.trim()) m.push('Phone');
['gstin','phone'].forEach(id => $(id).classList.toggle('invalid', !state[id].trim()));
return m;
}
function init() {
  $('firm').innerHTML = FIRMS.map(f => `<option>${esc(f)}</option>`).join('') + `<option value="${CUSTOM}">Other (type name)…</option>`;
  FIELDS.forEach(id => { $(id).value = state[id]; });
  CHECKS.forEach(id => { $(id).checked = state[id]; });
  $('firmCustom').style.display = state.firm === CUSTOM ? '' : 'none';
  loadFirmProfile();

  FIELDS.forEach(id => $(id).addEventListener('input', () => {
    state[id] = $(id).value;
    if (id === 'firm') {
      $('firmCustom').style.display = state.firm === CUSTOM ? '' : 'none';
      loadFirmProfile();
    }
    if (id === 'firmCustom') loadFirmProfile();
    if (id === 'customer' || id === 'tn') { state.toText = toTextFor(state.customer, state.tn); $('toText').value = state.toText; }
    if (id === 'customer' || id === 'consType' || id === 'consPlace') { state.consText = consTextFor(state.customer, state.consType, state.consPlace); $('consText').value = state.consText; }
    if (id === 'gstin' || id === 'phone') profiles[firmName()] = { gstin: state.gstin, phone: state.phone };
    if (id === 'km') { minC = false; }
    if (id === 'tcRate') { tcRateManual = state.tcRate !== ''; }
    if (id === 'chart' || id === 'km') { tcRateManual = false; }
    render();
  }));
  CHECKS.forEach(id => $(id).addEventListener('change', () => { state[id] = $(id).checked; render(); }));
  $('mincBtn').addEventListener('click', () => { minC = !minC; if (minC) { state.km = ''; $('km').value = ''; } tcRateManual = false; render(); });
$('printBtn').addEventListener('click', () => {
  const m = missingRequired();
  if (m.length) { alert('Please fill: ' + m.join(', ')); return; }
  printNamed();
});
  window.addEventListener('resize', fit);
  window.addEventListener('beforeprint', () => { const el=$('sheets'); el.style.transform='none'; el.style.width=''; el.style.height=''; });
  window.addEventListener('afterprint', fit);
  render();
}
init();

/* ================= Word (.docx) export — native, editable ================= */
// Builds real Word tables/paragraphs using the same geometry as the on-screen bill
// (font factors, column widths, paddings, line-height 1.3), so it matches the PDF while staying editable.
async function buildDocxBlob() {
  const D = await import('docx');
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType,
          VerticalAlign, TabStopType, LineRuleType, PageOrientation, TableLayoutType, HeightRule, Tab } = D;
  const FONT = 'Times New Roman';
  const NONE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const LINE = { style: BorderStyle.SINGLE, size: 6, color: '000000' };
  const NOB = { top: NONE, bottom: NONE, left: NONE, right: NONE };
  const dxa = n => ({ size: Math.round(n), type: WidthType.DXA });

  const R = (text, pt, o = {}) => new TextRun({ text, font: FONT, size: Math.max(2, Math.round(pt * 2)), bold: !!o.b, underline: o.u ? {} : undefined, characterSpacing: o.cs });
  const P = (runs, pt, o = {}) => new Paragraph({
    children: runs, alignment: o.align, indent: o.indent, tabStops: o.tabs, pageBreakBefore: !!o.pb, border: o.border,
    spacing: { before: Math.round(o.before || 0), after: 0, line: Math.round((o.lh || 1.3) * pt * 20), lineRule: LineRuleType.EXACT }
  });
  const tiny = o => P([R('', 1)], 1, { lh: 1, ...o });
  const C = (children, width, o = {}) => new TableCell({
    children, width: dxa(width), verticalAlign: o.v || VerticalAlign.TOP, borders: o.borders || NOB,
    columnSpan: o.span, rowSpan: o.rowSpan,
    margins: { marginUnitType: WidthType.DXA, top: Math.round(o.mt || 0), bottom: Math.round(o.mb || 0), left: Math.round(o.ml || 0), right: Math.round(o.mr || 0) }
  });
  const T = (rows, widths, W, o = {}) => new Table({
    rows, columnWidths: widths.map(Math.round), width: dxa(W), layout: TableLayoutType.FIXED,
    alignment: o.align, borders: { ...NOB, insideHorizontal: NONE, insideVertical: NONE }
  });

  function bill(kind, pt, W, fillEm, pb) {
    const isTc = kind === 'tc';
    const qty = Math.max(0, Math.floor(Number(state.qty) || 0));
    const firm = firmName();
    const invNo = isTc && state.tcNo.trim() ? state.tcNo : state.invNo;
    const date = isTc && state.tcDate.trim() ? state.tcDate : state.date;
    const ratePaise = isTc ? Math.round((Number(effectiveTcRate()) || 0) * 100) : Math.round((Number(state.poleRate) || 0) * 100);
    const c = computeBill(qty, ratePaise);
    const consDate = isTc ? state.consDate2 : state.consDate1;
    const qtyWords = `${qty}( ${words(qty)}${isTc ? '' : ' '}) Nos. of P.C.C. Poles Of ${state.spec}`;
    const out = [];

    // top line: GSTIN | INVOICE | ORIGINAL/DUPLICATE | phone  (space-between ≈ tab stops at 35% / 57% / right)
    const f1 = pt * 0.82;
    out.push(P([R(`GSTIN:-${state.gstin}`, f1), new TextRun({ children: [new Tab()], font: FONT, size: Math.round(f1 * 2) }),
      R('INVOICE', f1, { b: true, u: true }), new TextRun({ children: [new Tab()], font: FONT, size: Math.round(f1 * 2) }),
      R('ORIGINAL/DUPLICATE', f1), new TextRun({ children: [new Tab()], font: FONT, size: Math.round(f1 * 2) }),
      R(`☎${state.phone}`, f1)], f1, {
      pb, tabs: [{ type: TabStopType.LEFT, position: Math.round(W * 0.35) }, { type: TabStopType.LEFT, position: Math.round(W * 0.57) }, { type: TabStopType.RIGHT, position: W }] }));
    // firm name
    out.push(P([R(firm.toUpperCase(), pt * 2.1, { b: true, cs: Math.round(0.02 * pt * 2.1 * 20) })], pt * 2.1, { align: AlignmentType.CENTER, lh: 1.15, before: 0.25 * pt * 2.1 * 20 }));
    [ 'Mfgrs. Of –All Types P.C.C. Poles', `${isTc ? 'TC ' : ''}Invoice No/Challan .${invNo}`, `Dated:- ${date}` ]
      .forEach(t => out.push(P([R(t, f1)], f1, { align: AlignmentType.CENTER })));

    // To / Consigned (bottom-aligned, consigned block is 38% wide)
    const f2 = pt * 0.88, hb = 0.5 * f2 * 20;
    const toLines = ['To,', ...String(state.toText).split('\n')];
    const consLines = String(state.consText).split('\n');
    const last = consLines.pop() ?? '';
    const m = last.match(/^(.*?)(\S+)\s*$/);
    const consParas = [P([R('Consigned to :-', f2, { u: true })], f2)];
    consLines.forEach(l => consParas.push(P([R(l, f2)], f2)));
    consParas.push(P(m ? [R(m[1], f2), R(m[2], f2, { b: true, u: true })] : [R(last, f2)], f2));
    if (consDate) consParas.push(P([R('Dt:-' + consDate, f2)], f2));
    const hw1 = W * 0.62, hw2 = W - hw1;
    out.push(T([new TableRow({ children: [
      C(toLines.map((l, i) => P([R(l, f2)], f2, { before: i ? 0 : hb })), hw1, { v: VerticalAlign.BOTTOM }),
      C(consParas.map((p, i) => p), hw2, { v: VerticalAlign.BOTTOM, mt: hb })
    ] })], [hw1, hw2], W));

    // items table
    const tf = pt * 0.9, em = tf * 20;
    const wS = 4.4 * em, wR = 6.2 * em, wP = 2.4 * em, wD = W - wS - wR - wP;
    const mx = 0.35 * em, my = 0.12 * em;
    const cellP = (txt, o = {}) => P(txt === '' ? [R('', 2)] : [R(txt, tf, o)], txt === '' ? 2 : tf, { align: o.align, indent: o.indent, before: o.before });
    const body = { top: NONE, bottom: NONE, left: LINE, right: LINE };
    const all = { top: LINE, bottom: LINE, left: LINE, right: LINE };
    const mid = VerticalAlign.CENTER;
    const rows = [];
    rows.push(new TableRow({ cantSplit: true, children: [
      C([cellP('S.No.')], wS, { borders: all, rowSpan: 2, v: mid, ml: mx, mr: mx, mt: 0.15 * em, mb: 0.15 * em }),
      C([cellP('DESCRIPTION OF GOODS', { align: AlignmentType.CENTER })], wD, { borders: all, rowSpan: 2, v: mid, ml: mx, mr: mx, mt: 0.15 * em, mb: 0.15 * em }),
      C([cellP('AMOUNT', { align: AlignmentType.CENTER })], wR + wP, { borders: all, span: 2, ml: mx, mr: mx, mt: 0.15 * em, mb: 0.15 * em })
    ] }));
    rows.push(new TableRow({ cantSplit: true, children: [
      C([cellP('Rs.')], wR, { borders: all, ml: mx, mr: mx, mt: 0.15 * em, mb: 0.15 * em }),
      C([cellP('P.')], wP, { borders: all, ml: mx, mr: mx, mt: 0.15 * em, mb: 0.15 * em })
    ] }));
    const bc = (paras, w, o = {}) => C(paras, w, { borders: body, ml: mx, mr: mx, mt: my + (o.extraTop || 0), mb: my, v: o.v });
    const amtCells = (p, v) => [
      bc([cellP(rsPart(p), { u: true, align: AlignmentType.RIGHT })], wR, { v }),
      bc([cellP(pPart(p), { u: true })], wP, { v })
    ];
    const blank2 = () => [bc([cellP('')], wR), bc([cellP('')], wP)];
    const row = (cells, h) => new TableRow({ cantSplit: true, height: h ? { value: Math.round(h), rule: HeightRule.ATLEAST } : undefined, children: cells });

    // description rows
    if (isTc) {
      rows.push(row([bc([cellP('1.')], wS), bc([cellP(`${qtyWords} . Long distance`), cellP(`${state.from} to  ${state.to} Total Km=${kmLabel()}`)], wD), ...blank2()]));
      rows.push(row([bc([cellP('')], wS), bc([cellP(`Rs ${(ratePaise / 100).toFixed(2)} X ${qty} pole`, { before: 0.5 * em })], wD), ...amtCells(c.base, VerticalAlign.BOTTOM)]));
    } else {
      rows.push(row([bc([cellP('1.')], wS), bc([cellP(`${qtyWords} Long`)], wD), ...blank2()]));
      rows.push(row([bc([cellP('')], wS), bc([cellP(`@ Rs ${(ratePaise / 100).toFixed(2)} per pole`, { indent: { left: Math.round(12 * em) }, before: 0.4 * em })], wD), ...amtCells(c.base, VerticalAlign.BOTTOM)]));
    }
    rows.push(row([bc([cellP('')], wS), bc([cellP('')], wD), ...blank2()], 1.2 * em));   // spacer
    const rr = isTc ? 2.2 : 3;
    [[isTc ? 'SGST 9%' : 'SGST 9%', c.gst], ['CGST 9%', c.gst], [isTc ? 'TOTAL' : 'Total', c.total], [isTc ? 'SAY' : 'Say', c.say]].forEach(([lab, p]) =>
      rows.push(row([bc([cellP('')], wS), bc([cellP(lab, { align: AlignmentType.RIGHT, indent: { right: Math.round(rr * em) } })], wD, { v: VerticalAlign.BOTTOM }), ...amtCells(p, VerticalAlign.BOTTOM)])));
    // Payment Recieved sits in the S.No. column, level with the words line
    rows.push(row([
      bc([cellP('Payment'), cellP('Recieved')], wS, { extraTop: 0.5 * em }),
      bc([cellP(`( Rupees ${words(c.say / 100)} Only)`, { indent: { left: Math.round(1.2 * em) } })], wD, { extraTop: 0.5 * em }),
      ...blank2()]));
    const last2 = { top: NONE, bottom: LINE, left: LINE, right: LINE };
    const fc = w => C([cellP('')], w, { borders: last2 });
    rows.push(row([fc(wS), fc(wD), fc(wR), fc(wP)], fillEm * em));
    out.push(new Table({ rows, columnWidths: [wS, wD, wR, wP].map(Math.round), width: dxa(W), layout: TableLayoutType.FIXED,
      borders: { top: LINE, bottom: LINE, left: LINE, right: LINE, insideHorizontal: NONE, insideVertical: LINE } }));
    out.push(tiny({ before: 0.6 * pt * 20 }));

    // signature
    const sw1 = W * 0.70, sw2 = W - sw1;
    out.push(T([new TableRow({ children: [
      C([P([R('E.&O.E', f2)], f2, { before: 3 * f2 * 20, indent: { left: Math.round(5.3 * pt * 20) } })], sw1),
      C([P([R(`FOR :-${firm.toUpperCase()}`, f2)], f2, { align: AlignmentType.CENTER }),
         P([R('PROPRIETOR', f2)], f2, { align: AlignmentType.CENTER, before: 1.4 * f2 * 20 })], sw2)
    ] })], [sw1, sw2], W));
    return out;
  }

  const kinds = [];
  if (state.incGoods) kinds.push('goods');
  if (state.incTc) kinds.push('tc');
  const L = state.layout, land = L === 'l2';
  const margin = 567;                                         // 10 mm, same as the sheet padding
  const contentW = (land ? 16838 : 11906) - 2 * margin;
  const children = [];
  if (L === 'p1') {
    const W = Math.min(Math.round(49 * 11 * 20), contentW);
    kinds.forEach((k, i) => children.push(...bill(k, 11, W, 18, i > 0)));
  } else {
    for (let i = 0; i < kinds.length; i += 2) {
      const pair = kinds.slice(i, i + 2), pageBreak = i > 0;
      if (land) {
        const cw = Math.floor((contentW - 340) / 2);
        if (pageBreak) children.push(tiny({ pb: true }));
        const cells = [];
        pair.forEach((k, j) => {
          if (j) cells.push(C([tiny()], 340));
          cells.push(C([...bill(k, 7.9, cw, 12, false), tiny()], cw));
        });
        children.push(T([new TableRow({ children: cells })], pair.length > 1 ? [cw, 340, cw] : [cw], pair.length > 1 ? contentW : cw));
      } else {
        const W = Math.round(49 * 8.6 * 20);
        children.push(...bill(pair[0], 8.6, W, 5, pageBreak));
        if (pair[1]) {
          children.push(P([R('', 2)], 2, { before: 1.6 * 56.7, border: { bottom: { style: BorderStyle.DASHED, size: 4, color: '999999', space: 1 } } }));
          children.push(tiny({ before: 3 * 56.7 }));
          children.push(...bill(pair[1], 8.6, W, 5, false));
        }
      }
    }
  }
  children.push(tiny());
  const doc = new Document({
    title: `Invoice ${state.invNo}`,
    styles: { default: { document: { run: { font: FONT } } } },
    sections: [{ properties: { page: {
      size: { width: 11906, height: 16838, orientation: land ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT },
      margin: { top: margin, right: margin, bottom: margin, left: margin, header: 0, footer: 0 } } }, children }]
  });
  return Packer.toBlob(doc);
}

async function downloadWord() {
  const m = missingRequired();
  if (m.length) { alert('Please fill: ' + m.join(', ')); return false; }
  if (!state.incGoods && !state.incTc) { alert('Tick at least one bill to include.'); return false; }
  const blob = await buildDocxBlob();
  const name = `Bill-${state.invNo || 'draft'}-${firmName()}`.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') + '.docx';
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return name;
}
$('wordBtn').addEventListener('click', async () => {
  cloudStatus('Preparing Word file…');
  try { const n = await downloadWord(); cloudStatus(n ? 'Downloaded ' + n : '', n ? 'ok' : ''); }
  catch (e) { console.error(e); cloudStatus('Word export failed: ' + e.message, 'err'); }
});

/* ================= Cloud (Neon via /api) ================= */
let currentId = null;
const cloudStatus = (msg, cls = '') => { $('cloudStatus').textContent = msg; $('cloudStatus').className = 'status ' + cls; };

async function api(path, opts = {}) {
  const res = await fetch('/api/' + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json' },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || ('Request failed (' + res.status + ')'));
  return json;
}

function snapshot() { return { ...state, minC, tcRateManual, firmName: firmName() }; }
function applyState(d) {
  state = Object.assign({}, DEFAULTS, d);
  minC = !!d.minC; tcRateManual = !!d.tcRateManual;
  FIELDS.forEach(id => { $(id).value = state[id] ?? ''; });
  CHECKS.forEach(id => { $(id).checked = !!state[id]; });
  $('firmCustom').style.display = state.firm === CUSTOM ? '' : 'none';
  render();
}

/* ---------- Views (editor / saved bills) + mobile tabs ---------- */
function setView(v) {
  document.body.dataset.view = v;
  $('viewEditor').hidden = v !== 'editor';
  $('viewBills').hidden = v !== 'bills';
  document.querySelectorAll('[data-view-btn]').forEach(b => b.classList.toggle('on', b.dataset.viewBtn === v));
  if (v === 'bills') refreshList().catch(e => { $('billsList').innerHTML = `<div class="empty">Could not load bills: ${esc(e.message)}</div>`; });
  else fit();
  window.scrollTo(0, 0);
}
function setTab(t) {
  document.body.dataset.tab = t;
  document.querySelectorAll('[data-tab-btn]').forEach(b => b.classList.toggle('on', b.dataset.tabBtn === t));
  fit();
}
document.querySelectorAll('[data-view-btn]').forEach(b => b.addEventListener('click', () => setView(b.dataset.viewBtn)));
document.querySelectorAll('[data-tab-btn]').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tabBtn)));

/* ---------- Saved bills list ---------- */
let allBills = [];
let filt = { q: '', firm: '' };

function totalsOf(d) {
  const mode = d.taxMode || 'round';
  const qty = Math.max(0, Math.floor(Number(d.qty) || 0));
  let tcRate = Number(d.tcRate);
  if (!(tcRate > 0)) { const c = CHARTS[d.chart || 'A']; const k = d.minC ? 'Min C' : Number(d.km); tcRate = (c[k] || 0) / 100; }
  const goods = computeBill(qty, Math.round((Number(d.poleRate) || 0) * 100), mode);
  const tc = computeBill(qty, Math.round(tcRate * 100), mode);
  return { qty, goods: d.incGoods === false ? 0 : goods.say, tc: d.incTc === false ? 0 : tc.say };
}
const inr = p => '₹ ' + (p / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

function renderBills() {
  $('billsCount').textContent = allBills.length;
  const firms = [...new Set(allBills.map(b => b.firm).filter(Boolean))];
  $('firmChips').innerHTML = ['', ...firms].map(f =>
    `<button type="button" class="chip ${filt.firm === f ? 'on' : ''}" data-firm="${esc(f)}">${f ? esc(f) : 'All firms'}</button>`).join('');
  const q = filt.q.trim().toLowerCase();
  const rows = allBills.filter(b => (!filt.firm || b.firm === filt.firm) &&
    (!q || [b.firm, b.invoice_no, b.invoice_date, b.data.tn, b.data.customer, b.data.consPlace, b.data.consType].join(' ').toLowerCase().includes(q)));
  let sum = 0;
  $('billsList').innerHTML = rows.map(b => {
    const d = b.data, t = totalsOf(d); sum += t.goods + t.tc;
    return `<div class="bill-card ${b.id === currentId ? 'cur' : ''}">
      <div class="bc-top"><div><div class="bc-firm">${esc(b.firm || '(no firm)')}</div>
        <div class="bc-meta">${esc(b.invoice_date)} · saved ${new Date(b.updated_at).toLocaleDateString()}</div></div>
        <span class="bc-no">#${esc(b.invoice_no || '—')}</span></div>
      <div class="bc-meta">${esc(d.customer || '')}${d.tn ? ' · TN-' + esc(d.tn) : ''} · ${esc(d.consType || '')} ${esc(d.consPlace || '')}<br>
        ${t.qty} poles @ ₹${Number(d.poleRate) || 0} · ${d.minC ? 'Min C' : esc(d.km || '—') + ' km'}</div>
      <div class="bc-amts"><div>Goods bill<b>${inr(t.goods)}</b></div><div>Transport bill<b>${inr(t.tc)}</b></div></div>
      <div class="bc-total"><span>Total</span><span>${inr(t.goods + t.tc)}</span></div>
      <div class="bc-btns"><button class="btn" data-open="${b.id}">Open</button><button class="btn primary" data-print="${b.id}">Print</button><button class="btn" data-word="${b.id}">Word</button><button class="btn danger" data-del="${b.id}">Delete</button></div>
    </div>`;
  }).join('') || `<div class="empty">${allBills.length ? 'No bills match your search.' : 'No saved bills yet. Create one and press Save.'}</div>`;
  $('billsSummary').textContent = `${rows.length} bill(s) · combined value ${inr(sum)}`;
}
async function refreshList() {
  allBills = await api('invoices');
  renderBills();
}
$('billSearch').addEventListener('input', e => { filt.q = e.target.value; renderBills(); });
$('firmChips').addEventListener('click', e => { if (e.target.dataset.firm !== undefined) { filt.firm = e.target.dataset.firm; renderBills(); } });
$('reloadBtn').addEventListener('click', () => refreshList().catch(e => alert(e.message)));
$('billsList').addEventListener('click', async e => {
  const t = e.target.closest('button'); if (!t) return;
  const id = Number(t.dataset.open || t.dataset.print || t.dataset.del || t.dataset.word); if (!id) return;
  try {
    if (t.dataset.del !== undefined) {
      if (!confirm('Delete this saved bill permanently?')) return;
      await api('invoice?id=' + id, { method: 'DELETE' });
      if (id === currentId) currentId = null;
      await refreshList();
      return;
    }
    const row = allBills.find(b => b.id === id);
    currentId = id; applyState(row.data);
    if (t.dataset.word !== undefined) { renderBills(); $('billsSummary').textContent = 'Preparing Word file…'; const n = await downloadWord(); if (n) $('billsSummary').textContent = 'Downloaded ' + n; return; }
    setView('editor');
    if (t.dataset.print !== undefined) {
      setTab('preview');
      const m = missingRequired();
      if (m.length) { alert('Please fill: ' + m.join(', ')); return; }
      setTimeout(() => printNamed(), 400);
    } else { setTab('form'); cloudStatus('Opened bill #' + (state.invNo || '—'), 'ok'); }
  } catch (err) { alert(err.message); }
});

/* ---------- Firm profiles (phone/GSTIN for custom firms) ---------- */
async function syncProfiles() {
  const rows = await api('profiles');
  rows.forEach(r => { profiles[r.firm] = { gstin: r.gstin, phone: r.phone }; });
  loadFirmProfile(); render();
}
let profileTimer;
function pushProfile() {
  clearTimeout(profileTimer);
  profileTimer = setTimeout(() => {
    const firm = firmName();
    if (firm) api('profiles', { method: 'PUT', body: { firm, gstin: state.gstin, phone: state.phone } }).catch(() => {});
  }, 800);
}
$('gstin').addEventListener('input', pushProfile);
$('phone').addEventListener('input', pushProfile);

/* ---------- Save / New ---------- */
$('saveBtn').addEventListener('click', async () => {
  const miss = missingRequired();
  if (miss.length) { cloudStatus('Required: ' + miss.join(', '), 'err'); setTab('form'); return; }
  try {
    cloudStatus('Saving…');
    const { id } = await api('invoices', { method: 'POST', body: { id: currentId, data: snapshot() } });
    currentId = id;
    cloudStatus('Saved ✓ bill #' + (state.invNo || '—') + ' — see “Saved bills”', 'ok');
    refreshList().catch(() => {});
  } catch (e) { cloudStatus(e.message, 'err'); }
});
$('newBtn').addEventListener('click', () => {
  currentId = null;
  const n = parseInt(state.invNo, 10);
  applyState({ ...snapshot(), invNo: Number.isFinite(n) ? String(n + 1) : '', tcNo: '', date: today });
  setTab('form'); cloudStatus('New bill (not saved yet)');
});

// Cloud is optional: the app still prints without the API / database.
(async () => {
  try { await syncProfiles(); await refreshList(); cloudStatus('Connected to cloud ✓', 'ok'); }
  catch (e) { cloudStatus('Cloud unavailable: ' + e.message, 'err'); }
})();
