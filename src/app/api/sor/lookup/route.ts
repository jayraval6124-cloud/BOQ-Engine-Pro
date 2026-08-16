import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/sor/lookup?code=E-1-2&division=Ahmedabad&year=2024-25
// Returns matching SOR item by subChapter (GSRTC code) or itemCode fallback
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const code     = searchParams.get("code")?.trim() || "";
  const division = searchParams.get("division") || "";
  const year     = searchParams.get("year") || "";

  if (!code) return NextResponse.json(null);

  const base: Record<string, unknown> = { isActive: true, deletedAt: null };
  if (division) base.division = division;
  if (year)     base.sorYear  = year;

  // Try subChapter first (GSRTC-style codes like "E-1-2"), then itemCode
  let item = await prisma.sORItem.findFirst({
    where: { ...base, subChapter: { equals: code, mode: "insensitive" } },
    select: { id: true, itemCode: true, subChapter: true, description: true, unit: true, rate: true, chapter: true },
  });

  if (!item) {
    item = await prisma.sORItem.findFirst({
      where: { ...base, itemCode: { equals: code, mode: "insensitive" } },
      select: { id: true, itemCode: true, subChapter: true, description: true, unit: true, rate: true, chapter: true },
    });
  }

  return NextResponse.json(item ?? null);
}
