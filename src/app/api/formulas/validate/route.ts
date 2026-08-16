import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { validateExpression, evaluateFormula } from "@/lib/formula-engine";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { expression, variables } = await req.json();
  const validation = validateExpression(expression);
  if (!validation.valid) return NextResponse.json({ valid: false, error: validation.error });

  let preview: number | null = null;
  if (variables) {
    const result = evaluateFormula(expression, variables);
    preview = result.error ? null : result.value;
  }

  return NextResponse.json({ valid: true, variables: validation.variables, preview });
}
