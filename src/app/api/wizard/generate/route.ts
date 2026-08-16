import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { generateProjectNo } from "@/lib/utils";
import { z } from "zod";

interface BoqFormulaItem {
  description: string;
  unit: string;
  sorCode?: string;
  chapter?: string;
  groupHeader?: string;
  formula: string;
  sortOrder?: number;
}

interface MeasSubRowItem {
  subDesc?: string;
  nosFormula: string;
  lengthFormula: string;
  breadthFormula: string;
  heightFormula: string;
}

interface MeasFormulaItem {
  description: string;
  unit: string;
  gsrtcCode?: string;
  rows?: MeasSubRowItem[];
  // legacy flat format (backward compat)
  nosFormula?: string;
  lengthFormula?: string;
  breadthFormula?: string;
  heightFormula?: string;
  sortOrder?: number;
}

function normalizeMeasRows(mi: MeasFormulaItem): MeasSubRowItem[] {
  if (Array.isArray(mi.rows) && mi.rows.length > 0) return mi.rows;
  return [{
    subDesc: "",
    nosFormula: mi.nosFormula || "1",
    lengthFormula: mi.lengthFormula || "",
    breadthFormula: mi.breadthFormula || "0",
    heightFormula: mi.heightFormula || "0",
  }];
}

interface MeasRow { label: string; nos: number; L: number; B: number; H: number; }
interface ParamGroup { rows: MeasRow[]; }

function rowQty(r: MeasRow): number {
  const q = (r.nos || 1) * (r.L || 0) * (r.B > 0 ? r.B : 1) * (r.H > 0 ? r.H : 1);
  return r.L > 0 ? q : 0;
}

function groupTotal(g: ParamGroup): number {
  return g.rows.reduce((s, r) => s + rowQty(r), 0);
}

function buildVars(params: Record<string, ParamGroup>, paramDefs?: Array<{ name: string; dims?: string }>): string {
  const rmGroup = params["running_meter"];
  const rmDef = paramDefs?.find((p) => p.name === "running_meter");
  const rmTotal = rmGroup
    ? (rmDef?.dims === "n" ? rmGroup.rows.reduce((s, r) => s + (r.nos || 0), 0) : groupTotal(rmGroup))
    : 0;

  return Object.entries(params).map(([name, group]) => {
    const def = paramDefs?.find((p) => p.name === name);
    // For count-type params (dims="n"), total = sum of nos values (L=0 so groupTotal would be 0)
    let total = def?.dims === "n"
      ? group.rows.reduce((s, r) => s + (r.nos || 0), 0)
      : groupTotal(group);

    if (name === "column_nos" && rmTotal > 0 && (total <= 1 || total === 0)) {
      total = Math.ceil((rmTotal / 3) + (rmTotal / 15));
    }

    const lines = [`const ${name} = ${total};`];
    const r = group.rows[0];
    if (!def?.dims && r) {
      // Full table — expose Nos, L, B, H from first row
      lines.push(`const ${name}_nos = ${r.nos || 1};`);
      lines.push(`const ${name}_l = ${r.L || 0};`);
      lines.push(`const ${name}_b = ${r.B || 0};`);
      lines.push(`const ${name}_h = ${r.H || 0};`);
    } else if (def?.dims && r) {
      if (def.dims === "n") {
        const nVal = (name === "column_nos" && rmTotal > 0 && (r.nos <= 1 || !r.nos))
          ? Math.ceil((rmTotal / 3) + (rmTotal / 15))
          : (r.nos || 0);
        lines.push(`const ${name}_n = ${nVal};`);
      } else if (def.dims === "d") {
        lines.push(`const ${name}_d = ${r.L || 0};`);
      } else if (def.dims === "lxb" || def.dims === "lxbxh") {
        lines.push(`const ${name}_l = ${r.L || 0};`);
        lines.push(`const ${name}_b = ${r.B || 0};`);
        if (def.dims === "lxbxh") lines.push(`const ${name}_h = ${r.H || 0};`);
      } else {
        // l, b, h — single value also exposed as _l/_b/_h
        lines.push(`const ${name}_${def.dims} = ${r.L || 0};`);
      }
    }
    return lines.join("\n");
  }).join("\n");
}

type ParamDef = { name: string; dims?: string };

function evalFormula(formula: string, params: Record<string, ParamGroup>, defs?: ParamDef[]): number {
  if (!formula || formula.trim() === "") return 0;
  try {
    const vars = buildVars(params, defs);
    // eslint-disable-next-line no-new-func
    const fn = new Function(`${vars}\nreturn (${formula});`);
    const result = fn() as unknown;
    return typeof result === "number" && isFinite(result) ? Math.max(0, result) : 0;
  } catch {
    return 0;
  }
}

// Like evalFormula but allows negative values (for deductions in measurement rows)
function evalFormulaSigned(formula: string, params: Record<string, ParamGroup>, defs?: ParamDef[]): number {
  if (!formula || formula.trim() === "") return 0;
  try {
    const vars = buildVars(params, defs);
    // eslint-disable-next-line no-new-func
    const fn = new Function(`${vars}\nreturn (${formula});`);
    const result = fn() as unknown;
    return typeof result === "number" && isFinite(result) ? result : 0;
  } catch {
    return 0;
  }
}

const rowSchema = z.object({ label: z.string().default(""), nos: z.number().default(1), L: z.number().default(0), B: z.number().default(0), H: z.number().default(0) });
const groupSchema = z.object({ rows: z.array(rowSchema).default([]) });

const measItemSchema = z.object({
  sorCode: z.string().default(""),
  description: z.string().default(""),
  unit: z.string().default(""),
  rate: z.number().default(0),
  chapter: z.string().default(""),
  rows: z.array(rowSchema).default([]),
});

const schema = z.object({
  selectedTemplates: z.array(
    z.object({
      templateId: z.string(),
      // New measurement-sheet approach — rows per BOQ item
      measItems: z.array(measItemSchema).default([]),
      // Legacy formula approach — kept for backward compat
      parameters: z.record(groupSchema).default({}),
    }),
  ).min(1),
  name: z.string().min(2),
  sorYear: z.string().min(1),
  sorDivision: z.string().default(""),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { selectedTemplates, name, sorYear, sorDivision } = parsed.data;

  const templateIds = selectedTemplates.map((t) => t.templateId);
  const templates = await prisma.wizardTemplate.findMany({ where: { id: { in: templateIds } } });
  if (templates.length !== templateIds.length) {
    return NextResponse.json({ error: "One or more project types not found." }, { status: 404 });
  }

  const project = await prisma.$transaction(async (tx) => {
    const proj = await tx.project.create({
      data: {
        projectNo: generateProjectNo(),
        name,
        sorYear,
        sorDivision,
        createdById: session.user.id,
      },
    });

    for (let i = 0; i < selectedTemplates.length; i++) {
      const sel = selectedTemplates[i];
      const tmpl = templates.find((t) => t.id === sel.templateId)!;
      const boqNo = `BOQ-${String(i + 1).padStart(3, "0")}`;

      // ── New measurement-sheet approach ────────────────────────────────────
      if (sel.measItems && sel.measItems.length > 0) {
        // Items with at least one measurement row
        const filledItems = sel.measItems.filter((mi) => mi.rows.some((r) => r.L > 0));

        // Create measurement sheet from wizard input
        let measSheetId: string | null = null;
        if (filledItems.length > 0) {
          const sheet = await tx.measurementSheet.create({
            data: {
              projectId: proj.id,
              name: tmpl.name,
              description: `Measurement Sheet — ${tmpl.name}`,
              status: "DRAFT",
              createdById: session.user.id,
            },
          });
          measSheetId = sheet.id;

          let serial = 0;
          for (let j = 0; j < filledItems.length; j++) {
            const mi = filledItems[j];
            for (const r of mi.rows) {
              if (r.L <= 0) continue;
              serial++;
              const itemQty = (r.nos || 1) * r.L * (r.B > 0 ? r.B : 1) * (r.H > 0 ? r.H : 1);
              await tx.measurementRow.create({
                data: {
                  measurementSheetId: sheet.id,
                  serialNo: serial,
                  itemNo: j + 1,
                  description: r.label || mi.description,
                  unit: mi.unit || "",
                  gsrtcCode: mi.sorCode || null,
                  nos: r.nos || 1,
                  length: r.L || null,
                  breadth: r.B > 0 ? r.B : null,
                  height: r.H > 0 ? r.H : null,
                  quantity: itemQty,
                },
              });
            }
          }
        }

        const boq = await tx.bOQ.create({
          data: {
            projectId: proj.id,
            measurementSheetId: measSheetId,
            boqNo,
            name: tmpl.name,
            subWork: "Civil",
            status: "DRAFT",
            createdById: session.user.id,
          },
        });

        // Create one BOQ item per filled measItem
        for (let j = 0; j < filledItems.length; j++) {
          const mi = filledItems[j];
          // Compute quantity from measurement rows
          const qty = mi.rows.reduce((s, r) => {
            if (r.L <= 0) return s;
            return s + (r.nos || 1) * r.L * (r.B > 0 ? r.B : 1) * (r.H > 0 ? r.H : 1);
          }, 0);

          // Try to look up rate from SOR
          let rate = mi.rate || 0;
          let sorItemId: string | null = null;
          let resolvedDescription = mi.description;
          let resolvedUnit = mi.unit || "";
          if (mi.sorCode && sorDivision) {
            let sorItem = await tx.sORItem.findFirst({
              where: { subChapter: mi.sorCode, division: sorDivision, sorYear },
            });
            if (!sorItem) {
              sorItem = await tx.sORItem.findFirst({
                where: { itemCode: mi.sorCode, division: sorDivision, sorYear },
              });
            }
            if (sorItem) {
              rate = Number(sorItem.rate ?? 0);
              sorItemId = sorItem.id;
              if (sorItem.description) resolvedDescription = sorItem.description;
              if (sorItem.unit) resolvedUnit = sorItem.unit;
            }
          }

          await tx.bOQItem.create({
            data: {
              boqId: boq.id,
              description: resolvedDescription,
              unit: resolvedUnit,
              quantity: qty,
              rate,
              amount: qty * rate,
              sorItemId,
              gsrtcCode: mi.sorCode || null,
              itemCode: mi.sorCode || null,
              chapter: mi.chapter || null,
              isManualEntry: true,
              sortOrder: j,
            },
          });
        }

        await tx.wizardTemplate.update({ where: { id: tmpl.id }, data: { usageCount: { increment: 1 } } });
        continue; // skip legacy formula path
      }

      // ── Legacy formula-based approach (backward compat) ───────────────────
      const params = (sel.parameters || {}) as Record<string, ParamGroup>;
      const tmplParams = (tmpl.parameters as Array<{ name: string; label: string; unit?: string; dims?: string }>) || [];
      const paramDefs: ParamDef[] = tmplParams.map((p) => ({ name: p.name, dims: p.dims }));

      const boq = await tx.bOQ.create({
        data: {
          projectId: proj.id,
          boqNo,
          name: tmpl.name,
          subWork: "Civil",
          status: "DRAFT",
          createdById: session.user.id,
        },
      });

      const allFormulaItems = ((tmpl as Record<string, unknown>).boqItemFormulas as BoqFormulaItem[] | undefined) ?? [];
      const seenSorCodes = new Set<string>();
      const formulaItems = allFormulaItems.filter((fi) => {
        const key = fi.sorCode || fi.description?.slice(0, 60) || "";
        if (seenSorCodes.has(key)) return false;
        seenSorCodes.add(key);
        return true;
      });

      for (let j = 0; j < formulaItems.length; j++) {
        const fItem = formulaItems[j];
        if (!fItem.description) continue;
        const qty = evalFormula(fItem.formula || "0", params, paramDefs);
        let rate = 0, sorItemId: string | null = null;
        let resolvedDescription = fItem.description, resolvedUnit = fItem.unit || "";
        if (fItem.sorCode && sorDivision) {
          let sorItem = await tx.sORItem.findFirst({ where: { subChapter: fItem.sorCode, division: sorDivision, sorYear } });
          if (!sorItem) sorItem = await tx.sORItem.findFirst({ where: { itemCode: fItem.sorCode, division: sorDivision, sorYear } });
          if (sorItem) {
            rate = Number(sorItem.rate ?? 0); sorItemId = sorItem.id;
            if (sorItem.description) resolvedDescription = sorItem.description;
            if (sorItem.unit) resolvedUnit = sorItem.unit;
          }
        }
        await tx.bOQItem.create({
          data: {
            boqId: boq.id, description: resolvedDescription, unit: resolvedUnit,
            quantity: qty, rate, amount: qty * rate, sorItemId,
            gsrtcCode: fItem.sorCode || null, itemCode: fItem.sorCode || null,
            chapter: fItem.chapter || null, groupHeader: fItem.groupHeader || null,
            isManualEntry: true, sortOrder: fItem.sortOrder ?? j,
          },
        });
      }

      await tx.wizardTemplate.update({ where: { id: tmpl.id }, data: { usageCount: { increment: 1 } } });
    }

    return proj;
  });

  await logAudit({
    userId: session.user.id,
    projectId: project.id,
    action: "WIZARD_COMPLETED",
    entity: "Project",
    entityId: project.id,
    newValues: { selectedTemplates },
    description: `Project created via Smart Wizard: ${selectedTemplates.length} type(s) — ${templates.map((t) => t.name).join(", ")}`,
  });

  return NextResponse.json(project, { status: 201 });
}
