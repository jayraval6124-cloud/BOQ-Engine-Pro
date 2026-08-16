import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const types = searchParams.get("types")?.split(",") || ["projects","sor","elements","knowledge"];

  if (q.length < 2) return NextResponse.json({ results: [], total: 0 });

  const results: Array<{ type: string; id: string; title: string; subtitle?: string; meta?: string; url: string }> = [];

  const contains = { contains: q, mode: "insensitive" as const };

  await Promise.all([
    types.includes("projects") && prisma.project.findMany({
      where: { deletedAt: null, OR: [{ name: contains }, { projectNo: contains }] },
      take: 8,
      select: { id: true, projectNo: true, name: true, status: true, sorDivision: true, sorYear: true },
    }).then((rows) => results.push(...rows.map((r) => ({
      type: "project",
      id: r.id,
      title: r.name,
      subtitle: r.projectNo,
      meta: `${r.sorDivision || "—"} · ${r.status}`,
      url: `/dashboard/projects/${r.id}`,
    })))),

    types.includes("sor") && prisma.sORItem.findMany({
      where: { deletedAt: null, OR: [{ description: contains }, { itemCode: contains }, { chapter: contains }] },
      take: 8,
      select: { id: true, itemCode: true, description: true, unit: true, rate: true, chapter: true, sorYear: true },
    }).then((rows) => results.push(...rows.map((r) => ({
      type: "sor",
      id: r.id,
      title: r.description,
      subtitle: `${r.itemCode} · ${r.unit} · ₹${Number(r.rate).toLocaleString("en-IN")}`,
      meta: r.chapter,
      url: `/dashboard/sor`,
    })))),

    types.includes("elements") && prisma.elementTemplate.findMany({
      where: { OR: [{ name: contains }, { description: contains }] },
      take: 5,
      select: { id: true, name: true, type: true, description: true },
    }).then((rows) => results.push(...rows.map((r) => ({
      type: "element",
      id: r.id,
      title: r.name,
      subtitle: r.type,
      meta: r.description || undefined,
      url: `/dashboard/elements`,
    })))),

    types.includes("knowledge") && prisma.knowledgeBaseItem.findMany({
      where: { deletedAt: null, OR: [{ title: contains }, { content: contains }] },
      take: 5,
      select: { id: true, title: true, type: true, chapter: true },
    }).then((rows) => results.push(...rows.map((r) => ({
      type: "knowledge",
      id: r.id,
      title: r.title,
      subtitle: r.type,
      meta: r.chapter || undefined,
      url: `/dashboard/knowledge`,
    })))),

    types.includes("boq") && prisma.bOQ.findMany({
      where: { deletedAt: null, OR: [{ name: contains }, { boqNo: contains }] },
      take: 5,
      select: { id: true, boqNo: true, name: true, status: true, grandTotal: true },
    }).then((rows) => results.push(...rows.map((r) => ({
      type: "boq",
      id: r.id,
      title: r.name,
      subtitle: r.boqNo,
      meta: `${r.status} · ₹${Number(r.grandTotal).toLocaleString("en-IN")}`,
      url: `/dashboard/boq/${r.id}`,
    })))),
  ].filter(Boolean));

  return NextResponse.json({ results, total: results.length, query: q });
}
