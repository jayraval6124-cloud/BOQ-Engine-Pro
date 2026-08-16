import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const codes: string[] = Array.isArray(body.codes) ? body.codes.map((c: string) => c.toUpperCase()) : [];

  if (codes.length === 0) return NextResponse.json({ success: true, count: 0, data: [] });

  const items = await prisma.itemSpecification.findMany({
    where: { itemCode: { in: codes } },
    orderBy: { itemCode: "asc" },
  });

  // Return in a shape compatible with the original Specification Generator API
  const data = items.map((i) => ({
    Item_Code: i.itemCode,
    Description: i.description,
    sections: i.sections,
    Workmanship: [],
    Materials: [],
    Mode_Of_Measurement_Payment: [],
    Details: {},
  }));

  return NextResponse.json({ success: true, count: data.length, data });
}
