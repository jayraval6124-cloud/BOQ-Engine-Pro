"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Save, Loader2, Plus, Trash2, Download, X, Search,
} from "lucide-react";
import { toast } from "@/components/ui/toaster";
import { DIVISIONS_GUJARAT, SOR_YEARS } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Project { id: string; name: string; projectNo: string; sorDivision: string; sorYear: string }
interface SORMatch { id: string; itemCode: string; subChapter: string; description: string; unit: string; rate: number; chapter: string }
interface SheetMeta { id: string; name: string; _count: { rows: number } }

interface MBRow {
  tempId: string;
  sorCode: string;
  description: string;
  nos: string;
  L: string;
  B: string;
  H: string;
  qty: number;
  unit: string;
  sorItemId: string | null;
  rate: number;
  chapter: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcQty(nos: string, L: string, B: string, H: string): number {
  const l = parseFloat(L);
  const n = parseFloat(nos);
  const b = parseFloat(B);
  const h = parseFloat(H);
  if (isNaN(l) || l <= 0) {
    // Count-only
    return !isNaN(n) && n > 0 ? n : 0;
  }
  const factors: number[] = [];
  if (!isNaN(n) && n > 0) factors.push(n);
  factors.push(l);
  if (!isNaN(b) && b > 0) factors.push(b);
  if (!isNaN(h) && h > 0) factors.push(h);
  return factors.length === 0 ? 0 : factors.reduce((p, v) => p * v, 1);
}

function newRow(): MBRow {
  return {
    tempId: Math.random().toString(36).slice(2, 9),
    sorCode: "", description: "", nos: "1", L: "", B: "", H: "",
    qty: 0, unit: "", sorItemId: null, rate: 0, chapter: "",
  };
}

function computeBreakdown(totalRs: number) {
  const welfareCess      = totalRs * 0.01;
  const tenderAmount     = totalRs + welfareCess;
  const gst18            = tenderAmount * 0.18;
  const totalWithGST     = tenderAmount + gst18;
  const contingency5     = totalWithGST * 0.05;
  const workContingency2 = totalWithGST * 0.02;
  const estimatedAmount  = totalWithGST + contingency5 + workContingency2;
  const netEstimated     = Math.ceil(estimatedAmount);
  return { totalRs, welfareCess, tenderAmount, gst18, totalWithGST, contingency5, workContingency2, estimatedAmount, netEstimated };
}

const fmt2 = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt3 = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

// ─── SOR Dropdown ─────────────────────────────────────────────────────────────

function SORDropdown({ results, onSelect }: { results: SORMatch[]; onSelect: (item: SORMatch) => void }) {
  if (results.length === 0) return null;
  return (
    <div className="absolute left-0 top-full z-50 w-96 bg-white border border-blue-200 rounded-lg shadow-2xl mt-0.5 max-h-52 overflow-y-auto">
      {results.map((item) => (
        <button
          key={item.id}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onSelect(item); }}
          className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-slate-100 last:border-0"
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-blue-700 font-bold shrink-0">
              {item.subChapter || item.itemCode}
            </span>
            <span className="text-xs text-slate-600 truncate flex-1">{item.description}</span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            {item.unit} · ₹{fmt2(item.rate)} · {item.chapter}
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewBOQPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  // Project
  const [projects, setProjects]           = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [createNew, setCreateNew]         = useState(false);
  const [newProj, setNewProj]             = useState({ name: "", sorDivision: "", sorYear: "" });

  // BOQ meta
  const [boqName, setBoqName] = useState("BOQ - Estimate 1");
  const [subWork, setSubWork] = useState("Civil");
  const [notes, setNotes]     = useState("");

  // Active sheet tab
  const [activeSheet, setActiveSheet] = useState<"mb" | "abstract" | "boq">("mb");

  // MB rows
  const [mbRows, setMbRows] = useState<MBRow[]>([newRow(), newRow(), newRow()]);

  // SOR autocomplete
  const [sorFocusId, setSorFocusId]   = useState<string | null>(null);
  const [sorResults, setSorResults]   = useState<SORMatch[]>([]);
  const sorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Import modal
  const [showImport, setShowImport]               = useState(false);
  const [importProjId, setImportProjId]           = useState("");
  const [importSheets, setImportSheets]           = useState<SheetMeta[]>([]);
  const [importSelected, setImportSelected]       = useState<Set<string>>(new Set());
  const [importLoading, setImportLoading]         = useState(false);

  // Save
  const [saving, setSaving] = useState(false);

  // Derived
  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const sorDivision = createNew ? newProj.sorDivision : (selectedProject?.sorDivision || "");
  const sorYear     = createNew ? newProj.sorYear     : (selectedProject?.sorYear     || "");

  // ─── Load projects ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetch("/api/projects?limit=200")
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []));
  }, []);

  useEffect(() => {
    const pid = searchParams.get("projectId");
    if (pid) { setSelectedProjectId(pid); setCreateNew(false); }
  }, [searchParams]);

  // ─── Abstract (computed from mbRows) ────────────────────────────────────────

  const abstract = useMemo(() => {
    const map = new Map<string, {
      sorCode: string; description: string; unit: string;
      totalQty: number; rate: number; chapter: string; sorItemId: string | null;
    }>();
    for (const row of mbRows) {
      const key = row.sorCode.trim() || row.description.trim();
      if (!key) continue;
      const prev = map.get(key);
      if (prev) {
        prev.totalQty += row.qty;
      } else {
        map.set(key, {
          sorCode: row.sorCode,
          description: row.description,
          unit: row.unit,
          totalQty: row.qty,
          rate: row.rate,
          chapter: row.chapter || "General",
          sorItemId: row.sorItemId,
        });
      }
    }
    return Array.from(map.values());
  }, [mbRows]);

  const totalRs = useMemo(() => abstract.reduce((s, i) => s + i.totalQty * i.rate, 0), [abstract]);
  const bd      = useMemo(() => computeBreakdown(totalRs), [totalRs]);

  // ─── SOR Autocomplete ────────────────────────────────────────────────────────

  const searchSOR = useCallback(async (q: string, tempId: string) => {
    if (q.length < 2) { setSorResults([]); return; }
    try {
      const p = new URLSearchParams({ search: q, limit: "10" });
      if (sorDivision) p.set("division", sorDivision);
      if (sorYear)     p.set("sorYear",  sorYear);
      const res  = await fetch(`/api/sor?${p}`);
      const data = await res.json();
      // Only show if this row is still focused
      setSorFocusId((cur) => {
        if (cur === tempId) setSorResults(data.items || []);
        return cur;
      });
    } catch { /* ignore */ }
  }, [sorDivision, sorYear]);

  const handleSORInput = (tempId: string, val: string) => {
    updateField(tempId, "sorCode", val);
    setSorFocusId(tempId);
    setSorResults([]);
    if (sorTimer.current) clearTimeout(sorTimer.current);
    if (val.length >= 2) sorTimer.current = setTimeout(() => searchSOR(val, tempId), 220);
  };

  const applySOR = (tempId: string, item: SORMatch) => {
    setMbRows((prev) => prev.map((r) => {
      if (r.tempId !== tempId) return r;
      const qty = calcQty(r.nos, r.L, r.B, r.H);
      return { ...r, sorCode: item.subChapter || item.itemCode, description: item.description, unit: item.unit, rate: item.rate, chapter: item.chapter, sorItemId: item.id, qty };
    }));
    setSorFocusId(null);
    setSorResults([]);
    // Move focus to Nos cell
    setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>(`[data-field="nos"][data-row="${tempId}"]`);
      el?.focus();
    }, 0);
  };

  const lookupExact = useCallback(async (tempId: string, code: string) => {
    if (!code.trim()) return;
    try {
      const p = new URLSearchParams({ code });
      if (sorDivision) p.set("division", sorDivision);
      if (sorYear)     p.set("year",     sorYear);
      const res  = await fetch(`/api/sor/lookup?${p}`);
      const item: SORMatch | null = await res.json();
      if (item) applySOR(tempId, item);
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorDivision, sorYear]);

  // ─── Row mutations ────────────────────────────────────────────────────────────

  const updateField = (tempId: string, field: keyof MBRow, val: string | number) => {
    setMbRows((prev) => prev.map((r) => {
      if (r.tempId !== tempId) return r;
      const updated = { ...r, [field]: val };
      if (["nos", "L", "B", "H"].includes(field as string)) {
        updated.qty = calcQty(
          field === "nos" ? String(val) : r.nos,
          field === "L"   ? String(val) : r.L,
          field === "B"   ? String(val) : r.B,
          field === "H"   ? String(val) : r.H,
        );
      }
      return updated;
    }));
  };

  const addRow = useCallback(() => setMbRows((prev) => [...prev, newRow()]), []);

  const removeRow = (tempId: string) =>
    setMbRows((prev) => prev.length > 1 ? prev.filter((r) => r.tempId !== tempId) : prev);

  const focusNextRow = (currentTempId: string) => {
    const idx = mbRows.findIndex((r) => r.tempId === currentTempId);
    if (idx >= 0 && idx < mbRows.length - 1) {
      const nextId = mbRows[idx + 1].tempId;
      const el = document.querySelector<HTMLInputElement>(`[data-field="sorCode"][data-row="${nextId}"]`);
      el?.focus();
    } else {
      // Last row — add a new one and focus it
      const newTempId = Math.random().toString(36).slice(2, 9);
      setMbRows((prev) => [...prev, { ...newRow(), tempId: newTempId }]);
      setTimeout(() => {
        const el = document.querySelector<HTMLInputElement>(`[data-field="sorCode"][data-row="${newTempId}"]`);
        el?.focus();
      }, 30);
    }
  };

  // ─── Import ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!importProjId) { setImportSheets([]); return; }
    fetch(`/api/measurements?projectId=${importProjId}`)
      .then((r) => r.json())
      .then((d) => setImportSheets(Array.isArray(d) ? d : []));
  }, [importProjId]);

  const runImport = async () => {
    if (importSelected.size === 0) return;
    setImportLoading(true);
    const imported: MBRow[] = [];
    for (const sheetId of importSelected) {
      try {
        const res   = await fetch(`/api/measurements/${sheetId}`);
        const sheet = await res.json();
        for (const r of (sheet.rows || [])) {
          if (!r.gsrtcCode && !r.description) continue;
          imported.push({
            tempId:      Math.random().toString(36).slice(2, 9),
            sorCode:     r.gsrtcCode  || "",
            description: r.description || "",
            nos:         r.nos    != null ? String(r.nos)    : "1",
            L:           r.length != null ? String(r.length) : "",
            B:           r.breadth!= null ? String(r.breadth): "",
            H:           r.height != null ? String(r.height) : "",
            qty:         Number(r.quantity ?? 0),
            unit:        r.unit   || "",
            sorItemId:   r.sorItemId || null,
            rate:        0,
            chapter:     "",
          });
        }
      } catch { /* skip failed sheets */ }
    }
    if (imported.length > 0) {
      setMbRows((prev) => {
        const nonEmpty = prev.filter((r) => r.sorCode || r.description);
        return [...nonEmpty, ...imported];
      });
      toast({ title: `Imported ${imported.length} rows`, variant: "success" });
    } else {
      toast({ title: "No rows found in selected sheets", variant: "destructive" });
    }
    setShowImport(false);
    setImportLoading(false);
    setImportSelected(new Set());
  };

  // ─── Save ─────────────────────────────────────────────────────────────────────

  const save = async () => {
    if (!createNew && !selectedProjectId) {
      toast({ title: "Select or create a project first", variant: "destructive" });
      return;
    }
    if (createNew && !newProj.name.trim()) {
      toast({ title: "Enter a project name", variant: "destructive" });
      return;
    }
    if (createNew && !newProj.sorYear) {
      toast({ title: "Select a SOR year", variant: "destructive" });
      return;
    }
    const validRows = mbRows.filter((r) => r.sorCode || r.description);
    if (validRows.length === 0) {
      toast({ title: "Add at least one row in the MB sheet", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // 1. Create project if needed
      let projectId = selectedProjectId;
      if (createNew) {
        const pRes  = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newProj.name.trim(), sorDivision: newProj.sorDivision, sorYear: newProj.sorYear }),
        });
        const pData = await pRes.json();
        if (!pRes.ok) throw new Error(pData.error || "Failed to create project");
        projectId = pData.id;
      }

      // 2. Create measurement sheet
      const msRes  = await fetch("/api/measurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, name: `MB - ${boqName}` }),
      });
      const msData = await msRes.json();
      if (!msRes.ok) throw new Error(msData.error || "Failed to create measurement sheet");
      const sheetId = msData.id;

      // 3. Save MB rows
      await fetch(`/api/measurements/${sheetId}/rows`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: validRows.map((r, i) => ({
            itemNo:      i + 1,
            gsrtcCode:   r.sorCode   || null,
            description: r.description,
            nos:         parseFloat(r.nos)  || null,
            length:      parseFloat(r.L)    || null,
            breadth:     parseFloat(r.B)    || null,
            height:      parseFloat(r.H)    || null,
            unit:        r.unit        || "Nos",
            sorItemId:   r.sorItemId   || null,
            sortOrder:   i,
            serialNo:    i + 1,
          })),
        }),
      });

      // 4. Create BOQ from abstract
      const boqItems = abstract.map((item) => ({
        gsrtcCode:     item.sorCode   || undefined,
        sorItemId:     item.sorItemId || undefined,
        description:   item.description,
        unit:          item.unit || "Nos",
        quantity:      item.totalQty,
        rate:          item.rate,
        chapter:       item.chapter,
        isManualEntry: !item.sorItemId,
        sheetQtys:     { [sheetId]: { sheetName: `MB - ${boqName}`, qty: item.totalQty } },
      }));

      const boqRes  = await fetch("/api/boq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId, measurementSheetId: sheetId,
          name: boqName, subWork, notes,
          includeGST: true, gstPercent: 18,
          breakdown: bd,
          items: boqItems,
        }),
      });
      const boqData = await boqRes.json();
      if (!boqRes.ok) throw new Error(boqData.error || "Failed to create BOQ");

      toast({ title: "BOQ created", variant: "success" });
      router.push(`/dashboard/boq/${boqData.id}`);
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ─── Cell styles ──────────────────────────────────────────────────────────────

  const cellCls = "w-full text-xs px-1.5 py-1.5 border-0 bg-transparent focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-inset focus:ring-blue-400 rounded";
  const numCls  = `${cellCls} text-right font-mono`;

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col"
      style={{ height: "calc(100vh - 64px)" }}
      onClick={() => { setSorFocusId(null); setSorResults([]); }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/boq" className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-slate-800">New BOQ</h1>
            <p className="text-xs text-slate-400">Enter measurements below — Abstract &amp; BOQ auto-calculate</p>
          </div>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
            : <><Save className="w-4 h-4" />Save BOQ</>}
        </button>
      </div>

      {/* ── Setup Bar ── */}
      <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex-shrink-0">
        <div className="flex flex-wrap gap-3 items-end">

          {/* Project selector / new project */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Project</label>
            <div className="flex items-center gap-1.5">
              {!createNew ? (
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-48"
                >
                  <option value="">Select project…</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={newProj.name}
                  onChange={(e) => setNewProj((p) => ({ ...p, name: e.target.value }))}
                  placeholder="New project name…"
                  className="px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                />
              )}
              <button
                type="button"
                onClick={() => { setCreateNew((v) => !v); setSelectedProjectId(""); }}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-blue-600 hover:bg-blue-50 whitespace-nowrap"
              >
                {createNew ? "Use existing" : "+ New"}
              </button>
            </div>
          </div>

          {/* New project: division + year */}
          {createNew && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">SOR Division</label>
                <select
                  value={newProj.sorDivision}
                  onChange={(e) => setNewProj((p) => ({ ...p, sorDivision: e.target.value }))}
                  className="px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Division…</option>
                  {DIVISIONS_GUJARAT.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">SOR Year</label>
                <select
                  value={newProj.sorYear}
                  onChange={(e) => setNewProj((p) => ({ ...p, sorYear: e.target.value }))}
                  className="px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Year…</option>
                  {SOR_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </>
          )}

          {/* BOQ Name */}
          <div className="flex flex-col gap-1 flex-1 min-w-40">
            <label className="text-xs font-medium text-slate-500">BOQ Name</label>
            <input
              value={boqName}
              onChange={(e) => setBoqName(e.target.value)}
              className="px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Sub-Work */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Sub-Work</label>
            <select
              value={subWork}
              onChange={(e) => setSubWork(e.target.value)}
              className="px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option>Civil</option>
              <option>Electrical Work</option>
              <option>Borewell Work</option>
              <option>Fire Fighting Work</option>
            </select>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1 flex-1 min-w-32">
            <label className="text-xs font-medium text-slate-500">Notes</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional…"
              className="px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* ── Sheet Tabs + Toolbar ── */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white flex-shrink-0 px-2">
        <div className="flex">
          {(["mb", "abstract", "boq"] as const).map((sheet) => {
            const labels = { mb: "📋  MB (Measurements)", abstract: "📊  Abstract", boq: "💰  BOQ" };
            return (
              <button
                key={sheet}
                onClick={() => setActiveSheet(sheet)}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  activeSheet === sheet
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}
              >
                {labels[sheet]}
              </button>
            );
          })}
        </div>
        {activeSheet === "mb" && (
          <div className="flex items-center gap-2 py-1.5 pr-2">
            <button
              type="button"
              onClick={() => { setShowImport(true); setImportProjId(""); setImportSheets([]); setImportSelected(new Set()); }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <Download className="w-3.5 h-3.5" /> Import from Project
            </button>
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="w-3.5 h-3.5" /> Add Row
            </button>
          </div>
        )}
      </div>

      {/* ── Grid Area ── */}
      <div className="flex-1 overflow-hidden" onClick={(e) => e.stopPropagation()}>

        {/* ── MB Sheet ── */}
        {activeSheet === "mb" && (
          <div className="h-full overflow-auto" style={{ scrollbarWidth: "thin" }}>
            <table className="text-xs border-collapse" style={{ minWidth: 840, width: "100%" }}>
              <thead className="sticky top-0 z-20">
                <tr className="bg-slate-800 text-white">
                  <th className="w-8 px-2 py-2 text-center text-xs font-semibold border-r border-slate-600">#</th>
                  <th className="w-32 px-2 py-2 text-left text-xs font-semibold border-r border-slate-600">SOR Code</th>
                  <th className="px-2 py-2 text-left text-xs font-semibold border-r border-slate-600">Description</th>
                  <th className="w-16 px-2 py-2 text-center text-xs font-semibold border-r border-slate-600">Nos</th>
                  <th className="w-20 px-2 py-2 text-center text-xs font-semibold border-r border-slate-600">L</th>
                  <th className="w-20 px-2 py-2 text-center text-xs font-semibold border-r border-slate-600">B</th>
                  <th className="w-20 px-2 py-2 text-center text-xs font-semibold border-r border-slate-600">H</th>
                  <th className="w-24 px-2 py-2 text-center text-xs font-semibold border-r border-slate-600 bg-blue-700">Qty</th>
                  <th className="w-16 px-2 py-2 text-center text-xs font-semibold border-r border-slate-600">Unit</th>
                  <th className="w-8 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {mbRows.map((row, idx) => (
                  <tr
                    key={row.tempId}
                    className={`border-b border-slate-100 hover:bg-blue-50/20 ${idx % 2 === 0 ? "" : "bg-slate-50/40"}`}
                  >
                    <td className="px-2 py-0.5 text-center text-slate-400 border-r border-slate-100">{idx + 1}</td>

                    {/* ── SOR Code ── */}
                    <td className="px-0.5 py-0.5 border-r border-slate-100 relative" onClick={(e) => e.stopPropagation()}>
                      <input
                        data-field="sorCode"
                        data-row={row.tempId}
                        value={row.sorCode}
                        onChange={(e) => handleSORInput(row.tempId, e.target.value)}
                        onFocus={() => setSorFocusId(row.tempId)}
                        onBlur={() => {
                          setTimeout(() => { setSorFocusId(null); setSorResults([]); }, 160);
                          lookupExact(row.tempId, row.sorCode);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") { setSorFocusId(null); setSorResults([]); }
                          if (e.key === "Tab" && sorFocusId === row.tempId && sorResults.length > 0) {
                            e.preventDefault();
                            applySOR(row.tempId, sorResults[0]);
                          }
                          if (e.key === "Enter") { e.preventDefault(); focusNextRow(row.tempId); }
                        }}
                        placeholder="e.g. RJ116"
                        className={`${cellCls} font-mono text-blue-700 font-semibold`}
                      />
                      {sorFocusId === row.tempId && (
                        <SORDropdown
                          results={sorResults}
                          onSelect={(item) => applySOR(row.tempId, item)}
                        />
                      )}
                    </td>

                    {/* ── Description ── */}
                    <td className="px-0.5 py-0.5 border-r border-slate-100">
                      <input
                        data-field="description"
                        data-row={row.tempId}
                        value={row.description}
                        onChange={(e) => updateField(row.tempId, "description", e.target.value)}
                        placeholder="Description…"
                        className={cellCls}
                      />
                    </td>

                    {/* ── Nos ── */}
                    <td className="px-0.5 py-0.5 border-r border-slate-100">
                      <input
                        data-field="nos"
                        data-row={row.tempId}
                        type="number" step="any"
                        value={row.nos}
                        onChange={(e) => updateField(row.tempId, "nos", e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNextRow(row.tempId); } }}
                        placeholder="1"
                        className={numCls}
                      />
                    </td>

                    {/* ── L ── */}
                    <td className="px-0.5 py-0.5 border-r border-slate-100">
                      <input
                        type="number" step="any"
                        value={row.L}
                        onChange={(e) => updateField(row.tempId, "L", e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNextRow(row.tempId); } }}
                        placeholder="—"
                        className={numCls}
                      />
                    </td>

                    {/* ── B ── */}
                    <td className="px-0.5 py-0.5 border-r border-slate-100">
                      <input
                        type="number" step="any"
                        value={row.B}
                        onChange={(e) => updateField(row.tempId, "B", e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNextRow(row.tempId); } }}
                        placeholder="—"
                        className={numCls}
                      />
                    </td>

                    {/* ── H ── */}
                    <td className="px-0.5 py-0.5 border-r border-slate-100">
                      <input
                        type="number" step="any"
                        value={row.H}
                        onChange={(e) => updateField(row.tempId, "H", e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === "Tab") {
                            e.preventDefault();
                            focusNextRow(row.tempId);
                          }
                        }}
                        placeholder="—"
                        className={numCls}
                      />
                    </td>

                    {/* ── Qty (read-only) ── */}
                    <td className="px-2 py-0.5 border-r border-slate-100 bg-blue-50/50 text-right">
                      <span className="font-mono font-semibold text-blue-700">
                        {row.qty > 0 ? fmt3(row.qty) : <span className="text-slate-300">—</span>}
                      </span>
                    </td>

                    {/* ── Unit ── */}
                    <td className="px-0.5 py-0.5 border-r border-slate-100">
                      <input
                        value={row.unit}
                        onChange={(e) => updateField(row.tempId, "unit", e.target.value)}
                        placeholder="Sqm"
                        className={`${cellCls} text-center`}
                      />
                    </td>

                    {/* ── Delete ── */}
                    <td className="px-1 py-0.5 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(row.tempId)}
                        className="p-1 text-slate-200 hover:text-red-500 rounded transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}

                {/* Add row footer */}
                <tr>
                  <td colSpan={10} className="px-3 py-2 border-t border-dashed border-slate-200 bg-slate-50/50">
                    <button
                      type="button"
                      onClick={addRow}
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50"
                    >
                      <Plus className="w-3 h-3" /> Add row
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ── Abstract Sheet ── */}
        {activeSheet === "abstract" && (
          <div className="h-full overflow-auto" style={{ scrollbarWidth: "thin" }}>
            <table className="text-xs border-collapse w-full">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-800 text-white">
                  <th className="w-8 px-3 py-2.5 text-center text-xs font-semibold border-r border-slate-600">#</th>
                  <th className="w-32 px-3 py-2.5 text-left text-xs font-semibold border-r border-slate-600">SOR Code</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold border-r border-slate-600">Description</th>
                  <th className="w-28 px-3 py-2.5 text-right text-xs font-semibold border-r border-slate-600">Total Qty</th>
                  <th className="w-16 px-3 py-2.5 text-center text-xs font-semibold border-r border-slate-600">Unit</th>
                  <th className="w-28 px-3 py-2.5 text-right text-xs font-semibold border-r border-slate-600">Rate (Rs.)</th>
                  <th className="w-32 px-3 py-2.5 text-right text-xs font-semibold">Amount (Rs.)</th>
                </tr>
              </thead>
              <tbody>
                {abstract.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-20 text-slate-400">
                      <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      Enter measurements in the MB tab first
                    </td>
                  </tr>
                ) : abstract.map((item, i) => {
                  const amount = item.totalQty * item.rate;
                  return (
                    <tr key={i} className={`border-b border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}>
                      <td className="px-3 py-2 text-center text-slate-400 border-r border-slate-100">{i + 1}</td>
                      <td className="px-3 py-2 border-r border-slate-100 font-mono font-semibold text-blue-700">{item.sorCode || "—"}</td>
                      <td className="px-3 py-2 border-r border-slate-100 text-slate-700">{item.description}</td>
                      <td className="px-3 py-2 border-r border-slate-100 text-right font-mono font-semibold text-blue-700">{fmt3(item.totalQty)}</td>
                      <td className="px-3 py-2 border-r border-slate-100 text-center text-slate-500">{item.unit}</td>
                      <td className={`px-3 py-2 border-r border-slate-100 text-right font-mono ${item.rate > 0 ? "text-slate-700" : "text-amber-400 font-medium"}`}>
                        {item.rate > 0 ? fmt2(item.rate) : "0.00 ⚠"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-slate-800">
                        {amount > 0 ? fmt2(amount) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {abstract.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100 border-t-2 border-slate-300">
                    <td colSpan={6} className="px-3 py-2.5 text-right font-semibold text-slate-700 text-xs">Total Rs.</td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900 text-sm">{fmt2(totalRs)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* ── BOQ Sheet ── */}
        {activeSheet === "boq" && (
          <div className="h-full overflow-auto flex flex-col" style={{ scrollbarWidth: "thin" }}>
            <table className="text-xs border-collapse w-full">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-800 text-white">
                  <th className="w-8 px-3 py-2.5 text-center text-xs font-semibold border-r border-slate-600">#</th>
                  <th className="w-32 px-3 py-2.5 text-left text-xs font-semibold border-r border-slate-600">SOR Code</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold border-r border-slate-600">Description</th>
                  <th className="w-16 px-3 py-2.5 text-center text-xs font-semibold border-r border-slate-600">Unit</th>
                  <th className="w-28 px-3 py-2.5 text-right text-xs font-semibold border-r border-slate-600">Quantity</th>
                  <th className="w-28 px-3 py-2.5 text-right text-xs font-semibold border-r border-slate-600">Rate (Rs.)</th>
                  <th className="w-36 px-3 py-2.5 text-right text-xs font-semibold">Amount (Rs.)</th>
                </tr>
              </thead>
              <tbody>
                {abstract.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-20 text-slate-400">
                      Enter measurements in the MB tab first
                    </td>
                  </tr>
                ) : abstract.map((item, i) => {
                  const amount = item.totalQty * item.rate;
                  return (
                    <tr key={i} className={`border-b border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}>
                      <td className="px-3 py-2 text-center text-slate-400 border-r border-slate-100">{i + 1}</td>
                      <td className="px-3 py-2 border-r border-slate-100 font-mono font-semibold text-blue-700">{item.sorCode || "—"}</td>
                      <td className="px-3 py-2 border-r border-slate-100 text-slate-700">{item.description}</td>
                      <td className="px-3 py-2 border-r border-slate-100 text-center text-slate-500">{item.unit}</td>
                      <td className="px-3 py-2 border-r border-slate-100 text-right font-mono font-semibold text-blue-700">{fmt3(item.totalQty)}</td>
                      <td className={`px-3 py-2 border-r border-slate-100 text-right font-mono ${item.rate > 0 ? "text-slate-700" : "text-amber-400"}`}>
                        {fmt2(item.rate)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-slate-800">
                        {amount > 0 ? fmt2(amount) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Breakdown footer */}
            {abstract.length > 0 && (
              <div className="flex-shrink-0 border-t-2 border-slate-300 bg-slate-50 px-6 py-4 flex justify-end mt-auto">
                <div className="w-80 space-y-0.5">
                  {[
                    { label: "Total Rs.",               value: bd.totalRs,           bold: false, indent: false },
                    { label: "1% Welfare Cess Rs.",      value: bd.welfareCess,        bold: false, indent: true  },
                    { label: "Tender Amount Rs.",         value: bd.tenderAmount,       bold: true,  indent: false },
                    { label: "GST 18% Rs.",               value: bd.gst18,             bold: false, indent: true  },
                    { label: "Total Amount (with GST)",   value: bd.totalWithGST,      bold: true,  indent: false },
                    { label: "5% Contingency Rs.",        value: bd.contingency5,       bold: false, indent: true  },
                    { label: "2% Work Contingency Rs.",   value: bd.workContingency2,   bold: false, indent: true  },
                    { label: "Estimated Amount Rs.",      value: bd.estimatedAmount,    bold: true,  indent: false },
                  ].map(({ label, value, bold, indent }) => (
                    <div key={label} className={`flex justify-between text-xs py-0.5 ${bold ? "border-t border-slate-200 pt-1 mt-0.5" : ""}`}>
                      <span className={`${indent ? "pl-4 text-slate-500" : "text-slate-700"} ${bold ? "font-semibold" : ""}`}>{label}</span>
                      <span className={`font-mono ${bold ? "font-semibold text-slate-800" : "text-slate-600"}`}>{fmt2(value)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center border-t-2 border-blue-600 pt-2 mt-2">
                    <span className="font-bold text-blue-700 text-sm">Net Estimated Amount Rs.</span>
                    <span className="font-bold text-blue-700 text-sm font-mono">{fmt2(bd.netEstimated)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Import Modal ── */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowImport(false)}>
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-[520px] max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div>
                <h3 className="font-semibold text-slate-800">Import from Project</h3>
                <p className="text-xs text-slate-400 mt-0.5">Select a project and choose which measurement sheets to import</p>
              </div>
              <button onClick={() => setShowImport(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Project</label>
                <select
                  value={importProjId}
                  onChange={(e) => setImportProjId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select project…</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {importProjId && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Measurement Sheets
                    {importSheets.length > 0 && (
                      <span className="ml-1 font-normal text-slate-400">({importSheets.length} found)</span>
                    )}
                  </label>
                  {importSheets.length === 0 ? (
                    <div className="text-sm text-slate-400 py-6 text-center border border-dashed border-slate-200 rounded-lg">
                      No measurement sheets found for this project
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {importSheets.map((sheet) => (
                        <label key={sheet.id} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${importSelected.has(sheet.id) ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}>
                          <input
                            type="checkbox"
                            checked={importSelected.has(sheet.id)}
                            onChange={(e) => {
                              setImportSelected((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(sheet.id);
                                else next.delete(sheet.id);
                                return next;
                              });
                            }}
                            className="w-4 h-4 rounded accent-blue-600"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-slate-800">{sheet.name}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{sheet._count.rows} rows</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {importSelected.size > 0 && `${importSelected.size} sheet${importSelected.size > 1 ? "s" : ""} selected`}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setShowImport(false)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button
                  onClick={runImport}
                  disabled={importSelected.size === 0 || importLoading}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {importLoading
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Importing…</>
                    : <><Download className="w-3.5 h-3.5" />Import {importSelected.size > 0 ? `(${importSelected.size})` : ""}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
