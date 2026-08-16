import { NextRequest, NextResponse } from "next/server";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ExcelJS = require("exceljs");

const C = {
  darkBlue: "1F4E79", midBlue: "2E75B6", lightBlue: "BDD7EE",
  yellow: "FFFF00", amber: "FFC000", orange: "FCE4D6",
  green: "E2EFDA", grey: "D9D9D9", white: "FFFFFF",
};

const fill  = (c: string) => ({ type: "pattern", pattern: "solid", fgColor: { argb: c } });
const fnt   = (sz: number, bold = false, col = "000000", italic = false) => ({ name: "Calibri", size: sz, bold, italic, color: { argb: col } });
const aln   = (h = "left", v = "middle", wrap = false) => ({ horizontal: h, vertical: v, wrapText: wrap });
const bdr   = (s = "thin") => ({ top: { style: s }, right: { style: s }, bottom: { style: s }, left: { style: s } });
const bdrM  = () => bdr("medium");

function sc(cell: any, opts: { fill?: string; font?: object; align?: object; border?: object; numFmt?: string }) {
  if (opts.fill)   cell.fill      = fill(opts.fill);
  if (opts.font)   cell.font      = opts.font;
  if (opts.align)  cell.alignment = opts.align;
  if (opts.border) cell.border    = opts.border;
  if (opts.numFmt) cell.numFmt   = opts.numFmt;
}

const ITEMS = [
  { no: 1,  code: "RJ001", unit: "Cmt",  desc: "Demolition of B.B. / stone masonry wall incl. tools, scaffolding, stacking serviceable & disposing unserviceable materials (In C.M.)" },
  { no: 2,  code: "RJ013", unit: "Cmt",  desc: "Excavation for foundation in any kind of soil incl. dewatering, shoring, backfilling in layers of 20 cm with watering & consolidating etc. (A) 0.00–1.50 m" },
  { no: 3,  code: "RJ027", unit: "Cmt",  desc: "Providing & laying cement concrete 1:3:6 and curing complete excl. formwork. (A) Foundation, plinth & any place" },
  { no: 4,  code: "RJ030", unit: "Cmt",  desc: "Providing & Laying RCC M-250 using 12–20 mm aggregate incl. formwork, machine mixing, vibration, curing etc. complete. (A) Foundation & Plinth" },
  { no: 5,  code: "RJ032", unit: "Cmt",  desc: "Providing & Laying RCC M-250 complete. (A) Column — Upto Plinth Level" },
  { no: 6,  code: "RJ033", unit: "Cmt",  desc: "Providing & Laying RCC M-250 complete. (B) Column — Upto Ground Floor / Top of Wall" },
  { no: 7,  code: "RJ031", unit: "Cmt",  desc: "Providing & Laying RCC M-250 complete. (A) Ground Beam" },
  { no: 8,  code: "RJ053", unit: "Cmt",  desc: "Providing & Laying RCC M-250 complete. (A) Coping / Sills" },
  { no: 9,  code: "RJ080", unit: "Kg",   desc: "Providing TMT Bar FE 500D reinforcement for R.C.C. work including bending, binding and placing in position complete." },
  { no: 10, code: "RJ097", unit: "Cmt",  desc: "Providing & laying Bela / Brick masonry in C.M. (1:6) incl. dressing, racking, watering, curing, scaffolding etc. complete. (A) Above Plinth Level" },
  { no: 11, code: "RJ116", unit: "Smt",  desc: "Providing 20 mm thick Sand Faced Cement Plaster (12 mm C.M. 1:3 + 8 mm C.M. 1:1) incl. pattas, pattis, watering, curing, scaffolding etc." },
  { no: 12, code: "RJ152", unit: "Smt",  desc: "Finishing wall with weatherproof exterior emulsion paint (two coats) after brushing surface etc. complete" },
  { no: 13, code: "RJ273", unit: "Nos",  desc: "Providing & fixing 110 mm dia. PVC rain water spout pipe min. 60 cm length in C.M. (1:1) at max. 1 m c/c interval etc. complete" },
  { no: 14, code: "RJ166", unit: "Rmt",  desc: "Providing & fixing 1.20 m high barbed wire fencing with M.S. angle posts 40×40×6 mm at 3 m c/c, 5 horizontal + 2 diagonal G.I. barbed wire lines, oil paint 3 coats, posts fixed in C.C. (1:2:4) block etc. complete" },
];

function calcAll(inp: Record<string, number>) {
  const { L, Hw, Hp, cs, sp, Lf, Hf, tp, tr, gbw, gbd, ct, wt, ph, Dl, Dt, Dh, fw, ss, sr_f, sr_gb, sr_col, sr_cop } = inp;
  const N   = Math.round(L / sp);
  const Hab = Hw - Hp;
  const A1  = (cs + 0.1) ** 2;
  const A2  = (Lf - 0.15) ** 2;
  return {
    N, Hab,
    qtys: [
      Dl * Dt * Dh,
      N * Lf * Lf * Hf + L * (gbw + 0.10) * (tr / 3),
      N * Lf * Lf * tp + L * (gbw + 0.10) * (tr / 3),
      N * (Lf - 0.15) ** 2 * tr + N * (tr / 3) * (A1 + A2 + Math.sqrt(A1 * A2)),
      N * cs * cs * Hp,
      N * cs * cs * Hab,
      L * gbw * gbd - N * gbw * gbd,
      L * cs * ct,
      0, // filled below after q4..q8
      L * wt * Hab,
      2 * L * ph + N * 4 * Math.max((cs - wt) / 2, 0) * Hab + L * cs + 2 * L * ct,
      0, // paint = plaster
      Math.round(L / ss),
      fw,
    ],
  };
}

export async function POST(req: NextRequest) {
  const { inp, rates } = await req.json();
  const { N, Hab, qtys: rawQtys } = calcAll(inp);

  // Fill deferred items
  const qtys = [...rawQtys];
  qtys[8]  = qtys[3] * inp.sr_f + qtys[6] * inp.sr_gb + (qtys[4] + qtys[5]) * inp.sr_col + qtys[7] * inp.sr_cop;
  qtys[11] = qtys[10];

  const amounts = qtys.map((q, i) => q * (rates[i] ?? 0));
  const total   = amounts.reduce((s, a) => s + a, 0);
  const pct1    = total * 0.01;
  const tender  = total + pct1;
  const gst     = tender * 0.18;
  const withGst = tender + gst;
  const cont5   = withGst * 0.05;
  const des2    = withGst * 0.02;
  const estimated = withGst + cont5 + des2;
  const say     = Math.round(estimated);

  const wb = new ExcelJS.Workbook();
  wb.creator = "BOQ Engine Pro";
  wb.created = new Date();

  // ── ABSTRACT sheet ────────────────────────────────────────────────────────────
  const aws = wb.addWorksheet("ABSTRACT", { properties: { tabColor: { argb: C.midBlue } } });
  [0, 48, 10, 55, 7, 16, 18].forEach((w, i) => { aws.getColumn(i + 1).width = w || 6; });
  aws.getColumn(1).width = 6;
  aws.getColumn(2).width = 10;
  aws.getColumn(3).width = 55;
  aws.getColumn(4).width = 14;
  aws.getColumn(5).width = 7;
  aws.getColumn(6).width = 16;
  aws.getColumn(7).width = 18;

  // Title
  aws.mergeCells("A1:G1");
  const t1 = aws.getCell("A1");
  t1.value = `NAME OF WORK :- ${inp.workName}`;
  sc(t1, { fill: C.darkBlue, font: fnt(12, true, C.white), align: aln("center"), border: bdrM() });
  aws.getRow(1).height = 22;

  aws.mergeCells("A2:G2");
  const t2 = aws.getCell("A2");
  t2.value = `Columns: ${N} Nos @ ${inp.sp} m c/c  |  Wall Length: ${inp.L} m  |  Height above GL: ${inp.Hw} m`;
  sc(t2, { fill: C.lightBlue, font: fnt(10, true), align: aln("center"), border: bdr() });
  aws.getRow(2).height = 16;

  aws.mergeCells("A3:G3");
  const t3 = aws.getCell("A3");
  t3.value = "ESTIMATE SHEET";
  sc(t3, { fill: C.midBlue, font: fnt(11, true, C.white), align: aln("center"), border: bdr() });
  aws.getRow(3).height = 18;

  // Headers
  ["Item\nNo.", "GSRTC\nCode", "Item Description", "Qty", "Unit", "Rate (Rs.)", "Amount (Rs.)"].forEach((h, i) => {
    const c = aws.getCell(4, i + 1);
    c.value = h;
    sc(c, { fill: C.darkBlue, font: fnt(10, true, C.white), align: aln("center", "middle", true), border: bdrM() });
  });
  aws.getRow(4).height = 28;

  // Items
  ITEMS.forEach((item, i) => {
    const row = 5 + i;
    const qty = qtys[i] ?? 0;
    const amt = amounts[i] ?? 0;

    const cells = [item.no, item.code, item.desc, +qty.toFixed(3), item.unit, rates[i] ?? 0, +amt.toFixed(2)];
    cells.forEach((v, ci) => {
      const c = aws.getCell(row, ci + 1);
      c.value = v;
      const isCtr = ci !== 2;
      sc(c, {
        fill: ci === 5 ? C.yellow : ci === 6 ? C.orange : ci === 3 ? C.lightBlue : ci === 0 || ci === 1 ? C.grey : C.white,
        font: fnt(ci === 2 ? 9 : 10, ci !== 2),
        align: aln(isCtr ? "center" : "left", "middle", !isCtr),
        border: ci === 5 ? bdrM() : bdr(),
        numFmt: (ci === 3 || ci === 5 || ci === 6) ? "#,##0.00" : undefined,
      });
    });
    aws.getRow(row).height = item.desc.length > 80 ? 38 : 24;
  });

  // Summary rows
  const totRow = 5 + ITEMS.length;
  const summaryRows = [
    { label: "Total Rs.", val: total, fillA: C.darkBlue, fontA: fnt(11, true, C.white), fillV: C.midBlue, fontV: fnt(11, true, C.white), thick: true },
    { label: "1%  Design & Quality Control  Rs.", val: pct1, fillA: C.white, fontA: fnt(10), fillV: C.white, fontV: fnt(10), thick: false },
    { label: "Tender Amount Rs.", val: tender, fillA: C.green, fontA: fnt(11, true), fillV: C.green, fontV: fnt(11, true), thick: true },
    { label: "18% GST Rs.", val: gst, fillA: C.white, fontA: fnt(10), fillV: C.white, fontV: fnt(10), thick: false },
    { label: "Total (with GST) Rs.", val: withGst, fillA: C.white, fontA: fnt(10, true), fillV: C.white, fontV: fnt(10, true), thick: false },
    { label: "5% Contingencies Rs.", val: cont5, fillA: C.white, fontA: fnt(10), fillV: C.white, fontV: fnt(10), thick: false },
    { label: "2% Design Charges Rs.", val: des2, fillA: C.white, fontA: fnt(10), fillV: C.white, fontV: fnt(10), thick: false },
    { label: "Estimated Amount Rs.", val: estimated, fillA: C.amber, fontA: fnt(11, true), fillV: C.amber, fontV: fnt(11, true), thick: true },
    { label: "Say Estimated Amount Rs.", val: say, fillA: C.darkBlue, fontA: fnt(12, true, C.white), fillV: C.darkBlue, fontV: fnt(12, true, C.white), thick: true },
  ];

  summaryRows.forEach((s, idx) => {
    const rn = totRow + idx;
    aws.mergeCells(`A${rn}:F${rn}`);
    const labelCell = aws.getCell(`A${rn}`);
    labelCell.value = s.label;
    sc(labelCell, { fill: s.fillA, font: s.fontA, align: aln("right"), border: s.thick ? bdrM() : bdr() });
    const valCell = aws.getCell(`G${rn}`);
    valCell.value = +s.val.toFixed(2);
    sc(valCell, { fill: s.fillV, font: s.fontV, align: aln("center"), border: s.thick ? bdrM() : bdr(), numFmt: idx === summaryRows.length - 1 ? "#,##0" : "#,##0.00" });
    aws.getRow(rn).height = 20;
  });

  // Signatures
  const sigRow = totRow + summaryRows.length + 2;
  aws.mergeCells(`A${sigRow}:G${sigRow}`);
  const sig = aws.getCell(`A${sigRow}`);
  sig.value = "Dy. Engg (Tech)                                   Div. Acc.                                   Executive Engineer";
  sc(sig, { font: fnt(10), align: aln("center") });
  aws.mergeCells(`A${sigRow + 1}:G${sigRow + 1}`);
  const sig2 = aws.getCell(`A${sigRow + 1}`);
  sig2.value = `GSRTC, ${inp.division}`;
  sc(sig2, { font: fnt(9, false, "595959", true), align: aln("center") });

  // ── SUMMARY sheet ─────────────────────────────────────────────────────────────
  const sws = wb.addWorksheet("SUMMARY", { properties: { tabColor: { argb: C.amber } } });
  [6, 30, 22, 22].forEach((w, i) => { sws.getColumn(i + 1).width = w; });

  sws.mergeCells("A1:D1");
  const st1 = sws.getCell("A1");
  st1.value = `NAME OF WORK :- ${inp.workName}`;
  sc(st1, { fill: C.darkBlue, font: fnt(12, true, C.white), align: aln("center"), border: bdrM() });
  sws.getRow(1).height = 22;

  sws.mergeCells("A2:D2");
  const st2 = sws.getCell("A2");
  st2.value = "SUMMARY";
  sc(st2, { fill: C.midBlue, font: fnt(13, true, C.white), align: aln("center") });
  sws.getRow(2).height = 20;

  ["No.", "Description", "Estimated Amount (Rs.)", "Tender Amount (Rs.)"].forEach((h, i) => {
    const c = sws.getCell(4, i + 1);
    c.value = h;
    sc(c, { fill: C.darkBlue, font: fnt(10, true, C.white), align: aln("center"), border: bdrM() });
  });

  [1, "Compound Wall Work", +say.toFixed(0), +tender.toFixed(0)].forEach((v, i) => {
    const c = sws.getCell(5, i + 1);
    c.value = v;
    sc(c, { fill: C.white, font: fnt(11, i !== 1), align: aln(i === 1 ? "left" : "center"), border: bdr(), numFmt: i >= 2 ? "#,##0" : undefined });
  });

  [["TOTAL :-", say, C.grey], ["SAY :-", Math.round(say), C.amber]].forEach(([label, val, bg], idx) => {
    const rn = 6 + idx;
    sws.mergeCells(`A${rn}:B${rn}`);
    const lc = sws.getCell(`A${rn}`);
    lc.value = label;
    sc(lc, { fill: bg as string, font: fnt(11, true), align: aln("right"), border: bdrM() });
    const vc = sws.getCell(`C${rn}`);
    vc.value = val;
    sc(vc, { fill: bg as string, font: fnt(12, true), align: aln("center"), border: bdrM(), numFmt: "#,##0" });
    sws.getRow(rn).height = 22;
  });

  // ── Return as buffer ───────────────────────────────────────────────────────────
  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="CW_Estimate.xlsx"`,
    },
  });
}
