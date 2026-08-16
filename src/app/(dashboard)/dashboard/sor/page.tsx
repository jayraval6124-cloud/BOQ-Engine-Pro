"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Plus, Search, Database, Upload, Download, Edit2, Trash2, X, Loader2, FolderOpen, CheckCircle2, AlertCircle } from "lucide-react";
import { SOR_YEARS } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";
import Papa from "papaparse";

interface SORItem {
  id: string; itemCode: string; description: string; unit: string; rate: string;
  division: string; sorYear: string; chapter: string; subChapter?: string; category?: string;
}

interface FormState {
  itemCode: string; description: string; unit: string; rate: string;
  division: string; sorYear: string; chapter: string; subChapter: string; category: string; specification: string;
}

const UNITS = ["Cum", "Sqm", "Rmt", "MT", "Kg", "Nos", "LS", "Each", "Quintal", "Liter"];
const defaultForm: FormState = { itemCode: "", description: "", unit: "Cum", rate: "", division: "", sorYear: "2024-25", chapter: "", subChapter: "", category: "", specification: "" };

export default function SORPage() {
  const [items, setItems]       = useState<SORItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [total, setTotal]       = useState(0);
  const [divisions, setDivisions] = useState<string[]>([]);
  const [chapters, setChapters] = useState<string[]>([]);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState("");
  const [filterDivision, setFilterDivision] = useState("");
  const [filterYear, setFilterYear]         = useState("");
  const [filterChapter, setFilterChapter]   = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<SORItem | null>(null);
  const [form, setForm]         = useState<FormState>(defaultForm);
  const [importing, setImporting] = useState(false);
  const [importDivision, setImportDivision] = useState("");
  const [importYear, setImportYear]         = useState("2024-25");
  const fileRef = useRef<HTMLInputElement>(null);

  const LOCAL_DIVISIONS = [
    "Ahmedabad","Amreli","Bharuch","Bhavnagar","Bhuj","Godhara",
    "Himmatnagar","Jamnagar","Junagadh","Mehsana","Nadiad","Palanpur",
    "Rajkot","Surat","Vadodara","Valsad",
  ];
  const [localImporting, setLocalImporting] = useState<Record<string, boolean>>({});
  const [localResults,   setLocalResults]   = useState<Record<string, { imported: number; updated: number; errors: number } | "error">>({});

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), search, division: filterDivision, sorYear: filterYear, chapter: filterChapter, limit: "30" });
    const res  = await fetch(`/api/sor?${params}`);
    const data = await res.json();
    setItems(data.items || []);
    setTotal(data.total || 0);
    setDivisions(data.divisions || []);
    setChapters(data.chapters || []);
    setLoading(false);
  }, [page, search, filterDivision, filterYear, filterChapter]);

  const importLocal = useCallback(async (division: string) => {
    setLocalImporting((p) => ({ ...p, [division]: true }));
    try {
      const res  = await fetch("/api/sor/import-local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ division, sorYear: "2024-25" }),
      });
      const json = await res.json();
      if (res.ok) {
        const r = json.results?.[division] ?? { imported: json.imported, updated: json.updated, errors: json.errors };
        setLocalResults((p) => ({ ...p, [division]: r }));
        toast({ title: `${division}: ${r.imported} new, ${r.updated} updated`, variant: "success" });
        fetchItems();
      } else {
        setLocalResults((p) => ({ ...p, [division]: "error" }));
        toast({ title: json.error || "Import failed", variant: "destructive" });
      }
    } catch {
      setLocalResults((p) => ({ ...p, [division]: "error" }));
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setLocalImporting((p) => ({ ...p, [division]: false }));
    }
  }, [fetchItems]);

  const importAllLocal = async () => {
    setLocalImporting(Object.fromEntries(LOCAL_DIVISIONS.map((d) => [d, true])));
    try {
      const res  = await fetch("/api/sor/import-local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ division: "__ALL__", sorYear: "2024-25" }),
      });
      const json = await res.json();
      if (res.ok) {
        if (json.results) setLocalResults(json.results);
        toast({ title: `All divisions: ${json.imported} new, ${json.updated} updated, ${json.errors} errors`, variant: "success" });
        fetchItems();
      } else {
        toast({ title: json.error || "Import failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setLocalImporting({});
    }
  };

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // Set default importDivision once divisions load
  useEffect(() => {
    if (divisions.length && !importDivision) setImportDivision(divisions[0]);
    if (divisions.length && !form.division)  setForm((f) => ({ ...f, division: divisions[0] }));
  }, [divisions]); // eslint-disable-line react-hooks/exhaustive-deps

  const openEdit = (item: SORItem) => {
    setEditItem(item);
    setForm({ itemCode: item.itemCode, description: item.description, unit: item.unit, rate: item.rate, division: item.division, sorYear: item.sorYear, chapter: item.chapter, subChapter: item.subChapter || "", category: item.category || "", specification: "" });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, rate: parseFloat(form.rate) };
    const url    = editItem ? `/api/sor/${editItem.id}` : "/api/sor";
    const method = editItem ? "PUT" : "POST";
    const res  = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const json = await res.json();
    if (res.ok) {
      toast({ title: editItem ? "Item updated" : "Item created", variant: "success" });
      setShowForm(false); setEditItem(null); setForm(defaultForm); fetchItems();
    } else toast({ title: json.error || "Operation failed", variant: "destructive" });
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Delete SOR item ${code}?`)) return;
    const res = await fetch(`/api/sor/${id}`, { method: "DELETE" });
    if (res.ok) { toast({ title: "Item deleted", variant: "destructive" }); fetchItems(); }
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const mapped = (results.data as Record<string, string>[]).map((row) => {
          const parseNum = (v: string | undefined) => { const n = parseFloat(v || ""); return isNaN(n) ? null : n; };
          return {
            itemCode:    row["Item Code"]    || row["itemCode"]    || row["code"]        || "",
            description: row["Description"]  || row["description"] || "",
            unit:        row["Unit"]         || row["unit"]        || "",
            rate:        parseNum(row["Rate Rs."] || row["Rate"] || row["rate"]) ?? 0,
            chapter:     row["Type Of Work"] || row["Chapter"]     || row["chapter"]     || "Uncategorized",
            subChapter:  row["SOR Code"]     || row["Sub Chapter"] || row["subChapter"]  || "",
            category:    row["Category"]     || row["category"]    || "",
            materialDescription: row["Material Description"] || row["materialDescription"] || null,
            inputRate:          parseNum(row["Input Rate"]   || row["inputRate"]),
            cementConsumption:  parseNum(row["Cement Consumption"]  || row["cementConsumption"]),
            steelConsumption:   parseNum(row["Steel Consumption"]   || row["steelConsumption"]),
            sandRatio:          parseNum(row["Sand Ratio"]          || row["sandRatio"]),
            aggregateRatio:     parseNum(row["Aggregate Ratio"]     || row["aggregateRatio"]),
          };
        }).filter((r) => r.itemCode && r.description);

        if (!mapped.length) { toast({ title: "No valid rows found in CSV", variant: "destructive" }); setImporting(false); return; }

        const res  = await fetch("/api/sor/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: mapped, division: importDivision, sorYear: importYear }),
        });
        const json = await res.json();
        if (res.ok) {
          toast({ title: `Import done: ${json.imported} new, ${json.updated} updated`, variant: "success" });
          fetchItems();
        } else toast({ title: json.error || "Import failed", variant: "destructive" });
        setImporting(false);
        if (fileRef.current) fileRef.current.value = "";
      },
    });
  };

  const exportCSV = () => {
    const rows = [["Item Code", "Description", "Unit", "Rate", "Division", "SOR Year", "Chapter", "Sub Chapter"]];
    items.forEach((i) => rows.push([i.itemCode, i.description, i.unit, i.rate, i.division, i.sorYear, i.chapter, i.subChapter || ""]));
    const csv  = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "sor-items.csv"; a.click();
  };

  const inputClass = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">SOR Database</h1>
          <p className="text-slate-500 text-sm">{total} items in database</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-2 items-center">
            <select value={importDivision} onChange={(e) => setImportDivision(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none">
              {divisions.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={importYear} onChange={(e) => setImportYear(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none">
              {SOR_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <label className={`flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm cursor-pointer hover:bg-slate-50 ${importing ? "opacity-60 pointer-events-none" : ""}`}>
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {importing ? "Importing..." : "Import CSV"}
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
            </label>
          </div>
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => { setEditItem(null); setForm({ ...defaultForm, division: divisions[0] || "" }); setShowForm(true); }} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      {/* ── Local Import from D:\Office\Jay\Master DTP\ ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-emerald-600" />
            <p className="text-sm font-semibold text-slate-700">Import from Master DTP Files <span className="text-xs font-normal text-slate-400 ml-1">D:\Office\Jay\Master DTP\</span></p>
          </div>
          <button
            onClick={importAllLocal}
            disabled={Object.values(localImporting).some(Boolean)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {Object.values(localImporting).some(Boolean) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Import All Divisions
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {LOCAL_DIVISIONS.map((div) => {
            const busy   = localImporting[div];
            const result = localResults[div];
            return (
              <button
                key={div}
                onClick={() => importLocal(div)}
                disabled={busy}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors
                  border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-60 disabled:cursor-wait"
              >
                <span className="text-slate-700">{div}</span>
                {busy ? (
                  <Loader2 className="w-3.5 h-3.5 text-emerald-500 animate-spin" />
                ) : result === "error" ? (
                  <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                ) : result ? (
                  <span className="text-emerald-600 font-semibold">{(result as { imported: number; updated: number; errors: number }).imported + (result as { imported: number; updated: number; errors: number }).updated}</span>
                ) : (
                  <Upload className="w-3 h-3 text-slate-300" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by code or description..." className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={filterDivision} onChange={(e) => { setFilterDivision(e.target.value); setPage(1); }} className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Divisions</option>
            {divisions.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filterYear} onChange={(e) => { setFilterYear(e.target.value); setPage(1); }} className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Years</option>
            {SOR_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filterChapter} onChange={(e) => { setFilterChapter(e.target.value); setPage(1); }} className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-56">
            <option value="">All Chapters</option>
            {chapters.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" /><p className="text-sm text-slate-400">Loading...</p></div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center"><Database className="w-12 h-12 text-slate-200 mx-auto mb-3" /><p className="text-slate-500 font-medium">No SOR items found</p><p className="text-slate-400 text-sm mt-1">Import from CSV or add items manually</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-24">Code</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-16">Unit</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Rate (₹)</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Division</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-20">Year</th>
                <th className="w-16 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-mono text-slate-600 text-xs">{item.itemCode}</td>
                  <td className="px-4 py-3">
                    <p className="text-slate-800">{item.description}</p>
                    {item.subChapter
                      ? <p className="text-xs text-slate-400 mt-0.5">{item.chapter} &rsaquo; {item.subChapter}</p>
                      : <p className="text-xs text-slate-400 mt-0.5">{item.chapter}</p>
                    }
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.unit}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-700">₹{Number(item.rate).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{item.division}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{item.sorYear}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(item)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(item.id, item.itemCode)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {total > 30 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-500">Showing {Math.min((page - 1) * 30 + 1, total)}&ndash;{Math.min(page * 30, total)} of {total}</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-3 py-1 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100">Previous</button>
              <button disabled={page * 30 >= total} onClick={() => setPage(page + 1)} className="px-3 py-1 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowForm(false); setEditItem(null); }} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-xl mx-4 p-6 z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-slate-800">{editItem ? "Edit SOR Item" : "Add SOR Item"}</h2>
              <button onClick={() => { setShowForm(false); setEditItem(null); }} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Item Code *</label>
                  <input value={form.itemCode} onChange={(e) => setForm({ ...form, itemCode: e.target.value })} required className={inputClass} placeholder="2.1.1" disabled={!!editItem} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Unit *</label>
                  <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className={inputClass}>
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Description *</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required rows={2} className={inputClass} placeholder="Item description..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Rate (₹) *</label>
                  <input value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} type="number" step="0.01" required className={inputClass} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Division *</label>
                  <select value={form.division} onChange={(e) => setForm({ ...form, division: e.target.value })} className={inputClass} disabled={!!editItem}>
                    {divisions.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">SOR Year *</label>
                  <select value={form.sorYear} onChange={(e) => setForm({ ...form, sorYear: e.target.value })} className={inputClass} disabled={!!editItem}>
                    {SOR_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Chapter *</label>
                  <input value={form.chapter} onChange={(e) => setForm({ ...form, chapter: e.target.value })} required className={inputClass} placeholder="Chapter 3 - Concrete Work" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Sub Chapter</label>
                  <input value={form.subChapter} onChange={(e) => setForm({ ...form, subChapter: e.target.value })} className={inputClass} placeholder="3.2 RCC Work" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Specification</label>
                  <textarea value={form.specification} onChange={(e) => setForm({ ...form, specification: e.target.value })} rows={2} className={inputClass} placeholder="Technical specification..." />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditItem(null); }} className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                  {editItem ? "Update Item" : "Add Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
