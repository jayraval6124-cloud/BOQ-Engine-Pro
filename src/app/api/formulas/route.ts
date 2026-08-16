import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { validateExpression } from "@/lib/formula-engine";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  expression: z.string().min(1),
  type: z.enum(["VOLUME", "AREA", "LENGTH", "WEIGHT", "COUNT", "CUSTOM"]),
  unit: z.string().optional(),
  description: z.string().optional(),
  example: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const formulas = await prisma.formula.findMany({ where: { deletedAt: null }, orderBy: [{ isSystem: "desc" }, { name: "asc" }] });
  return NextResponse.json(formulas);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const data = createSchema.parse(body);
  const validation = validateExpression(data.expression);
  if (!validation.valid) return NextResponse.json({ error: `Invalid expression: ${validation.error}` }, { status: 400 });

  const formula = await prisma.formula.create({ data: { ...data, variables: validation.variables } });
  return NextResponse.json(formula, { status: 201 });
}
