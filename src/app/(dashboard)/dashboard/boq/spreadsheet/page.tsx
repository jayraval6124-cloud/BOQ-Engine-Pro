"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, Save, Loader2, Search, X, Plus, Trash2, ChevronDown,
  FileText, BarChart3, IndianRupee, Check,
} from "lucide-react";
import { toast } from "@/components/ui/toaster";
import { DIVISIONS_GUJARAT, SOR_YEARS } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────
interface Project  { id: string; name: string; sorDivision: string; sorYear: string }
interface SheetMeta { id: string; name: string; _count: { rows: number } }
interface SORItem  { id: string; itemCode: string; subChapter: string; description: string; unit: string; rate: number; chapter: string }

interface MBRow {
  tempId: string;
  sorCode: string;
  description: string;
  nos: string;
  L: string;
  B: string;
  H: string;
  unit: string;
  rate: string;
  sorItemId: string;
  chapter: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
let _uid = 0;
const uid = () => `r${++_uid}`;

const blankRow = (): MBRow => ({
  tempId: uid(), sorCode: "", description: "", nos: "", L: "", B: "", H: "",
  unit: "", rate: "", sorItemId: "", chapter: "",
});

function calcQty(nos: string, L: string, B: string, H: string): number {
  const n = parseFloat(nos) || 0;
  const l = parseFloat(L);
  if (!l) return n; // count-only
  const b = parseFloat(B) || 1;
  const h = parseFloat(H) || 1;
  return n * l * b * h;
}

const fmt2 = (v: number) => v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt3 = (v: number) => v.toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

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

// ─── SOR dropdown component ────────────────────────────────────────────────
function SORDropdown({
  value, onChange, onSelect, division, year, inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (item: SORItem) => void;
  division: string;
  year: string;
  inputRef?: React.RefObject<HTMLInputElement>;
}) {
  const [results, setResults]   = useState<SORItem[]>([]);
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const debounceRef             = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const p = new URLSearchParams({ search: q, limit: "12" });
        if (division) p.set("division", division);
        if (year)     p.set("year",     year);
        const res  = await fetch(`/api/sor?${p}`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : (data.items || []));
        setOpen(true);
      } finally { setLoading(false); }
    }, 250);
  }, [division, year]);

  const handleBlur = useCallback(async () => {
    if (!value.trim()) return;
    try {
      const p = new URLSearchParams({ code: value.trim() });
      if (division) p.set("division", division);
      if (year)     p.set("year",     year);
      const res  = await fetch(`/api/sor/lookup?${p}`);
      const item: SORItem | null = await res.json();
      if (item) {
        // Set the RJ/subChapter code in the field if found by different term
        if (item.subChapter && item.subChapter.toUpperCase() !== value.trim().toUpperCase()) {
          onChange(item.subChapter);
        }
        onSelect(item);
      }
    } catch { /* no-op */ }
  }, [value, division, year, onSelect, onChange]);

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => { onChange(e.target.value); search(e.target.value); }}
        onBlur={() => { setTimeout(() => setOpen(false), 150); handleBlur(); }}
        onFocus={() => value && results.length && setOpen(true)}
        placeholder="RJ code…"
        className="w-full px-2 py-1 text-xs border-0 bg-transparent focus:outline-none focus:bg-blue-50 rounded"
      />
      {loading && <Loader2 className="absolute right-1.5 top-1.5 w-3 h-3 animate-spin text-slate-400" />}
      {open && results.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-0.5 w-80 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          {results.map((item) => (
            <button key={item.id} type="button"
              onMouseDown={() => {
                // Set the display code in the field (subChapter = RJ code), then fill details
                const rjCode = item.subChapter || item.itemCode;
                onChange(rjCode);
                onSelect(item);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2.5 hover:bg-blue-50 border-b border-slate-100 last:border-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-blue-700 shrink-0">{item.subChapter || item.itemCode}</span>
                <span className="text-xs text-slate-400 shrink-0">{item.unit}</span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{item.description}</p>
              <p className="text-xs font-semibold text-emerald-600 mt-0.5">₹{fmt2(item.rate)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function BOQSpreadsheetPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [projects, setProjects]       = useState<Project[]>([]);
  const [selProjectId, setSelProjectId] = useState("");
  const [createNew, setCreateNew]     = useState(false);
  const [newProj, setNewProj]         = useState({ name: "", sorDivision: "", sorYear: "" });
  const [boqName, setBoqName]         = useState("BOQ - Estimate 1");
  const [subWork, setSubWork]         = useState("Civil");
  const [notes, setNotes]             = useState("");
  const [activeTab, setActiveTab]     = useState<"mb" | "abstract" | "boq">("mb");

  const [rows, setRows]               = useState<MBRow[]>([blankRow(), blankRow(), blankRow()]);
  const [saving, setSaving]           = useState(false);

  // Import modal
  const [showImport, setShowImport]         = useState(false);
  const [importProjId, setImportProjId]     = useState("");
  const [importSheets, setImportSheets]     = useState<SheetMeta[]>([]);
  const [importSelected, setImportSelected] = useState<Set<string>>(new Set());
  const [importLoading, setImportLoading]   = useState(false);

  const selectedProject = projects.find((p) => p.id === selProjectId);
  const division = createNew ? newProj.sorDivision : (selectedProject?.sorDivision || "");
  const year     = createNew ? newProj.sorYear     : (selectedProject?.sorYear     || "");

  useEffect(() => {
    fetch("/api/projects?limit=200").then((r) => r.json()).then((d) => setProjects(d.projects || []));
  }, []);

  useEffect(() => {
    const pid = searchParams.get("projectId");
    if (pid) { setSelProjectId(pid); setCreateNew(false); }
  }, [searchParams]);

  useEffect(() => {
    if (!importProjId) { setImportSheets([]); return; }
    fetch(`/api/measurements?projectId=${importProjId}`)
      .then((r) => r.json())
      .then((d) => setImportSheets(Array.isArray(d) ? d : []));
  }, [importProjId]);

  // Abstract & BOQ computed from MB rows
  const abstractItems = useMemo(() => {
    const map = new Map<string, { sorCode: string; description: string; unit: string; totalQty: number; rate: number }>();
    rows.forEach((r) => {
      const key = r.sorCode.trim() || r.description.trim();
      if (!key) return;
      const qty  = calcQty(r.nos, r.L, r.B, r.H);
      const rate = parseFloat(r.rate) || 0;
      const prev = map.get(key);
      if (prev) { prev.totalQty += qty; }
      else map.set(key, { sorCode: r.sorCode.trim(), description: r.description.trim(), unit: r.unit, totalQty: qty, rate });
    });
    return Array.from(map.values());
  }, [rows]);

  const totalRs = abstractItems.reduce((s, i) => s + i.totalQty * i.rate, 0);
  const bd      = computeBreakdown(totalRs);

  // Row actions
  const updateRow = useCallback((tempId: string, field: keyof MBRow, value: string) => {
    setRows((prev) => prev.map((r) => r.tempId === tempId ? { ...r, [field]: value } : r));
  }, []);

  const applySORORow = useCallback((tempId: string, item: SORItem) => {
    setRows((prev) => prev.map((r) => r.tempId === tempId
      ? {
          ...r,
          // Keep sorCode as user typed (which onChange already set to subChapter/RJ code)
          // Only fill description, unit, rate from the matched SOR item
          description: item.description,
          unit:        item.unit,
          rate:        String(item.rate),
          sorItemId:   item.id,
          chapter:     item.chapter,
        }
      : r
    ));
  }, []);

  const addRow = () => setRows((prev) => [...prev, blankRow()]);
  const deleteRow = (tempId: string) => setRows((prev) => prev.filter((r) => r.tempId !== tempId));

  const addBlankRows = (n: number) => setRows((prev) => [...prev, ...Array.from({ length: n }, blankRow)]);

  // Import rows
  const runImport = async () => {
    if (importSelected.size === 0) return;
    setImportLoading(true);
    try {
      const imported: MBRow[] = [];
      for (const sheetId of importSelected) {
        const res   = await fetch(`/api/measurements/${sheetId}`);
        const sheet = await res.json();
        for (const r of (sheet.rows || [])) {
          if (!r.gsrtcCode && !r.description) continue;
          imported.push({
            tempId: uid(),
            sorCode:     r.gsrtcCode  || "",
            description: r.description || "",
            nos:         r.nos     != null ? String(r.nos)     : "",
            L:           r.length  != null ? String(r.length)  : "",
            B:           r.breadth != null ? String(r.breadth) : "",
            H:           r.height  != null ? String(r.height)  : "",
            unit:        r.unit    || "",
            rate:        "",
            sorItemId:   "",
            chapter:     "",
          });
        }
      }
      if (!imported.length) { toast({ title: "No rows found", variant: "destructive" }); return; }
      setRows((prev) => [...prev.filter((r) => r.sorCode || r.description), ...imported]);
      toast({ title: `Imported ${imported.length} rows`, variant: "success" });
      setShowImport(false);
    } catch { toast({ title: "Import failed", variant: "destructive" }); }
    finally { setImportLoading(false); }
  };

  // Save
  const saveBOQ = async () => {
    if (!createNew && !selProjectId) {
      toast({ title: "Select or create a project first", variant: "destructive" }); return;
    }
    if (createNew && !newProj.name.trim()) {
      toast({ title: "Enter a project name", variant: "destructive" }); return;
    }
    const mbRows = rows.filter((r) => r.sorCode.trim() || r.description.trim());
    if (!mbRows.length) {
      toast({ title: "Add at least one row to the Measurements sheet", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      let projectId = selProjectId;
      if (createNew) {
        const pRes  = await fetch("/api/projects", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newProj.name.trim(), sorDivision: newProj.sorDivision, sorYear: newProj.sorYear }),
        });
        const pData = await pRes.json();
        if (!pRes.ok) throw new Error(pData.error || "Failed to create project");
        projectId = pData.id;
      }

      const msRes  = await fetch("/api/measurements", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, name: `MB - ${boqName}` }),
      });
      const msData = await msRes.json();
      if (!msRes.ok) throw new Error(msData.error || "Failed to create measurement sheet");

      await fetch(`/api/measurements/${msData.id}/rows`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: mbRows.map((r, i) => ({
            itemNo: i + 1, gsrtcCode: r.sorCode || null, description: r.description,
            nos: parseFloat(r.nos) || null, length: parseFloat(r.L) || null,
            breadth: parseFloat(r.B) || null, height: parseFloat(r.H) || null,
            unit: r.unit || "Nos", sortOrder: i, serialNo: i + 1,
          })),
        }),
      });

      const boqRes  = await fetch("/api/boq", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId, measurementSheetId: msData.id, name: boqName, subWork, notes,
          includeGST: true, gstPercent: 18,
          breakdown: bd,
          items: abstractItems.map((item) => ({
            gsrtcCode: item.sorCode || undefined, description: item.description,
            unit: item.unit || "Nos", quantity: item.totalQty, rate: item.rate,
            chapter: "General", isManualEntry: true,
            sheetQtys: { [msData.id]: { sheetName: `MB - ${boqName}`, qty: item.totalQty } },
          })),
        }),
      });
      const boqData = await boqRes.json();
      if (!boqRes.ok) throw new Error(boqData.error || "Failed to create BOQ");
      toast({ title: "BOQ saved successfully", variant: "success" });
      router.push(`/dashboard/boq/${boqData.id}`);
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Save failed", variant: "destructive" });
    } finally { setSaving(false); }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* ── Header bar ── */}
      <div className="flex items-center gap-3">
        <Link href={selProjectId ? `/dashboard/projects/${selProjectId}` : "/dashboard/projects"}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-slate-800">New BOQ</h1>
          <p className="text-xs text-slate-400">Fill measurements, then save to generate BOQ</p>
        </div>
        <div className="flex-1" />
        <button type="button" onClick={() => { setShowImport(true); setImportProjId(""); setImportSelected(new Set()); }}
          className="flex items-center gap-1.5 text-sm px-3 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
          Import Rows
        </button>
        <button onClick={saveBOQ} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Save className="w-4 h-4" />Save BOQ</>}
        </button>
      </div>

      {/* ── Setup panel ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-4">
          {/* Project */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Project</label>
            <div className="flex items-center gap-1.5">
              {!createNew ? (
                <select value={selProjectId} onChange={(e) => setSelProjectId(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-48">
                  <option value="">Select project…</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              ) : (
                <input value={newProj.name} onChange={(e) => setNewProj((p) => ({ ...p, name: e.target.value }))}
                  placeholder="New project name…"
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-48" />
              )}
              <button type="button" onClick={() => { setCreateNew((v) => !v); setSelProjectId(""); }}
                className="text-xs px-2.5 py-2 rounded-lg border border-slate-200 text-blue-600 hover:bg-blue-50">
                {createNew ? "Existing" : "+ New"}
              </button>
            </div>
          </div>
          {createNew && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Division</label>
                <select value={newProj.sorDivision} onChange={(e) => setNewProj((p) => ({ ...p, sorDivision: e.target.value }))}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">— Select —</option>
                  {DIVISIONS_GUJARAT.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">SOR Year</label>
                <select value={newProj.sorYear} onChange={(e) => setNewProj((p) => ({ ...p, sorYear: e.target.value }))}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">— Select —</option>
                  {SOR_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </>
          )}
          {/* BOQ Name */}
          <div className="flex flex-col gap-1 flex-1 min-w-52">
            <label className="text-xs font-medium text-slate-500">BOQ Name</label>
            <input value={boqName} onChange={(e) => setBoqName(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {/* Sub-Work */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Sub-Work</label>
            <select value={subWork} onChange={(e) => setSubWork(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option>Civil</option>
              <option>Electrical Work</option>
              <option>Borewell Work</option>
              <option>Fire Fighting Work</option>
              <option>Plumbing Work</option>
            </select>
          </div>
          {/* Notes */}
          <div className="flex flex-col gap-1 flex-1 min-w-36">
            <label className="text-xs font-medium text-slate-500">Notes (optional)</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Remarks…"
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200 px-4 gap-1">
          {([
            { id: "mb",       label: "Measurements",      icon: FileText },
            { id: "abstract", label: "Abstract / Summary", icon: BarChart3 },
            { id: "boq",      label: "Estimate Sheet",     icon: IndianRupee },
          ] as const).map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}>
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
          <div className="flex-1" />
          {activeTab === "mb" && (
            <div className="flex items-center gap-2 py-2">
              <span className="text-xs text-slate-400">{rows.filter((r) => r.sorCode || r.description).length} rows</span>
              <button onClick={addRow}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Plus className="w-3 h-3" /> Add Row
              </button>
            </div>
          )}
        </div>

        {/* ── Measurements Tab ── */}
        {activeTab === "mb" && (
          <div className="overflow-auto">
            <table className="w-full text-sm border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-800 text-white text-xs">
                  <th className="px-3 py-2.5 text-center w-10 font-semibold">#</th>
                  <th className="px-3 py-2.5 text-left w-28 font-semibold">RJ Code</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Description</th>
                  <th className="px-3 py-2.5 text-center w-16 font-semibold">Nos</th>
                  <th className="px-3 py-2.5 text-center w-20 font-semibold">L (m)</th>
                  <th className="px-3 py-2.5 text-center w-20 font-semibold">B (m)</th>
                  <th className="px-3 py-2.5 text-center w-20 font-semibold">H (m)</th>
                  <th className="px-3 py-2.5 text-center w-24 font-semibold bg-blue-700">Qty</th>
                  <th className="px-3 py-2.5 text-center w-16 font-semibold">Unit</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const qty    = calcQty(row.nos, row.L, row.B, row.H);
                  const hasData = row.sorCode || row.description;
                  return (
                    <tr key={row.tempId}
                      className={`border-b border-slate-100 hover:bg-slate-50/70 transition-colors group ${hasData ? "" : "opacity-60"}`}>
                      <td className="px-3 py-1 text-center text-xs text-slate-400 font-mono">{i + 1}</td>
                      <td className="px-1 py-0.5 border-r border-slate-100">
                        <SORDropdown
                          value={row.sorCode}
                          onChange={(v) => updateRow(row.tempId, "sorCode", v)}
                          onSelect={(item) => applySORORow(row.tempId, item)}
                          division={division} year={year}
                        />
                      </td>
                      <td className="px-1 py-0.5 border-r border-slate-100">
                        <input value={row.description} onChange={(e) => updateRow(row.tempId, "description", e.target.value)}
                          placeholder="Item description…"
                          className="w-full px-2 py-1 text-xs border-0 bg-transparent focus:outline-none focus:bg-blue-50 rounded" />
                      </td>
                      {(["nos", "L", "B", "H"] as const).map((f) => (
                        <td key={f} className="px-1 py-0.5 border-r border-slate-100">
                          <input type="number" value={row[f]} onChange={(e) => updateRow(row.tempId, f, e.target.value)}
                            placeholder="0"
                            className="w-full px-2 py-1 text-xs text-center border-0 bg-transparent focus:outline-none focus:bg-blue-50 rounded" />
                        </td>
                      ))}
                      <td className="px-3 py-1 text-center text-xs font-semibold text-blue-700 bg-blue-50/60">
                        {qty > 0 ? fmt3(qty) : "—"}
                      </td>
                      <td className="px-1 py-0.5 border-r border-slate-100">
                        <input value={row.unit} onChange={(e) => updateRow(row.tempId, "unit", e.target.value)}
                          placeholder="Unit"
                          className="w-full px-2 py-1 text-xs text-center border-0 bg-transparent focus:outline-none focus:bg-blue-50 rounded" />
                      </td>
                      <td className="px-1 py-1 text-center">
                        <button onClick={() => deleteRow(row.tempId)}
                          className="p-1 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity rounded">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Add rows */}
            <div className="flex items-center gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/60">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Search className="w-3 h-3" /> Type an RJ code and press Tab — description, unit &amp; rate fill automatically from SOR database
              </span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 border-t border-slate-100">
              <button onClick={addRow}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 px-3 py-1.5 border border-blue-200 rounded-lg hover:bg-blue-50">
                <Plus className="w-3 h-3" /> Add Row
              </button>
              <button onClick={() => addBlankRows(5)}
                className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50">
                + 5 Rows
              </button>
              <button onClick={() => addBlankRows(10)}
                className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50">
                + 10 Rows
              </button>
            </div>
          </div>
        )}

        {/* ── Abstract Tab ── */}
        {activeTab === "abstract" && (
          <div className="overflow-auto">
            {abstractItems.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <BarChart3 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p>No data yet — fill the Measurements sheet first</p>
              </div>
            ) : (
              <>
                <table className="w-full text-sm border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-800 text-white text-xs">
                      <th className="px-4 py-2.5 text-center w-10 font-semibold">#</th>
                      <th className="px-4 py-2.5 text-left w-28 font-semibold">RJ Code</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Description</th>
                      <th className="px-4 py-2.5 text-right w-28 font-semibold">Total Qty</th>
                      <th className="px-4 py-2.5 text-center w-16 font-semibold">Unit</th>
                      <th className="px-4 py-2.5 text-right w-28 font-semibold">Rate (Rs.)</th>
                      <th className="px-4 py-2.5 text-right w-32 font-semibold">Amount (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {abstractItems.map((item, i) => {
                      const amount = item.totalQty * item.rate;
                      return (
                        <tr key={i} className={`border-b border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                          <td className="px-4 py-2.5 text-center text-xs text-slate-400">{i + 1}</td>
                          <td className="px-4 py-2.5 text-xs font-semibold text-blue-700">{item.sorCode || "—"}</td>
                          <td className="px-4 py-2.5 text-sm text-slate-700">{item.description}</td>
                          <td className="px-4 py-2.5 text-right text-sm font-semibold text-blue-700">{fmt3(item.totalQty)}</td>
                          <td className="px-4 py-2.5 text-center text-xs text-slate-500">{item.unit}</td>
                          <td className={`px-4 py-2.5 text-right text-sm ${item.rate === 0 ? "text-amber-500" : "text-slate-700"}`}>
                            {item.rate === 0 ? "—" : fmt2(item.rate)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-sm font-semibold text-slate-800">{fmt2(amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-blue-50 border-t-2 border-blue-200">
                      <td colSpan={6} className="px-4 py-3 text-sm font-bold text-slate-700 text-right">Total Rs.</td>
                      <td className="px-4 py-3 text-right text-base font-bold text-blue-700">₹{fmt2(totalRs)}</td>
                    </tr>
                  </tfoot>
                </table>
                {abstractItems.some((i) => i.rate === 0) && (
                  <div className="px-4 py-3 text-xs text-amber-600 bg-amber-50 border-t border-amber-100 flex items-center gap-2">
                    <span className="font-semibold">⚠</span>
                    Some items have no rate — enter rates in the Measurements sheet or use Auto-fill SOR
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── BOQ / Estimate Sheet Tab ── */}
        {activeTab === "boq" && (
          <div className="overflow-auto">
            {abstractItems.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <IndianRupee className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p>No data yet — fill the Measurements sheet first</p>
              </div>
            ) : (
              <>
                <table className="w-full text-sm border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-800 text-white text-xs">
                      <th className="px-4 py-2.5 text-center w-10 font-semibold">#</th>
                      <th className="px-4 py-2.5 text-left w-28 font-semibold">RJ Code</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Description</th>
                      <th className="px-4 py-2.5 text-center w-16 font-semibold">Unit</th>
                      <th className="px-4 py-2.5 text-right w-28 font-semibold">Quantity</th>
                      <th className="px-4 py-2.5 text-right w-28 font-semibold">Rate (Rs.)</th>
                      <th className="px-4 py-2.5 text-right w-32 font-semibold">Amount (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {abstractItems.map((item, i) => {
                      const amount = item.totalQty * item.rate;
                      return (
                        <tr key={i} className={`border-b border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                          <td className="px-4 py-2.5 text-center text-xs text-slate-400">{i + 1}</td>
                          <td className="px-4 py-2.5 text-xs font-semibold text-blue-700">{item.sorCode || "—"}</td>
                          <td className="px-4 py-2.5 text-sm text-slate-700">{item.description}</td>
                          <td className="px-4 py-2.5 text-center text-xs text-slate-500">{item.unit}</td>
                          <td className="px-4 py-2.5 text-right text-sm font-semibold text-blue-700">{fmt3(item.totalQty)}</td>
                          <td className="px-4 py-2.5 text-right text-sm text-slate-700">{item.rate === 0 ? "—" : fmt2(item.rate)}</td>
                          <td className="px-4 py-2.5 text-right text-sm font-semibold text-slate-800">{fmt2(amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Financial breakdown */}
                <div className="border-t-2 border-slate-200 mx-4 mt-2" />
                <div className="px-4 py-4 max-w-lg ml-auto space-y-1.5">
                  {[
                    { label: "Total Rs.",                value: bd.totalRs,           bold: false },
                    { label: "1% Welfare Cess Rs.",      value: bd.welfareCess,        bold: false },
                    { label: "Tender Amount Rs.",         value: bd.tenderAmount,       bold: true  },
                    { label: "GST 18% Rs.",               value: bd.gst18,             bold: false },
                    { label: "Total (with GST) Rs.",      value: bd.totalWithGST,      bold: true  },
                    { label: "5% Contingency Rs.",        value: bd.contingency5,       bold: false },
                    { label: "2% Work Contingency Rs.",   value: bd.workContingency2,   bold: false },
                    { label: "Estimated Amount Rs.",      value: bd.estimatedAmount,    bold: false },
                  ].map(({ label, value, bold }) => (
                    <div key={label} className="flex items-center justify-between text-sm">
                      <span className={bold ? "font-semibold text-slate-700" : "text-slate-500"}>{label}</span>
                      <span className={bold ? "font-bold text-slate-800" : "text-slate-700"}>₹{fmt2(value)}</span>
                    </div>
                  ))}
                  <div className="border-t border-slate-200 pt-3 mt-2">
                    <div className="flex items-center justify-between bg-blue-600 text-white rounded-xl px-4 py-3">
                      <span className="text-sm font-bold">NET ESTIMATED AMOUNT Rs.</span>
                      <span className="text-lg font-bold">₹{fmt2(bd.netEstimated)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Import Modal ── */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowImport(false)}>
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-[500px] max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div>
                <h3 className="font-semibold text-slate-800">Import from Project</h3>
                <p className="text-xs text-slate-400 mt-0.5">Rows will be appended to the Measurements tab</p>
              </div>
              <button onClick={() => setShowImport(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 flex flex-col gap-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Source Project</label>
                <select value={importProjId} onChange={(e) => { setImportProjId(e.target.value); setImportSelected(new Set()); }}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Select project…</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {importProjId && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Measurement Sheets</label>
                  {importSheets.length === 0
                    ? <div className="text-sm text-slate-400 py-8 text-center border border-dashed border-slate-200 rounded-lg">No sheets found</div>
                    : <div className="space-y-2">
                        {importSheets.map((sheet) => (
                          <label key={sheet.id}
                            className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${importSelected.has(sheet.id) ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}>
                            <input type="checkbox" checked={importSelected.has(sheet.id)}
                              onChange={(e) => setImportSelected((prev) => { const n = new Set(prev); e.target.checked ? n.add(sheet.id) : n.delete(sheet.id); return n; })}
                              className="w-4 h-4 rounded accent-blue-600" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-slate-800">{sheet.name}</p>
                                {importSelected.has(sheet.id) && <Check className="w-3.5 h-3.5 text-blue-600" />}
                              </div>
                              <p className="text-xs text-slate-400">{sheet._count.rows} rows</p>
                            </div>
                          </label>
                        ))}
                      </div>
                  }
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button onClick={() => setShowImport(false)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={runImport} disabled={importSelected.size === 0 || importLoading}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {importLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Importing…</> : <>Import {importSelected.size > 0 ? `(${importSelected.size})` : ""}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
