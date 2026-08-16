// Runs as a child process: node pdf-extract-worker.mjs <pdfPath>
// Outputs: SORTED_TEXT\n===RAW===\nRAW_TEXT
// Falls back to OCR (tesseract.js) when PDF text is vector outlines

import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import mupdf from 'mupdf';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const workerUrl = new URL('../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).href;
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const pdfPath = process.argv[2];
if (!pdfPath) { process.stderr.write('No PDF path\n'); process.exit(1); }

const MIN_TEXT = 50; // chars — below this, try OCR

async function extractTextFromItems(items) {
  const sorted = [...items]
    .filter(i => i.str && i.str.trim())
    .sort((a, b) => {
      const yd = b.transform[5] - a.transform[5];
      return Math.abs(yd) > 8 ? yd : a.transform[4] - b.transform[4];
    });

  const lines = []; let cur = []; let lastY = null;
  for (const item of sorted) {
    const y = Math.round(item.transform[5]);
    if (lastY === null || Math.abs(y - lastY) > 8) { if (cur.length) lines.push(cur); cur = [item.str]; lastY = y; }
    else cur.push(item.str);
  }
  if (cur.length) lines.push(cur);
  return lines.map(l => l.join('  ')).join('\n');
}

// mupdfDoc is loaded once per worker run to avoid re-parsing the PDF for each page
let _mupdfDoc = null;
function getMupdfDoc(pdfBuffer) {
  if (!_mupdfDoc) _mupdfDoc = mupdf.Document.openDocument(pdfBuffer, 'application/pdf');
  return _mupdfDoc;
}

async function ocrPage(pdfBuffer, pageNum) {
  // Render PDF page to PNG using mupdf (works in Node.js, no canvas needed)
  const doc = getMupdfDoc(pdfBuffer);
  const page = doc.loadPage(pageNum - 1); // 0-indexed
  const matrix = mupdf.Matrix.scale(2.5, 2.5);
  const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false, true);
  const pngBuffer = pixmap.asPNG();

  const tmpPng = join(tmpdir(), `ocr-page-${pageNum}-${Date.now()}.png`);
  writeFileSync(tmpPng, pngBuffer);

  try {
    const { createWorker } = require('tesseract.js');
    const worker = await createWorker('eng', 1, {
      logger: () => {},
      errorHandler: () => {},
    });
    await worker.setParameters({ tessedit_pageseg_mode: '3' });
    const { data: { text } } = await worker.recognize(tmpPng);
    await worker.terminate();
    return text.trim();
  } finally {
    try { unlinkSync(tmpPng); } catch {}
  }
}

try {
  const buffer = readFileSync(pdfPath);
  const data = new Uint8Array(buffer);
  const doc = await pdfjs.getDocument({ data }).promise;

  const sortedParts = [];
  const rawParts = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const allItems = content.items.filter(i => i.str && i.str.trim());

    // Raw draw-order text
    const rawText = allItems.map(i => i.str).join('  ');
    const sortedText = await extractTextFromItems(allItems);

    const hasText = (rawText.length + sortedText.length) >= MIN_TEXT;

    if (hasText) {
      sortedParts.push(sortedText);
      rawParts.push(rawText);
    } else {
      // Vector outline PDF — render with mupdf and OCR
      process.stderr.write(`[page ${p}] text too short (${rawText.length} chars), trying OCR...\n`);
      const ocrText = await ocrPage(buffer, p);
      process.stderr.write(`[page ${p}] OCR got ${ocrText.length} chars\n`);
      sortedParts.push(ocrText);
      rawParts.push(ocrText);
    }
  }

  const sortedOutput = sortedParts.join('\n--- PAGE BREAK ---\n');
  const rawOutput   = rawParts.join('\n--- PAGE BREAK ---\n');
  process.stdout.write(sortedOutput + '\n===RAW===\n' + rawOutput);
  process.exit(0);
} catch (err) {
  process.stderr.write(String(err) + '\n');
  process.exit(1);
}
