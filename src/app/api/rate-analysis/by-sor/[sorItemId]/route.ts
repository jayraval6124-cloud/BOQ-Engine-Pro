import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";

export async function GET(request: Request, { params }: { params: { sorItemId: string } }) {
  try {
    const { sorItemId } = params;
    
    if (!sorItemId) {
      return NextResponse.json({ error: "Missing sorItemId" }, { status: 400 });
    }

    const rateAnalysis = await prisma.rateAnalysis.findFirst({
      where: { sorItemId },
      include: {
        components: {
          orderBy: { sortOrder: "asc" }
        }
      }
    });

    if (!rateAnalysis) {
      return NextResponse.json({ rateAnalysis: null });
    }

    return NextResponse.json({ rateAnalysis });
  } catch (error) {
    console.error("Error fetching rate analysis:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
