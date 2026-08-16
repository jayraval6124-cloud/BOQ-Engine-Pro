import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import rawData from "@/lib/data/item-specs.json";

interface RawItem {
  Item_Code: string;
  Description: string;
  sections: { title: string; description: string; subsections: unknown[] }[];
}

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = rawData as RawItem[];

  let inserted = 0;
  let skipped = 0;

  for (const item of items) {
    if (!item.Item_Code) { skipped++; continue; }

    const code = item.Item_Code.toUpperCase().trim();
    const sections = (item.sections ?? []).map((s) => ({
      title: s.title ?? "",
      description: s.description ?? "",
      subsections: Array.isArray(s.subsections) ? s.subsections : [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    })) as any;

    await prisma.itemSpecification.upsert({
      where: { itemCode: code },
      update: { description: item.Description ?? "", sections },
      create: { itemCode: code, description: item.Description ?? "", sections },
    });
    inserted++;
  }

  return NextResponse.json({ success: true, inserted, skipped, total: items.length });
}
