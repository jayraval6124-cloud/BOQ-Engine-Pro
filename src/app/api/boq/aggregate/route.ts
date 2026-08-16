import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/boq/aggregate?projectId=xxx
// Reads ALL measurement sheets for a project, groups rows by gsrtcCode,
// returns per-sheet quantities + SOR rate for each unique code.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: { id: true, name: true, sorDivision: true, sorYear: true },
  });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // Fetch all sheets with their rows
  const sheets = await prisma.measurementSheet.findMany({
    where: { projectId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, name: true,
      rows: {
        where: { isHeader: false },
        orderBy: [{ itemNo: "asc" }, { sortOrder: "asc" }],
        select: {
          id: true, itemNo: true, gsrtcCode: true, description: true,
          quantity: true, unit: true, sorItemId: true,
        },
      },
    },
  });

  // Aggregate: group by gsrtcCode across all sheets
  // Key: gsrtcCode (or fallback to description for rows without a code)
  const codeMap = new Map<string, {
    gsrtcCode: string;
    description: string;
    unit: string;
    sorItemId: string | null;
    sheetQtys: Map<string, { sheetName: string; qty: number }>;
  }>();

  for (const sheet of sheets) {
    // Per-sheet: group rows by itemNo, sum quantities within each itemNo group
    const sheetGroups = new Map<number, { gsrtcCode: string; description: string; unit: string; sorItemId: string | null; qty: number }>();

    for (const row of sheet.rows) {
      const itemNo = row.itemNo;
      const existing = sheetGroups.get(itemNo);
      if (existing) {
        existing.qty += Number(row.quantity);
      } else {
        sheetGroups.set(itemNo, {
          gsrtcCode:   row.gsrtcCode || "",
          description: row.description,
          unit:        row.unit,
          sorItemId:   row.sorItemId,
          qty:         Number(row.quantity),
        });
      }
    }

    // Now merge into global codeMap
    for (const [, group] of sheetGroups) {
      const key = group.gsrtcCode || group.description.slice(0, 40);
      if (!key) continue;
      if (!codeMap.has(key)) {
        codeMap.set(key, {
          gsrtcCode:   group.gsrtcCode,
          description: group.description,
          unit:        group.unit,
          sorItemId:   group.sorItemId,
          sheetQtys:   new Map(),
        });
      }
      const entry = codeMap.get(key)!;
      const prev  = entry.sheetQtys.get(sheet.id)?.qty ?? 0;
      entry.sheetQtys.set(sheet.id, { sheetName: sheet.name, qty: prev + group.qty });
    }
  }

  // Fetch SOR rates for all unique sorItemIds + lookup by gsrtcCode for those without
  const sorIdSet = new Set<string>();
  codeMap.forEach((v) => { if (v.sorItemId) sorIdSet.add(v.sorItemId); });

  const sorItems = await prisma.sORItem.findMany({
    where: {
      id: { in: [...sorIdSet] },
      isActive: true,
    },
    select: { id: true, rate: true, chapter: true, subChapter: true, itemCode: true },
  });
  const sorById = new Map(sorItems.map((s) => [s.id, s]));

  // For codes without sorItemId, try to look up by subChapter
  const codesNeedingLookup: string[] = [];
  codeMap.forEach((v, k) => {
    if (!v.sorItemId && v.gsrtcCode) codesNeedingLookup.push(v.gsrtcCode);
  });

  let fallbackSorMap = new Map<string, { id: string; rate: unknown; chapter: string; itemCode: string }>();
  if (codesNeedingLookup.length > 0) {
    const fallbacks = await prisma.sORItem.findMany({
      where: {
        subChapter: { in: codesNeedingLookup, mode: "insensitive" },
        isActive: true,
        ...(project.sorDivision ? { division: project.sorDivision } : {}),
        ...(project.sorYear     ? { sorYear: project.sorYear }     : {}),
      } as Record<string, unknown>,
      select: { id: true, rate: true, chapter: true, subChapter: true, itemCode: true },
    });
    fallbackSorMap = new Map(fallbacks.map((s) => [s.subChapter?.toLowerCase() || "", s]));
  }

  // Build result array
  const items: Array<{
    gsrtcCode: string; description: string; unit: string;
    sorItemId: string | null; itemCode: string;
    rate: number; chapter: string;
    sheetQtys: Record<string, { sheetName: string; qty: number }>;
    totalQty: number;
  }> = [];

  let sortIndex = 0;
  codeMap.forEach((v) => {
    const sor = v.sorItemId ? sorById.get(v.sorItemId) : fallbackSorMap.get(v.gsrtcCode.toLowerCase());
    const rate    = sor ? Number(sor.rate) : 0;
    const chapter = sor?.chapter || "General";
    const itemCode = sor?.itemCode || v.gsrtcCode;

    const sheetQtysObj: Record<string, { sheetName: string; qty: number }> = {};
    let totalQty = 0;
    v.sheetQtys.forEach((sq, sheetId) => {
      sheetQtysObj[sheetId] = sq;
      totalQty += sq.qty;
    });

    items.push({
      gsrtcCode:   v.gsrtcCode,
      description: v.description,
      unit:        v.unit,
      sorItemId:   v.sorItemId,
      itemCode,
      rate,
      chapter,
      sheetQtys:  sheetQtysObj,
      totalQty,
    });
    sortIndex++;
  });

  return NextResponse.json({
    project,
    sheets: sheets.map((s) => ({ id: s.id, name: s.name })),
    items,
  });
}
