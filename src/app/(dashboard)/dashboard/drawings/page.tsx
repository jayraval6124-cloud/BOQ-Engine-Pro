"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Upload, FileText, Image, Eye, Trash2, Zap, CheckCircle, AlertTriangle,
  XCircle, HelpCircle, Plus, RefreshCw, Filter, ChevronDown, Building2,
  Search, MoreHorizontal, Pencil
} from "lucide-react";
import { toast } from "@/components/ui/toaster";
import { DRAWING_TEMPLATE_OPTIONS, ENTITY_DEFINITIONS, ENTITY_COLOR_MAP, getEntityDef } from "@/lib/drawing-templates";

// ─── types ────────────────────────────────────────────────

interface Project { id: string; name: string; projectNo: string; drawingTemplate: string | null }
interface Drawing {
  id: string; name: string; drawingNo: string | null; discipline: string; floor: string | null;
  revision: string | null; filePath: string; fileType: string; pageCount: number;
  status: string; analysisError: string | null; uploadedAt: string; analyzedAt: string | null;
  _count: { entities: number }
}
interface Entity {
  id: string; entityType: string; entityLabel: string | null; attributes: Record<string, { value: string | null; unit?: string | null; status?: string }>;
  extractionMethod: string; confidence: number | null; status: string; notes: string | null;
  verifiedAt: string | null; drawingId: string | null; pageId: string | null;
  drawing: { id: string; name: string; drawingNo: string | null } | null;
  page: { id: string; pageNo: number } | null;
  createdAt: string;
}

const DISCIPLINE_LABELS: Record<string, string> = {
  ARCHITECTURAL: "Architectural", STRUCTURAL: "Structural", ELECTRICAL: "Electrical",
  PLUMBING: "Plumbing", OTHER: "Other",
};

const STATUS_CONFIG = {
  UPLOADED:  { label: "Uploaded",  color: "bg-slate-100 text-slate-600" },
  ANALYZING: { label: "Analyzing", color: "bg-yellow-100 text-yellow-700 animate-pulse" },
  ANALYZED:  { label: "Analyzed",  color: "bg-green-100 text-green-700" },
  ERROR:     { label: "Error",     color: "bg-red-100 text-red-700" },
};

const ENTITY_STATUS_CONFIG = {
  NEEDS_VERIFICATION: { label: "Needs Review", icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
  VERIFIED:           { label: "Verified",     icon: CheckCircle,    color: "text-green-600", bg: "bg-green-50" },
  REJECTED:           { label: "Rejected",     icon: XCircle,        color: "text-red-500",   bg: "bg-red-50" },
  CONFLICT:           { label: "Conflict",     icon: AlertTriangle,  color: "text-orange-600", bg: "bg-orange-50" },
  NOT_FOUND:          { label: "Not Found",    icon: HelpCircle,     color: "text-slate-400", bg: "bg-slate-50" },
};

// ─── helpers ──────────────────────────────────────────────

function EntityBadge({ type }: { type: string }) {
  const def = getEntityDef(type);
  const color = def ? ENTITY_COLOR_MAP[def.color] : ENTITY_COLOR_MAP.slate;
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color.bg} ${color.text}`}>
      {def?.label ?? type}
    </span>
  );
}

// ─── upload modal ─────────────────────────────────────────

function UploadModal({ projectId, onClose, onUploaded }: { projectId: string; onClose: () => void; onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ name: "", drawingNo: "", discipline: "ARCHITECTURAL", floor: "", revision: "" });
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (f: File) => {
    setFile(f);
    if (!form.name) setForm((p) => ({ ...p, name: f.name.replace(/\.[^.]+$/, "") }));
  };

  const submit = async () => {
    if (!file || !form.name) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("projectId", projectId);
    fd.append("name", form.name);
    fd.append("drawingNo", form.drawingNo);
    fd.append("discipline", form.discipline);
    fd.append("floor", form.floor);
    fd.append("revision", form.revision);
    const res = await fetch("/api/drawings", { method: "POST", body: fd });
    setUploading(false);
    if (res.ok) { toast({ title: "Drawing uploaded", variant: "success" }); onUploaded(); onClose(); }
    else { const d = await res.json(); toast({ title: d.error ?? "Upload failed", variant: "destructive" }); }
  };

  const inp = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Upload Drawing</h2>
          <p className="text-xs text-slate-500 mt-0.5">PDF or image file (scanned drawing supported)</p>
        </div>
        <div className="p-6 space-y-4">
          {/* File drop zone */}
          <label className={`block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${file ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:border-blue-300"}`}>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileChange(e.target.files[0]); }} />
            {file ? (
              <><FileText className="w-8 h-8 text-blue-500 mx-auto mb-2" /><p className="text-sm font-medium text-blue-700">{file.name}</p><p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p></>
            ) : (
              <><Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" /><p className="text-sm text-slate-500">Click to select PDF or image</p><p className="text-xs text-slate-400">Multi-page PDF supported</p></>
            )}
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Drawing Name *</label>
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Ground Floor Architectural Plan" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Drawing No.</label>
              <input value={form.drawingNo} onChange={(e) => setForm((p) => ({ ...p, drawingNo: e.target.value }))} placeholder="A-101" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Revision</label>
              <input value={form.revision} onChange={(e) => setForm((p) => ({ ...p, revision: e.target.value }))} placeholder="R0" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Discipline</label>
              <select value={form.discipline} onChange={(e) => setForm((p) => ({ ...p, discipline: e.target.value }))} className={inp}>
                {Object.entries(DISCIPLINE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Floor / Level</label>
              <input value={form.floor} onChange={(e) => setForm((p) => ({ ...p, floor: e.target.value }))} placeholder="GF / FF / Roof" className={inp} />
            </div>
          </div>
        </div>
        <div className="px-6 pb-5 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
          <button onClick={submit} disabled={!file || !form.name || uploading}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {uploading ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Uploading…</> : <><Upload className="w-3.5 h-3.5" /> Upload</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── edit entity modal ────────────────────────────────────

function EditEntityModal({ entity, onClose, onSaved }: { entity: Entity; onClose: () => void; onSaved: () => void }) {
  const def = getEntityDef(entity.entityType);
  const [label, setLabel] = useState(entity.entityLabel ?? "");
  const [attrs, setAttrs] = useState<Record<string, { value: string | null; unit?: string | null; status?: string }>>(
    JSON.parse(JSON.stringify(entity.attributes))
  );
  const [saving, setSaving] = useState(false);

  const updateAttr = (key: string, value: string) => {
    setAttrs((p) => ({ ...p, [key]: { ...p[key], value: value || null } }));
  };

  const save = async () => {
    setSaving(true);
    const res = await fetch(`/api/project-entities/${entity.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityLabel: label, attributes: attrs }),
    });
    setSaving(false);
    if (res.ok) { toast({ title: "Entity updated", variant: "success" }); onSaved(); onClose(); }
    else toast({ title: "Save failed", variant: "destructive" });
  };

  const inp = "w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500";
  const fields = def?.fields ?? Object.keys(attrs).map((k) => ({ key: k, label: k, unit: attrs[k]?.unit ?? undefined }));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 sticky top-0 bg-white">
          <EntityBadge type={entity.entityType} />
          <h2 className="text-base font-semibold text-slate-800">Edit Entity</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Label / Name</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Entity name or ID" className={inp} />
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Attributes</p>
            {fields.map((f) => {
              const attr = attrs[f.key] ?? { value: null };
              return (
                <div key={f.key} className="flex items-center gap-3">
                  <label className="w-32 text-xs text-slate-600 shrink-0">{f.label}{f.unit ? ` (${f.unit})` : ""}</label>
                  <input value={attr.value ?? ""} onChange={(e) => updateAttr(f.key, e.target.value)}
                    placeholder="NOT_FOUND" className={`flex-1 ${inp}`} />
                  <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${attr.value ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"}`}>
                    {attr.value ? "Set" : "—"}
                  </span>
                </div>
              );
            })}
            {/* Extra attributes not in def */}
            {Object.keys(attrs).filter((k) => !fields.some((f) => f.key === k)).map((k) => (
              <div key={k} className="flex items-center gap-3">
                <label className="w-32 text-xs text-slate-600 shrink-0">{k}</label>
                <input value={attrs[k]?.value ?? ""} onChange={(e) => updateAttr(k, e.target.value)} className={`flex-1 ${inp}`} />
              </div>
            ))}
          </div>
        </div>
        <div className="px-6 pb-5 flex justify-end gap-3 sticky bottom-0 bg-white border-t border-slate-100 pt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
          <button onClick={save} disabled={saving} className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────

export default function DrawingsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [tab, setTab] = useState<"drawings" | "entities">("drawings");
  const [loading, setLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [editEntity, setEditEntity] = useState<Entity | null>(null);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [ollamaOk, setOllamaOk] = useState<boolean | null>(null);
  const [drawingTemplate, setDrawingTemplate] = useState<string>("");

  // Load projects
  useEffect(() => {
    fetch("/api/projects").then((r) => r.json()).then((d) => {
      const list = Array.isArray(d) ? d : d.projects ?? [];
      setProjects(list);
      if (list.length > 0 && !selectedProjectId) setSelectedProjectId(list[0].id);
    });
  }, []);

  // Check Ollama status
  useEffect(() => {
    fetch("/api/ollama/status").then((r) => r.json()).then((d) => setOllamaOk(d.ok)).catch(() => setOllamaOk(false));
  }, []);

  const loadDrawings = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    const [dRes, eRes] = await Promise.all([
      fetch(`/api/drawings?projectId=${selectedProjectId}`),
      fetch(`/api/project-entities?projectId=${selectedProjectId}`),
    ]);
    const [d, e] = await Promise.all([dRes.json(), eRes.json()]);
    setDrawings(Array.isArray(d) ? d : []);
    setEntities(Array.isArray(e) ? e : []);
    setLoading(false);

    // Sync drawing template from project record
    const p = projects.find((x) => x.id === selectedProjectId);
    setDrawingTemplate(p?.drawingTemplate ?? "");
  }, [selectedProjectId, projects]);

  useEffect(() => { loadDrawings(); }, [loadDrawings]);

  const analyze = async (drawingId: string) => {
    setAnalyzingId(drawingId);
    const res = await fetch(`/api/drawings/${drawingId}/analyze`, { method: "POST" });
    const data = await res.json();
    setAnalyzingId(null);
    if (res.ok) {
      toast({ title: `Found ${data.entitiesFound} entities`, variant: "success" });
      loadDrawings();
    } else {
      toast({ title: data.error ?? "Analysis failed", variant: "destructive" });
      loadDrawings();
    }
  };

  const deleteDrawing = async (d: Drawing) => {
    if (!confirm(`Delete drawing "${d.name}"? All extracted entities will be removed.`)) return;
    await fetch(`/api/drawings/${d.id}`, { method: "DELETE" });
    toast({ title: "Drawing deleted" });
    loadDrawings();
  };

  const verifyEntity = async (id: string, action: "verify" | "reject") => {
    await fetch(`/api/project-entities/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    loadDrawings();
  };

  const deleteEntity = async (id: string) => {
    await fetch(`/api/project-entities/${id}`, { method: "DELETE" });
    loadDrawings();
  };

  const saveTemplate = async () => {
    if (!selectedProjectId) return;
    await fetch(`/api/projects/${selectedProjectId}/drawing-template`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drawingTemplate }),
    });
    toast({ title: "Template saved", variant: "success" });
  };

  // Stats
  const stats = {
    drawings: drawings.length,
    pages: drawings.reduce((s, d) => s + d.pageCount, 0),
    entities: entities.length,
    verified: entities.filter((e) => e.status === "VERIFIED").length,
    needsReview: entities.filter((e) => e.status === "NEEDS_VERIFICATION").length,
    notFound: entities.filter((e) => e.status === "NOT_FOUND").length,
    rejected: entities.filter((e) => e.status === "REJECTED").length,
  };

  const filteredEntities = entities.filter((e) => {
    if (filterStatus !== "ALL" && e.status !== filterStatus) return false;
    if (filterType !== "ALL" && e.entityType !== filterType) return false;
    return true;
  });

  const entityTypes = [...new Set(entities.map((e) => e.entityType))].sort();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Drawings</h1>
          <p className="text-slate-500 text-sm mt-0.5">Upload, analyze, and verify project drawings → feed verified data into BOQ</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Ollama indicator */}
          {ollamaOk !== null && (
            <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg ${ollamaOk ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${ollamaOk ? "bg-green-500" : "bg-red-500"}`} />
              Ollama {ollamaOk ? "Connected" : "Offline"}
            </div>
          )}
          {selectedProjectId && (
            <button onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
              <Upload className="w-4 h-4" /> Upload Drawing
            </button>
          )}
        </div>
      </div>

      {/* Project + Template selector */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
          <label className="text-xs font-medium text-slate-600 shrink-0">Project:</label>
          <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-48">
            <option value="">— Select project —</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.projectNo} — {p.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-600 shrink-0">Extraction Template:</label>
          <select value={drawingTemplate} onChange={(e) => setDrawingTemplate(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">— Select template —</option>
            {DRAWING_TEMPLATE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <button onClick={saveTemplate} className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium">Save</button>
        </div>
        <button onClick={loadDrawings} className="ml-auto text-slate-400 hover:text-slate-600">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {!selectedProjectId ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500">Select a project to manage its drawings</p>
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-6 gap-3">
            {[
              { label: "Drawings", value: stats.drawings, color: "text-blue-600 bg-blue-50" },
              { label: "Pages", value: stats.pages, color: "text-slate-600 bg-slate-100" },
              { label: "Entities", value: stats.entities, color: "text-purple-600 bg-purple-50" },
              { label: "Verified", value: stats.verified, color: "text-green-600 bg-green-50" },
              { label: "Needs Review", value: stats.needsReview, color: "text-amber-600 bg-amber-50" },
              { label: "Not Found", value: stats.notFound, color: "text-red-500 bg-red-50" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-3 text-center shadow-sm">
                <p className={`text-2xl font-bold ${s.color.split(" ")[0]}`}>{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
            <button onClick={() => setTab("drawings")} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === "drawings" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              Drawings ({drawings.length})
            </button>
            <button onClick={() => setTab("entities")} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === "entities" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              Project Data ({entities.length})
            </button>
          </div>

          {/* ── DRAWINGS TAB ── */}
          {tab === "drawings" && (
            loading ? (
              <div className="py-12 text-center"><div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" /></div>
            ) : drawings.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-slate-300 p-16 text-center">
                <Upload className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500 mb-4">No drawings uploaded yet</p>
                <button onClick={() => setShowUpload(true)} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
                  Upload First Drawing
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {drawings.map((drawing) => {
                  const sc = STATUS_CONFIG[drawing.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.UPLOADED;
                  const isAnalyzing = analyzingId === drawing.id;
                  return (
                    <div key={drawing.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                      {/* Thumbnail header */}
                      <div className="h-32 bg-slate-50 border-b border-slate-100 flex items-center justify-center relative">
                        {drawing.fileType === "image" ? (
                          <img src={drawing.filePath} alt={drawing.name} className="h-full w-full object-contain p-2" />
                        ) : (
                          <FileText className="w-10 h-10 text-slate-300" />
                        )}
                        <span className={`absolute top-2 right-2 text-xs font-medium px-2 py-0.5 rounded-full ${sc.color}`}>{sc.label}</span>
                        {drawing.drawingNo && (
                          <span className="absolute top-2 left-2 text-xs font-mono font-semibold bg-white/80 px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                            {drawing.drawingNo}
                          </span>
                        )}
                      </div>
                      {/* Info */}
                      <div className="p-4">
                        <p className="font-semibold text-slate-800 text-sm leading-tight line-clamp-2">{drawing.name}</p>
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
                          <span>{DISCIPLINE_LABELS[drawing.discipline] ?? drawing.discipline}</span>
                          {drawing.floor && <><span>·</span><span>{drawing.floor}</span></>}
                          <span>·</span><span>{drawing.pageCount}p</span>
                        </div>
                        {drawing.status === "ANALYZED" && (
                          <p className="text-xs text-green-600 mt-1">{drawing._count.entities} entities extracted</p>
                        )}
                        {drawing.status === "ERROR" && drawing.analysisError && (
                          <p className="text-xs text-red-500 mt-1 line-clamp-2">{drawing.analysisError}</p>
                        )}
                      </div>
                      {/* Actions */}
                      <div className="px-4 pb-4 flex items-center gap-2">
                        <Link href={`/dashboard/drawings/${drawing.id}`}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium">
                          <Eye className="w-3.5 h-3.5" /> View
                        </Link>
                        <button onClick={() => analyze(drawing.id)} disabled={isAnalyzing || drawing.status === "ANALYZING"}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-60">
                          {isAnalyzing ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Analyzing…</> : <><Zap className="w-3.5 h-3.5" /> Analyze</>}
                        </button>
                        <button onClick={() => deleteDrawing(drawing)} className="ml-auto p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {/* Add drawing card */}
                <button onClick={() => setShowUpload(true)}
                  className="bg-white rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-colors flex flex-col items-center justify-center gap-3 h-48 cursor-pointer">
                  <Plus className="w-8 h-8 text-slate-300" />
                  <span className="text-sm text-slate-400">Add Drawing</span>
                </button>
              </div>
            )
          )}

          {/* ── ENTITIES / PROJECT DATA TAB ── */}
          {tab === "entities" && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                    className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="ALL">All Status</option>
                    <option value="NEEDS_VERIFICATION">Needs Review</option>
                    <option value="VERIFIED">Verified</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="NOT_FOUND">Not Found</option>
                    <option value="CONFLICT">Conflict</option>
                  </select>
                </div>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                  className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="ALL">All Types</option>
                  {entityTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <span className="text-xs text-slate-500 ml-auto">{filteredEntities.length} entities</span>
              </div>

              {filteredEntities.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                  <Search className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500">{entities.length === 0 ? "No entities extracted yet. Analyze drawings to extract data." : "No entities match current filter."}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredEntities.map((entity) => {
                    const sc = ENTITY_STATUS_CONFIG[entity.status as keyof typeof ENTITY_STATUS_CONFIG] ?? ENTITY_STATUS_CONFIG.NEEDS_VERIFICATION;
                    const StatusIcon = sc.icon;
                    const attrs = entity.attributes ?? {};
                    const attrEntries = Object.entries(attrs).filter(([, v]) => v?.value != null);
                    const missingAttrs = Object.entries(attrs).filter(([, v]) => !v?.value);

                    return (
                      <div key={entity.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${entity.status === "VERIFIED" ? "border-green-200" : entity.status === "REJECTED" ? "border-red-200 opacity-60" : "border-slate-200"}`}>
                        <div className="px-4 py-3 flex items-center gap-3 border-b border-slate-100">
                          <EntityBadge type={entity.entityType} />
                          <span className="font-semibold text-slate-800 text-sm">{entity.entityLabel || entity.entityType}</span>
                          <div className={`flex items-center gap-1 text-xs font-medium ml-auto px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>
                            <StatusIcon className="w-3 h-3" /> {sc.label}
                          </div>
                        </div>

                        <div className="px-4 py-3">
                          {/* Source */}
                          {entity.drawing && (
                            <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                              <FileText className="w-3.5 h-3.5" />
                              <span>Source: {entity.drawing.drawingNo ?? entity.drawing.name}{entity.page ? ` · Page ${entity.page.pageNo}` : ""}</span>
                              <span>·</span>
                              <span>{entity.extractionMethod}</span>
                              {entity.confidence != null && <><span>·</span><span>{Math.round(entity.confidence * 100)}% confidence</span></>}
                            </div>
                          )}

                          {/* Attributes grid */}
                          <div className="grid grid-cols-3 gap-2">
                            {attrEntries.map(([key, attr]) => (
                              <div key={key} className="bg-slate-50 rounded-lg px-3 py-2">
                                <p className="text-xs text-slate-500 capitalize">{key}</p>
                                <p className="text-sm font-semibold text-slate-800">
                                  {attr.value}{attr.unit ? ` ${attr.unit}` : ""}
                                </p>
                              </div>
                            ))}
                            {missingAttrs.map(([key]) => (
                              <div key={key} className="bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                                <p className="text-xs text-red-400 capitalize">{key}</p>
                                <p className="text-xs font-semibold text-red-400">NOT FOUND</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Actions */}
                        {entity.status !== "VERIFIED" && entity.status !== "REJECTED" && (
                          <div className="px-4 pb-3 flex items-center gap-2">
                            <button onClick={() => verifyEntity(entity.id, "verify")}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium">
                              <CheckCircle className="w-3.5 h-3.5" /> Accept
                            </button>
                            <button onClick={() => setEditEntity(entity)}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium">
                              <Pencil className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button onClick={() => verifyEntity(entity.id, "reject")}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-medium">
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                            <button onClick={() => deleteEntity(entity.id)} className="ml-auto p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        {entity.status === "VERIFIED" && (
                          <div className="px-4 pb-3 flex items-center gap-2">
                            <button onClick={() => setEditEntity(entity)}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium">
                              <Pencil className="w-3.5 h-3.5" /> Edit
                            </button>
                            <p className="text-xs text-green-600 ml-2">Verified {entity.verifiedAt ? new Date(entity.verifiedAt).toLocaleDateString("en-IN") : ""}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add manual entity */}
              <div className="pt-2">
                <Link href={`/dashboard/drawings?addEntity=1&projectId=${selectedProjectId}`}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                  + Add entity manually
                </Link>
              </div>
            </div>
          )}
        </>
      )}

      {showUpload && selectedProjectId && (
        <UploadModal projectId={selectedProjectId} onClose={() => setShowUpload(false)} onUploaded={loadDrawings} />
      )}
      {editEntity && (
        <EditEntityModal entity={editEntity} onClose={() => setEditEntity(null)} onSaved={loadDrawings} />
      )}
    </div>
  );
}
