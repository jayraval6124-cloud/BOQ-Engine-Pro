"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Settings, Printer, ArrowLeft, Search, X, Plus } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SubSection { title: string; description: string; }
interface Section { title: string; description: string; subsections: SubSection[]; }
interface ItemSpec {
  Item_Code: string;
  Description: string;
  Workmanship?: string[];
  Materials?: string[];
  Mode_Of_Measurement_Payment?: string[];
  Details?: Record<string, string[]>;
  sections?: Section[];
}

// ─── Print HTML generator (ported from original ItemDetails) ─────────────────

function buildPrintHTML(selected: ItemSpec[], title: string): string {
  let html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>';
  html += '@page{margin:10px;size:A4;}';
  html += '*{margin:0;padding:0;box-sizing:border-box;}';
  html += 'body{font-family:"Segoe UI",Arial,sans-serif;padding:15px;font-size:12px;}';
  html += '.page-break{page-break-after:always;break-after:always;}';
  html += 'table{width:100%;border-collapse:collapse;}';
  html += 'td{page-break-inside:avoid;break-inside:avoid;vertical-align:top;}';
  html += '.hdr{text-align:center;margin-bottom:20px;padding-bottom:15px;border-bottom:2px solid #334155;}';
  html += '.hdr h1{font-size:22px;margin-bottom:5px;color:#1e293b;font-weight:800;}';
  html += '.hdr p{font-size:14px;color:#64748b;font-weight:500;}';
  html += '.item-table{margin-bottom:15px;}';
  html += '.item-header td{background:#f1f5f9;padding:12px;border:1px solid #e2e8f0;font-weight:600;}';
  html += '.item-code{font-family:monospace;font-size:14px;font-weight:700;color:#0f172a;}';
  html += '.section-container{margin-top:10px;}';
  html += '.section-header{display:flex;justify-content:space-between;align-items:center;padding:8px 10px;font-weight:700;font-size:11px;}';
  html += '.workmanship-header{background:#eef2ff;color:#4f46e5;}';
  html += '.materials-header{background:#ecfdf5;color:#10b981;}';
  html += '.measurement-header{background:#fffbeb;color:#f59e0b;}';
  html += '.section-body{border:1px solid #e2e8f0;border-top:none;}';
  html += '.section-item{display:flex;align-items:stretch;border-bottom:1px solid #e2e8f0;font-size:11px;line-height:1.5;page-break-inside:avoid;}';
  html += '.section-item:last-child{border-bottom:none;}';
  html += '.section-num{width:25px;display:flex;align-items:center;justify-content:center;font-weight:700;color:#64748b;border-right:1px solid #e2e8f0;background:#f8fafc;flex-shrink:0;}';
  html += '.section-text{padding:6px 10px;flex:1;text-align:justify;}';
  html += '.generic-section{margin-bottom:10px;border:1px solid #e0e7ff;}';
  html += '.generic-header{background:#e0e7ff;padding:8px 10px;color:#4f46e5;font-weight:700;}';
  html += '.generic-content{padding:10px;}';
  html += 'ul,ol{margin:0;padding-left:20px;}li{margin-bottom:4px;}p{margin-bottom:8px;}';
  html += '</style></head><body>';
  html += `<div class="hdr"><h1>${title}</h1><p>Detail Item Specification</p></div>`;

  selected.forEach((item, idx) => {
    if (idx > 0) html += '<div style="page-break-before:always;"> </div>';

    html += '<table class="item-table"><tr class="item-header">';
    html += `<td style="width:120px;"><div>Item No: ${idx + 1}</div><div class="item-code">${item.Item_Code}</div></td>`;
    html += `<td>${item.Description || "-"}</td></tr></table>`;

    const workItems = item.Workmanship ?? [];
    const matItems = item.Materials ?? [];
    const measItems = item.Mode_Of_Measurement_Payment ?? [];

    if (workItems.length > 0) {
      html += '<div class="section-container">';
      html += `<div class="section-header workmanship-header"><span>✏ Workmanship Specifications</span><span>${workItems.length}</span></div>`;
      html += '<div class="section-body">';
      workItems.forEach((w, i) => { html += `<div class="section-item"><div class="section-num">${i + 1}</div><div class="section-text">${w}</div></div>`; });
      html += '</div></div>';
    }
    if (matItems.length > 0) {
      html += '<div class="section-container">';
      html += `<div class="section-header materials-header"><span>◈ Materials Required</span><span>${matItems.length}</span></div>`;
      html += '<div class="section-body">';
      matItems.forEach((m, i) => { html += `<div class="section-item"><div class="section-num">${i + 1}</div><div class="section-text">${m}</div></div>`; });
      html += '</div></div>';
    }
    if (measItems.length > 0) {
      html += '<div class="section-container">';
      html += `<div class="section-header measurement-header"><span>$ Mode of Measurement & Payment</span><span>${measItems.length}</span></div>`;
      html += '<div class="section-body">';
      measItems.forEach((m, i) => { html += `<div class="section-item"><div class="section-num">${i + 1}</div><div class="section-text">${m}</div></div>`; });
      html += '</div></div>';
    }

    (item.sections ?? []).forEach((sec, sidx) => {
      html += '<div class="generic-section">';
      html += `<div class="generic-header">${sidx + 1}. ${sec.title || `Section ${sidx + 1}`}</div>`;
      html += '<div class="generic-content">';
      if (sec.description) html += `<div style="background:#f8fafc;padding:10px;border:1px solid #e2e8f0;margin-bottom:10px;">${sec.description}</div>`;
      (sec.subsections ?? []).forEach((sub) => {
        html += '<div style="margin-bottom:8px;">';
        if (sub.title) html += `<div style="font-weight:700;font-size:10px;text-transform:uppercase;">${sub.title}</div>`;
        html += `<div style="color:#475569;line-height:1.5;margin-left:15px;">${sub.description}</div>`;
        html += '</div>';
      });
      html += '</div></div>';
    });
  });

  html += '</body></html>';
  return html;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SpecificationsPage() {
  const [view, setView] = useState<"selector" | "report">("selector");
  const [allItems, setAllItems] = useState<ItemSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedDone, setSeedDone] = useState(false);
  const [selected, setSelected] = useState<ItemSpec[]>([]);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [reportTitle, setReportTitle] = useState("Specification Report");
  const [editingTitle, setEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/item-specs");
      const data = await res.json();
      if (data.success) setAllItems(data.data.map((i: { itemCode: string; description: string; sections: Section[] }) => ({
        Item_Code: i.itemCode,
        Description: i.description,
        sections: i.sections ?? [],
        Workmanship: [],
        Materials: [],
        Mode_Of_Measurement_Payment: [],
        Details: {},
      })));
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const showToast = useCallback((msg: string, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allItems.filter(
      (i) => !selected.some((s) => s.Item_Code === i.Item_Code) &&
        (!q || i.Item_Code.toLowerCase().includes(q))
    );
  }, [allItems, selected, search]);

  function handleSelect(item: ItemSpec) {
    if (!selected.some((s) => s.Item_Code === item.Item_Code)) {
      setSelected((prev) => [...prev, item]);
      showToast(`${item.Item_Code} added`);
    }
    setSearch(""); setShowDropdown(false); setHighlighted(-1);
    inputRef.current?.focus();
  }

  function handleRemove(code: string) {
    setSelected((prev) => prev.filter((i) => i.Item_Code !== code));
    showToast(`${code} removed`, "info");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted((p) => Math.min(p + 1, Math.min(filtered.length, 8) - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlighted((p) => Math.max(p - 1, -1)); }
    else if (e.key === "Enter" && highlighted >= 0 && filtered[highlighted]) { e.preventDefault(); handleSelect(filtered[highlighted]); }
  }

  async function handlePaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData("text");
    const codes = [...new Set(text.split(/[\n\r\t,]+/).map((p) => p.trim().toUpperCase().replace(/[^A-Z0-9\-_.]/g, "")).filter(Boolean))];
    if (codes.length === 0) return;
    e.preventDefault();
    try {
      const res = await fetch("/api/item-specs/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes }),
      });
      const result = await res.json();
      if (result.success && result.data?.length) {
        let added = 0;
        (result.data as ItemSpec[]).forEach((item) => {
          if (!selected.some((s) => s.Item_Code === item.Item_Code)) {
            setSelected((prev) => [...prev, item]);
            added++;
          }
        });
        showToast(added > 0 ? `${added} items added from paste` : "No new items found", added > 0 ? "success" : "warning");
      } else {
        showToast("No matching items found", "error");
      }
    } catch { showToast("Paste failed", "error"); }
  }

  function toggleSection(key: string) {
    setExpandedSections((prev) => ({ ...prev, [key]: !(prev[key] !== false) }));
  }

  function handlePrint() {
    const html = buildPrintHTML(selected, reportTitle);
    const pw = window.open("", "_blank", "width=900,height=700");
    if (!pw) { alert("Allow pop-ups for this site."); return; }
    pw.document.write(html);
    pw.document.close();
    pw.onload = () => { setTimeout(() => { pw.print(); pw.close(); }, 600); };
    setTimeout(() => { if (!pw.closed) { pw.print(); pw.close(); } }, 3500);
  }

  async function handleSeed() {
    setSeeding(true);
    try {
      const res = await fetch("/api/item-specs/seed", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSeedDone(true);
        showToast(`Seeded ${data.inserted} items`, "success");
        fetchItems();
      }
    } catch { showToast("Seed failed", "error"); }
    setSeeding(false);
  }

  // ── Selector view ──────────────────────────────────────────────────────────

  if (view === "selector") return (
    <div className="min-h-[calc(100vh-5rem)]">
      {toast && (
        <div className="fixed top-6 right-6 z-50">
          <div className={`flex items-center gap-3 rounded-2xl border px-5 py-3.5 shadow-2xl bg-white ${toast.type === "success" ? "border-emerald-200" : toast.type === "info" ? "border-sky-200" : "border-amber-200"}`}>
            <span className="text-sm font-semibold text-slate-700">{toast.msg}</span>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto pt-8 pb-16">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Specification Generator</h1>
          <p className="text-slate-500">Build professional specification reports for civil engineering items.</p>
          <div className="mt-4 flex items-center justify-center gap-4">
            <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow border border-slate-100 text-sm font-semibold text-slate-700">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              {loading ? "…" : allItems.length} Items
            </span>
            <Link href="/dashboard/specifications/manage"
              className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow border border-slate-100 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              <Settings className="w-3.5 h-3.5" /> Manage Items
            </Link>
          </div>
        </div>

        {/* Seed banner — shown when DB is empty */}
        {!loading && allItems.length === 0 && !seedDone && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-4">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-amber-800 mb-1">No items in database</p>
              <p className="text-sm text-amber-700 mb-3">Import the 307 civil engineering item specifications from the bundled dataset.</p>
              <button onClick={handleSeed} disabled={seeding}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 disabled:opacity-50 transition-colors">
                {seeding ? "Importing…" : "Import All 307 Items"}
              </button>
            </div>
          </div>
        )}

        {/* Search / dropdown */}
        <div className="relative mb-4" ref={wrapperRef}>
          <div className="relative flex items-center rounded-2xl border border-slate-200 bg-white shadow-lg focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
            <Search className="w-5 h-5 text-slate-400 ml-4 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              className="w-full bg-transparent border-0 px-4 py-4 text-slate-900 placeholder-slate-400 focus:outline-none text-base"
              placeholder="Search item codes or paste from Excel (Ctrl+V)…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); setHighlighted(-1); }}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
            />
            {search && (
              <button className="pr-4 text-slate-400 hover:text-slate-600" onClick={() => setSearch("")}>
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {showDropdown && filtered.length > 0 && (
            <ul className="absolute z-50 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-slate-200 bg-white py-2 shadow-2xl">
              {filtered.slice(0, 8).map((item, idx) => (
                <li key={item.Item_Code}
                  className={`flex cursor-pointer items-center gap-4 mx-2 rounded-xl px-4 py-3 transition-all ${idx === highlighted ? "bg-indigo-50" : "hover:bg-slate-50"}`}
                  onClick={() => handleSelect(item)} onMouseEnter={() => setHighlighted(idx)}>
                  <span className={`inline-flex shrink-0 items-center rounded-xl px-3 py-1.5 text-xs font-bold font-mono ${idx === highlighted ? "bg-indigo-600 text-white" : "bg-indigo-100 text-indigo-700"}`}>
                    {item.Item_Code}
                  </span>
                  <span className="truncate text-sm text-slate-600 flex-1">
                    {item.Description?.replace(/<[^>]+>/g, "").substring(0, 60) || "No description"}…
                  </span>
                  <Plus className={`w-4 h-4 shrink-0 ${idx === highlighted ? "text-indigo-500" : "text-slate-300"}`} />
                </li>
              ))}
            </ul>
          )}

          {showDropdown && search && filtered.length === 0 && (
            <div className="absolute z-50 mt-2 w-full rounded-2xl border border-slate-200 bg-white py-10 text-center shadow-2xl">
              <Search className="w-7 h-7 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-500">No results for &ldquo;{search}&rdquo;</p>
            </div>
          )}
        </div>

        {/* Selected tags */}
        {selected.length > 0 && (
          <div className="mb-4 rounded-2xl border border-slate-200 bg-white shadow overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-600 text-xs font-bold text-white">{selected.length}</span>
                Selected
              </span>
              <button className="text-sm font-semibold text-red-500 hover:text-red-600" onClick={() => setSelected([])}>Clear all</button>
            </div>
            <div className="flex flex-wrap gap-2 p-4">
              {selected.map((item, idx) => (
                <span key={item.Item_Code}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-1.5 text-sm font-bold font-mono text-indigo-700 border border-indigo-100">
                  <span className="text-xs text-indigo-400">{idx + 1}.</span>
                  {item.Item_Code}
                  <button className="ml-1 text-indigo-400 hover:text-indigo-700" onClick={() => handleRemove(item.Item_Code)}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {selected.length === 0 && !search && allItems.length > 0 && (
          <div className="mb-4 rounded-2xl border-2 border-dashed border-slate-200 bg-white/40 px-8 py-12 text-center">
            <Search className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-600">Start building your report</h3>
            <p className="mt-1 text-sm text-slate-400">Search and select RJ item codes</p>
          </div>
        )}

        {/* Footer action */}
        <div className="flex items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-lg border border-slate-100">
          <span className="text-sm text-slate-500">
            {selected.length > 0 ? `${selected.length} item${selected.length > 1 ? "s" : ""} selected` : "Select items to continue"}
          </span>
          <button
            disabled={selected.length === 0}
            onClick={() => setView("report")}
            className="rounded-xl px-6 py-2.5 text-sm font-bold transition-all disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg hover:shadow-xl hover:-translate-y-px">
            Generate Report →
          </button>
        </div>
      </div>
    </div>
  );

  // ── Report view ────────────────────────────────────────────────────────────

  const SECTION_COLORS: Record<string, { bg: string; text: string; border: string; header: string }> = {
    workmanship: { bg: "bg-indigo-500",  text: "text-indigo-600",  border: "border-indigo-100", header: "bg-indigo-50" },
    materials:   { bg: "bg-emerald-500", text: "text-emerald-600", border: "border-emerald-100", header: "bg-emerald-50" },
    measurement: { bg: "bg-amber-500",   text: "text-amber-600",   border: "border-amber-100",  header: "bg-amber-50"  },
  };

  return (
    <div className="min-h-[calc(100vh-5rem)]">
      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <button onClick={() => setView("selector")}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Selection
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-1.5">
            {selected.length} Items
          </span>
          <button onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl px-4 py-2 bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors shadow">
            <Printer className="w-4 h-4" /> Print / PDF
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Report header */}
        <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-200">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-8 py-12 text-center">
            {editingTitle ? (
              <div className="flex flex-col items-center gap-3">
                <input type="text" value={tempTitle} onChange={(e) => setTempTitle(e.target.value)}
                  autoFocus onKeyDown={(e) => { if (e.key === "Enter") { setReportTitle(tempTitle.trim() || reportTitle); setEditingTitle(false); } if (e.key === "Escape") setEditingTitle(false); }}
                  className="text-center text-2xl font-bold bg-white/10 border border-white/30 rounded-lg px-4 py-2 text-white w-full max-w-md outline-none" />
                <div className="flex gap-2">
                  <button onClick={() => { setReportTitle(tempTitle.trim() || reportTitle); setEditingTitle(false); }}
                    className="rounded-lg bg-emerald-500 px-4 py-1.5 text-sm font-bold text-white hover:bg-emerald-600">Save</button>
                  <button onClick={() => setEditingTitle(false)}
                    className="rounded-lg bg-white/20 px-4 py-1.5 text-sm font-bold text-white hover:bg-white/30">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-3xl font-extrabold text-white">{reportTitle}</h2>
                <button onClick={() => { setTempTitle(reportTitle); setEditingTitle(true); }}
                  className="rounded-lg bg-white/10 p-2 text-white/60 hover:bg-white/20 hover:text-white transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>
            )}
            <p className="mt-2 text-slate-300">Detail Item Specification</p>
          </div>
        </div>

        {/* Item cards */}
        {selected.map((item, idx) => (
          <div key={item.Item_Code} className="rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden">
            {/* Item header */}
            <div className="grid grid-cols-12 border-b border-slate-100">
              <div className="col-span-2 flex flex-col justify-center gap-1 px-5 py-4 border-r border-slate-100 bg-slate-50">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Item No: {idx + 1}</span>
                <span className="font-mono text-base font-extrabold text-slate-900">{item.Item_Code}</span>
              </div>
              <div className="col-span-10 px-5 py-4">
                <div className="text-sm text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: item.Description }} />
              </div>
            </div>

            {/* Sections */}
            <div className="px-5 py-4 bg-slate-50/50 space-y-3">
              {/* Workmanship */}
              {(item.Workmanship ?? []).length > 0 && (() => {
                const c = SECTION_COLORS.workmanship;
                const key = `${item.Item_Code}-workmanship`;
                const isOpen = expandedSections[key] !== false;
                return (
                  <div className={`border ${c.border} rounded-xl overflow-hidden`}>
                    <button className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-all hover:bg-slate-50 ${isOpen ? c.header : ""}`}
                      onClick={() => toggleSection(key)}>
                      <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${c.bg} text-white text-xs`}>W</span>
                      <span className="flex-1 font-bold text-slate-800">Workmanship</span>
                      <span className={`rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-bold ${c.text}`}>{item.Workmanship!.length}</span>
                      <svg className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m19 9-7 7-7-7" /></svg>
                    </button>
                    {isOpen && <div className="px-4 pb-4 pt-2 space-y-2">
                      {item.Workmanship!.map((t, i) => (
                        <div key={i} className="flex gap-3 text-sm text-slate-700">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-indigo-50 text-xs font-bold text-indigo-600">{i + 1}</span>
                          <span className="flex-1">{t}</span>
                        </div>
                      ))}
                    </div>}
                  </div>
                );
              })()}

              {/* Generic sections (RJ data uses sections array) */}
              {(item.sections ?? []).map((sec, sidx) => {
                const key = `${item.Item_Code}-sec-${sidx}`;
                const isOpen = expandedSections[key] !== false;
                const colorMap: Record<string, string> = { Workmanship: "bg-indigo-500", Materials: "bg-emerald-500", "Mode Of Measurement & Payment": "bg-amber-500" };
                const bg = colorMap[sec.title] ?? "bg-slate-500";
                const initial = sec.title?.charAt(0) ?? "S";
                return (
                  <div key={sidx} className="border border-slate-200 rounded-xl overflow-hidden">
                    <button className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-all ${isOpen ? "bg-slate-50" : ""}`}
                      onClick={() => toggleSection(key)}>
                      <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${bg} text-white text-xs font-bold`}>{initial}</span>
                      <span className="flex-1 font-bold text-slate-800 text-sm">{sec.title || `Section ${sidx + 1}`}</span>
                      <svg className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m19 9-7 7-7-7" /></svg>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-2">
                        {sec.description && (
                          <div className="text-sm text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-100"
                            dangerouslySetInnerHTML={{ __html: sec.description }} />
                        )}
                        {(sec.subsections ?? []).map((sub, si) => (
                          <div key={si} className="mt-3 pl-4 border-l-2 border-slate-200">
                            {sub.title && <p className="text-xs font-bold uppercase text-slate-700 mb-1">{sub.title}</p>}
                            <div className="text-sm text-slate-600" dangerouslySetInnerHTML={{ __html: sub.description }} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
