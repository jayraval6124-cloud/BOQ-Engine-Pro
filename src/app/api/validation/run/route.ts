import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { runBOQValidation, saveValidationResults } from "@/lib/validation-service";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const boqId = searchParams.get("boqId") || (await req.json().catch(() => ({}))).boqId;

  if (!boqId) return NextResponse.json({ error: "boqId required" }, { status: 400 });

  const boq = await prisma.bOQ.findUnique({ where: { id: boqId }, select: { id: true, projectId: true, name: true } });
  if (!boq) return NextResponse.json({ error: "BOQ not found" }, { status: 404 });

  const issues = await runBOQValidation(boqId);
  await saveValidationResults(boqId, boq.projectId, issues);

  const hasErrors = issues.some((i) => i.severity === "ERROR");

  if (hasErrors) {
    await logAudit({
      userId: session.user.id,
      projectId: boq.projectId,
      action: "VALIDATION_FAILED",
      entity: "BOQ",
      entityId: boqId,
      newValues: { errorCount: issues.filter((i) => i.severity === "ERROR").length },
      description: `Validation failed for BOQ "${boq.name}"`,
    });
  }

  return NextResponse.json({
    total: issues.length,
    errors: issues.filter((i) => i.severity === "ERROR").length,
    warnings: issues.filter((i) => i.severity === "WARNING").length,
    info: issues.filter((i) => i.severity === "INFO").length,
    hasErrors,
    issues,
  });
}
