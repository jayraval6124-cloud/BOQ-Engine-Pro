import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const sectionSchema = z.object({
  title: z.string().default(""),
  description: z.string().default(""),
  subsections: z.array(z.object({ title: z.string().default(""), description: z.string().default("") })).default([]),
});

const createSchema = z.object({
  itemCode: z.string().min(1).toUpperCase(),
  description: z.string().default(""),
  sections: z.array(sectionSchema).default([]),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const codesParam = url.searchParams.get("codes");
  const search = url.searchParams.get("search") ?? "";

  if (codesParam) {
    // Bulk lookup by codes (used by DTP generator)
    const codes = codesParam.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean);
    const items = await prisma.itemSpecification.findMany({
      where: { itemCode: { in: codes } },
      select: { itemCode: true, description: true, sections: true },
    });
    return NextResponse.json(items.map((i) => ({
      Item_Code: i.itemCode,
      Description: i.description,
      sections: i.sections,
    })));
  }

  const where = search
    ? { OR: [{ itemCode: { contains: search, mode: "insensitive" as const } }, { description: { contains: search, mode: "insensitive" as const } }] }
    : {};

  const items = await prisma.itemSpecification.findMany({
    where,
    orderBy: { itemCode: "asc" },
    select: { id: true, itemCode: true, description: true, sections: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json({ success: true, count: items.length, data: items });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { itemCode, description, sections } = parsed.data;

  const existing = await prisma.itemSpecification.findUnique({ where: { itemCode } });
  if (existing) return NextResponse.json({ error: "Item code already exists." }, { status: 409 });

  const item = await prisma.itemSpecification.create({
    data: { itemCode, description, sections },
  });

  return NextResponse.json({ success: true, data: item }, { status: 201 });
}
