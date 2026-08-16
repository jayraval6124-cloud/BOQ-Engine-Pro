"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, CheckCircle2, ChevronRight, Building2, BookOpen,
  Database, Sparkles, ArrowLeft, Settings, ChevronDown, ChevronUp,
  Layers, FileText, Zap, SkipForward, Plus, X, Upload, AlertCircle,
} from "lucide-react";
import { toast } from "@/components/ui/toaster";
import { DIVISIONS_GUJARAT, SOR_YEARS } from "@/lib/utils";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MeasRow { id: string; label: string; nos: number; L: number; B: number; H: number; }

interface BoqFormulaItem {
  sorCode?: string; description: string; unit?: string;
  rate?: number | string; chapter?: string; groupHeader?: string;
}

interface BoqMeasItem {
  sorCode: string; description: string; unit: string;
  rate: number; chapter: string; rows: MeasRow[];
}

interface WizardTemplate {
  id: string; name: string; buildingType: string; description: string | null;
  icon?: string; usageCount: number; isUserCreated: boolean;
  boqItemFormulas?: BoqFormulaItem[];
}

interface DrawingItem {
  id: string; name: string; drawingNo: string | null; discipline: string;
  status: string; fileType: string; uploadedAt: string;
  project: { id: string; name: string; projectNo: string };
  _count: { entities: number };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function newRow(): MeasRow {
  return { id: Math.random().toString(36).slice(2, 8), label: "", nos: 1, L: 0, B: 0, H: 0 };
}

function rowQty(r: MeasRow): number {
  if (r.L <= 0) return 0;
  return (r.nos || 1) * r.L * (r.B > 0 ? r.B : 1) * (r.H > 0 ? r.H : 1);
}

function itemTotal(item: BoqMeasItem): number {
  return item.rows.reduce((s, r) => s + rowQty(r), 0);
}

function fmtN(n: number): string {
  if (n === 0) return "0";
  return parseFloat(n.toFixed(3)).toString();
}

// Auto-bucket SOR codes into chapter groups
function sorChapter(sorCode: string): string {
  if (!sorCode) return "General";
  const n = parseInt(sorCode.replace(/[^0-9]/g, "")) || 0;
  if (n <= 22) return "Earth Work";
  if (n <= 59) return "Concrete Work";
  if (n === 80) return "Steel";
  if (n <= 95) return "Masonry";
  if (n <= 120) return "Plaster";
  if (n <= 142) return "Flooring & Woodwork";
  if (n <= 149) return "Waterproofing";
  if (n <= 165) return "Paint & Finish";
  if (n <= 232) return "Sanitary & Plumbing";
  if (n <= 290) return "External Works";
  return "General";
}

const CHAPTER_ORDER = [
  "Earth Work", "Concrete Work", "Steel", "Masonry", "Plaster",
  "Flooring & Woodwork", "Waterproofing", "Paint & Finish",
  "Sanitary & Plumbing", "External Works", "General",
];

// ─── Step labels ─────────────────────────────────────────────────────────────

const STEP_LABELS = [
  { label: "Project Type",    icon: Building2 },
  { label: "Drawing / AI",   icon: Layers },
  { label: "Measurement Sheet", icon: BookOpen },
  { label: "Details",         icon: Database },
  { label: "Generate",        icon: Sparkles },
];

// ─── Measurement Table ────────────────────────────────────────────────────────

function MeasTable({
  rows, onAdd, onUpdate, onRemove,
}: {
  rows: MeasRow[];
  onAdd: () => void;
  onUpdate: (id: string, key: keyof MeasRow, val: string | number) => void;
  onRemove: (id: string) => void;
}) {
  const total = rows.reduce((s, r) => s + rowQty(r), 0);
  const cell = "px-1.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white text-center w-full";

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[500px]">
          <thead>
            <tr className="text-slate-400 border-b border-slate-200">
              <th className="text-left pb-1.5 pr-2 font-medium">Description</th>
              <th className="text-center pb-1.5 px-1 w-10 font-medium">Nos</th>
              <th className="text-center pb-1.5 px-1 w-16 font-medium">L</th>
              <th className="text-center pb-1.5 px-1 w-16 font-medium">B</th>
              <th className="text-center pb-1.5 px-1 w-16 font-medium">H / D</th>
              <th className="text-right pb-1.5 px-1 w-20 font-medium">Qty</th>
              <th className="w-6"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => {
              const q = rowQty(r);
              return (
                <tr key={r.id}>
                  <td className="pr-2 py-1">
                    <input value={r.label} onChange={(e) => onUpdate(r.id, "label", e.target.value)}
                      placeholder="e.g. F1 Footing" className={`${cell} text-left`} />
                  </td>
                  <td className="px-1 py-1"><input type="number" step="any" value={r.nos || ""} onChange={(e) => onUpdate(r.id, "nos", parseFloat(e.target.value) || 1)} className={cell} /></td>
                  <td className="px-1 py-1"><input type="number" step="any" value={r.L || ""} onChange={(e) => onUpdate(r.id, "L", parseFloat(e.target.value) || 0)} className={cell} /></td>
                  <td className="px-1 py-1"><input type="number" step="any" value={r.B || ""} onChange={(e) => onUpdate(r.id, "B", parseFloat(e.target.value) || 0)} className={cell} /></td>
                  <td className="px-1 py-1"><input type="number" step="any" value={r.H || ""} onChange={(e) => onUpdate(r.id, "H", parseFloat(e.target.value) || 0)} className={cell} /></td>
                  <td className="px-1 py-1 text-right font-mono font-semibold text-slate-700">{q > 0 ? fmtN(q) : ""}</td>
                  <td className="pl-1"><button type="button" onClick={() => onRemove(r.id)} className="p-0.5 text-slate-300 hover:text-red-500 rounded"><X className="w-3.5 h-3.5" /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mt-2">
        <button type="button" onClick={onAdd}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50">
          <Plus className="w-3 h-3" /> Add row
        </button>
        {total > 0 && <span className="text-xs font-bold text-slate-700 font-mono">Total: {fmtN(total)}</span>}
      </div>
    </div>
  );
}

// ─── BOQ Measurement Item Card ────────────────────────────────────────────────

function BoqMeasCard({
  item, fromAI, onAdd, onUpdate, onRemove,
}: {
  item: BoqMeasItem; fromAI?: boolean;
  onAdd: () => void;
  onUpdate: (rid: string, key: keyof MeasRow, val: string | number) => void;
  onRemove: (rid: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const qty = itemTotal(item);
  const hasData = item.rows.some((r) => r.L > 0);

  return (
    <div className={`border rounded-lg overflow-hidden ${fromAI ? "border-emerald-200" : hasData ? "border-blue-200" : "border-slate-200"}`}>
      <button type="button" onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${fromAI ? "bg-emerald-50 hover:bg-emerald-100" : hasData ? "bg-blue-50 hover:bg-blue-100" : "bg-white hover:bg-slate-50"}`}>
        {item.sorCode && (
          <span className="text-xs font-mono text-slate-400 w-12 shrink-0">{item.sorCode}</span>
        )}
        <span className="flex-1 text-xs text-slate-700 truncate leading-snug">{item.description}</span>
        <span className="text-xs text-slate-400 shrink-0 mx-1">{item.unit}</span>
        {qty > 0 && (
          <span className={`text-xs font-bold shrink-0 ${fromAI ? "text-emerald-700" : "text-blue-700"}`}>
            {fmtN(qty)}
          </span>
        )}
        {fromAI && <span className="text-xs text-emerald-600 font-medium shrink-0">AI</span>}
        {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
      </button>

      {open && (
        <div className={`border-t px-3 py-3 ${fromAI ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200"}`}>
          <MeasTable rows={item.rows} onAdd={onAdd} onUpdate={onUpdate} onRemove={onRemove} />
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [templates, setTemplates] = useState<WizardTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Measurement sheet: templateId → BoqMeasItem[]
  const [measSheet, setMeasSheet] = useState<Record<string, BoqMeasItem[]>>({});
  // Which items were filled by AI (sorCode set)
  const [aiItems, setAiItems] = useState<Record<string, Set<string>>>({});

  const [projectData, setProjectData] = useState({
    name: "", sorYear: SOR_YEARS[0], sorDivision: DIVISIONS_GUJARAT[0],
  });
  const [generating, setGenerating] = useState(false);

  // Drawing Intelligence
  const [drawings, setDrawings] = useState<DrawingItem[]>([]);
  const [loadingDrawings, setLoadingDrawings] = useState(false);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiFilledCount, setAiFilledCount] = useState<number | null>(null);

  // In-wizard drawing upload
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "analyzing" | "done" | "error">("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingAutoGenerate, setPendingAutoGenerate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load templates
  useEffect(() => {
    setLoading(true);
    fetch("/api/wizard/templates")
      .then(async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return []; } })
      .then((d) => setTemplates(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  // Load drawings when entering drawing step
  useEffect(() => {
    if (step !== 1) return;
    setLoadingDrawings(true);
    fetch("/api/drawings/library")
      .then(async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return []; } })
      .then((d) => setDrawings(Array.isArray(d) ? d : []))
      .finally(() => setLoadingDrawings(false));
  }, [step]);

  // ── Selection ──────────────────────────────────────────────────────────────

  const toggle = (t: WizardTemplate) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(t.id)) {
        next.delete(t.id);
        setMeasSheet((m) => { const n = { ...m }; delete n[t.id]; return n; });
        setAiItems((a) => { const n = { ...a }; delete n[t.id]; return n; });
      } else {
        next.add(t.id);
        const boqItems = (t.boqItemFormulas as BoqFormulaItem[]) || [];
        // Initialize with EMPTY rows — no defaults, every project is different
        setMeasSheet((m) => ({
          ...m,
          [t.id]: boqItems.map((fi) => ({
            sorCode: fi.sorCode || "",
            description: fi.description || "",
            unit: fi.unit || "",
            rate: typeof fi.rate === "number" ? fi.rate : 0,
            chapter: fi.chapter || fi.groupHeader || sorChapter(fi.sorCode || ""),
            rows: [],
          })),
        }));
        setExpanded((e) => new Set(e).add(t.id));
      }
      return next;
    });
  };

  const selectedTemplates = templates.filter((t) => selected.has(t.id));

  // ── Auto-generate when drawing is uploaded and selected ───────────────────

  useEffect(() => {
    if (pendingAutoGenerate && selectedDrawingId && !aiGenerating) {
      setPendingAutoGenerate(false);
      handleAIGenerate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAutoGenerate, selectedDrawingId, aiGenerating]);

  // ── In-wizard drawing upload ───────────────────────────────────────────────

  const handleUploadDrawing = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast({ title: "Only PDF drawings are supported", variant: "destructive" });
      return;
    }
    setUploadStatus("uploading");
    setUploadError(null);
    try {
      // 1. Upload file to Wizard Drawings inbox
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", file.name.replace(/\.[^.]+$/, ""));
      const uploadRes = await fetch("/api/wizard/upload-drawing", { method: "POST", body: fd });
      if (!uploadRes.ok) {
        const e = await uploadRes.json().catch(() => ({})) as { error?: string };
        throw new Error(e.error || "Upload failed");
      }
      const { drawingId } = await uploadRes.json() as { drawingId: string };

      // 2. Fire-and-forget: trigger analysis on the server, don't await the response
      //    (Ollama can take 1–10 min; waiting blocks the fetch and causes browser timeout)
      setUploadStatus("analyzing");
      fetch(`/api/drawings/${drawingId}/analyze`, { method: "POST" }).catch(() => {});

      // 3. Poll /api/drawings/[id] every 3 seconds until ANALYZED or ERROR
      const deadline = Date.now() + 15 * 60 * 1000; // 15-minute UI timeout
      while (Date.now() < deadline) {
        await new Promise<void>((r) => setTimeout(r, 3000));
        const statusRes = await fetch(`/api/drawings/${drawingId}`).catch(() => null);
        if (!statusRes?.ok) continue;
        const drawing = await statusRes.json() as { status: string; analysisError?: string };
        if (drawing.status === "ANALYZED") {
          // 4. Done — reload library and auto-select
          setUploadStatus("done");
          const libData = await fetch("/api/drawings/library").then(r => r.json()).catch(() => []) as DrawingItem[];
          setDrawings(Array.isArray(libData) ? libData : []);
          setSelectedDrawingId(drawingId);
          setPendingAutoGenerate(true);
          toast({ title: "Drawing analyzed — generating measurement sheet…", variant: "success" });
          return;
        } else if (drawing.status === "ERROR") {
          throw new Error(drawing.analysisError || "Ollama analysis failed");
        }
        // status === "ANALYZING" or "UPLOADED" — keep polling
      }
      throw new Error("Analysis timed out after 15 minutes");
    } catch (e) {
      setUploadStatus("error");
      setUploadError(e instanceof Error ? e.message : "Upload or analysis failed");
    }
  }, []);

  // ── AI generate measurement sheet from drawing ─────────────────────────────

  const handleAIGenerate = useCallback(async () => {
    if (!selectedDrawingId) return;
    setAiGenerating(true);
    try {
      const res = await fetch("/api/wizard/generate-measurement-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drawingId: selectedDrawingId,
          templates: selectedTemplates.map((t) => ({
            id: t.id,
            boqItems: (measSheet[t.id] || []).map((item) => ({
              sorCode: item.sorCode,
              description: item.description,
              unit: item.unit,
              chapter: item.chapter,
            })),
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "AI generation failed");
      }

      const data = await res.json() as {
        suggestions: Record<string, Record<string, MeasRow[]>>;
        filledCount: number;
      };

      let total = 0;
      setMeasSheet((prev) => {
        const next = { ...prev };
        const newAiItems: Record<string, Set<string>> = {};
        for (const [tid, suggMap] of Object.entries(data.suggestions || {})) {
          if (!next[tid]) continue;
          newAiItems[tid] = new Set<string>();
          next[tid] = next[tid].map((item) => {
            const rows = suggMap[item.sorCode];
            if (rows && rows.length > 0) {
              total++;
              newAiItems[tid].add(item.sorCode);
              return { ...item, rows: rows.map((r) => ({ ...r, id: Math.random().toString(36).slice(2, 8) })) };
            }
            return item;
          });
        }
        setAiItems(newAiItems);
        return next;
      });

      setAiFilledCount(total);
      toast({ title: `AI filled ${total} measurement items from drawing`, variant: "success" });
      if (total > 0) setTimeout(() => setStep(2), 700);
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "AI generation failed", variant: "destructive" });
    } finally {
      setAiGenerating(false);
    }
  }, [selectedDrawingId, selectedTemplates, measSheet]);

  // ── Measurement sheet row operations ───────────────────────────────────────

  const addMeasRow = (tid: string, sorCode: string) => {
    setMeasSheet((prev) => ({
      ...prev,
      [tid]: (prev[tid] || []).map((item) =>
        item.sorCode !== sorCode ? item : { ...item, rows: [...item.rows, newRow()] }
      ),
    }));
  };

  const updateMeasRow = (tid: string, sorCode: string, rid: string, key: keyof MeasRow, val: string | number) => {
    setMeasSheet((prev) => ({
      ...prev,
      [tid]: (prev[tid] || []).map((item) =>
        item.sorCode !== sorCode ? item : {
          ...item, rows: item.rows.map((r) => r.id !== rid ? r : { ...r, [key]: val }),
        }
      ),
    }));
  };

  const removeMeasRow = (tid: string, sorCode: string, rid: string) => {
    setMeasSheet((prev) => ({
      ...prev,
      [tid]: (prev[tid] || []).map((item) =>
        item.sorCode !== sorCode ? item : { ...item, rows: item.rows.filter((r) => r.id !== rid) }
      ),
    }));
  };

  // ── Navigation ─────────────────────────────────────────────────────────────

  const canProceed = () => {
    if (step === 0) return selected.size > 0;
    if (step === 3) return projectData.name.trim().length >= 2;
    return true;
  };

  // ── Generate project ───────────────────────────────────────────────────────

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const body = {
        selectedTemplates: selectedTemplates.map((t) => ({
          templateId: t.id,
          measItems: (measSheet[t.id] || []).filter((item) => item.rows.some((r) => r.L > 0)),
        })),
        ...projectData,
        name: projectData.name.trim(),
      };
      const res = await fetch("/api/wizard/generate", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errText = await res.text();
        let errMsg = "Generation failed";
        try { errMsg = JSON.parse(errText).error || errMsg; } catch { errMsg = errText; }
        throw new Error(errMsg);
      }
      const project = await res.json();
      toast({ title: "Project created successfully!", variant: "success" });
      router.push(`/dashboard/projects/${project.id}`);
    } catch (e: unknown) {
      toast({ title: e instanceof Error ? e.message : "Failed to create project", variant: "destructive" });
    } finally { setGenerating(false); }
  };

  const inputClass = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Smart Project Wizard</h1>
            <p className="text-slate-500 text-sm">Select type · Drawing Intelligence · Measurement Sheet · Generate BOQ</p>
          </div>
        </div>
        <Link href="/dashboard/wizard/manage" className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
          <Settings className="w-4 h-4" /> Manage Types
        </Link>
      </div>

      {/* Stepper */}
      <div className="flex items-center mb-8 overflow-x-auto pb-1">
        {STEP_LABELS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step, isDone = i < step;
          return (
            <div key={i} className="flex items-center flex-1 last:flex-none shrink-0">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${isActive ? "bg-blue-600 text-white" : isDone ? "bg-emerald-100 text-emerald-700" : "text-slate-400"}`}>
                {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEP_LABELS.length - 1 && <ChevronRight className="w-4 h-4 text-slate-300 mx-1 shrink-0" />}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">

        {/* ── Step 0: Select project type ── */}
        {step === 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-800">Select Project Type</h2>
                <p className="text-slate-500 text-sm mt-0.5">A separate BOQ will be created for each selected type.</p>
              </div>
              {selected.size > 0 && (
                <span className="text-sm font-semibold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">{selected.size} selected</span>
              )}
            </div>
            {loading ? (
              <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
            ) : templates.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {templates.map((t) => {
                  const checked = selected.has(t.id);
                  const itemCount = (t.boqItemFormulas || []).length;
                  return (
                    <button key={t.id} type="button" onClick={() => toggle(t)}
                      className={`text-left p-4 rounded-xl border-2 transition-all hover:border-blue-400 w-full ${checked ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}>
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {checked ? <CheckCircle2 className="w-5 h-5 text-blue-600" /> : <div className="w-5 h-5 rounded-full border-2 border-slate-300" />}
                        </div>
                        <div className="text-2xl leading-none">{t.icon || "🏗️"}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-800 text-sm">{t.name}</div>
                          {t.description && <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{t.description}</div>}
                          {itemCount > 0 && (
                            <div className="text-xs text-slate-400 mt-1">{itemCount} BOQ items</div>
                          )}
                        </div>
                        {t.isUserCreated && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium flex-shrink-0">Custom</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-500 text-sm">
                <p className="mb-3">No project types found.</p>
                <Link href="/dashboard/wizard/manage" className="inline-flex items-center gap-1.5 text-blue-600 font-medium hover:underline">
                  <Settings className="w-4 h-4" /> Create your first project type
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── Step 1: Drawing Intelligence ── */}
        {step === 1 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-semibold text-slate-800">Drawing Intelligence</h2>
              <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">Optional</span>
            </div>
            <p className="text-slate-500 text-sm mb-5">
              Upload a drawing PDF — AI will analyze it using civil engineering knowledge (IS codes + estimation rules) and auto-fill measurement rows for each BOQ item.
              Skip this step to enter measurements manually.
            </p>

            {/* ── Upload zone ── */}
            <div className="mb-5">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) { handleUploadDrawing(f); e.target.value = ""; } }}
              />

              {uploadStatus === "idle" || uploadStatus === "done" || uploadStatus === "error" ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => { setUploadError(null); fileInputRef.current?.click(); }}
                    onDragOver={(e) => { e.preventDefault(); }}
                    onDrop={(e) => { e.preventDefault(); setUploadError(null); const f = e.dataTransfer.files?.[0]; if (f) handleUploadDrawing(f); }}
                    className={`w-full flex flex-col items-center justify-center gap-2 px-6 py-8 border-2 border-dashed rounded-xl transition-all cursor-pointer group ${uploadStatus === "error" ? "border-red-200 bg-red-50/50 hover:bg-red-50" : "border-blue-200 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-400"}`}
                  >
                    <Upload className={`w-8 h-8 transition-colors ${uploadStatus === "error" ? "text-red-400 group-hover:text-red-600" : "text-blue-400 group-hover:text-blue-600"}`} />
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-700">
                        {uploadStatus === "error" ? "Try Again — Upload Drawing PDF" : "Upload Drawing PDF"}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">Drop PDF here or click to browse · AI will analyze using IS codes &amp; estimation rules</p>
                    </div>
                    {uploadStatus === "done" && (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium mt-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Drawing analyzed successfully
                      </span>
                    )}
                    {uploadStatus === "error" && uploadError && (
                      <span className="flex items-center gap-1.5 text-xs text-red-600 font-medium mt-1 max-w-sm text-center">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {uploadError}
                      </span>
                    )}
                  </button>
                </div>
              ) : uploadStatus === "uploading" ? (
                <div className="flex items-center gap-3 px-6 py-5 border border-blue-200 rounded-xl bg-blue-50">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Uploading drawing…</p>
                    <p className="text-xs text-blue-600 mt-0.5">Saving file to server</p>
                  </div>
                </div>
              ) : uploadStatus === "analyzing" ? (
                <div className="flex items-center gap-3 px-6 py-5 border border-amber-200 rounded-xl bg-amber-50">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Analyzing drawing with AI…</p>
                    <p className="text-xs text-amber-600 mt-0.5">This may take 1–5 minutes. AI is reading entities, dimensions, IS codes &amp; estimation rules.</p>
                  </div>
                </div>
              ) : null}
            </div>

            {/* ── Library drawings ── */}
            {(uploadStatus === "idle" || uploadStatus === "done" || uploadStatus === "error") && (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-xs text-slate-400 font-medium px-2">or choose from analyzed library</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                {loadingDrawings ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500 mr-2" />
                    <span className="text-sm text-slate-500">Loading drawing library…</span>
                  </div>
                ) : drawings.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-sm">
                    No analyzed drawings in library yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {drawings.map((d) => {
                      const isAnalyzed = d.status === "ANALYZED";
                      const isSelected = selectedDrawingId === d.id;
                      return (
                        <button key={d.id} onClick={() => isAnalyzed ? setSelectedDrawingId(isSelected ? null : d.id) : undefined}
                          disabled={!isAnalyzed}
                          className={`text-left p-4 rounded-xl border-2 transition-all ${isSelected ? "border-blue-600 bg-blue-50" : isAnalyzed ? "border-slate-200 hover:border-blue-300 hover:bg-slate-50 cursor-pointer" : "border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed"}`}>
                          <div className="flex items-start gap-3">
                            <div className="shrink-0 mt-0.5">
                              {isSelected ? <CheckCircle2 className="w-5 h-5 text-blue-600" /> : <FileText className="w-5 h-5 text-slate-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm text-slate-800 truncate">{d.name}</div>
                              <div className="text-xs text-slate-500 truncate mt-0.5">{d.project.name} · {d.project.projectNo}</div>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isAnalyzed ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                                  {isAnalyzed ? "Analyzed" : d.status}
                                </span>
                                {d._count.entities > 0 && (
                                  <span className="text-xs text-slate-400">{d._count.entities} entities</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {selectedDrawingId && (
              <div className="space-y-3">
                <button onClick={handleAIGenerate} disabled={aiGenerating}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed">
                  {aiGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Analysing drawing and generating measurement sheet…</> :
                   <><Zap className="w-4 h-4" /> Generate Measurement Sheet from Drawing</>}
                </button>

                {aiFilledCount !== null && aiFilledCount > 0 && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-emerald-800 font-medium">{aiFilledCount} BOQ items filled from drawing. Review and edit below.</span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-center">
              <button onClick={() => setStep(2)}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 font-medium px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors">
                <SkipForward className="w-4 h-4" /> Skip — enter measurements manually
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Measurement Sheet ── */}
        {step === 2 && (
          <div>
            <h2 className="text-base font-semibold text-slate-800 mb-1">Measurement Sheet</h2>
            <p className="text-slate-500 text-sm mb-5">
              Enter dimensions for each BOQ item (Nos × L × B × H). Items with no rows will be excluded from the BOQ.
              {aiFilledCount !== null && aiFilledCount > 0 && (
                <span className="text-emerald-700 font-medium ml-1">· {aiFilledCount} items pre-filled from drawing AI</span>
              )}
            </p>

            <div className="space-y-6">
              {selectedTemplates.map((t) => {
                const items = measSheet[t.id] || [];
                const isOpen = expanded.has(t.id);
                const filledCount = items.filter((it) => it.rows.some((r) => r.L > 0)).length;

                // Group by chapter
                const grouped = new Map<string, BoqMeasItem[]>();
                items.forEach((item) => {
                  const ch = item.chapter || "General";
                  if (!grouped.has(ch)) grouped.set(ch, []);
                  grouped.get(ch)!.push(item);
                });
                const chapters = CHAPTER_ORDER.filter((ch) => grouped.has(ch));
                grouped.forEach((_, ch) => { if (!chapters.includes(ch)) chapters.push(ch); });

                return (
                  <div key={t.id} className="border border-slate-200 rounded-xl overflow-hidden">
                    <button type="button"
                      onClick={() => setExpanded((prev) => { const next = new Set(prev); next.has(t.id) ? next.delete(t.id) : next.add(t.id); return next; })}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left">
                      <span className="text-xl">{t.icon || "🏗️"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-800 text-sm">{t.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {filledCount} of {items.length} items have data
                        </div>
                      </div>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>

                    {isOpen && (
                      <div className="px-4 py-4 space-y-4">
                        {items.length === 0 ? (
                          <p className="text-sm text-slate-400 text-center py-4">
                            No BOQ items defined.{" "}
                            <Link href="/dashboard/wizard/manage" className="text-blue-600 hover:underline">Edit template</Link>
                          </p>
                        ) : chapters.map((chapter) => {
                          const chItems = grouped.get(chapter) || [];
                          const chFilled = chItems.filter((it) => it.rows.some((r) => r.L > 0)).length;
                          return (
                            <div key={chapter}>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="h-px flex-1 bg-slate-200" />
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">
                                  {chapter}
                                  {chFilled > 0 && <span className="ml-1 text-blue-500 normal-case font-normal">({chFilled}/{chItems.length})</span>}
                                </span>
                                <div className="h-px flex-1 bg-slate-200" />
                              </div>
                              <div className="space-y-1.5">
                                {chItems.map((item) => {
                                  const fromAI = !!(aiItems[t.id]?.has(item.sorCode));
                                  return (
                                    <BoqMeasCard
                                      key={item.sorCode || item.description}
                                      item={item}
                                      fromAI={fromAI}
                                      onAdd={() => addMeasRow(t.id, item.sorCode)}
                                      onUpdate={(rid, key, val) => updateMeasRow(t.id, item.sorCode, rid, key, val)}
                                      onRemove={(rid) => removeMeasRow(t.id, item.sorCode, rid)}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Step 3: Project details ── */}
        {step === 3 && (
          <div>
            <h2 className="text-base font-semibold text-slate-800 mb-1">Project Details</h2>
            <p className="text-slate-500 text-sm mb-5">Set the project name and SOR settings.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Project Name *</label>
                <input value={projectData.name} onChange={(e) => setProjectData((p) => ({ ...p, name: e.target.value }))}
                  className={inputClass} placeholder="e.g. Construction of DM Quarter at Bardoli" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">SOR Year *</label>
                  <select value={projectData.sorYear} onChange={(e) => setProjectData((p) => ({ ...p, sorYear: e.target.value }))} className={inputClass}>
                    {SOR_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">SOR Division</label>
                  <select value={projectData.sorDivision} onChange={(e) => setProjectData((p) => ({ ...p, sorDivision: e.target.value }))} className={inputClass}>
                    <option value="">— Not set —</option>
                    {DIVISIONS_GUJARAT.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 4: Review & Generate ── */}
        {step === 4 && (
          <div>
            <h2 className="text-base font-semibold text-slate-800 mb-1">Review & Generate</h2>
            <p className="text-slate-500 text-sm mb-5">Review your measurement summary before creating the project.</p>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="text-xs font-semibold text-blue-700 mb-3 uppercase tracking-wide">Project</div>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <span className="text-slate-500">Name</span><span className="font-medium text-slate-800">{projectData.name}</span>
                  <span className="text-slate-500">SOR Year</span><span className="font-medium text-slate-800">{projectData.sorYear}</span>
                  <span className="text-slate-500">Division</span><span className="font-medium text-slate-800">{projectData.sorDivision || "—"}</span>
                  {selectedDrawingId && aiFilledCount !== null && aiFilledCount > 0 && (
                    <><span className="text-slate-500">Drawing AI</span><span className="text-emerald-700 font-medium">{aiFilledCount} items generated</span></>
                  )}
                </div>
              </div>

              {selectedTemplates.map((t) => {
                const items = (measSheet[t.id] || []).filter((it) => it.rows.some((r) => r.L > 0));
                const totalAmt = items.reduce((s, it) => s + itemTotal(it) * (it.rate || 0), 0);
                return (
                  <div key={t.id} className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-base">{t.icon || "🏗️"}</span>
                      <span className="font-semibold text-slate-800 text-sm">{t.name}</span>
                      <span className="ml-auto text-xs font-semibold text-emerald-700">{items.length} items</span>
                    </div>
                    {items.length === 0 ? (
                      <p className="text-xs text-amber-600">No measurement data entered — a blank BOQ will be created.</p>
                    ) : (
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {items.map((item) => {
                          const qty = itemTotal(item);
                          const amt = qty * (item.rate || 0);
                          return (
                            <div key={item.sorCode} className="flex items-center gap-2 text-xs py-0.5">
                              {item.sorCode && <span className="font-mono text-slate-400 w-12 shrink-0">{item.sorCode}</span>}
                              <span className="flex-1 text-slate-600 truncate">{item.description}</span>
                              <span className="font-mono text-slate-700 shrink-0">{fmtN(qty)} {item.unit}</span>
                              {amt > 0 && <span className="font-mono text-emerald-700 shrink-0 w-20 text-right">₹{Math.round(amt).toLocaleString()}</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {totalAmt > 0 && (
                      <div className="mt-3 pt-2 border-t border-emerald-200 flex justify-between text-sm font-bold">
                        <span className="text-emerald-700">Estimated Total</span>
                        <span className="text-emerald-800">₹{Math.round(totalAmt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button onClick={() => setStep((s) => s - 1)} disabled={step === 0}
          className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
          Back
        </button>
        {step < 4 ? (
          <button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed">
            {step === 1 ? "Skip to Measurement Sheet" : "Next"} <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={handleGenerate} disabled={generating || !projectData.name.trim()}
            className="flex items-center gap-2 px-8 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed">
            {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : <><Sparkles className="w-4 h-4" /> Generate Project</>}
          </button>
        )}
      </div>
    </div>
  );
}
