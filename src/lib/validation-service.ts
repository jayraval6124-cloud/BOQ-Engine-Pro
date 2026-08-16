import { prisma } from "@/lib/db";
import { ValidationSeverity } from "@prisma/client";

interface ValidationResult {
  severity: ValidationSeverity;
  code: string;
  message: string;
  boqItemId?: string;
  field?: string;
  context?: Record<string, unknown>;
}

export async function runBOQValidation(boqId: string): Promise<ValidationResult[]> {
  const boq = await prisma.bOQ.findUnique({
    where: { id: boqId },
    include: {
      items: { include: { sorItem: true } },
      project: true,
    },
  });

  if (!boq) throw new Error("BOQ not found");

  const issues: ValidationResult[] = [];
  const items = boq.items;

  // 1. BOQ has no items at all
  if (items.length === 0) {
    issues.push({
      severity: "ERROR",
      code: "BOQ_EMPTY",
      message: "BOQ has no items. Add work items before approving.",
    });
    return issues;
  }

  // 2. Items with zero rate
  const zeroRate = items.filter(
    (i) => Number(i.rate) === 0 && i.itemType !== "LUMP_SUM" && i.itemType !== "CONTINGENCY"
  );
  for (const item of zeroRate) {
    issues.push({
      severity: "ERROR",
      code: "ZERO_RATE",
      message: `Item "${item.description}" has zero rate. Set a valid SOR rate.`,
      boqItemId: item.id,
      field: "rate",
      context: { itemCode: item.itemCode, chapter: item.chapter },
    });
  }

  // 3. Items with zero or negative quantity
  const zeroQty = items.filter((i) => Number(i.quantity) <= 0 && !i.isProvisional);
  for (const item of zeroQty) {
    issues.push({
      severity: "WARNING",
      code: "ZERO_QUANTITY",
      message: `Item "${item.description}" has zero or negative quantity.`,
      boqItemId: item.id,
      field: "quantity",
      context: { quantity: Number(item.quantity) },
    });
  }

  // 4. Duplicate descriptions within same chapter
  const descMap = new Map<string, string[]>();
  for (const item of items) {
    const key = `${item.chapter || ""}|${item.description.toLowerCase().trim()}`;
    const existing = descMap.get(key) || [];
    existing.push(item.id);
    descMap.set(key, existing);
  }
  for (const [key, ids] of descMap.entries()) {
    if (ids.length > 1) {
      const [chapter, desc] = key.split("|");
      issues.push({
        severity: "WARNING",
        code: "DUPLICATE_ITEM",
        message: `Duplicate item description "${desc}" found ${ids.length} times in chapter "${chapter || "General"}".`,
        context: { count: ids.length, boqItemIds: ids },
      });
    }
  }

  // 5. Missing SOR item link (informational)
  const noSOR = items.filter((i) => !i.sorItemId && !i.isManualEntry && i.itemType === "STANDARD");
  for (const item of noSOR) {
    issues.push({
      severity: "INFO",
      code: "NO_SOR_LINK",
      message: `Item "${item.description}" is not linked to any SOR item.`,
      boqItemId: item.id,
      context: { chapter: item.chapter },
    });
  }

  // 6. Amount mismatch (qty × rate ≠ amount)
  for (const item of items) {
    const expected = Math.round(Number(item.quantity) * Number(item.rate) * 100) / 100;
    const actual = Math.round(Number(item.amount) * 100) / 100;
    if (Math.abs(expected - actual) > 0.1) {
      issues.push({
        severity: "ERROR",
        code: "AMOUNT_MISMATCH",
        message: `Amount mismatch for "${item.description}": expected ₹${expected.toFixed(2)} but stored ₹${actual.toFixed(2)}.`,
        boqItemId: item.id,
        field: "amount",
        context: { expected, actual, quantity: Number(item.quantity), rate: Number(item.rate) },
      });
    }
  }

  // 7. No chapter assigned to items
  const noChapter = items.filter((i) => !i.chapter || i.chapter.trim() === "");
  if (noChapter.length > 0) {
    issues.push({
      severity: "INFO",
      code: "NO_CHAPTER",
      message: `${noChapter.length} item(s) have no chapter assigned. Abstract grouping will be incomplete.`,
      context: { count: noChapter.length },
    });
  }

  return issues;
}

export async function saveValidationResults(
  boqId: string,
  projectId: string,
  results: ValidationResult[]
): Promise<void> {
  // Clear old issues for this BOQ
  await prisma.validationIssue.deleteMany({ where: { boqId } });

  if (results.length === 0) return;

  await prisma.validationIssue.createMany({
    data: results.map((r) => ({
      boqId,
      projectId,
      boqItemId: r.boqItemId,
      severity: r.severity,
      code: r.code,
      message: r.message,
      field: r.field,
      context: (r.context ?? {}) as never,
    })),
  });
}
