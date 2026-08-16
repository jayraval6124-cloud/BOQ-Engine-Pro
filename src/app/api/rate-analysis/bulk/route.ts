import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { gsrtcCodes, divisionName, sorYear } = await request.json();

    if (!gsrtcCodes || !Array.isArray(gsrtcCodes)) {
      return NextResponse.json({ error: "gsrtcCodes array is required" }, { status: 400 });
    }

    // Clean up input codes
    const cleanCodes = gsrtcCodes.map(c => c.trim()).filter(Boolean);

    // Prepare query filters
    const whereClause: any = {
      itemCode: { in: cleanCodes }
    };

    if (divisionName) {
      whereClause.division = divisionName;
    }
    
    if (sorYear) {
      whereClause.sorYear = sorYear;
    }

    // Fetch matching SOR Items with their RateAnalysis and Components
    const items = await prisma.sORItem.findMany({
      where: whereClause,
      include: {
        rateAnalyses: {
          include: {
            components: true
          }
        }
      }
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error in bulk rate analysis fetch:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
