import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  itemCode: z.string().min(1),
  description: z.string().min(1),
  unit: z.string().min(1),
  rate: z.number().positive(),
  division: z.string().min(1),
  sorYear: z.string().min(1),
  chapter: z.string().min(1),
  subChapter: z.string().optional(),
  category: z.string().optional(),
  specification: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search  = searchParams.get("search")   || "";
  const division = searchParams.get("division") || "";
  const sorYear  = searchParams.get("sorYear")  || "";
  const chapter  = searchParams.get("chapter")  || "";
  const page  = parseInt(searchParams.get("page")  || "1");
  const limit = parseInt(searchParams.get("limit") || "30");

  const where: Record<string, unknown> = { isActive: true, deletedAt: null };
  if (search) where.OR = [
    { description:  { contains: search, mode: "insensitive" } },
    { itemCode:     { contains: search, mode: "insensitive" } },
    { subChapter:   { contains: search, mode: "insensitive" } },
  ];
  if (division) where.division = division;
  if (sorYear)  where.sorYear  = sorYear;
  if (chapter)  where.chapter  = chapter;

  const [items, total] = await Promise.all([
    prisma.sORItem.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.sORItem.count({ where }),
  ]);

  const divisions = await prisma.sORItem.findMany({
    where: { isActive: true, deletedAt: null },
    select: { division: true },
    distinct: ["division"],
    orderBy: { division: "asc" },
  });

  const chapters = await prisma.sORItem.findMany({
    where: { isActive: true, deletedAt: null, ...(division ? { division } : {}) },
    select: { chapter: true },
    distinct: ["chapter"],
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({
    items,
    total,
    page,
    pages: Math.ceil(total / limit),
    divisions: divisions.map((d) => d.division),
    chapters: chapters.map((c) => c.chapter),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const existing = await prisma.sORItem.findFirst({
      where: { itemCode: data.itemCode, division: data.division, sorYear: data.sorYear },
    });
    if (existing) return NextResponse.json({ error: "Item code already exists for this division and year" }, { status: 409 });

    const item = await prisma.sORItem.create({ data });
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
