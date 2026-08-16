import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const boqId = searchParams.get("boqId");
  const projectId = searchParams.get("projectId");
  const severity = searchParams.get("severity");
  const resolved = searchParams.get("resolved");

  const where: Record<string, unknown> = {};
  if (boqId) where.boqId = boqId;
  if (projectId) where.projectId = projectId;
  if (severity) where.severity = severity;
  if (resolved !== null) where.isResolved = resolved === "true";

  const issues = await prisma.validationIssue.findMany({
    where,
    include: { boq: { select: { boqNo: true, name: true } }, project: { select: { name: true, projectNo: true } } },
    orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(issues);
}
