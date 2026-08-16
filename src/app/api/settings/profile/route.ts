import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name } = await req.json();
  const updated = await prisma.user.update({ where: { id: session.user.id }, data: { name } });
  return NextResponse.json({ success: true, name: updated.name });
}
