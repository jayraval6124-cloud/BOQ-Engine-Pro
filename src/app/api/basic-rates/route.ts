import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/basic-rates?division=X&sorYear=Y
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const division = searchParams.get("division") || "";
  const sorYear  = searchParams.get("sorYear")  || "";

  const where: Record<string, unknown> = { isActive: true };
  if (division) where.division = division;
  if (sorYear)  where.sorYear  = sorYear;

  const rates = await prisma.basicMaterialRate.findMany({ where, orderBy: { materialCode: "asc" } });
  return NextResponse.json(rates);
}

// POST /api/basic-rates — upsert a rate
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { division, sorYear, materialCode, materialName, rate, unit } = body;

  if (!division || !sorYear || !materialCode || rate == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const result = await prisma.basicMaterialRate.upsert({
    where: { division_sorYear_materialCode: { division, sorYear, materialCode } },
    update: { materialName, rate, unit, isActive: true, updatedAt: new Date() },
    create: { division, sorYear, materialCode, materialName: materialName || materialCode, rate, unit: unit || "" },
  });

  return NextResponse.json(result);
}
