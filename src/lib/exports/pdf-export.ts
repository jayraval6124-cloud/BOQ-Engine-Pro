import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from "pdf-lib";

// ── Types (shared with excel-export) ─────────────────────────────────────────

interface MeasurementRowExport {
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

interface MeasurementSheetExport {
  id: string;
  name: string;
  rows: MeasurementRowExport[];
}

export interface BOQExportData {
  boqNo: string;
  name: string;
  revisionNo: number;
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
  items: Array<{
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
  }>;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PW    = 841.89;   // A4 landscape width
const PH    = 595.28;
const MARG  = 28;
const CW    = PW - MARG * 2;  // ~785

const NAVY  = rgb(0.118, 0.231, 0.372);
const YELL  = rgb(1,     0.949, 0.800);
const IBGD  = rgb(0.910, 0.941, 0.996);
const WHITE = rgb(1,     1,     1);
const BLACK = rgb(0,     0,     0);
const GRAY  = rgb(0.4,   0.4,   0.4);
const DGRAY = rgb(0.2,   0.2,   0.2);
const LINE  = rgb(0.7,   0.7,   0.7);

// ── Helpers ───────────────────────────────────────────────────────────────────

function rupee(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function num(n: number | null | undefined, dec = 3) {
  if (n === null || n === undefined) return "";
  return n.toLocaleString("en-IN", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function wrapText(text: string, fnt: PDFFont, size: number, maxW: number): string[] {
  if (!text) return [""];
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (fnt.widthOfTextAtSize(test, size) <= maxW) { cur = test; }
    else { if (cur) lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

function truncate(text: string, fnt: PDFFont, size: number, maxW: number): string {
  let t = String(text ?? "");
  if (fnt.widthOfTextAtSize(t, size) <= maxW) return t;
  while (t.length > 0 && fnt.widthOfTextAtSize(t + "…", size) > maxW) t = t.slice(0, -1);
  return t + "…";
}

// ── Drawing Primitives ────────────────────────────────────────────────────────

type DrawCtx = { page: PDFPage; font: PDFFont; bold: PDFFont };

function fillRect(ctx: DrawCtx, x: number, y: number, w: number, h: number, color: ReturnType<typeof rgb>) {
  ctx.page.drawRectangle({ x, y, width: w, height: h, color, borderWidth: 0 });
}

function border(ctx: DrawCtx, x: number, y: number, w: number, h: number, c = LINE, lw = 0.4) {
  ctx.page.drawRectangle({ x, y, width: w, height: h, borderColor: c, borderWidth: lw });
}

function text(
  ctx: DrawCtx,
  t: string,
  x: number,
  y: number,
  size: number,
  bold = false,
  color: ReturnType<typeof rgb> = BLACK,
  maxW?: number,
) {
  const fnt = bold ? ctx.bold : ctx.font;
  const str = maxW !== undefined ? truncate(t, fnt, size, maxW) : t;
  if (!str) return;
  ctx.page.drawText(str, { x, y, size, font: fnt, color });
}

// Draw a full-width navy banner row; returns new y (below the banner)
function banner(ctx: DrawCtx, y: number, label: string, h = 22, size = 11) {
  fillRect(ctx, MARG, y - h, CW, h, NAVY);
  border(ctx, MARG, y - h, CW, h, NAVY);
  ctx.page.drawText(label, { x: MARG + 6, y: y - h + (h - size) / 2 + 1, size, font: ctx.bold, color: WHITE });
  return y - h;
}

// Draw a navy cell header at x,y with width w and height h
function hdrCell(ctx: DrawCtx, x: number, y: number, w: number, h: number, label: string, size = 8, center = true) {
  fillRect(ctx, x, y - h, w, h, NAVY);
  border(ctx, x, y - h, w, h, rgb(0.5, 0.6, 0.7), 0.5);
  const tw = ctx.bold.widthOfTextAtSize(label, size);
  const tx = center ? x + (w - tw) / 2 : x + 2;
  ctx.page.drawText(label, { x: tx, y: y - h + (h - size) / 2 + 1, size, font: ctx.bold, color: WHITE });
}

// Draw a data cell
function dataCell(
  ctx: DrawCtx, x: number, y: number, w: number, h: number,
  label: string, size = 8, bold = false, align: "l" | "c" | "r" = "l",
  bg?: ReturnType<typeof rgb>,
) {
  if (bg) fillRect(ctx, x, y - h, w, h, bg);
  border(ctx, x, y - h, w, h, LINE, 0.3);
  if (!label) return;
  const fnt = bold ? ctx.bold : ctx.font;
  const tw  = fnt.widthOfTextAtSize(label, size);
  let tx = x + 2;
  if (align === "c") tx = x + (w - tw) / 2;
  else if (align === "r") tx = x + w - tw - 2;
  ctx.page.drawText(label, { x: tx, y: y - h + (h - size) / 2 + 1, size, font: fnt, color: BLACK });
}

// ── Context / page management ─────────────────────────────────────────────────

class Ctx {
  doc: PDFDocument;
  page!: PDFPage;
  font!: PDFFont;
  bold!: PDFFont;
  y = 0;
  private dc!: DrawCtx;

  constructor(doc: PDFDocument) { this.doc = doc; }

  async init() {
    this.font = await this.doc.embedFont(StandardFonts.Helvetica);
    this.bold = await this.doc.embedFont(StandardFonts.HelveticaBold);
    this.newPage();
  }

  newPage() {
    this.page = this.doc.addPage([PW, PH]);
    this.y = PH - MARG;
    this.dc = { page: this.page, font: this.font, bold: this.bold };
  }

  needsBreak(h: number) { return this.y - h < MARG + 30; }

  get dc_(): DrawCtx { return this.dc; }
}

// ── Section: Summary ──────────────────────────────────────────────────────────

function drawSummary(ctx: Ctx, data: BOQExportData, title: string) {
  const dc = ctx.dc_;
  const bd = data.breakdown;
  const tenderAmt  = bd?.tenderAmount  ?? (data.totalAmount * 1.01);
  const estimAmt   = bd?.estimatedAmount ?? data.grandTotal;

  // Title banner
  ctx.y = banner(dc, ctx.y, title, 26, 11);
  ctx.y -= 5;

  // SUMMARY banner
  ctx.y = banner(dc, ctx.y, "SUMMARY", 22, 11);
  ctx.y -= 4;

  // Column header
  const cols = [40, 280, 200, 200];
  const xs   = [MARG, MARG + 40, MARG + 320, MARG + 520];
  const HH   = 20;

  ["No.", "Description", "Estimated Amount (Rs.)", "Tender Amount (Rs.)"].forEach((h, i) => {
    hdrCell(dc, xs[i], ctx.y, cols[i], HH, h, 9);
  });
  ctx.y -= HH;

  // Civil Work
  const ROW = 20;
  [["1", "c"], ["Civil Work", "l"], [rupee(estimAmt), "r"], [rupee(tenderAmt), "r"]].forEach(([v, al], i) => {
    dataCell(dc, xs[i], ctx.y, cols[i], ROW, v, 9, false, al as "l" | "c" | "r");
  });
  ctx.y -= ROW;

  // TOTAL
  dataCell(dc, xs[0], ctx.y, xs[2] - xs[0], ROW, "TOTAL :-", 9, true, "r");
  dataCell(dc, xs[2], ctx.y, cols[2], ROW, rupee(estimAmt), 9, true, "r", YELL);
  dataCell(dc, xs[3], ctx.y, cols[3], ROW, rupee(tenderAmt), 9, true, "r", YELL);
  ctx.y -= ROW;

  // SAY
  dataCell(dc, xs[0], ctx.y, xs[2] - xs[0], ROW, "SAY :-", 9, true, "r");
  dataCell(dc, xs[2], ctx.y, cols[2], ROW, rupee(Math.ceil(estimAmt)), 9, true, "r", YELL);
  dataCell(dc, xs[3], ctx.y, cols[3], ROW, rupee(Math.ceil(tenderAmt)), 9, true, "r", YELL);
  ctx.y -= ROW;
  ctx.y -= 30;

  // Signature block
  text(dc, "Dy. Engg  (Tech)", MARG + 10, ctx.y, 9, false, DGRAY);
  text(dc, "Div. Acc.", MARG + 250, ctx.y, 9, false, DGRAY);
  text(dc, "Executive Engineer", MARG + 500, ctx.y, 9, false, DGRAY);
  ctx.y -= 14;
  text(dc, `GSRTC, ${data.project.sorDivision || "Division"}`, MARG + 10, ctx.y, 9, false, DGRAY);
}

// ── Section: BOQ / Abstract (Estimate Sheet) ──────────────────────────────────

function drawBOQSection(ctx: Ctx, data: BOQExportData, title: string) {
  const dc = ctx.dc_;
  const bd = data.breakdown;

  // ABSTRACT format: No | GSRTC Code | Description | Qty | Unit | Rate | Amount
  const W_NO  = 28;
  const W_COD = 62;
  const W_DSC = 390;
  const W_QTY = 65;
  const W_U   = 40;
  const W_R   = 70;
  const W_AM  = 85;
  const colW  = [W_NO, W_COD, W_DSC, W_QTY, W_U, W_R, W_AM];
  const colX: number[] = [MARG];
  for (let i = 0; i < colW.length - 1; i++) colX.push(colX[i] + colW[i]);
  const totalW = colW.reduce((a, v) => a + v, 0);

  const drawHeaders = () => {
    const HH = 24;
    const hdrs = ["No.", "GSRTC\nCode", "Description of Item", "Qty", "Unit", "Rate\n(Rs.)", "Amount\n(Rs.)"];
    const aligns: ("c"|"l"|"c"|"c"|"c"|"r"|"r")[] = ["c","c","l","c","c","r","r"];
    hdrs.forEach((h, i) => {
      fillRect(dc, colX[i], ctx.y - HH, colW[i], HH, NAVY);
      border(dc, colX[i], ctx.y - HH, colW[i], HH, rgb(0.4,0.5,0.6), 0.5);
      const lines = h.split("\n");
      const size = 8;
      const lineH = size + 2;
      const totalH = lines.length * lineH;
      const yStart = ctx.y - (HH - totalH) / 2 - size;
      lines.forEach((ln, li) => {
        const tw = ctx.bold.widthOfTextAtSize(ln, size);
        const tx = aligns[i] === "l" ? colX[i] + 3 : colX[i] + (colW[i] - tw) / 2;
        dc.page.drawText(ln, { x: tx, y: yStart - li * lineH, size, font: ctx.bold, color: WHITE });
      });
    });
    ctx.y -= HH;
  };

  ctx.y = banner(dc, ctx.y, title, 26, 11);
  ctx.y -= 4;
  // ABSTRACT / ESTIMATE SHEET label
  fillRect(dc, MARG, ctx.y - 20, totalW, 20, rgb(0.93, 0.95, 0.98));
  border(dc, MARG, ctx.y - 20, totalW, 20, LINE, 0.5);
  const lbl = "ABSTRACT / ESTIMATE SHEET";
  const lblW = ctx.bold.widthOfTextAtSize(lbl, 10);
  dc.page.drawText(lbl, { x: MARG + (totalW - lblW) / 2, y: ctx.y - 15, size: 10, font: ctx.bold, color: NAVY });
  ctx.y -= 20;
  ctx.y -= 3;
  drawHeaders();

  for (let ii = 0; ii < data.items.length; ii++) {
    const item = data.items[ii];
    const descLines = wrapText(item.description, ctx.font, 8, W_DSC - 5);
    const rowH = Math.max(18, descLines.length * 10 + 4);

    if (ctx.needsBreak(rowH + 4)) {
      ctx.newPage();
      ctx.y = banner(dc, ctx.y, title + " (contd.)", 22, 9);
      ctx.y -= 2;
      drawHeaders();
    }

    const bg = ii % 2 === 0 ? rgb(1,1,1) : rgb(0.98, 0.99, 1);
    dataCell(dc, colX[0], ctx.y, colW[0], rowH, String(ii + 1), 8, false, "c", bg);
    dataCell(dc, colX[1], ctx.y, colW[1], rowH, item.gsrtcCode || item.itemCode || "", 7.5, false, "c", bg);

    // Description — multi-line
    if (bg) fillRect(dc, colX[2], ctx.y - rowH, colW[2], rowH, bg);
    border(dc, colX[2], ctx.y - rowH, colW[2], rowH, LINE, 0.3);
    const lineH = 9;
    const yT = ctx.y - (rowH - descLines.length * lineH) / 2 - 8;
    descLines.forEach((ln, li) => {
      dc.page.drawText(ln, { x: colX[2] + 3, y: yT - li * lineH, size: 8, font: ctx.font, color: BLACK });
    });

    dataCell(dc, colX[3], ctx.y, colW[3], rowH, num(item.quantity), 8, true, "r", bg);
    dataCell(dc, colX[4], ctx.y, colW[4], rowH, item.unit, 8, false, "c", bg);
    dataCell(dc, colX[5], ctx.y, colW[5], rowH, rupee(item.rate), 8, false, "r", bg);
    dataCell(dc, colX[6], ctx.y, colW[6], rowH, rupee(item.amount), 8, true, "r", bg);
    ctx.y -= rowH;
  }

  // Footer totals
  ctx.y -= 4;
  const totalRs     = data.items.reduce((s, i) => s + i.amount, 0);
  const welfareCess = totalRs * 0.01;
  const tenderAmt   = totalRs + welfareCess;
  const gst18       = tenderAmt * 0.18;
  const totalGST    = tenderAmt + gst18;
  const cont5       = totalGST * 0.05;
  const cont2       = totalGST * 0.02;
  const estimAmt    = totalGST + cont5 + cont2;
  const netEst      = Math.ceil(estimAmt);

  const footerRows: [string, number, boolean][] = [
    ["Total Rs.",                   bd?.totalRs          ?? totalRs,    false],
    ["1% Welfare Cess Rs.",          bd?.welfareCess      ?? welfareCess, false],
    ["Tender Amount Rs.",            bd?.tenderAmount     ?? tenderAmt,  true ],
    ["18% GST Rs.",                  bd?.gst18            ?? gst18,      false],
    ["Total Amount (with GST) Rs.",  bd?.totalWithGST     ?? totalGST,   false],
    ["5% Contingencies Rs.",         bd?.contingency5     ?? cont5,      false],
    ["2% Work Contingency Rs.",      bd?.workContingency2 ?? cont2,      false],
    ["Estimated Amount Rs.",         bd?.estimatedAmount  ?? estimAmt,   true ],
    ["Say Estimated Amount Rs.",     bd?.netEstimated     ?? netEst,     true ],
  ];

  const amtColW = colW[6];
  const labelW  = totalW - amtColW;

  for (const [label, val, isBold] of footerRows) {
    const isSay = label.startsWith("Say");
    const FH    = isSay ? 20 : 15;
    if (ctx.needsBreak(FH + 2)) { ctx.newPage(); ctx.y = banner(dc, ctx.y, title + " (contd.)", 22, 9); ctx.y -= 2; }

    fillRect(dc, MARG, ctx.y - FH, labelW, FH, isSay ? NAVY : YELL);
    border(dc, MARG, ctx.y - FH, labelW, FH, LINE, 0.4);
    const lw = (isBold ? ctx.bold : ctx.font).widthOfTextAtSize(label, 8.5);
    dc.page.drawText(label, { x: MARG + labelW - lw - 4, y: ctx.y - FH + (FH - 8.5) / 2 + 1, size: 8.5, font: isBold ? ctx.bold : ctx.font, color: isSay ? WHITE : BLACK });

    const amtX = MARG + labelW;
    fillRect(dc, amtX, ctx.y - FH, amtColW, FH, isSay ? NAVY : YELL);
    border(dc, amtX, ctx.y - FH, amtColW, FH, LINE, 0.4);
    const av = rupee(val);
    const aw = (isBold ? ctx.bold : ctx.font).widthOfTextAtSize(av, 8.5);
    dc.page.drawText(av, { x: amtX + amtColW - aw - 3, y: ctx.y - FH + (FH - 8.5) / 2 + 1, size: 8.5, font: isBold ? ctx.bold : ctx.font, color: isSay ? WHITE : BLACK });
    ctx.y -= FH;
  }

  // Signature row
  ctx.y -= 20;
  const sigs = ["Dy. Engg  (Tech)", "Div. Acc.", "Executive Engineer"];
  const sigW = totalW / 3;
  sigs.forEach((s, i) => {
    text(dc, s, MARG + i * sigW + 10, ctx.y, 8.5, false, DGRAY);
  });
}

// ── Section: Measurement Sheets ───────────────────────────────────────────────

function drawMeasurementSection(ctx: Ctx, sheet: MeasurementSheetExport, title: string) {
  const dc = ctx.dc_;

  // Always 10 columns
  const W_NO  = 28;
  const W_COD = 58;
  const W_DSC = 320;
  const W_NOS = 28;
  const W_L   = 42;
  const W_B   = 42;
  const W_H   = 42;
  const W_QTY = 60;
  const W_U   = 42;
  const W_FQ  = 60;
  const colW  = [W_NO, W_COD, W_DSC, W_NOS, W_L, W_B, W_H, W_QTY, W_U, W_FQ];
  const colX: number[] = [MARG];
  for (let i = 0; i < 9; i++) colX.push(colX[i] + colW[i]);

  const drawMeasHeaders = () => {
    const HH = 26;
    const hdrs = ["Item\nNO.", "GSRTC\nCode", "Description of Item", "NO", "L", "B", "H", "QTY", "UNIT", "Final\nQty"];
    hdrs.forEach((h, i) => {
      fillRect(dc, colX[i], ctx.y - HH, colW[i], HH, NAVY);
      border(dc, colX[i], ctx.y - HH, colW[i], HH, rgb(0.4, 0.5, 0.6), 0.5);
      const lines = h.split("\n");
      const size  = 7.5;
      const lineH = size + 2;
      const totalH = lines.length * lineH;
      const yStart = ctx.y - (HH - totalH) / 2 - size;
      lines.forEach((ln, li) => {
        const tw = ctx.bold.widthOfTextAtSize(ln, size);
        const tx = colX[i] + (colW[i] - tw) / 2;
        dc.page.drawText(ln, { x: tx, y: yStart - li * lineH, size, font: ctx.bold, color: WHITE });
      });
    });
    ctx.y -= HH;
  };

  // Header block
  ctx.y = banner(dc, ctx.y, title, 24, 11);
  ctx.y -= 3;
  ctx.y = banner(dc, ctx.y, "Measurement Sheet", 20, 10);
  ctx.y -= 3;
  ctx.y = banner(dc, ctx.y, `${sheet.name} Qty`, 20, 10);
  ctx.y -= 3;
  drawMeasHeaders();

  // Group rows by itemNo
  const groups: [number, MeasurementRowExport[]][] = [];
  const seen = new Map<number, number>();
  for (const row of sheet.rows) {
    const gi = seen.get(row.itemNo);
    if (gi !== undefined) groups[gi][1].push(row);
    else { seen.set(row.itemNo, groups.length); groups.push([row.itemNo, [row]]); }
  }

  for (const [itemNo, rows] of groups) {
    const code     = rows[0].gsrtcCode || "";
    const descText = rows[0].description;
    const unit     = rows[0].unit;
    const totalQty = rows.reduce((s, r) => s + r.quantity, 0);

    const descLines = wrapText(descText, ctx.font, 8, W_DSC - 4);
    const itemHdrH  = Math.max(22, descLines.length * 10 + 6);
    const totalRowsH = rows.length * 16 + 18 + 14; // meas rows + total row + spacer

    if (ctx.needsBreak(itemHdrH + totalRowsH)) {
      ctx.newPage();
      ctx.y = banner(dc, ctx.y, title + " (contd.)", 22, 9);
      ctx.y -= 2;
      ctx.y = banner(dc, ctx.y, `${sheet.name} Qty (contd.)`, 18, 9);
      ctx.y -= 2;
      drawMeasHeaders();
    }

    // ── Item header row ──────────────────────────────────────────────────────
    fillRect(dc, colX[0], ctx.y - itemHdrH, colW[0], itemHdrH, IBGD);
    border( dc, colX[0], ctx.y - itemHdrH, colW[0], itemHdrH, LINE, 0.4);
    const noTw = ctx.bold.widthOfTextAtSize(String(itemNo), 8);
    dc.page.drawText(String(itemNo), { x: colX[0] + (W_NO - noTw) / 2, y: ctx.y - itemHdrH / 2 - 3, size: 8, font: ctx.bold, color: BLACK });

    fillRect(dc, colX[1], ctx.y - itemHdrH, colW[1], itemHdrH, IBGD);
    border( dc, colX[1], ctx.y - itemHdrH, colW[1], itemHdrH, LINE, 0.4);
    const cTw = ctx.font.widthOfTextAtSize(code, 8);
    dc.page.drawText(code, { x: colX[1] + (W_COD - cTw) / 2, y: ctx.y - itemHdrH / 2 - 3, size: 8, font: ctx.font, color: BLACK });

    // Description spans cols 3-9 (C-I)
    const descSpanW = colW[2] + colW[3] + colW[4] + colW[5] + colW[6] + colW[7] + colW[8];
    fillRect(dc, colX[2], ctx.y - itemHdrH, descSpanW, itemHdrH, IBGD);
    border( dc, colX[2], ctx.y - itemHdrH, descSpanW, itemHdrH, LINE, 0.4);
    const lineH = 9;
    const yT = ctx.y - (itemHdrH - descLines.length * lineH) / 2 - 8;
    descLines.forEach((ln, li) => {
      dc.page.drawText(ln, { x: colX[2] + 3, y: yT - li * lineH, size: 8, font: ctx.font, color: BLACK });
    });

    // Final Qty (col J)
    fillRect(dc, colX[9], ctx.y - itemHdrH, colW[9], itemHdrH, IBGD);
    border( dc, colX[9], ctx.y - itemHdrH, colW[9], itemHdrH, LINE, 0.4);
    const fqTxt = num(totalQty);
    const fqW   = ctx.bold.widthOfTextAtSize(fqTxt, 8);
    dc.page.drawText(fqTxt, { x: colX[9] + W_FQ - fqW - 3, y: ctx.y - itemHdrH / 2 - 3, size: 8, font: ctx.bold, color: BLACK });

    ctx.y -= itemHdrH;

    // ── Blank spacer ─────────────────────────────────────────────────────────
    ctx.y -= 4;

    // ── Measurement rows ─────────────────────────────────────────────────────
    for (const mr of rows) {
      const MH = 16;
      dataCell(dc, colX[0], ctx.y, colW[0], MH, "",                   8, false, "c");
      dataCell(dc, colX[1], ctx.y, colW[1], MH, "",                   8, false, "c");
      dataCell(dc, colX[2], ctx.y, colW[2], MH, "",                   8, false, "l");
      dataCell(dc, colX[3], ctx.y, colW[3], MH, mr.nos !== null ? num(mr.nos, 0) : "", 8, false, "c");
      dataCell(dc, colX[4], ctx.y, colW[4], MH, mr.length  !== null ? num(mr.length,  2) : "", 8, false, "c");
      dataCell(dc, colX[5], ctx.y, colW[5], MH, mr.breadth !== null ? num(mr.breadth, 2) : "", 8, false, "c");
      dataCell(dc, colX[6], ctx.y, colW[6], MH, mr.height  !== null ? num(mr.height,  2) : "", 8, false, "c");
      dataCell(dc, colX[7], ctx.y, colW[7], MH, num(mr.quantity), 8, false, "c");
      dataCell(dc, colX[8], ctx.y, colW[8], MH, mr.unit, 8, false, "c");
      dataCell(dc, colX[9], ctx.y, colW[9], MH, "", 8, false, "c");
      ctx.y -= MH;
    }

    // ── Total row ────────────────────────────────────────────────────────────
    const TR = 18;
    [0, 1, 2, 3, 4, 5].forEach((ci) => dataCell(dc, colX[ci], ctx.y, colW[ci], TR, "", 8, false, "l", YELL));
    dataCell(dc, colX[6], ctx.y, colW[6], TR, "Total", 8, true, "r", YELL);
    dataCell(dc, colX[7], ctx.y, colW[7], TR, num(totalQty), 8, true, "c", YELL);
    dataCell(dc, colX[8], ctx.y, colW[8], TR, unit, 8, false, "c", YELL);
    dataCell(dc, colX[9], ctx.y, colW[9], TR, "", 8, false, "c", YELL);
    ctx.y -= TR;

    // Spacer between items
    ctx.y -= 8;
  }
}

// ── Pagination footer ─────────────────────────────────────────────────────────

function addPageNumbers(doc: PDFDocument, font: PDFFont) {
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawText(`Page ${i + 1} of ${pages.length}`, {
      x: PW - MARG - 75, y: 14, size: 7.5, font, color: GRAY,
    });
    p.drawText("Generated by BOQ Engine Pro", {
      x: MARG, y: 14, size: 7.5, font, color: GRAY,
    });
  });
}

// ── Main export function ──────────────────────────────────────────────────────

export async function generateBOQPDF(data: BOQExportData): Promise<Uint8Array> {
  const doc  = await PDFDocument.create();
  const ctx  = new Ctx(doc);
  await ctx.init();

  const projDiv  = data.project.sorDivision || data.project.district || "";
  const title    = `NAME OF WORK :- ${data.project.name}${projDiv ? ` @ ${projDiv} Division` : ""}`;

  // ── 1. Summary page ──────────────────────────────────────────────────────
  drawSummary(ctx, data, title);

  // ── 2. BOQ / Estimate sheet ──────────────────────────────────────────────
  ctx.newPage();
  drawBOQSection(ctx, data, title);

  // ── 3. Measurement sheets ────────────────────────────────────────────────
  for (const sheet of data.measurementSheets ?? []) {
    ctx.newPage();
    drawMeasurementSection(ctx, sheet, title);
  }

  // ── 4. Page numbers ──────────────────────────────────────────────────────
  addPageNumbers(doc, ctx.font);

  return doc.save();
}
