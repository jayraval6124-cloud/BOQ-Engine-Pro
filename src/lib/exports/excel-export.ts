import ExcelJS from "exceljs";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MeasurementRowExport {
  itemNo: number;
  gsrtcCode: string;
  description: string;
  nos: number | null;
  length: number | null;
  breadth: number | null;
  height: number | null;
  quantity: number;
  unit: string;
}

export interface MeasurementSheetExport {
  id: string;
  name: string;
  rows: MeasurementRowExport[];
}

export interface BOQItemExport {
  gsrtcCode?: string;
  itemCode?: string;
  chapter?: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  isManualEntry?: boolean;
  sheetQtys?: Record<string, { sheetName: string; qty: number }>;
}

export interface BOQExportData {
  boqNo: string;
  name: string;
  revisionNo: number;
  subWork?: string;
  project: { name: string; clientName?: string; district?: string; sorYear?: string; sorDivision?: string; company?: { name: string } };
  createdBy: { name: string };
  createdAt: Date | string;
  totalAmount: number;
  gstAmount: number;
  grandTotal: number;
  includeGST: boolean;
  gstPercent?: number;
  breakdown?: {
    totalRs: number; welfareCess: number; tenderAmount: number; gst18: number;
    totalWithGST: number; contingency5: number; workContingency2: number;
    estimatedAmount: number; netEstimated: number;
  };
  measurementSheets?: MeasurementSheetExport[];
  items: BOQItemExport[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function C(n: number): string {
  let r = "";
  while (n > 0) { const m = (n - 1) % 26; r = String.fromCharCode(65 + m) + r; n = Math.floor((n - 1) / 26); }
  return r;
}
function A(col: number, row: number) { return `${C(col)}${row}`; }
function safe(name: string) { return name.replace(/[\\/?*[\]:]/g, "").slice(0, 31); }
function Q(name: string) { return /[\s']/.test(name) ? `'${name.replace(/'/g, "''")}'` : name; }
function b(style: ExcelJS.BorderStyle): Partial<ExcelJS.Borders> {
  const s = { style } as ExcelJS.Border;
  return { top: s, bottom: s, left: s, right: s };
}

const NAVY  = { argb: "FF1E3A5F" };
const LTBLUE = { argb: "FFD9E1F2" };
const YELLOW = { argb: "FFFFF2CC" };
const WHITE  = { argb: "FFFFFFFF" };
const ITEMBG = { argb: "FFE8F0FE" };

function fillSolid(argb: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function navyCell(cell: ExcelJS.Cell, text: string, size = 11, bold = true) {
  cell.value = text;
  cell.font  = { bold, size, color: WHITE };
  cell.fill  = fillSolid(NAVY.argb);
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
}

// ── Measurement sheet builder ─────────────────────────────────────────────────
// Returns { [gsrtcCode]: excelRowNumber }  — the row where Final Qty (col J) sits

function buildMeasurementSheet(
  wb: ExcelJS.Workbook,
  sheet: MeasurementSheetExport,
  projectTitle: string,
): Record<string, number> {
  const ws = wb.addWorksheet(safe(sheet.name), {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true },
  });

  // Fixed 10-column layout  A B C D E F G H I J
  [8, 14, 52, 7, 10, 10, 10, 12, 8, 12].forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  const mergeFullRow = (rn: number) => ws.mergeCells(rn, 1, rn, 10);

  // ── Rows 1–6: header block ─────────────────────────────────────────────────
  mergeFullRow(1);
  navyCell(ws.getCell("A1"), projectTitle, 12);
  ws.getRow(1).height = 28;

  mergeFullRow(2); ws.getRow(2).height = 6;

  mergeFullRow(3);
  navyCell(ws.getCell("A3"), "Measurement Sheet", 11);
  ws.getRow(3).height = 22;

  mergeFullRow(4); ws.getRow(4).height = 6;

  mergeFullRow(5);
  navyCell(ws.getCell("A5"), `${sheet.name} Qty`, 11);
  ws.getRow(5).height = 22;

  mergeFullRow(6); ws.getRow(6).height = 6;

  // ── Row 7: column headers ──────────────────────────────────────────────────
  const HDR_LABELS = ["Item\nNO.", "GSRTC\nCode", "Description of Item", "NO", "L", "B", "H", "QTY", "UNIT", "Final\nQty"];
  const hr = ws.getRow(7);
  HDR_LABELS.forEach((h, i) => {
    const cell = hr.getCell(i + 1);
    cell.value = h;
    cell.font  = { bold: true, color: WHITE };
    cell.fill  = fillSolid(NAVY.argb);
    cell.border = b("thin");
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });
  hr.height = 28;

  // ── Group rows by itemNo ───────────────────────────────────────────────────
  const groups: [number, MeasurementRowExport[]][] = [];
  const seen = new Map<number, number>();
  for (const row of sheet.rows) {
    const gi = seen.get(row.itemNo);
    if (gi !== undefined) groups[gi][1].push(row);
    else { seen.set(row.itemNo, groups.length); groups.push([row.itemNo, [row]]); }
  }

  let cur = 8;
  const itemHeaderRows: Record<string, number> = {};

  for (const [itemNo, rows] of groups) {
    const code    = rows[0].gsrtcCode || "";
    const desc    = rows[0].description;
    const unit    = rows[0].unit;
    const totalQty = rows.reduce((s, r) => s + r.quantity, 0);

    const headerRow = cur;
    const measStart = cur + 2;            // skip header + blank
    const measEnd   = measStart + rows.length - 1;
    const totalRow  = measEnd + 1;

    if (code) itemHeaderRows[code] = headerRow;

    // ── Item header row ──────────────────────────────────────────────────────
    {
      const r = ws.getRow(headerRow);
      r.getCell(1).value = itemNo;
      r.getCell(2).value = code || null;

      ws.mergeCells(headerRow, 3, headerRow, 9);
      const dc = r.getCell(3);
      dc.value = desc;
      dc.alignment = { wrapText: true, vertical: "middle" };

      // J = Final Qty formula (references totalRow's H col = SUM)
      const jc = r.getCell(10);
      jc.value = { formula: `H${totalRow}`, result: totalQty };
      jc.font  = { bold: true };
      jc.numFmt = "#,##0.000";
      jc.alignment = { horizontal: "center", vertical: "middle" };

      [1, 2, 3, 10].forEach((c) => {
        r.getCell(c).border = b("thin");
        r.getCell(c).fill   = fillSolid(ITEMBG.argb);
      });
      [1, 2].forEach((c) => { r.getCell(c).alignment = { horizontal: "center", vertical: "middle" }; });
      r.height = 36;
    }
    cur++;

    // ── Blank spacer ──────────────────────────────────────────────────────────
    ws.getRow(cur).height = 4;
    cur++;

    // ── Measurement rows ─────────────────────────────────────────────────────
    for (const mr of rows) {
      const nos = mr.nos;
      const L   = mr.length;
      const B   = mr.breadth;
      const H   = mr.height;
      const qty = mr.quantity;

      const r = ws.getRow(cur);
      [4, 5, 6, 7].forEach((c, i) => {
        const val = [nos, L, B, H][i];
        if (val !== null) r.getCell(c).value = val;
        r.getCell(c).border = b("hair");
        r.getCell(c).alignment = { horizontal: "center" };
      });

      const hasAny = nos !== null || L !== null || B !== null || H !== null;
      r.getCell(8).value = hasAny
        ? { formula: `IF(D${cur}="",1,D${cur})*IF(E${cur}="",1,E${cur})*IF(F${cur}="",1,F${cur})*IF(G${cur}="",1,G${cur})`, result: qty }
        : qty;
      r.getCell(8).numFmt = "#,##0.000";
      r.getCell(8).alignment = { horizontal: "center" };
      r.getCell(8).border = b("hair");

      r.getCell(9).value = mr.unit;
      r.getCell(9).alignment = { horizontal: "center" };
      r.getCell(9).border = b("hair");

      r.height = 18;
      cur++;
    }

    // ── Total row ────────────────────────────────────────────────────────────
    {
      const r = ws.getRow(cur);
      r.getCell(7).value = "Total";
      r.getCell(7).font  = { bold: true };
      r.getCell(7).alignment = { horizontal: "right" };
      r.getCell(8).value = { formula: `SUM(H${measStart}:H${measEnd})`, result: totalQty };
      r.getCell(8).font  = { bold: true };
      r.getCell(8).numFmt = "#,##0.000";
      r.getCell(8).alignment = { horizontal: "center" };
      r.getCell(9).value = unit;
      r.getCell(9).alignment = { horizontal: "center" };

      [7, 8, 9].forEach((c) => {
        r.getCell(c).border = b("thin");
        r.getCell(c).fill   = fillSolid(YELLOW.argb);
      });
      r.height = 18;
      cur++;
    }

    // Blank separator
    ws.getRow(cur).height = 8;
    cur++;
  }

  return itemHeaderRows;
}

// ── Main export function ──────────────────────────────────────────────────────

export async function generateBOQExcel(data: BOQExportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "BOQ Engine Pro";
  wb.created = new Date();

  const isCivil = !data.subWork || data.subWork === "Civil";
  const sheets  = isCivil ? (data.measurementSheets ?? []) : [];
  const projDiv = data.project.sorDivision || data.project.district || "";
  const projTitle = `NAME OF WORK :- ${data.project.name}${projDiv ? ` @ ${projDiv} Division` : ""}`;

  // ── 1. Summary worksheet ──────────────────────────────────────────────────
  const sumWs = wb.addWorksheet("Summary");
  sumWs.getColumn(1).width = 6;
  sumWs.getColumn(2).width = 30;
  sumWs.getColumn(3).width = 22;
  sumWs.getColumn(4).width = 22;

  const bd = data.breakdown;
  const tenderAmt  = bd?.tenderAmount  ?? (data.totalAmount * 1.01);
  const estimAmt   = bd?.estimatedAmount ?? data.grandTotal;
  const netEst     = bd?.netEstimated   ?? Math.ceil(data.grandTotal);

  sumWs.mergeCells("A1:D1");
  navyCell(sumWs.getCell("A1"), projTitle, 12);
  sumWs.getRow(1).height = 28;

  sumWs.mergeCells("A2:D2"); sumWs.getRow(2).height = 6;

  sumWs.mergeCells("A3:D3");
  navyCell(sumWs.getCell("A3"), "SUMMARY", 12);
  sumWs.getRow(3).height = 22;

  sumWs.mergeCells("A4:D4"); sumWs.getRow(4).height = 6;

  // Headers
  const sumHdr = sumWs.getRow(5);
  ["No.", "Description", "Estimated Amount (Rs.)", "Tender Amount (Rs.)"].forEach((h, i) => {
    const c = sumHdr.getCell(i + 1);
    c.value = h; c.font = { bold: true, color: WHITE };
    c.fill = fillSolid(NAVY.argb); c.border = b("thin");
    c.alignment = { horizontal: "center", vertical: "middle" };
  });
  sumHdr.height = 22;

  // Work type row
  const sumData = sumWs.getRow(6);
  const sumWorkLabel = isCivil ? "Civil Work" : (data.subWork || "Civil Work");
  [1, sumWorkLabel, estimAmt, tenderAmt].forEach((v, i) => {
    const c = sumData.getCell(i + 1);
    c.value = v as number | string;
    c.border = b("thin");
    if (i >= 2) { c.numFmt = "#,##0.00"; c.alignment = { horizontal: "right" }; }
  });

  // Total row
  const sumTotal = sumWs.getRow(7);
  sumWs.mergeCells("A7:B7");
  sumTotal.getCell(1).value = "TOTAL :-";
  sumTotal.getCell(1).font = { bold: true };
  sumTotal.getCell(1).alignment = { horizontal: "right" };
  [3, 4].forEach((c, i) => {
    sumTotal.getCell(c).value = [estimAmt, tenderAmt][i];
    sumTotal.getCell(c).font = { bold: true };
    sumTotal.getCell(c).numFmt = "#,##0.00";
    sumTotal.getCell(c).alignment = { horizontal: "right" };
    sumTotal.getCell(c).border = b("thin");
  });

  // SAY row
  const sumSay = sumWs.getRow(8);
  sumWs.mergeCells("A8:B8");
  sumSay.getCell(1).value = "SAY :-";
  sumSay.getCell(1).font = { bold: true };
  sumSay.getCell(1).alignment = { horizontal: "right" };
  [3, 4].forEach((c, i) => {
    sumSay.getCell(c).value = [netEst, Math.ceil(tenderAmt)][i];
    sumSay.getCell(c).font = { bold: true };
    sumSay.getCell(c).numFmt = "#,##0.00";
    sumSay.getCell(c).fill = fillSolid(YELLOW.argb);
    sumSay.getCell(c).alignment = { horizontal: "right" };
    sumSay.getCell(c).border = b("thin");
  });

  // Signature rows
  const sigRow = 14;
  sumWs.mergeCells(`A${sigRow}:D${sigRow}`);
  sumWs.getCell(`A${sigRow}`).value = "       Dy. Engg  (Tech)                    Div. Acc.                    Executive Engineer";
  sumWs.mergeCells(`A${sigRow+1}:D${sigRow+1}`);
  sumWs.getCell(`A${sigRow+1}`).value = `   GSRTC, ${projDiv || "Division"}`;

  // ── 2. BOQ worksheet (first tab) ─────────────────────────────────────────
  const boqWs = wb.addWorksheet("BOQ", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true },
  });
  const N    = sheets.length;
  const CA   = 1;                // Item No.
  const CB   = 2;                // Item Code
  const CC   = 3;                // Type of Work
  const CD   = 4;                // Description
  const CSH  = 5;                // first sheet-qty column
  const CTQ  = CSH + N;          // Total Qty
  const CU   = CTQ + 1;          // Unit
  const CR   = CU  + 1;          // Rate
  const CAM  = CR  + 1;          // Amount
  const LAST = CAM;

  boqWs.getColumn(CA).width = 8;
  boqWs.getColumn(CB).width = 12;
  boqWs.getColumn(CC).width = 16;
  boqWs.getColumn(CD).width = 55;
  for (let i = 0; i < N; i++) boqWs.getColumn(CSH + i).width = 13;
  boqWs.getColumn(CTQ).width = 12;
  boqWs.getColumn(CU).width  = 8;
  boqWs.getColumn(CR).width  = 13;
  boqWs.getColumn(CAM).width = 15;

  // Row 1: Project title
  boqWs.mergeCells(1, 1, 1, LAST);
  navyCell(boqWs.getCell("A1"), projTitle, 12);
  boqWs.getRow(1).height = 28;

  // Row 2: blank
  boqWs.getRow(2).height = 6;

  // Row 3: sheet title — "ESTIMATE SHEET" for Civil, "NAME OF WORK ESTIMATE SHEET – X" for others
  boqWs.mergeCells(3, 1, 3, LAST);
  const estCell = boqWs.getCell("A3");
  estCell.value = isCivil
    ? "ESTIMATE SHEET"
    : `NAME OF WORK ESTIMATE SHEET – ${(data.subWork || "WORK").toUpperCase()}`;
  estCell.font  = { bold: true, size: 12 };
  estCell.alignment = { horizontal: "center" };
  boqWs.getRow(3).height = 22;

  // Row 4: blank
  boqWs.getRow(4).height = 6;

  // Row 5: Column headers
  const boqHdrs = [
    "Item No.", "Item Code", "Type of Work", "Item Description",
    ...sheets.map((s) => `${s.name} Qty`),
    "Total Qty", "Unit", "Rate (₹)", "Amount (₹)",
  ];
  const boqHdrRow = boqWs.getRow(5);
  boqHdrs.forEach((h, i) => {
    const cell = boqHdrRow.getCell(i + 1);
    cell.value = h;
    cell.font  = { bold: true, color: WHITE };
    cell.fill  = fillSolid(NAVY.argb);
    cell.border = b("medium");
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });
  boqHdrRow.height = 35;
  const HDR = 5;

  // ── 3. Build measurement sheets + collect header row refs ─────────────────
  const allCellRefs: Record<string, Record<string, number>> = {};
  for (const sheet of sheets) {
    allCellRefs[sheet.id] = buildMeasurementSheet(wb, sheet, projTitle);
  }

  // ── 4. Write BOQ data rows ────────────────────────────────────────────────
  let curR = HDR + 1;
  const dataStart = curR;

  for (let ii = 0; ii < data.items.length; ii++) {
    const item = data.items[ii];
    const sq   = item.sheetQtys;
    const code = item.gsrtcCode || item.itemCode || "";

    const row = boqWs.getRow(curR);

    row.getCell(CA).value = ii + 1;
    row.getCell(CA).alignment = { horizontal: "center", vertical: "top" };

    row.getCell(CB).value = code;
    row.getCell(CB).alignment = { horizontal: "center", vertical: "top" };

    row.getCell(CC).value = item.chapter || "";
    row.getCell(CC).alignment = { wrapText: true, vertical: "top" };

    row.getCell(CD).value = item.description;
    row.getCell(CD).alignment = { wrapText: true, vertical: "top" };

    // Per-sheet qty columns with formula link to measurement sheet Final Qty
    for (let si = 0; si < N; si++) {
      const sh    = sheets[si];
      const shSafe = safe(sh.name);
      const headerRowNum = allCellRefs[sh.id]?.[code];

      const cell = row.getCell(CSH + si);
      if (sq?.[sh.id] && headerRowNum) {
        // ='Main BS'!J8  — the Final Qty cell in the measurement sheet
        cell.value = { formula: `${Q(shSafe)}!J${headerRowNum}`, result: sq[sh.id].qty };
      } else {
        cell.value = 0;
      }
      cell.numFmt = "#,##0.000";
      cell.alignment = { horizontal: "center", vertical: "top" };
    }

    // Total Qty = E+F+... (sum of all sheet-qty cols)
    const sheetColSum = N > 0
      ? sheets.map((_, si) => A(CSH + si, curR)).join("+")
      : "0";
    const tqCell = row.getCell(CTQ);
    tqCell.value  = { formula: sheetColSum, result: item.quantity };
    tqCell.numFmt = "#,##0.000";
    tqCell.font   = { bold: true };
    tqCell.alignment = { horizontal: "center", vertical: "top" };

    row.getCell(CU).value = item.unit;
    row.getCell(CU).alignment = { horizontal: "center", vertical: "top" };

    row.getCell(CR).value  = item.rate;
    row.getCell(CR).numFmt = "#,##0.00";
    row.getCell(CR).alignment = { horizontal: "right", vertical: "top" };

    // Amount = TotalQty × Rate
    const amtCell = row.getCell(CAM);
    amtCell.value  = { formula: `${A(CTQ, curR)}*${A(CR, curR)}`, result: item.amount };
    amtCell.numFmt = "#,##0.00";
    amtCell.font   = { bold: true };
    amtCell.alignment = { horizontal: "right", vertical: "top" };

    row.eachCell({ includeEmpty: true }, (cell, ci) => {
      if (ci <= LAST) cell.border = b("hair");
    });
    row.height = 40;

    curR++;
  }

  const dataEnd = curR - 1;

  // ── 5. Footer breakdown rows ──────────────────────────────────────────────
  const AC = C(CAM);  // Amount column letter

  const R_TOTAL  = dataEnd + 1;
  const R_WELF   = R_TOTAL  + 1;
  const R_TENDER = R_WELF   + 1;
  const R_GST    = R_TENDER + 1;
  const R_TGST   = R_GST    + 1;
  const R_CONT5  = R_TGST   + 1;
  const R_CONT2  = R_CONT5  + 1;
  const R_EST    = R_CONT2  + 1;
  const R_NET    = R_EST    + 1;

  const footerDefs: [number, string, string, boolean][] = [
    [R_TOTAL,  "Total Rs. :-",                `SUM(${AC}${dataStart}:${AC}${dataEnd})`,                          false],
    [R_WELF,   "1% Rs. :-",                    `${AC}${R_TOTAL}*0.01`,                                            false],
    [R_TENDER, "Tender Amount Rs. :-",          `${AC}${R_TOTAL}+${AC}${R_WELF}`,                                 true ],
    [R_GST,    "GST 18% Rs. :-",               `${AC}${R_TENDER}*0.18`,                                           false],
    [R_TGST,   "Total Amount Rs. :-",           `${AC}${R_TENDER}+${AC}${R_GST}`,                                 true ],
    [R_CONT5,  "5%  Rs. :-",                   `${AC}${R_TGST}*0.05`,                                             false],
    [R_CONT2,  "2%  Rs. :-",                   `${AC}${R_TGST}*0.02`,                                             false],
    [R_EST,    "Estimated Amount Rs. :-",       `${AC}${R_TGST}+${AC}${R_CONT5}+${AC}${R_CONT2}`,                 true ],
    [R_NET,    "Net Estimated Amount Rs. :-",   `CEILING(${AC}${R_EST},1)`,                                        true ],
  ];

  for (const [rn, label, formula, isBold] of footerDefs) {
    // Merge label: A through column before Amount
    boqWs.mergeCells(rn, 1, rn, LAST - 1);

    const r   = boqWs.getRow(rn);
    r.height  = 22;

    const lc  = r.getCell(1);
    lc.value  = label;
    lc.font   = { bold: true };
    lc.alignment = { horizontal: "right", vertical: "middle" };
    lc.border = b("thin");

    const vc  = r.getCell(LAST);
    vc.value  = { formula, result: 0 };
    vc.numFmt = "#,##0.00";
    vc.font   = { bold: isBold };
    vc.alignment = { horizontal: "right", vertical: "middle" };
    vc.border = b("medium");
  }

  // Highlight Net Estimated Amount row
  const netR = boqWs.getRow(R_NET);
  netR.height = 26;
  netR.getCell(1).fill   = fillSolid(NAVY.argb);
  netR.getCell(1).font   = { bold: true, size: 12, color: WHITE };
  netR.getCell(LAST).fill = fillSolid(NAVY.argb);
  netR.getCell(LAST).font = { bold: true, size: 12, color: WHITE };

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
