import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  projectName: z.string().min(1),
  agencyName: z.string().min(1),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await prisma.rateAnalysisProject.findMany({
    where: { createdById: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      projectName: true,
      agencyName: true,
      createdAt: true,
      updatedAt: true,
    }
  });

  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const project = await prisma.rateAnalysisProject.create({
    data: {
      projectName: parsed.data.projectName,
      agencyName: parsed.data.agencyName,
      createdById: session.user.id,
      items: [],
      globalSettings: { aboveBelowType: "Below", aboveBelowPercent: 0 },
    },
  });

  return NextResponse.json(project, { status: 201 });
}
