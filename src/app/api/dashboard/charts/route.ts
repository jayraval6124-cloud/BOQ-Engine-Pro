import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [projects, topBOQs] = await Promise.all([
    prisma.project.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { id: true },
    }),
    prisma.bOQ.findMany({
      where: { deletedAt: null },
      orderBy: { grandTotal: "desc" },
      take: 5,
      select: { name: true, grandTotal: true, project: { select: { name: true } } },
    }),
  ]);

  const statusMap: Record<string, number> = {};
  projects.forEach((p) => { statusMap[p.status] = p._count.id; });

  const projectsByStatus = ["DRAFT", "ACTIVE", "COMPLETED", "ON_HOLD", "CANCELLED"].map((s) => ({
    name: s,
    value: statusMap[s] || 0,
  }));

  return NextResponse.json({
    projectsByStatus,
    topBOQs: topBOQs.map((b) => ({
      name: b.name.length > 15 ? b.name.slice(0, 15) + "..." : b.name,
      amount: Number(b.grandTotal),
    })),
  });
}
