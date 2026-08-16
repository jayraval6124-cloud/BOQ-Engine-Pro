"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, Zap, CheckCircle, XCircle, AlertTriangle, HelpCircle,
  FileText, RefreshCw, Pencil, Trash2, ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, Maximize2, Info, Plus
} from "lucide-react";
import { toast } from "@/components/ui/toaster";
import { getEntityDef, ENTITY_COLOR_MAP } from "@/lib/drawing-templates";

interface Drawing {
  id: string; name: string; drawingNo: string | null; discipline: string; floor: string | null;
  revision: string | null; filePath: string; fileType: string; pageCount: number;
  status: string; analysisError: string | null; uploadedAt: string; analyzedAt: string | null;
  pages: Array<{ id: string; pageNo: number; textContent: string | null }>;
  entities: Entity[];
  project: { id: string; name: string; drawingTemplate: string | null };
}

interface Entity {
  id: string; entityType: string; entityLabel: string | null;
  attributes: Record<string, { value: string | null; unit?: string | null; status?: string }>;
  extractionMethod: string; confidence: number | null; status: string; notes: string | null; verifiedAt: string | null;
}

const ENTITY_STATUS_CONFIG = {
  NEEDS_VERIFICATION: { label: "Needs Review", icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  VERIFIED:           { label: "Verified",     icon: CheckCircle,    color: "text-green-600", bg: "bg-green-50 border-green-200" },
  REJECTED:           { label: "Rejected",     icon: XCircle,        color: "text-red-500",   bg: "bg-red-50 border-red-200" },
  CONFLICT:           { label: "Conflict",     icon: AlertTriangle,  color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
  NOT_FOUND:          { label: "Not Found",    icon: HelpCircle,     color: "text-slate-400", bg: "bg-slate-50 border-slate-200" },
};

function EntityBadge({ type }: { type: string }) {
  const def = getEntityDef(type);
  const color = def ? ENTITY_COLOR_MAP[def.color] : ENTITY_COLOR_MAP.slate;
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color.bg} ${color.text}`}>{def?.label ?? type}</span>;
}

export default function DrawingViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [drawing, setDrawing] = useState<Drawing | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [editEntityId, setEditEntityId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ label: string; attrs: Record<string, string> }>({ label: "", attrs: {} });
  const [addingEntity, setAddingEntity] = useState(false);
  const [addForm, setAddForm] = useState({ entityType: "ROOM", entityLabel: "", attrs: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/drawings/${id}`);
    if (res.ok) setDrawing(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const analyze = async () => {
    setAnalyzing(true);
    const res = await fetch(`/api/drawings/${id}/analyze`, { method: "POST" });
    const data = await res.json();
    setAnalyzing(false);
    if (res.ok) {
      const disc = data.disciplinesDetected?.join(" + ") ?? "";
      toast({ title: `Analysis complete — ${data.entitiesFound} entities found across ${data.pagesProcessed ?? 1} page(s)${disc ? ` [${disc}]` : ""}`, variant: "success" });
      load();
    }
    else { toast({ title: data.error ?? "Analysis failed", variant: "destructive" }); load(); }
  };

  const saveManualEntity = async () => {
    if (!drawing) return;
    // Parse attrs as "key:value, key:value, ..."
    const attrMap: Record<string, { value: string | null; unit: string | null }> = {};
    if (addForm.attrs.trim()) {
      for (const pair of addForm.attrs.split(",")) {
        const [k, ...rest] = pair.split(":");
        const key = k.trim();
        const val = rest.join(":").trim();
        if (key) attrMap[key] = { value: val || null, unit: null };
      }
    }
    const res = await fetch("/api/project-entities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: drawing.project.id,
        drawingId: drawing.id,
        entityType: addForm.entityType,
        entityLabel: addForm.entityLabel || null,
        attributes: attrMap,
        extractionMethod: "MANUAL",
        status: "NEEDS_VERIFICATION",
      }),
    });
    if (res.ok) {
      toast({ title: "Entity added", variant: "success" });
      setAddingEntity(false);
      setAddForm({ entityType: "ROOM", entityLabel: "", attrs: "" });
      load();
    } else {
      toast({ title: "Failed to add entity", variant: "destructive" });
    }
  };

  const verifyEntity = async (entityId: string, action: "verify" | "reject") => {
    await fetch(`/api/project-entities/${entityId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    load();
  };

  const deleteEntity = async (entityId: string) => {
    if (!confirm("Remove this entity?")) return;
    await fetch(`/api/project-entities/${entityId}`, { method: "DELETE" });
    load();
  };

  const startEdit = (entity: Entity) => {
    const attrs: Record<string, string> = {};
    for (const [k, v] of Object.entries(entity.attributes)) attrs[k] = v?.value ?? "";
    setEditForm({ label: entity.entityLabel ?? "", attrs });
    setEditEntityId(entity.id);
  };

  const saveEdit = async () => {
    if (!editEntityId) return;
    const entity = drawing?.entities.find((e) => e.id === editEntityId);
    if (!entity) return;
    const attributes: Record<string, { value: string | null; unit?: string | null }> = {};
    for (const [k, v] of Object.entries(editForm.attrs)) {
      attributes[k] = { value: v || null, unit: entity.attributes[k]?.unit ?? null };
    }
    await fetch(`/api/project-entities/${editEntityId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityLabel: editForm.label, attributes }),
    });
    toast({ title: "Saved", variant: "success" });
    setEditEntityId(null);
    load();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" /></div>;
  }
  if (!drawing) {
    return <div className="text-center py-16 text-slate-500">Drawing not found. <Link href="/dashboard/drawings" className="text-blue-600">Go back</Link></div>;
  }

  const entities = drawing.entities ?? [];
  const verified = entities.filter((e) => e.status === "VERIFIED").length;
  const pending = entities.filter((e) => e.status === "NEEDS_VERIFICATION").length;

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] -mt-6 -mx-6">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 py-3 bg-white border-b border-slate-200 shrink-0">
        <Link href="/dashboard/drawings" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="w-px h-5 bg-slate-200" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {drawing.drawingNo && <span className="text-xs font-mono font-semibold bg-slate-100 px-2 py-0.5 rounded text-slate-600">{drawing.drawingNo}</span>}
            <h1 className="text-sm font-semibold text-slate-800 truncate">{drawing.name}</h1>
            <span className="text-xs text-slate-400">· {drawing.discipline} · {drawing.pageCount} page{drawing.pageCount !== 1 ? "s" : ""}</span>
          </div>
          <p className="text-xs text-slate-400">
            Project: {drawing.project.name}
            {drawing.analyzedAt && ` · Analyzed ${new Date(drawing.analyzedAt).toLocaleDateString("en-IN")}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{verified}/{entities.length} verified</span>
          {pending > 0 && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{pending} pending</span>}
          <button onClick={analyze} disabled={analyzing}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-60">
            {analyzing ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Analyzing…</> : <><Zap className="w-3.5 h-3.5" /> Analyze</>}
          </button>
        </div>
      </div>

      {/* Body: viewer + entities panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Drawing viewer ── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-100">
          {/* Viewer toolbar */}
          <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-slate-200">
            <div className="flex items-center gap-1">
              <button onClick={() => setZoom((z) => Math.max(25, z - 25))} className="p-1.5 hover:bg-slate-100 rounded text-slate-600">
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-600 w-12 text-center font-mono">{zoom}%</span>
              <button onClick={() => setZoom((z) => Math.min(200, z + 25))} className="p-1.5 hover:bg-slate-100 rounded text-slate-600">
                <ZoomIn className="w-4 h-4" />
              </button>
              <button onClick={() => setZoom(100)} className="p-1.5 hover:bg-slate-100 rounded text-slate-600">
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Actual viewer */}
          <div className="flex-1 overflow-auto flex items-start justify-center p-6">
            {drawing.fileType === "pdf" ? (
              <iframe
                src={drawing.filePath}
                style={{ width: `${zoom}%`, minHeight: "80vh", border: "none" }}
                className="shadow-xl rounded-lg bg-white"
                title={drawing.name}
              />
            ) : (
              <img
                src={drawing.filePath}
                alt={drawing.name}
                style={{ width: `${zoom}%`, maxWidth: "100%" }}
                className="shadow-xl rounded-lg object-contain"
              />
            )}
          </div>

          {/* Extracted text preview (if PDF analyzed) */}
          {drawing.pages.length > 0 && drawing.pages[0].textContent && (
            <details className="border-t border-slate-200 bg-white">
              <summary className="px-4 py-2 text-xs text-slate-500 cursor-pointer hover:bg-slate-50 flex items-center gap-2">
                <Info className="w-3.5 h-3.5" /> Extracted text from PDF
                <span className="ml-auto text-slate-400">{drawing.pages[0].textContent.length.toLocaleString()} chars extracted</span>
              </summary>
              <div className="px-4 pb-3 max-h-48 overflow-y-auto">
                <pre className="text-xs text-slate-500 whitespace-pre-wrap font-mono leading-relaxed">
                  {drawing.pages[0].textContent}
                </pre>
              </div>
            </details>
          )}
        </div>

        {/* ── Entities panel ── */}
        <div className="w-80 shrink-0 flex flex-col bg-white border-l border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Extracted Entities</h2>
              <button onClick={() => setAddingEntity((v) => !v)}
                className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium">
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{entities.length} total · {verified} verified · {pending} pending</p>
          </div>

          {/* Quick-add entity form */}
          {addingEntity && (
            <div className="px-4 py-3 border-b border-slate-100 bg-blue-50">
              <p className="text-xs font-semibold text-slate-700 mb-2">Add Entity Manually</p>
              <div className="space-y-2">
                <select value={addForm.entityType} onChange={(e) => setAddForm((p) => ({ ...p, entityType: e.target.value }))}
                  className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                  {["BUILDING","ROOM","DOOR","WINDOW","COLUMN","BEAM","FOOTING","SLAB","WALL","STAIR"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <input value={addForm.entityLabel} onChange={(e) => setAddForm((p) => ({ ...p, entityLabel: e.target.value }))}
                  placeholder="Label / ID (e.g. Waiting Hall, D1, W2)"
                  className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                <textarea value={addForm.attrs} onChange={(e) => setAddForm((p) => ({ ...p, attrs: e.target.value }))}
                  placeholder={"Attributes: key:value, key:value\ne.g. length:18.2, width:8.5, floor:GF"}
                  rows={3}
                  className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
                <div className="flex gap-1.5">
                  <button onClick={saveManualEntity} className="flex-1 py-1.5 bg-blue-600 text-white text-xs rounded font-medium hover:bg-blue-700">Add Entity</button>
                  <button onClick={() => setAddingEntity(false)} className="flex-1 py-1.5 bg-white text-slate-600 text-xs rounded font-medium hover:bg-slate-50 border border-slate-200">Cancel</button>
                </div>
              </div>
            </div>
          )}

          {entities.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <Zap className="w-8 h-8 text-slate-200" />
              <p className="text-sm text-slate-400">No entities extracted yet.</p>
              <p className="text-xs text-slate-400">Click Analyze to extract data using Ollama AI.</p>
              <button onClick={analyze} disabled={analyzing}
                className="mt-2 px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60">
                {analyzing ? "Analyzing…" : "Analyze Now"}
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {entities.map((entity) => {
                const sc = ENTITY_STATUS_CONFIG[entity.status as keyof typeof ENTITY_STATUS_CONFIG] ?? ENTITY_STATUS_CONFIG.NEEDS_VERIFICATION;
                const StatusIcon = sc.icon;
                const attrs = entity.attributes ?? {};
                // Hide internal tracking fields from the UI
                const HIDDEN_ATTRS = new Set(["_page", "type", "material"]);
                const attrEntries = Object.entries(attrs).filter(([k]) => !HIDDEN_ATTRS.has(k));
                const isEditing = editEntityId === entity.id;

                return (
                  <div key={entity.id} className={`p-3 ${entity.status === "REJECTED" ? "opacity-50" : ""}`}>
                    <div className="flex items-start gap-2 mb-2">
                      <EntityBadge type={entity.entityType} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{entity.entityLabel || entity.entityType}</p>
                        {entity.confidence != null && (
                          <p className="text-xs text-slate-400">{Math.round(entity.confidence * 100)}% confidence</p>
                        )}
                      </div>
                      <div className={`flex items-center gap-0.5 text-xs shrink-0 ${sc.color}`}>
                        <StatusIcon className="w-3 h-3" />
                      </div>
                    </div>

                    {/* Attributes */}
                    {!isEditing ? (
                      <div className="space-y-1 mb-2">
                        {attrEntries.map(([key, attr]) => (
                          <div key={key} className={`flex items-center justify-between text-xs rounded px-2 py-0.5 ${attr?.value ? "bg-slate-50" : "bg-red-50"}`}>
                            <span className="text-slate-500 capitalize">{key}</span>
                            <span className={`font-medium ${attr?.value ? "text-slate-800" : "text-red-400"}`}>
                              {attr?.value ? `${attr.value}${attr.unit ? ` ${attr.unit}` : ""}` : "NOT FOUND"}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-1.5 mb-2">
                        <input value={editForm.label} onChange={(e) => setEditForm((p) => ({ ...p, label: e.target.value }))}
                          placeholder="Entity name/ID" className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        {attrEntries.map(([key]) => (
                          <div key={key} className="flex items-center gap-1">
                            <label className="text-xs text-slate-500 w-20 shrink-0 capitalize">{key}</label>
                            <input value={editForm.attrs[key] ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, attrs: { ...p.attrs, [key]: e.target.value } }))}
                              placeholder="NOT_FOUND" className="flex-1 text-xs border border-slate-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          </div>
                        ))}
                        {/* Allow editing hidden internal attrs so data isn't lost */}
                        <div className="flex gap-1 pt-1">
                          <button onClick={saveEdit} className="flex-1 py-1 bg-blue-600 text-white text-xs rounded font-medium hover:bg-blue-700">Save</button>
                          <button onClick={() => setEditEntityId(null)} className="flex-1 py-1 bg-slate-100 text-slate-600 text-xs rounded font-medium hover:bg-slate-200">Cancel</button>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {!isEditing && entity.status !== "VERIFIED" && entity.status !== "REJECTED" && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => verifyEntity(entity.id, "verify")}
                          className="flex items-center gap-0.5 px-2 py-1 bg-green-600 text-white text-xs rounded font-medium hover:bg-green-700">
                          <CheckCircle className="w-3 h-3" /> Accept
                        </button>
                        <button onClick={() => startEdit(entity)}
                          className="flex items-center gap-0.5 px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded font-medium hover:bg-slate-200">
                          <Pencil className="w-3 h-3" /> Edit
                        </button>
                        <button onClick={() => verifyEntity(entity.id, "reject")}
                          className="flex items-center gap-0.5 px-2 py-1 bg-red-50 text-red-600 text-xs rounded font-medium hover:bg-red-100">
                          <XCircle className="w-3 h-3" /> Reject
                        </button>
                        <button onClick={() => deleteEntity(entity.id)} className="p-1 text-slate-300 hover:text-red-500 ml-auto">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    {!isEditing && entity.status === "VERIFIED" && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Verified</span>
                        <button onClick={() => startEdit(entity)} className="ml-auto p-1 text-slate-300 hover:text-slate-600">
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {drawing.status === "ERROR" && drawing.analysisError && (
            <div className="p-3 bg-red-50 border-t border-red-200">
              <p className="text-xs text-red-600 font-medium">Analysis error:</p>
              <p className="text-xs text-red-500 mt-0.5">{drawing.analysisError}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
