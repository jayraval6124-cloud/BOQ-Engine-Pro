import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { generateProjectNo } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    name: string;
    sorYear: string;
    sorDivision?: string;
    enabledModules: string[];
    boqItems: {
      itemCode: string;
      description: string;
      unit: string;
      quantity: number;
      rate: number;
      amount: number;
      sortOrder: number;
      chapter: string;
    }[];
    breakdown: {
      totalRs: number;
      wc: number;
      tender: number;
      gst: number;
      withGST: number;
      cont5: number;
      cont2: number;
      estimated: number;
      say: number;
    };
  };

  if (!body.name?.trim()) return NextResponse.json({ error: "Project name required" }, { status: 400 });
  if (!body.boqItems?.length) return NextResponse.json({ error: "No BOQ items" }, { status: 400 });

  const projectNo = generateProjectNo();

  const project = await prisma.project.create({
    data: {
      name: body.name.trim(),
      projectNo,
      sorYear: body.sorYear,
      sorDivision: body.sorDivision || "",
      status: "DRAFT",
      createdById: session.user.id,
    },
  });

  const bd = body.breakdown;
  const boq = await prisma.bOQ.create({
    data: {
      boqNo: `${projectNo}-DEP`,
      name: `${body.name.trim()} — Depot BOQ`,
      revisionNo: 0,
      subWork: "Civil",
      projectId: project.id,
      createdById: session.user.id,
      totalAmount: bd.totalRs,
      gstAmount: bd.gst,
      grandTotal: bd.say,
      includeGST: true,
      gstPercent: 18,
      breakdown: bd,
      items: {
        create: body.boqItems.map((item) => ({
          itemCode: item.itemCode,
          gsrtcCode: item.itemCode,
          chapter: item.chapter,
          description: item.description,
          unit: item.unit,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount,
          sortOrder: item.sortOrder,
          isManualEntry: false,
        })),
      },
    },
  });

  await logAudit({
    userId: session.user.id,
    projectId: project.id,
    action: "WIZARD_COMPLETED",
    entity: "BOQ",
    entityId: boq.id,
    description: `Depot wizard generated BOQ "${boq.name}" with ${body.boqItems.length} items`,
  });

  return NextResponse.json({ projectId: project.id, boqId: boq.id });
}
