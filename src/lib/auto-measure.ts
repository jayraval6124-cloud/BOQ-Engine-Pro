import { prisma } from "@/lib/db";
import { evaluateFormula } from "@/lib/formula-engine";

interface Dimensions {
  nos?: number;
  length?: number;
  breadth?: number;
  height?: number;
  depth?: number;
  radius?: number;
  diameter?: number;
  [key: string]: number | undefined;
}

interface GeneratedRow {
  description: string;
  unit: string;
  nos: number | null;
  length: number | null;
  breadth: number | null;
  height: number | null;
  quantity: number;
  formulaExpr: string;
  sorItemId: string | null;
  remarks: string | null;
}

export async function generateRowsFromAssembly(
  assemblyId: string,
  dimensions: Dimensions
): Promise<GeneratedRow[]> {
  const assembly = await prisma.elementAssembly.findUnique({
    where: { id: assemblyId },
    include: { items: { include: { sorItem: true }, orderBy: { sequenceOrder: "asc" } } },
  });
  if (!assembly) throw new Error("Assembly not found");

  const rows: GeneratedRow[] = [];

  for (const item of assembly.items) {
    const vars: Record<string, number> = {
      Nos: dimensions.nos ?? 1,
      L: dimensions.length ?? 0,
      B: dimensions.breadth ?? 0,
      H: dimensions.height ?? 0,
      D: dimensions.depth ?? 0,
      R: dimensions.radius ?? 0,
      Dia: dimensions.diameter ?? 0,
      ...Object.fromEntries(
        Object.entries(dimensions).filter(([, v]) => v !== undefined).map(([k, v]) => [k, v as number])
      ),
    };

    let quantity = 0;
    try {
      const result = evaluateFormula(item.formula, vars);
      quantity = result.value;
      if (!isFinite(quantity) || isNaN(quantity)) quantity = 0;
      quantity = Math.round(quantity * 10000) / 10000;
    } catch {
      quantity = 0;
    }

    rows.push({
      description: item.description,
      unit: item.unit,
      nos: dimensions.nos ?? null,
      length: dimensions.length ?? null,
      breadth: dimensions.breadth ?? null,
      height: dimensions.height ?? null,
      quantity,
      formulaExpr: item.formula,
      sorItemId: item.sorItemId,
      remarks: item.calculationNote,
    });
  }

  return rows;
}

export async function generateRowsFromElementTemplate(
  elementTemplateId: string,
  dimensions: Dimensions
): Promise<GeneratedRow[]> {
  const template = await prisma.elementTemplate.findUnique({
    where: { id: elementTemplateId },
    include: { items: { include: { sorItem: true }, orderBy: { sortOrder: "asc" } } },
  });
  if (!template) throw new Error("Element template not found");

  const rows: GeneratedRow[] = [];

  for (const item of template.items) {
    const formula = item.defaultFormula || "Nos * L * B * H";
    const vars: Record<string, number> = {
      Nos: dimensions.nos ?? 1,
      L: dimensions.length ?? 0,
      B: dimensions.breadth ?? 0,
      H: dimensions.height ?? 0,
      D: dimensions.depth ?? 0,
      R: dimensions.radius ?? 0,
      Dia: dimensions.diameter ?? 0,
    };

    let quantity = 0;
    try {
      const result = evaluateFormula(formula, vars);
      quantity = result.value;
      if (!isFinite(quantity) || isNaN(quantity)) quantity = 0;
      quantity = Math.round(quantity * 10000) / 10000;
    } catch {
      quantity = 0;
    }

    rows.push({
      description: item.description,
      unit: item.unit,
      nos: dimensions.nos ?? null,
      length: dimensions.length ?? null,
      breadth: dimensions.breadth ?? null,
      height: dimensions.height ?? null,
      quantity,
      formulaExpr: formula,
      sorItemId: item.sorItemId ?? null,
      remarks: null,
    });
  }

  return rows;
}
