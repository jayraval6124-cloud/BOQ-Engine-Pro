import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { generateProjectNo } from "@/lib/utils";

const createSchema = z.object({
  name: z.string().min(2),
  sorDivision: z.string().default(""),
  state: z.string().default("Gujarat"),
  sorYear: z.string().min(1, "SOR year is required"),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const sorYear = searchParams.get("sorYear") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: Record<string, unknown> = { deletedAt: null };
  if (search) where.OR = [
    { name: { contains: search, mode: "insensitive" } },
    { clientName: { contains: search, mode: "insensitive" } },
    { projectNo: { contains: search, mode: "insensitive" } },
  ];
  if (status) where.status = status;
  if (sorYear) where.sorYear = sorYear;

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        createdBy: { select: { name: true } },
        _count: { select: { boqs: true, measurementSheets: true } },
      },
    }),
    prisma.project.count({ where }),
  ]);

  return NextResponse.json({ projects, total, page, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const project = await prisma.project.create({
      data: { ...data, projectNo: generateProjectNo(), createdById: session.user.id },
    });

    await logAudit({
      userId: session.user.id,
      projectId: project.id,
      action: "PROJECT_CREATED",
      entity: "Project",
      entityId: project.id,
      newValues: { name: project.name, projectNo: project.projectNo },
      description: `Project "${project.name}" created`,
    });

    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
