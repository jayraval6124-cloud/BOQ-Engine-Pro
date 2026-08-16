import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readFile, writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { spawn } from "child_process";
import { getAISettings, checkOllamaStatus, ollamaGenerate, buildExtractionPrompt, parseOllamaEntities, detectDiscipline } from "@/lib/ollama";

async function extractPdfText(buffer: Buffer): Promise<{ text: string; method: string }> {
  // Write PDF to a temp file, spawn a child Node process to extract text via pdfjs-dist
  const tmpPath = join(tmpdir(), `boq-pdf-${Date.now()}.pdf`);
  try {
    await writeFile(tmpPath, buffer);
    const workerScript = join(process.cwd(), "src/lib/pdf-extract-worker.mjs");

    const text = await new Promise<string>((resolve) => {
      const proc = spawn("node", [workerScript, tmpPath], { env: process.env });
      let out = "";
      let err = "";
      proc.stdout.on("data", (d: Buffer) => { out += d.toString(); });
      proc.stderr.on("data", (d: Buffer) => { err += d.toString(); });
      proc.on("close", (code) => {
        if (code === 0 && out.trim()) resolve(out.trim());
        else { console.error("[pdf-extract-worker] error:", err); resolve(""); }
      });
      setTimeout(() => { proc.kill(); resolve(""); }, 180000);
    });

    await unlink(tmpPath).catch(() => {});
    if (text.length > 0) return { text, method: "pdfjs" };
  } catch (e) {
    console.error("[extractPdfText] spawn failed:", e);
    await unlink(tmpPath).catch(() => {});
  }

  // Fallback: pdf-parse
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse");
    const result = await pdfParse(buffer);
    const text = (result.text ?? "").trim();
    if (text.length > 0) return { text, method: "pdf-parse" };
  } catch (e) {
    console.error("[pdf-parse] failed:", e);
  }

  return { text: "", method: "none" };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const drawing = await prisma.drawing.findUnique({
    where: { id },
    include: { project: { select: { id: true, drawingTemplate: true, name: true } } },
  });
  if (!drawing) return NextResponse.json({ error: "Drawing not found" }, { status: 404 });

  await prisma.drawing.update({ where: { id }, data: { status: "ANALYZING", analysisError: null } });

  try {
    const settings = await getAISettings();
    const ollamaStatus = await checkOllamaStatus(settings);
    if (!ollamaStatus.ok) {
      await prisma.drawing.update({ where: { id }, data: { status: "ERROR", analysisError: `Ollama not available: ${ollamaStatus.error}` } });
      return NextResponse.json({ error: `Ollama not available: ${ollamaStatus.error}` }, { status: 503 });
    }

    const fullPath = join(process.cwd(), "public", drawing.filePath);
    const fileBuffer = await readFile(fullPath);
    const templateType = drawing.project.drawingTemplate ?? "GENERAL";
    const userDiscipline = drawing.discipline ?? "OTHER"; // set by user on upload

    if (drawing.fileType !== "pdf") {
      await prisma.drawing.update({ where: { id }, data: { status: "ERROR", analysisError: "Image files require a vision model. Only digital PDF drawings are supported." } });
      return NextResponse.json({ error: "Image analysis not supported. Upload a digital PDF drawing." }, { status: 422 });
    }

    // Extract text (sorted + raw sections separated by ===RAW===)
    const { text: extractedText, method: extractionLib } = await extractPdfText(fileBuffer);
    const textLength = extractedText.length;

    // Split sorted and raw sections into per-page chunks
    const sepIdx = extractedText.indexOf("===RAW===");
    const sortedSection = sepIdx >= 0 ? extractedText.slice(0, sepIdx) : extractedText;
    const rawSection    = sepIdx >= 0 ? extractedText.slice(sepIdx + 9) : extractedText;

    const sortedChunks = sortedSection.split(/--- PAGE BREAK ---/).map(p => p.trim()).filter(Boolean);
    const rawChunks    = rawSection.split(/--- PAGE BREAK ---/).map(p => p.trim()).filter(Boolean);
    if (sortedChunks.length === 0) sortedChunks.push(sortedSection.trim());

    // Save pages for viewer preview
    for (let i = 0; i < sortedChunks.length; i++) {
      await prisma.drawingPage.upsert({
        where: { drawingId_pageNo: { drawingId: id, pageNo: i + 1 } },
        update: { textContent: sortedChunks[i] },
        create: { drawingId: id, pageNo: i + 1, textContent: sortedChunks[i] },
      });
    }

    await prisma.projectEntity.deleteMany({ where: { drawingId: id } });

    let created = 0;
    const analyzedDisciplines: string[] = [];

    // Process each page independently — auto-detect discipline per page
    for (let i = 0; i < sortedChunks.length; i++) {
      const pageText    = sortedChunks[i];
      const pageRawText = rawChunks[i] ?? pageText; // per-page raw text only

      // Auto-detect discipline from page content; fall back to user-selected discipline
      const detectedDiscipline = pageText.trim().length > 50
        ? detectDiscipline(pageText)
        : userDiscipline;

      // If user explicitly chose a non-OTHER/ARCHITECTURAL discipline, respect it
      const discipline = (userDiscipline !== "OTHER" && userDiscipline !== "ARCHITECTURAL")
        ? userDiscipline
        : detectedDiscipline !== "OTHER" ? detectedDiscipline : userDiscipline;

      if (!analyzedDisciplines.includes(discipline)) analyzedDisciplines.push(discipline);

      // Send this page's sorted + raw text to LLM (NOT all pages' raw)
      const pageFullText = pageText + (pageRawText !== pageText ? "\n===RAW===\n" + pageRawText : "");

      const prompt = buildExtractionPrompt(templateType, pageFullText, discipline);
      const rawResponse = await ollamaGenerate(prompt, settings);
      const entities = parseOllamaEntities(rawResponse);

      for (const ent of entities) {
        if (!ent.entityType) continue;
        await prisma.projectEntity.create({
          data: {
            projectId: drawing.projectId,
            drawingId: id,
            entityType: ent.entityType.toUpperCase(),
            entityLabel: ent.entityLabel ?? null,
            attributes: { ...ent.attributes, _page: { value: String(i + 1), unit: null } },
            extractionMethod: extractionLib.toUpperCase(),
            confidence: ent.confidence ?? null,
            status: "NEEDS_VERIFICATION",
            notes: `Page ${i + 1} — ${discipline}`,
          },
        });
        created++;
      }
    }

    await prisma.drawing.update({ where: { id }, data: { status: "ANALYZED", analyzedAt: new Date() } });

    return NextResponse.json({
      ok: true,
      entitiesFound: created,
      extractedTextLength: textLength,
      extractionLib,
      pagesProcessed: sortedChunks.length,
      disciplinesDetected: analyzedDisciplines,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.drawing.update({ where: { id }, data: { status: "ERROR", analysisError: msg } });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
