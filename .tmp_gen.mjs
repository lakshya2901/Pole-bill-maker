const CUSTOM='__custom__'; let minC=false, tcRateManual=false;
let state={firm:'Babel Cement',firmCustom:'',gstin:'08AGKPB8389F1Z2',phone:'70147 36433',invNo:'29',date:'19.10.26',
 toText:'The Sr..A.O.(CPC)\nJDVVNL,Jodhpur\nGSTIN:-08AAACJ8578R1ZJ\nJDVVNL/SE(MM)TN-2050(R)',consText:'THE AEN (O&M)\nJDVVNL Kuchaman',
 consDate1:'18.08.26',consDate2:'26.12.25',qty:'62',poleRate:'2200',spec:'9 mtr 200 kg',chart:'A',km:'165',from:'Delwara',to:'Kuchaman',
 tcRate:'',tcNo:'',tcDate:'',taxMode:'round',layout:process.argv[2]||'p1',incGoods:true,incTc:true};
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


function effectiveTcRate() {
  if (tcRateManual && state.tcRate !== '') return state.tcRate;
  const p = chartRate();
  return p == null ? '' : (p/100).toFixed(2);
}

function firmName() { return state.firm === CUSTOM ? (state.firmCustom || '') : state.firm; }

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


import fs from 'node:fs';
const blob=await buildDocxBlob(); fs.writeFileSync('.tmp_'+state.layout+'.docx',Buffer.from(await blob.arrayBuffer()));
console.log('ok',state.layout,blob.size);
