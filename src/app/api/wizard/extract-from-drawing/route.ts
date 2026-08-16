import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface Param { name: string; label: string; unit?: string; dims?: string; }
interface TemplateInput { id: string; parameters: Param[]; }

type EntityRow = {
  entityType: string;
  entityLabel: string | null;
  attributes: Record<string, { value: string | null; unit?: string | null }>;
};

function parseNum(val: string | null | undefined): number {
  if (!val) return 0;
  // Handle mm → m conversion for dimensional values
  const n = parseFloat(val.replace(/[^0-9.-]/g, ""));
  return isFinite(n) ? n : 0;
}

function getAttr(ent: EntityRow, key: string): number {
  const raw = ent.attributes?.[key]?.value;
  const unit = ent.attributes?.[key]?.unit;
  const val = parseNum(raw);
  // Convert mm to m if unit is mm
  if (unit?.toLowerCase() === "mm" && val > 0) return val / 1000;
  return val;
}

// Parse a "300 x 450" style size string → return first number in metres
function parseSizeStr(val: string | null | undefined): number {
  if (!val) return 0;
  const m = val.match(/[\d.]+/);
  if (!m) return 0;
  const n = parseFloat(m[0]);
  return n > 10 ? n / 1000 : n; // treat >10 as mm
}

function mapEntitiesToParams(
  entities: EntityRow[],
  templateParams: Param[],
): Record<string, number> {
  const suggestions: Record<string, number> = {};

  // Entity buckets — ROOM treated same as BUILDING
  const rooms    = entities.filter((e) => e.entityType === "ROOM" || e.entityType === "BUILDING");
  const columns  = entities.filter((e) => e.entityType === "COLUMN");
  const footings = entities.filter((e) => e.entityType === "FOOTING");
  const walls    = entities.filter((e) => e.entityType === "WALL");
  const slabs    = entities.filter((e) => e.entityType === "SLAB");
  // DOOR + ROLLING_SHUTTER both count as doors
  const doors    = entities.filter((e) => e.entityType === "DOOR" || e.entityType === "ROLLING_SHUTTER");
  // WINDOW + VENTILATION both count as windows
  const windows  = entities.filter((e) => e.entityType === "WINDOW" || e.entityType === "VENTILATION");

  // ── Plinth area from ROOM entities (sum all room L×W) ──────────────────
  const totalPlinthArea = rooms.reduce((s, r) => {
    const l = getAttr(r, "length") || getAttr(r, "length");
    const w = getAttr(r, "width");
    return s + (l > 0 && w > 0 ? l * w : 0);
  }, 0);

  // Bounding-box estimate from rooms for perimeter
  const maxRoomL = rooms.reduce((mx, r) => Math.max(mx, getAttr(r, "length")), 0);
  const maxRoomW = rooms.reduce((mx, r) => Math.max(mx, getAttr(r, "width")), 0);

  // Floor count — look for floor tag on rooms
  const floorSet = new Set(rooms.map((r) => r.attributes?.["floor"]?.value).filter(Boolean));
  const floors = Math.max(1, floorSet.size);

  // ── Column totals ────────────────────────────────────────────────────────
  const totalColNos = columns.reduce((s, c) =>
    s + Math.max(1, parseNum(c.attributes?.["quantity"]?.value)), 0);

  // Column size: prefer explicit width attr, fallback to "size" string
  const avgColSize = columns.length > 0
    ? columns.reduce((s, c) => {
        const w = getAttr(c, "width");
        if (w > 0) return s + w;
        return s + parseSizeStr(c.attributes?.["size"]?.value);
      }, 0) / columns.length
    : 0;

  // ── Footing totals ───────────────────────────────────────────────────────
  // FOOTING attrs: depth=excavation depth (mm), width=footing width, length=footing length, quantity
  const totalFootNos = footings.reduce((s, f) =>
    s + Math.max(1, parseNum(f.attributes?.["quantity"]?.value)), 0);

  // Group footings by label (F1, F2, F3...)
  const footByLabel: Record<string, EntityRow> = {};
  for (const f of footings) {
    const lbl = (f.entityLabel || "").toUpperCase();
    footByLabel[lbl] = f;
  }
  const f1 = footByLabel["F1"] || footings[0];
  const f2 = footByLabel["F2"] || footings[1];
  const f3 = footByLabel["F3"] || footings[2];

  const getFootNos = (f: EntityRow | undefined) =>
    f ? Math.max(1, parseNum(f.attributes?.["quantity"]?.value)) : 0;
  const getFootDim = (f: EntityRow | undefined, key: string) =>
    f ? getAttr(f, key) : 0;

  // ── Opening totals ───────────────────────────────────────────────────────
  const totalDoorArea = doors.reduce((s, d) => {
    const w = getAttr(d, "width"), h = getAttr(d, "height");
    const qty = Math.max(1, parseNum(d.attributes?.["quantity"]?.value));
    return s + (w > 0 && h > 0 ? w * h * qty : 0);
  }, 0);

  const totalWindowArea = windows.reduce((s, w) => {
    const ww = getAttr(w, "width"), h = getAttr(w, "height");
    const qty = Math.max(1, parseNum(w.attributes?.["quantity"]?.value));
    return s + (ww > 0 && h > 0 ? ww * h * qty : 0);
  }, 0);

  const totalSlabArea = slabs.reduce((s, sl) => {
    const area = getAttr(sl, "area");
    if (area > 0) return s + area;
    // fallback: if we have plinth area, use that
    return s + totalPlinthArea;
  }, 0);

  // ── Map to template params ───────────────────────────────────────────────
  for (const param of templateParams) {
    const pn = param.name;

    // Building / room areas
    if (pn === "plinth_area" && totalPlinthArea > 0)
      { suggestions[pn] = parseFloat(totalPlinthArea.toFixed(2)); continue; }
    if ((pn === "no_of_floors" || pn === "floors") && floors > 0)
      { suggestions[pn] = floors; continue; }
    if (pn === "floor_area" && totalPlinthArea > 0)
      { suggestions[pn] = parseFloat((totalPlinthArea * floors).toFixed(2)); continue; }

    // Running meter / perimeter
    if ((pn === "running_meter" || pn === "wall_len" || pn === "wall_len_gf" || pn === "wall_len_ff") && totalPlinthArea > 0) {
      const perim = maxRoomL > 0 && maxRoomW > 0
        ? 2 * (maxRoomL + maxRoomW)
        : Math.sqrt(totalPlinthArea) * 4;
      suggestions[pn] = parseFloat((perim * 1.3).toFixed(1)); // 1.3 factor for internal walls
      continue;
    }
    if (pn === "cw_rm" && totalPlinthArea > 0) {
      const perim = maxRoomL > 0 && maxRoomW > 0 ? 2*(maxRoomL+maxRoomW) : Math.sqrt(totalPlinthArea)*4;
      suggestions[pn] = parseFloat((perim * 1.2).toFixed(1));
      continue;
    }

    // Columns
    if ((pn === "col_nos" || pn === "column_nos" || pn === "total_col_nos") && totalColNos > 0)
      { suggestions[pn] = Math.ceil(totalColNos); continue; }
    if ((pn === "col_size" || pn === "col_size_gf" || pn === "col_size_plinth") && avgColSize > 0)
      { suggestions[pn] = parseFloat(avgColSize.toFixed(3)); continue; }

    // Footings — by label F1/F2/F3
    if (pn === "f1_nos" && getFootNos(f1) > 0) { suggestions[pn] = getFootNos(f1); continue; }
    if (pn === "f1_exc_h" && getFootDim(f1, "depth") > 0) { suggestions[pn] = parseFloat(getFootDim(f1, "depth").toFixed(2)); continue; }
    if (pn === "f1_exc_l" && getFootDim(f1, "length") > 0) { suggestions[pn] = parseFloat(getFootDim(f1, "length").toFixed(2)); continue; }
    if (pn === "f1_exc_b" && getFootDim(f1, "width") > 0) { suggestions[pn] = parseFloat(getFootDim(f1, "width").toFixed(2)); continue; }

    if (pn === "f2_nos" && getFootNos(f2) > 0) { suggestions[pn] = getFootNos(f2); continue; }
    if (pn === "f2_exc_h" && getFootDim(f2, "depth") > 0) { suggestions[pn] = parseFloat(getFootDim(f2, "depth").toFixed(2)); continue; }
    if (pn === "f2_exc_l" && getFootDim(f2, "length") > 0) { suggestions[pn] = parseFloat(getFootDim(f2, "length").toFixed(2)); continue; }
    if (pn === "f2_exc_b" && getFootDim(f2, "width") > 0) { suggestions[pn] = parseFloat(getFootDim(f2, "width").toFixed(2)); continue; }

    if (pn === "f3_nos" && getFootNos(f3) > 0) { suggestions[pn] = getFootNos(f3); continue; }
    if (pn === "f3_exc_h" && getFootDim(f3, "depth") > 0) { suggestions[pn] = parseFloat(getFootDim(f3, "depth").toFixed(2)); continue; }
    if (pn === "f3_exc_l" && getFootDim(f3, "length") > 0) { suggestions[pn] = parseFloat(getFootDim(f3, "length").toFixed(2)); continue; }
    if (pn === "f3_exc_b" && getFootDim(f3, "width") > 0) { suggestions[pn] = parseFloat(getFootDim(f3, "width").toFixed(2)); continue; }

    // Total footing count fallback
    if (pn === "footing_nos" && totalFootNos > 0) { suggestions[pn] = Math.ceil(totalFootNos); continue; }

    // Slab areas
    if ((pn === "gf_slab_area" || pn === "roof_slab_area" || pn === "slab_area") && totalPlinthArea > 0)
      { suggestions[pn] = parseFloat(totalPlinthArea.toFixed(2)); continue; }
    if (totalSlabArea > 0 && pn.includes("slab"))
      { suggestions[pn] = parseFloat(totalSlabArea.toFixed(2)); continue; }

    // Openings
    if (pn === "door_area" && totalDoorArea > 0)
      { suggestions[pn] = parseFloat(totalDoorArea.toFixed(2)); continue; }
    if (pn === "window_area" && totalWindowArea > 0)
      { suggestions[pn] = parseFloat(totalWindowArea.toFixed(2)); continue; }

    // Derived areas from plinth
    if (pn === "ext_plaster_area" && totalPlinthArea > 0) {
      const perim = maxRoomL > 0 && maxRoomW > 0 ? 2*(maxRoomL+maxRoomW) : Math.sqrt(totalPlinthArea)*4;
      suggestions[pn] = parseFloat((perim * 3.5 * floors).toFixed(1));
      continue;
    }
    if (pn === "int_plaster_area" && totalPlinthArea > 0) {
      const perim = maxRoomL > 0 && maxRoomW > 0 ? 2*(maxRoomL+maxRoomW) : Math.sqrt(totalPlinthArea)*4;
      suggestions[pn] = parseFloat((perim * 1.3 * 3.5 * floors).toFixed(1));
      continue;
    }

    // CW columns auto-calc
    if (pn === "cw_col_nos" && totalPlinthArea > 0) {
      const perim = maxRoomL > 0 && maxRoomW > 0 ? 2*(maxRoomL+maxRoomW)*1.2 : Math.sqrt(totalPlinthArea)*4*1.2;
      suggestions[pn] = Math.ceil(perim / 3) + Math.ceil(perim / 15);
      continue;
    }
  }

  return suggestions;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { drawingId, templates } = await req.json() as {
    drawingId: string;
    templates: TemplateInput[];
  };

  if (!drawingId) return NextResponse.json({ error: "drawingId required" }, { status: 400 });

  // Verify user owns this drawing (via project)
  const drawing = await prisma.drawing.findFirst({
    where: { id: drawingId, project: { createdById: session.user.id } },
    select: { id: true, name: true, status: true },
  });
  if (!drawing) return NextResponse.json({ error: "Drawing not found" }, { status: 404 });
  if (drawing.status !== "ANALYZED") return NextResponse.json({ error: "Drawing has not been analyzed yet" }, { status: 422 });

  const entities = await prisma.projectEntity.findMany({
    where: { drawingId },
    select: { entityType: true, entityLabel: true, attributes: true },
  });

  const typedEntities = entities.map((e) => ({
    entityType: e.entityType,
    entityLabel: e.entityLabel,
    attributes: (e.attributes as Record<string, { value: string | null; unit?: string | null }>) ?? {},
  }));

  const suggestions: Record<string, Record<string, number>> = {};
  for (const tmpl of (templates || [])) {
    suggestions[tmpl.id] = mapEntitiesToParams(typedEntities, tmpl.parameters || []);
  }

  return NextResponse.json({
    drawingName: drawing.name,
    entityCount: entities.length,
    suggestions,
  });
}
