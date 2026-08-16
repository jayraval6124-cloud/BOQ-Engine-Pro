import { prisma } from "@/lib/db";

export interface OllamaSettings {
  provider: string;
  ollamaUrl: string;
  ollamaModel: string;
  ollamaVisionModel: string;
  ollamaTimeout: number;
}

export async function getAISettings(): Promise<OllamaSettings> {
  const s = await prisma.aISettings.findUnique({ where: { id: "singleton" } });
  return {
    provider: s?.provider ?? "ollama",
    ollamaUrl: s?.ollamaUrl ?? "http://localhost:11434",
    ollamaModel: s?.ollamaModel ?? "qwen2.5:7b",
    ollamaVisionModel: s?.ollamaVisionModel ?? "qwen2.5:7b",
    ollamaTimeout: s?.ollamaTimeout ?? 300,
  };
}

export async function checkOllamaStatus(settings?: OllamaSettings): Promise<{ ok: boolean; error?: string; models?: string[] }> {
  const cfg = settings ?? (await getAISettings());
  try {
    const res = await fetch(`${cfg.ollamaUrl}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    const models = (data.models ?? []).map((m: { name: string }) => m.name);
    return { ok: true, models };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
  }
}

export async function ollamaGenerate(prompt: string, settings: OllamaSettings): Promise<string> {
  const res = await fetch(`${settings.ollamaUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: settings.ollamaModel,
      prompt,
      stream: false,
      format: "json",
      options: {
        num_ctx: 32768,
        temperature: 0.1,
      },
    }),
    signal: AbortSignal.timeout(settings.ollamaTimeout * 1000),
  });
  if (!res.ok) throw new Error(`Ollama error: HTTP ${res.status}`);
  const data = await res.json();
  return data.response ?? "";
}

export async function ollamaVision(prompt: string, imageBase64: string, settings: OllamaSettings): Promise<string> {
  const res = await fetch(`${settings.ollamaUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: settings.ollamaVisionModel,
      prompt,
      images: [imageBase64],
      stream: false,
      format: "json",
    }),
    signal: AbortSignal.timeout(settings.ollamaTimeout * 1000),
  });
  if (!res.ok) throw new Error(`Ollama vision error: HTTP ${res.status}`);
  const data = await res.json();
  return data.response ?? "";
}

// ── CAD text pre-processor ──────────────────────────────────────────────────
// CAD PDFs dump text in random draw order. This parser finds rooms, doors,
// windows from common patterns and produces clean structured text for the LLM.

const DIM_RE = /(\d+\.?\d*)\s*[xX×]\s*(\d+\.?\d*)/g;

// Auto-detect discipline from page text content
export function detectDiscipline(pageText: string): string {
  const t = pageText.toUpperCase();
  const score: Record<string, number> = { ARCHITECTURAL: 0, STRUCTURAL: 0, PLUMBING: 0, ELECTRICAL: 0 };

  // Architectural signals
  if (/\b(FLOOR\s+PLAN|ROOM|DOOR\s+SCHEDULE|WINDOW\s+SCHEDULE|ELEVATION|SECTION|FINISH|TILE|PAINT)\b/.test(t)) score.ARCHITECTURAL += 3;
  if (/\b(KITCHEN|TOILET|BATHROOM|CANTEEN|LOBBY|CORRIDOR|RECEPTION|OFFICE|HALL|WAITING)\b/.test(t)) score.ARCHITECTURAL += 2;
  if (/\b(DOOR|WINDOW|SHUTTER|VENTILATION|OPENING\s+SCHEDULE)\b/.test(t)) score.ARCHITECTURAL += 2;

  // Structural signals
  if (/\b(FOUNDATION|FOOTING|PILE|RAFT|PLINTH|GRADE\s+BEAM)\b/.test(t)) score.STRUCTURAL += 4;
  if (/\b(COLUMN\s+SCHEDULE|BEAM\s+SCHEDULE|REBAR|REINFORCEMENT|STIRRUP|DOWEL|BAR\s+DIA)\b/.test(t)) score.STRUCTURAL += 3;
  if (/\b(COLUMN|BEAM|SLAB|SHEAR\s+WALL|LINTEL|RETAINING)\b/.test(t)) score.STRUCTURAL += 2;
  if (/\b(M20|M25|M30|FE\s*415|FE\s*500|CONCRETE\s+GRADE|FILLER)\b/.test(t)) score.STRUCTURAL += 2;

  // Plumbing signals
  if (/\b(PLUMBING|DRAINAGE|PIPE|MANHOLE|GULLY|SOIL\s+PIPE|WASTE\s+PIPE|VENT\s+PIPE)\b/.test(t)) score.PLUMBING += 3;

  // Electrical signals
  if (/\b(ELECTRICAL|SINGLE\s+LINE|PANEL|MCB|CIRCUIT|CONDUIT|EARTHING|SWITCH\s+BOARD)\b/.test(t)) score.ELECTRICAL += 3;

  const best = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : "OTHER";
}
const ROOM_KEYWORD = /\b(ROOM|HALL|OFFICE|TOILET|KITCHEN|CANTEEN|STORE|LOBBY|CORRIDOR|FOYER|PANTRY|BATHROOM|CABIN|CHAMBER|DEPOT|PLATFORM|WAITING|AREA|CENTRE|CENTER|PARCEL|GENTS|LADIES|STAFF|DRINKING|FEEDING|BABY|HANDCLAP|HANDICAP|COOLER|WASH|WATER|REST|CONTROL|CONFERENCE|RECEPTION)\b/i;
// Opening schedule entry: CODE TYPE WxH  (e.g. D1 DOOR 1.00X2.10)
const SCHED_RE = /([A-Z]{1,2}\d{1,2})\s+(DOOR|WINDOW|ROLLING\s+SHUTTER|VENTILATION|SHUTTER|GATE|GRILLE)[^0-9]*(\d+\.?\d*)\s*[xX×]\s*(\d+\.?\d*)/gi;
// Strip single-letter door/window tags from room names (D, D1, D2, W, W1 etc.)
const TAG_RE = /\b[DVWRSU]\d{0,2}\b/g;

export function preprocessCadText(raw: string): string {
  // Worker outputs: SORTED_TEXT\n===RAW===\nRAW_TEXT
  const sepIdx = raw.indexOf("===RAW===");
  const sortedText = sepIdx >= 0 ? raw.slice(0, sepIdx) : raw;
  const rawText   = sepIdx >= 0 ? raw.slice(sepIdx + 9) : raw;

  // Flat raw draw-order string — schedule table columns stay together
  const flatRaw = rawText.replace(/\n|--- PAGE BREAK ---/g, "  ");

  const rooms: Array<{ name: string; l: string; w: string }> = [];
  const openings: Array<{ code: string; type: string; l: string; w: string }> = [];

  // ── 1. Opening schedule: scan RAW (draw order) text ────────────────────────
  const seenCodes = new Set<string>();
  let m: RegExpExecArray | null;
  const schedRe = new RegExp(SCHED_RE.source, "gi");
  while ((m = schedRe.exec(flatRaw)) !== null) {
    const code = m[1].toUpperCase();
    if (!seenCodes.has(code)) {
      seenCodes.add(code);
      openings.push({ code, type: m[2].toUpperCase().replace(/\s+/g, " "), l: m[3], w: m[4] });
    }
  }

  // ── 2. Rooms: scan SORTED lines (same-Y items grouped) ─────────────────────
  const seenRooms = new Set<string>();
  const lines = sortedText.split(/\n|--- PAGE BREAK ---/).map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (/opening\s+schedule|^\s*code\s*$|project\s+name|drg\.\s*titel|chief\s+eng/i.test(line)) continue;
    const dims = [...line.matchAll(new RegExp(DIM_RE.source, "g"))];
    if (dims.length === 0 || !ROOM_KEYWORD.test(line)) continue;

    let name = line
      .replace(new RegExp(DIM_RE.source, "g"), " ")
      .replace(TAG_RE, " ")
      .replace(/[^A-Za-z\s&/]/g, " ")
      .replace(/\b[A-Z]\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (name.length < 2) continue;
    const key = name.toUpperCase();
    if (seenRooms.has(key)) continue;
    seenRooms.add(key);
    rooms.push({ name, l: dims[0][1], w: dims[0][2] });
  }

  // ── 3. Build structured output ─────────────────────────────────────────────
  const out: string[] = [];
  if (rooms.length > 0) {
    out.push("=== ROOMS / SPACES ===");
    for (const r of rooms) out.push(`${r.name}: ${r.l} x ${r.w} m`);
  }
  if (openings.length > 0) {
    out.push("\n=== OPENING SCHEDULE ===");
    for (const o of openings) out.push(`${o.code}: ${o.type}, ${o.l} x ${o.w} m`);
  }
  return out.length > 0 ? out.join("\n") : sortedText.slice(0, 6000);
}
// ─────────────────────────────────────────────────────────────────────────────

const DISCIPLINE_ENTITIES: Record<string, { types: string[]; description: string }> = {
  ARCHITECTURAL: {
    types: ["BUILDING", "ROOM", "DOOR", "WINDOW", "WALL", "STAIR"],
    description: "rooms/spaces, doors, windows, walls, stairs — NO structural elements",
  },
  STRUCTURAL: {
    types: ["BUILDING", "COLUMN", "BEAM", "FOOTING", "SLAB", "WALL", "STAIR"],
    description: "columns, beams, footings, slabs, structural walls — NO rooms or doors",
  },
  PLUMBING: {
    types: ["ROOM", "WALL"],
    description: "wet areas, pipe runs, fixture locations",
  },
  ELECTRICAL: {
    types: ["ROOM", "BUILDING"],
    description: "electrical rooms, panel locations",
  },
  OTHER: {
    types: ["BUILDING", "ROOM", "DOOR", "WINDOW", "COLUMN", "BEAM", "FOOTING", "SLAB", "WALL", "STAIR"],
    description: "all entity types",
  },
};

const ENTITY_ATTRS: Record<string, string> = {
  BUILDING: "length, width, floorCount, floorHeight, totalArea",
  ROOM:     "name, floor, length, width, height, area",
  DOOR:     "id, width, height, quantity",
  WINDOW:   "id, width, height, quantity",
  COLUMN:   "id, size, floor",
  BEAM:     "id, size, span, floor",
  FOOTING:  "id, length, width, depth, quantity",
  SLAB:     "floor, thickness, area",
  WALL:     "thickness, height, location",
  STAIR:    "id, width, riserCount, floor",
};

export function buildExtractionPrompt(templateType: string, drawingContent: string, discipline = "OTHER"): string {
  const rawLength = drawingContent.trim().length;
  const disc = DISCIPLINE_ENTITIES[discipline] ?? DISCIPLINE_ENTITIES.OTHER;
  const entityList = disc.types.map((t) => `- ${t}: (${ENTITY_ATTRS[t]})`).join("\n");

  if (rawLength < 50) {
    // No text at all — scaffold mode
    return `You are a civil engineering drawing data extractor for a BOQ system.

PROJECT TYPE: ${templateType}
DRAWING DISCIPLINE: ${discipline}

No text could be extracted from this PDF. List typical entities for a ${templateType} ${discipline.toLowerCase()} drawing. Set all values to null with "status": "NOT_FOUND".

ENTITIES TO EXTRACT:
${entityList}

Return ONLY valid JSON: { "entities": [ ... ] }`;
  }

  // Split sorted text and raw text sections
  const sepIdx = drawingContent.indexOf("===RAW===");
  const sortedText = sepIdx >= 0 ? drawingContent.slice(0, sepIdx).trim() : drawingContent.trim();
  const rawText   = sepIdx >= 0 ? drawingContent.slice(sepIdx + 9).trim() : drawingContent.trim();

  // Run the CAD preprocessor to extract structured room/opening hints
  const preprocessed = preprocessCadText(drawingContent);
  const hasStructured = preprocessed.includes("===") && preprocessed.trim().length > 30;

  // Full text for LLM — sorted is more readable, cap at 10000 chars
  const fullText = sortedText.slice(0, 10000);

  return `You are a civil engineering drawing data extractor for a BOQ system.

PROJECT TYPE: ${templateType}
DRAWING DISCIPLINE: ${discipline} — extract ONLY: ${disc.description}

TASK: Read the FULL DRAWING TEXT below and extract every ${disc.description}. Be exhaustive — one entity per room, one per door ID, one per window ID. Extract every value you can find; only use NOT_FOUND if a value is genuinely absent.

RULES:
1. ONLY extract entity types listed under ENTITIES below
2. Extract every value visible in the drawing text — dimensions, sizes, counts, floor labels
3. For DOOR/WINDOW quantity: count how many times that ID appears in the text (e.g. "D2" appears 6 times → quantity 6)
4. If a value appears anywhere in the text, use it. NOT_FOUND only when truly absent
5. Do NOT invent values that are not in the text
6. Return ONLY valid JSON — no markdown, no extra text

ENTITIES TO EXTRACT:
${entityList}

RESPONSE FORMAT:
{
  "entities": [
    {
      "entityType": "ROOM",
      "entityLabel": "Ladies Toilet",
      "confidence": 0.9,
      "attributes": {
        "floor": { "value": "GF", "unit": null },
        "length": { "value": "3.22", "unit": "m" },
        "width": { "value": "4.35", "unit": "m" },
        "area": { "value": null, "unit": "sqm", "status": "NOT_FOUND" }
      }
    },
    {
      "entityType": "DOOR",
      "entityLabel": "D2",
      "confidence": 0.9,
      "attributes": {
        "id": { "value": "D2", "unit": null },
        "width": { "value": "0.80", "unit": "m" },
        "height": { "value": "2.10", "unit": "m" },
        "quantity": { "value": "6", "unit": "nos" }
      }
    }
  ]
}

${hasStructured ? `STRUCTURED HINTS (auto-parsed rooms and openings):\n${preprocessed}\n\n` : ""}FULL DRAWING TEXT (use this as the primary source):
${fullText}
${rawText && rawText !== sortedText ? `\nRAW DRAW-ORDER TEXT (for cross-reference):\n${rawText.slice(0, 4000)}` : ""}`;
}

export function parseOllamaEntities(raw: string): Array<{
  entityType: string;
  entityLabel?: string;
  confidence?: number;
  attributes: Record<string, { value: string | null; unit?: string | null; status?: string }>;
}> {
  try {
    const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/```\s*$/i, "");
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed.entities)) return parsed.entities;
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}
