import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAISettings, checkOllamaStatus, ollamaGenerate } from "@/lib/ollama";

type MeasRow = { label: string; nos: number; L: number; B: number; H: number };
type EntityRow = {
  entityType: string;
  entityLabel: string | null;
  attributes: Record<string, { value: string | null; unit: string | null }>;
};
type BoqItemInput = { sorCode: string; description: string; unit: string; chapter?: string };

// ─── Dimension helpers ────────────────────────────────────────────────────────

function num(val: string | null | undefined): number {
  if (!val) return 0;
  const n = parseFloat(val.replace(/[^0-9.-]/g, ""));
  return isFinite(n) ? n : 0;
}

function dim(val: string | null | undefined, unit: string | null | undefined): number {
  const n = num(val);
  if (!n) return 0;
  if (unit?.toLowerCase() === "mm" || (n > 10 && !unit)) return n / 1000;
  return n;
}

function getDim(e: EntityRow, key: string): number {
  return dim(e.attributes?.[key]?.value, e.attributes?.[key]?.unit);
}

function getQty(e: EntityRow): number {
  return Math.max(1, num(e.attributes?.["quantity"]?.value ?? e.attributes?.["count"]?.value));
}

function parseSize(val: string | null | undefined): [number, number] {
  if (!val) return [0, 0];
  const parts = val.match(/[\d.]+/g);
  if (!parts || parts.length < 2) return [parseFloat(parts?.[0] || "0") / 1000, 0];
  const a = parseFloat(parts[0]), b = parseFloat(parts[1]);
  return [a > 10 ? a / 1000 : a, b > 10 ? b / 1000 : b];
}

// ─── Build concise entity summary for LLM prompt ─────────────────────────────

function buildEntitySummary(entities: EntityRow[]): string {
  const lines: string[] = [];

  const byType = (type: string) => entities.filter(e => e.entityType === type);
  const footings = byType("FOOTING");
  const columns  = byType("COLUMN");
  const rooms    = [...byType("ROOM"), ...byType("BUILDING")];
  const walls    = byType("WALL");
  const slabs    = byType("SLAB");
  const doors    = [...byType("DOOR"), ...byType("ROLLING_SHUTTER")];
  const windows  = byType("WINDOW");
  const vents    = byType("VENTILATION");
  const stairs   = byType("STAIR");

  if (footings.length > 0) {
    const parts = footings.map(e => {
      const l = getDim(e, "length") || getDim(e, "width");
      const b = getDim(e, "width") || l;
      const d = getDim(e, "depth");
      const n = getQty(e);
      return `${e.entityLabel || "F"}(L:${l}m,B:${b}m,D:${d}m,Nos:${n})`;
    });
    lines.push(`FOOTINGS: ${parts.join(", ")}`);
  }

  if (columns.length > 0) {
    const bySize = new Map<string, { nos: number; w: number; b: number }>();
    columns.forEach(c => {
      const w = getDim(c, "width") || parseSize(c.attributes?.["size"]?.value)[0];
      const b = getDim(c, "depth") || parseSize(c.attributes?.["size"]?.value)[1] || w;
      const n = getQty(c);
      const key = `${Math.round(w*1000)}×${Math.round(b*1000)}`;
      if (bySize.has(key)) bySize.get(key)!.nos += n;
      else bySize.set(key, { nos: n, w, b });
    });
    const parts = [...bySize.entries()].map(([k, v]) => `${k}mm(Nos:${v.nos})`);
    lines.push(`COLUMNS: ${parts.join(", ")}`);
  }

  if (rooms.length > 0) {
    const parts = rooms.map(r => {
      const n = r.entityLabel || r.entityType;
      const l = getDim(r, "length");
      const w = getDim(r, "width");
      const a = getDim(r, "area");
      const f = r.attributes?.["floor"]?.value ?? "";
      return a > 0 ? `${n}(${a}sqm${f ? ","+f : ""})`
           : (l > 0 && w > 0) ? `${n}(${l}×${w}m${f ? ","+f : ""})` : `${n}(?)`;
    });
    lines.push(`ROOMS/SPACES: ${parts.join("; ")}`);
  }

  if (doors.length > 0) {
    const parts = doors.map(d => {
      const w = getDim(d, "width") || 0.9;
      const h = getDim(d, "height") || 2.1;
      return `${d.entityLabel || d.entityType}(${w}×${h}m,Nos:${getQty(d)})`;
    });
    lines.push(`DOORS: ${parts.join(", ")}`);
  }

  if (windows.length > 0) {
    const parts = windows.map(w => {
      const wd = getDim(w, "width") || 1.2;
      const h = getDim(w, "height") || 1.2;
      return `${w.entityLabel || "W"}(${wd}×${h}m,Nos:${getQty(w)})`;
    });
    lines.push(`WINDOWS: ${parts.join(", ")}`);
  }

  if (vents.length > 0) {
    const parts = vents.map(v => `${v.entityLabel || "V"}(${getDim(v, "width")||0.6}×${getDim(v, "height")||0.45}m,Nos:${getQty(v)})`);
    lines.push(`VENTILATORS: ${parts.join(", ")}`);
  }

  if (walls.length > 0) {
    const parts = walls.map(w => {
      const t = getDim(w, "thickness") || 0.23;
      const l = getDim(w, "length");
      const h = getDim(w, "height") || 3.0;
      return `t:${t}m${l > 0 ? ",L:"+l+"m" : ""},H:${h}m`;
    });
    lines.push(`WALLS: ${parts.join("; ")}`);
  }

  if (slabs.length > 0) {
    const parts = slabs.map(s => {
      const a = getDim(s, "area");
      const t = getDim(s, "thickness") || 0.125;
      return a > 0 ? `${a}sqm×${t}m` : `t:${t}m`;
    });
    lines.push(`SLABS: ${parts.join(", ")}`);
  }

  if (stairs.length > 0) lines.push(`STAIRS: ${stairs.length} set(s)`);

  return lines.join("\n") || "No entities extracted from this drawing.";
}

// ─── Building summary stats ───────────────────────────────────────────────────

function buildingSummary(entities: EntityRow[]): { totalArea: number; maxL: number; maxW: number; perimeter: number; floors: number; footingCount: number; columnCount: number; roomCount: number } {
  const rooms = entities.filter(e => e.entityType === "ROOM" || e.entityType === "BUILDING");
  const totalArea = rooms.reduce((s, r) => {
    const l = getDim(r, "length"), w = getDim(r, "width"), a = getDim(r, "area");
    return s + (a > 0 ? a : (l > 0 && w > 0 ? l * w : 0));
  }, 0);
  const maxL = rooms.reduce((mx, r) => Math.max(mx, getDim(r, "length")), 0);
  const maxW = rooms.reduce((mx, r) => Math.max(mx, getDim(r, "width")), 0);
  const perimeter = maxL > 0 && maxW > 0 ? 2 * (maxL + maxW) : Math.sqrt(totalArea) * 4;

  // Detect floors from entity floor labels or building floorCount
  const building = entities.find(e => e.entityType === "BUILDING");
  const floorCount = building ? num(building.attributes?.["floorCount"]?.value) : 0;
  const hasFF = entities.some(e => {
    const f = (e.attributes?.["floor"]?.value ?? "").toUpperCase();
    return f.includes("FF") || f.includes("FIRST") || f.includes("2");
  });
  const floors = floorCount > 1 ? floorCount : (hasFF ? 2 : 1);

  return {
    totalArea: Math.round(totalArea * 100) / 100,
    maxL: Math.round(maxL * 100) / 100,
    maxW: Math.round(maxW * 100) / 100,
    perimeter: Math.round(perimeter * 100) / 100,
    floors,
    footingCount: entities.filter(e => e.entityType === "FOOTING").reduce((s, e) => s + getQty(e), 0),
    columnCount: entities.filter(e => e.entityType === "COLUMN").reduce((s, e) => s + getQty(e), 0),
    roomCount: entities.filter(e => e.entityType === "ROOM").length,
  };
}

// ─── LLM prompt ───────────────────────────────────────────────────────────────

function buildEstimationPrompt(
  entitySummary: string,
  stats: ReturnType<typeof buildingSummary>,
  boqItems: BoqItemInput[],
): string {
  const itemList = boqItems.map(i => `${i.sorCode}: ${i.description} [${i.unit}]`).join("\n");

  return `You are a senior civil engineer expert in Indian construction BOQ preparation, IS codes, and government Schedule of Rates (SOR).

TASK: Fill measurement sheet rows for each BOQ item using the drawing entities below.
Each measurement row format: { "label": string, "nos": number, "L": number, "B": number, "H": number }
Quantity = nos × L × B × H (for volume in Cum), or nos × L × B (area, H=0), or nos × L (linear, B=0 H=0)
All dimensions in METERS.

DRAWING ENTITIES EXTRACTED:
${entitySummary}

BUILDING STATISTICS:
- Total room area: ${stats.totalArea} sqm
- Building length (max): ${stats.maxL} m
- Building width (max): ${stats.maxW} m
- Perimeter: ${stats.perimeter} m
- Floors: ${stats.floors}
- Total footings (nos): ${stats.footingCount}
- Total columns (nos): ${stats.columnCount}
- Room count: ${stats.roomCount}

IS CODE STANDARDS TO APPLY:
- Excavation 0-1.5m (IS 1200-2): footing L × footing B × min(depth,1.5) per footing type. Add 0.15m clearance to each side of footing.
- Excavation 1.5-3m: only if footing depth > 1.5m, depth = actual_depth - 1.5m
- Earth filling in plinth (IS 1200-2): plinth area × 0.60m depth (typical)
- PCC M10 under footings (IS 456): footing L × footing B × 0.15m thick
- PCC M10 under plinth: plinth area × 0.10m thick
- RCC M20 footings (IS 456): net footing L × B × 0.45m thick (deduct 0.3m clearance from each side vs excavation)
- Plinth beam / ground beam: perimeter × 0.45m × 0.60m
- Columns upto plinth: column size × 1.95m height (footing to plinth beam)
- Columns GF: column size × 3.00m (floor to beam bottom)
- Columns FF: column size × 3.35m (taller floor for residential)
- GF Beam: perimeter × 0.30m × 0.45m (+ secondary beams at 0.23m × 0.40m)
- FF Beam: same as GF beam
- RCC Slab: net room area per floor × 0.125m to 0.15m thick (IS 456)
- Brickwork 230mm (IS 2212): wall length × 0.23m × floor height (deduct openings)
- Brickwork 115mm partition: room perimeter × 0.115m × floor height
- Plaster ceiling (IS 2430): total slab area × floors (12mm thick, measured as area)
- Plaster internal walls: wall perimeter × floor height × floors × 2 sides (both sides)
- Plaster external: perimeter × floor height × floors (one side)
- DPC: plinth area × 0.025m (25mm thick anti-termite layer)
- Vitrified tiles floor: total room area × floors × 0.85 (excl. wet areas ~15%)
- Ceramic tiles floor (wet areas): total room area × 0.15 (bathrooms)
- Dado ceramic tiles: bathroom perimeter × 1.80m height
- Terrace waterproofing: terrace area × 1.1 (add parapet)
- Paint/distemper walls: (wall perimeter × floor height × 2 × floors) + ceiling area
- Flush door: door W × H × quantity per door type
- FRP door (bathroom): assume ~30% of doors are bathroom at 0.75×2.0m
- Window: window W × H × quantity per window type
- Ventilator: V W × H × quantity
- Termite treatment: plinth area (sqm, L as area value)

RULES:
1. Use actual drawing dimensions wherever available
2. If entity data is partially available, use IS code standard values for missing dims
3. Return empty array [] for items where no meaningful estimate can be made
4. Group multiple footing/column types as separate rows with descriptive labels
5. Round all values to 2 decimal places
6. For "nos × L" (linear) items: use nos=1, L=total length, B=0, H=0

BOQ ITEMS TO FILL (${boqItems.length} items):
${itemList}

Return ONLY valid JSON (no markdown, no explanation):
{
  "RJ013": [{"label": "F1 Footing", "nos": 4, "L": 1.65, "B": 1.65, "H": 1.5}],
  "RJ014": [],
  ...fill ALL ${boqItems.length} SOR codes above...
}`;
}

// ─── Rule-based fallback (for when Ollama is unavailable) ────────────────────

function row(label: string, nos: number, L: number, B = 0, H = 0): MeasRow {
  return { label, nos: Math.round(nos * 100) / 100, L: Math.round(L * 100) / 100, B: Math.round(B * 100) / 100, H: Math.round(H * 100) / 100 };
}

function ruleBased(item: BoqItemInput, entities: EntityRow[]): MeasRow[] {
  const desc = item.description.toLowerCase();
  const sor = item.sorCode || "";

  const footings = entities.filter(e => e.entityType === "FOOTING");
  const columns  = entities.filter(e => e.entityType === "COLUMN");
  const rooms    = entities.filter(e => e.entityType === "ROOM" || e.entityType === "BUILDING");
  const doors    = entities.filter(e => e.entityType === "DOOR");
  const windows  = entities.filter(e => e.entityType === "WINDOW");
  const vents    = entities.filter(e => e.entityType === "VENTILATION");

  const totalArea = rooms.reduce((s, r) => {
    const l = getDim(r, "length"), w = getDim(r, "width"), a = getDim(r, "area");
    return s + (a > 0 ? a : (l > 0 && w > 0 ? l * w : 0));
  }, 0);
  const maxL = rooms.reduce((mx, r) => Math.max(mx, getDim(r, "length")), 0);
  const maxW = rooms.reduce((mx, r) => Math.max(mx, getDim(r, "width")), 0);
  const perimeter = maxL > 0 && maxW > 0 ? 2 * (maxL + maxW) : Math.sqrt(totalArea) * 4;

  if (sor === "RJ013" || (desc.includes("excavat") && desc.includes("1.5"))) {
    const rows: MeasRow[] = [];
    const byLabel = new Map<string, EntityRow>();
    footings.forEach(f => { byLabel.set(f.entityLabel?.toUpperCase() || "F", f); });
    byLabel.forEach((f, lbl) => {
      const l = getDim(f, "length") || getDim(f, "width");
      const b = getDim(f, "width") || l;
      const h = getDim(f, "depth") || 1.5;
      if (getQty(f) > 0 && l > 0) rows.push(row(`${lbl} Footing`, getQty(f), l + 0.30, b + 0.30, Math.min(h, 1.5)));
    });
    if (totalArea > 0) rows.push(row("Plinth area", 1, maxL || Math.sqrt(totalArea), maxW || Math.sqrt(totalArea), 0.10));
    return rows;
  }

  if (sor === "RJ027" || desc.includes("pcc")) {
    const rows: MeasRow[] = [];
    const byLabel = new Map<string, EntityRow>();
    footings.forEach(f => { byLabel.set(f.entityLabel?.toUpperCase() || "F", f); });
    byLabel.forEach((f, lbl) => {
      const l = getDim(f, "length") || getDim(f, "width");
      const b = getDim(f, "width") || l;
      if (getQty(f) > 0 && l > 0) rows.push(row(`${lbl} PCC bed`, getQty(f), l, b, 0.15));
    });
    if (totalArea > 0) rows.push(row("Plinth PCC", 1, maxL || Math.sqrt(totalArea), maxW || Math.sqrt(totalArea), 0.10));
    return rows;
  }

  if (sor === "RJ030" || (desc.includes("rcc") && (desc.includes("foundation") || desc.includes("f&p")))) {
    const rows: MeasRow[] = [];
    const byLabel = new Map<string, EntityRow>();
    footings.forEach(f => { byLabel.set(f.entityLabel?.toUpperCase() || "F", f); });
    byLabel.forEach((f, lbl) => {
      const l = getDim(f, "length") || getDim(f, "width");
      const b = getDim(f, "width") || l;
      if (getQty(f) > 0 && l > 0) rows.push(row(`${lbl} RCC footing`, getQty(f), Math.max(0.3, l - 0.3), Math.max(0.3, b - 0.3), 0.45));
    });
    return rows;
  }

  if (sor === "RJ122" || (desc.includes("flush door") || (desc.includes("door") && !desc.includes("frp")))) {
    if (doors.length > 0) return doors.map(d => row(`Door ${d.entityLabel || ""}`.trim(), getQty(d), getDim(d, "width") || 0.9, 0, getDim(d, "height") || 2.1));
  }

  if (sor === "RJ117" || (desc.includes("window") && !desc.includes("ventilat"))) {
    if (windows.length > 0) return windows.map(w => row(`Window ${w.entityLabel || ""}`.trim(), getQty(w), getDim(w, "width") || 1.2, 0, getDim(w, "height") || 1.2));
  }

  if (sor === "RJ119" || desc.includes("ventilat")) {
    if (vents.length > 0) return vents.map(v => row(`Vent ${v.entityLabel || ""}`.trim(), getQty(v), getDim(v, "width") || 0.6, 0, getDim(v, "height") || 0.45));
  }

  if (sor === "RJ084" || sor === "RJ085" || (desc.includes("brick") && desc.includes("work"))) {
    if (totalArea > 0) return [row("External walls", 1, perimeter, 0.23, 3.0)];
  }

  if (sor === "RJ103" || (desc.includes("plaster") && desc.includes("ceil"))) {
    if (totalArea > 0) return [row("Ceiling area", 2, totalArea, 0, 0)];
  }

  if (sor === "RJ109" || (desc.includes("plaster") && desc.includes("internal"))) {
    if (perimeter > 0) return [row("Internal wall plaster", 2, perimeter * 1.3, 3.0, 0)];
  }

  if (sor === "RJ134" || (desc.includes("vitrified") && desc.includes("floor"))) {
    if (totalArea > 0) return [row("Floor area (excl. wet)", 1, Math.round(totalArea * 0.85 * 100) / 100, 0, 0)];
  }

  if (sor === "RJ144" || (desc.includes("waterproof") && (desc.includes("terrace") || desc.includes("roof")))) {
    if (totalArea > 0) return [row("Terrace + parapet", 1, Math.round(totalArea * 1.1 * 100) / 100, 0, 0)];
  }

  // Columns
  if ((sor === "RJ032" || sor === "RJ033" || sor === "RJ034") && columns.length > 0) {
    const h = sor === "RJ032" ? 1.95 : sor === "RJ033" ? 3.00 : 3.35;
    const bySize = new Map<string, { nos: number; w: number; b: number }>();
    columns.forEach(c => {
      const w = getDim(c, "width") || parseSize(c.attributes?.["size"]?.value)[0];
      const b = getDim(c, "depth") || parseSize(c.attributes?.["size"]?.value)[1] || w;
      const n = getQty(c);
      const key = `${Math.round(w * 1000)}×${Math.round(b * 1000)}`;
      if (bySize.has(key)) bySize.get(key)!.nos += n;
      else bySize.set(key, { nos: n, w, b });
    });
    return [...bySize.entries()].map(([k, v]) => row(`Col ${k}mm`, v.nos, v.w, v.b, h));
  }

  return [];
}

// ─── Parse LLM JSON response ──────────────────────────────────────────────────

function parseLLMResponse(raw: string, boqItems: BoqItemInput[]): Record<string, MeasRow[]> {
  try {
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    const result: Record<string, MeasRow[]> = {};
    for (const item of boqItems) {
      const rows = parsed[item.sorCode];
      if (Array.isArray(rows)) {
        result[item.sorCode] = rows
          .filter((r): r is Record<string, unknown> => r && typeof r === "object")
          .map(r => ({
            label: String(r["label"] ?? ""),
            nos: Number(r["nos"] ?? 1),
            L: Number(r["L"] ?? 0),
            B: Number(r["B"] ?? 0),
            H: Number(r["H"] ?? 0),
          }))
          .filter(r => r.L > 0);
      } else {
        result[item.sorCode] = [];
      }
    }
    return result;
  } catch {
    return {};
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { drawingId, templates } = await req.json() as {
    drawingId: string;
    templates: Array<{ id: string; boqItems: BoqItemInput[] }>;
  };

  if (!drawingId) return NextResponse.json({ error: "drawingId required" }, { status: 400 });

  const drawing = await prisma.drawing.findFirst({
    where: { id: drawingId },
    select: { id: true, name: true, status: true },
  });
  if (!drawing) return NextResponse.json({ error: "Drawing not found" }, { status: 404 });
  if (drawing.status !== "ANALYZED") return NextResponse.json({ error: "Drawing not yet analyzed" }, { status: 422 });

  const entities = await prisma.projectEntity.findMany({
    where: { drawingId },
    select: { entityType: true, entityLabel: true, attributes: true },
  });

  const typedEntities: EntityRow[] = entities.map(e => ({
    entityType: e.entityType,
    entityLabel: e.entityLabel,
    attributes: (e.attributes as Record<string, { value: string | null; unit: string | null }>) ?? {},
  }));

  const entitySummary = buildEntitySummary(typedEntities);
  const stats = buildingSummary(typedEntities);

  // Try Ollama first — it understands civil engineering, IS codes, and estimation
  const settings = await getAISettings();
  const ollamaOk = await checkOllamaStatus(settings);

  const suggestions: Record<string, Record<string, MeasRow[]>> = {};
  let filledCount = 0;
  let usedLLM = false;

  if (ollamaOk.ok) {
    // Combine all BOQ items across templates for a single LLM call (more efficient)
    const allItems = (templates || []).flatMap(t => t.boqItems || []);
    const uniqueItems = allItems.filter((item, i, arr) =>
      arr.findIndex(x => x.sorCode === item.sorCode) === i
    );

    if (uniqueItems.length > 0) {
      try {
        const prompt = buildEstimationPrompt(entitySummary, stats, uniqueItems);
        const rawResponse = await ollamaGenerate(prompt, settings);
        const llmResult = parseLLMResponse(rawResponse, uniqueItems);

        // Distribute results back to each template
        for (const tmpl of templates || []) {
          suggestions[tmpl.id] = {};
          for (const boqItem of tmpl.boqItems || []) {
            const rows = llmResult[boqItem.sorCode] ?? [];
            if (rows.length > 0) {
              suggestions[tmpl.id][boqItem.sorCode] = rows;
              filledCount++;
            }
          }
        }
        usedLLM = true;
      } catch (e) {
        console.error("[generate-measurement-sheet] Ollama failed:", e);
      }
    }
  }

  // Fallback: rule-based mapping (when Ollama unavailable or failed)
  if (!usedLLM) {
    for (const tmpl of templates || []) {
      suggestions[tmpl.id] = {};
      for (const boqItem of tmpl.boqItems || []) {
        const rows = ruleBased(boqItem, typedEntities);
        if (rows.length > 0) {
          suggestions[tmpl.id][boqItem.sorCode] = rows;
          filledCount++;
        }
      }
    }
  }

  return NextResponse.json({
    drawingName: drawing.name,
    entityCount: entities.length,
    entitySummary,
    suggestions,
    filledCount,
    method: usedLLM ? "ollama-llm" : "rule-based",
  });
}
