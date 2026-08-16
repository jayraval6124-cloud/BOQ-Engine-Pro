"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Printer, RefreshCw, Search } from "lucide-react";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProjectOption { id: string; name: string; projectNo: string; }
interface BOQOption     { id: string; name: string; subWork: string; boqNo: string; }

interface BOQItemFull {
  id: string;
  gsrtcCode:   string | null;
  itemCode:    string | null;
  description: string;
  quantity:    number | string;
  unit:        string;
  rate:        number | string | null;
  chapter:     string | null;
  sortOrder:   number;
  sorItem?:    { itemCode: string } | null;
}

interface SpecSection { title: string; description: string; subsections: { title: string; description: string }[]; }
interface ItemSpec    { Item_Code: string; Description: string; sections: SpecSection[]; }

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCode(item: BOQItemFull): string {
  return (item.gsrtcCode ?? item.sorItem?.itemCode ?? item.itemCode ?? "").toUpperCase().trim();
}

// ── Print ─────────────────────────────────────────────────────────────────────

const PRINT_STYLE = `
  @page { size: A4; margin: 10px; }
  *, *::before, *::after { box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, sans-serif; padding: 15px; font-size: 12px; margin: 0; }
  .page-break { page-break-before: always; break-before: always; }
  table { width: 100%; border-collapse: collapse; }
  td { page-break-inside: avoid; break-inside: avoid; vertical-align: top; }
  .hdr { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #334155; }
  .hdr h1 { font-size: 22px; margin-bottom: 5px; color: #1e293b; font-weight: 800; margin: 0; }
  .hdr p { font-size: 14px; color: #64748b; font-weight: 500; margin: 4px 0 0; }
  .item-header td { background: #f1f5f9; padding: 12px; border: 1px solid #e2e8f0; font-weight: 600; }
  .item-code { font-family: monospace; font-size: 14px; font-weight: 700; color: #0f172a; }
  .sec-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; font-weight: 700; font-size: 11px; margin-top: 10px; }
  .workmanship-hdr { background: #eef2ff; color: #4f46e5; }
  .materials-hdr   { background: #ecfdf5; color: #10b981; }
  .measurement-hdr { background: #fffbeb; color: #f59e0b; }
  .generic-hdr     { background: #e0e7ff; color: #4f46e5; }
  .sec-body { border: 1px solid #e2e8f0; border-top: none; }
  .sec-item { display: flex; align-items: stretch; border-bottom: 1px solid #e2e8f0; font-size: 11px; line-height: 1.5; page-break-inside: avoid; }
  .sec-item:last-child { border-bottom: none; }
  .sec-num { width: 25px; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #64748b; border-right: 1px solid #e2e8f0; background: #f8fafc; flex-shrink: 0; }
  .sec-text { padding: 6px 10px; flex: 1; text-align: justify; }
  .generic-body { border: 1px solid #e0e7ff; border-top: none; padding: 10px; }
  ul, ol { margin: 0; padding-left: 20px; } li { margin-bottom: 4px; } p { margin-bottom: 8px; }
`;

function buildPrintHTML(items: { item: BOQItemFull; idx: number; spec: ItemSpec }[], title: string): string {
  const headerClass = (t: string) => {
    if (/workmanship/i.test(t)) return "workmanship-hdr";
    if (/material/i.test(t))    return "materials-hdr";
    if (/measurement/i.test(t)) return "measurement-hdr";
    return "generic-hdr";
  };

  let html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>${PRINT_STYLE}</style></head><body>
    <div class="hdr"><h1>${title}</h1><p>Detail Item Specification</p></div>`;

  items.forEach(({ idx, spec }, i) => {
    if (i > 0) html += '<div class="page-break"> </div>';
    html += `<table><tr class="item-header">
      <td style="width:130px"><div>Item No: ${idx + 1}</div><div class="item-code">${spec.Item_Code}</div></td>
      <td>${spec.Description || "-"}</td></tr></table>`;

    (spec.sections ?? []).forEach((sec) => {
      const hc = headerClass(sec.title);
      html += `<div class="${hc} sec-header"><span>${sec.title}</span></div>`;
      if (hc === "generic-hdr") {
        html += `<div class="generic-body">${sec.description ?? ""}`;
        (sec.subsections ?? []).forEach((s) => {
          if (s.title) html += `<div style="font-weight:700;font-size:10px;text-transform:uppercase;margin-top:6px">${s.title}</div>`;
          if (s.description) html += `<div style="color:#475569;line-height:1.5;margin-left:15px">${s.description}</div>`;
        });
        html += `</div>`;
      } else {
        const lines: string[] = [];
        if (sec.description) lines.push(sec.description);
        (sec.subsections ?? []).forEach((s) => { if (s.description) lines.push(s.description); });
        html += `<div class="sec-body">`;
        lines.forEach((l, li) => {
          html += `<div class="sec-item"><div class="sec-num">${li + 1}</div><div class="sec-text">${l}</div></div>`;
        });
        html += `</div>`;
      }
    });
  });

  html += "</body></html>";
  return html;
}

// ── Section color maps ────────────────────────────────────────────────────────

function getSectionColors(title: string) {
  if (/workmanship/i.test(title))  return { bg: "bg-indigo-500",  border: "border-indigo-100",  header: "bg-indigo-50"  };
  if (/material/i.test(title))     return { bg: "bg-emerald-500", border: "border-emerald-100", header: "bg-emerald-50" };
  if (/measurement/i.test(title))  return { bg: "bg-amber-500",   border: "border-amber-100",   header: "bg-amber-50"   };
  return                                   { bg: "bg-slate-500",   border: "border-slate-200",   header: "bg-slate-50"   };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DTPSpecificationsPage() {
  const [view,        setView]       = useState<"selector" | "report">("selector");
  const [projectId,   setProjectId]  = useState("");
  const [boqId,       setBoqId]      = useState("");
  const [projects,    setProjects]   = useState<ProjectOption[]>([]);
  const [boqList,     setBoqList]    = useState<BOQOption[]>([]);
  const [boqItems,    setBoqItems]   = useState<BOQItemFull[]>([]);
  const [itemSpecs,   setItemSpecs]  = useState<Map<string, ItemSpec>>(new Map());
  const [loading,     setLoading]    = useState(false);
  const [reportTitle, setReportTitle] = useState("Detailed Specifications");
  const [expanded,    setExpanded]   = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/projects?limit=100")
      .then((r) => r.json())
      .then((d) => setProjects(Array.isArray(d.projects) ? d.projects : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!projectId) { setBoqList([]); setBoqId(""); return; }
    fetch(`/api/boq?projectId=${projectId}`)
      .then((r) => r.json())
      .then((data: BOQOption[]) => {
        const civil = Array.isArray(data) ? data.filter((b) => !b.subWork || b.subWork === "Civil") : [];
        setBoqList(civil);
        if (civil.length === 1) setBoqId(civil[0].id);
      })
      .catch(() => {});
  }, [projectId]);

  const loadItems = useCallback(async () => {
    if (!boqId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/boq/${boqId}`);
      if (!res.ok) return;
      const data = JSON.parse(await res.text());
      if (!data?.items) return;
      const items: BOQItemFull[] = data.items;
      setBoqItems(items);
      if (data.project?.name) setReportTitle(`Specifications — ${data.project.name}`);
      const codes = [...new Set(items.map(getCode).filter((c) => /^(RJ|MR)/i.test(c)))];
      if (codes.length > 0) {
        const r = await fetch(`/api/item-specs?codes=${codes.join(",")}`);
        const specs: ItemSpec[] = await r.json();
        const m = new Map<string, ItemSpec>();
        for (const s of specs) m.set(s.Item_Code.toUpperCase(), s);
        setItemSpecs(m);
      }
      setView("report");
    } finally {
      setLoading(false);
    }
  }, [boqId]);

  const specItems = boqItems
    .map((item, idx) => ({ item, idx, spec: itemSpecs.get(getCode(item)) }))
    .filter((x): x is { item: BOQItemFull; idx: number; spec: ItemSpec } => x.spec !== undefined);

  function toggle(key: string) {
    setExpanded((p) => ({ ...p, [key]: !(p[key] !== false) }));
  }

  function handlePrint() {
    const html = buildPrintHTML(specItems, reportTitle);
    const pw = window.open("", "_blank", "width=900,height=700");
    if (!pw) { alert("Allow pop-ups for this site."); return; }
    pw.document.write(html);
    pw.document.close();
    pw.onload = () => { setTimeout(() => { pw.print(); pw.close(); }, 600); };
    setTimeout(() => { if (!pw.closed) { pw.print(); pw.close(); } }, 3500);
  }

  // ── Selector view ─────────────────────────────────────────────────────────

  if (view === "selector") return (
    <div className="min-h-[calc(100vh-5rem)]">
      <div className="max-w-2xl mx-auto pt-8 pb-16">

        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Link href="/dashboard/dtp" className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Detailed Specifications</h1>
          <p className="text-slate-500">Load a Civil BOQ to generate item-wise DTP specifications.</p>
          <div className="mt-4 flex items-center justify-center gap-4">
            <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow border border-slate-100 text-sm font-semibold text-slate-700">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              DTP Section
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Select Project</label>
            <div className="relative flex items-center rounded-2xl border border-slate-200 bg-white focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
              <Search className="w-4 h-4 text-slate-400 ml-4 shrink-0" />
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full bg-transparent border-0 px-4 py-3.5 text-slate-900 focus:outline-none text-sm"
              >
                <option value="">— Select Project —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.projectNo} — {p.name}</option>)}
              </select>
            </div>
          </div>

          {boqList.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Select Civil BOQ</label>
              <div className="relative flex items-center rounded-2xl border border-slate-200 bg-white focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                <Search className="w-4 h-4 text-slate-400 ml-4 shrink-0" />
                <select
                  value={boqId}
                  onChange={(e) => setBoqId(e.target.value)}
                  className="w-full bg-transparent border-0 px-4 py-3.5 text-slate-900 focus:outline-none text-sm"
                >
                  <option value="">— Select BOQ —</option>
                  {boqList.map((b) => <option key={b.id} value={b.id}>{b.boqNo} — {b.name}</option>)}
                </select>
              </div>
            </div>
          )}

          <button
            onClick={loadItems}
            disabled={!boqId || loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg hover:shadow-xl hover:-translate-y-px"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Loading Specifications…" : "Load Specifications"}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Report view ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-[calc(100vh-5rem)]">
      {/* Sticky header — same as item spec page */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => { setView("selector"); setBoqItems([]); setItemSpecs(new Map()); }}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Selection
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-1.5">
            {specItems.length} Items
          </span>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl px-4 py-2 bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors shadow"
          >
            <Printer className="w-4 h-4" /> Print / PDF
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Report header banner — same as item spec report view */}
        <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-200">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-8 py-12 text-center">
            <h2 className="text-3xl font-extrabold text-white">{reportTitle}</h2>
            <p className="mt-2 text-slate-300">Detail Item Specification</p>
          </div>
        </div>

        {specItems.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/40 px-8 py-16 text-center">
            <Search className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-600">No specifications found</h3>
            <p className="mt-1 text-sm text-slate-400">
              Ensure RJ/MR item codes are set on BOQ items and specifications are seeded in the{" "}
              <Link href="/dashboard/specifications" className="text-indigo-600 underline">Specifications</Link> tool.
            </p>
          </div>
        ) : (
          specItems.map(({ item, idx, spec }) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden">
              {/* Item header — same grid as item spec report */}
              <div className="grid grid-cols-12 border-b border-slate-100">
                <div className="col-span-2 flex flex-col justify-center gap-1 px-5 py-4 border-r border-slate-100 bg-slate-50">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Item No: {idx + 1}</span>
                  <span className="font-mono text-base font-extrabold text-slate-900">{spec.Item_Code}</span>
                </div>
                <div className="col-span-10 px-5 py-4">
                  <div className="text-sm text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: spec.Description }} />
                </div>
              </div>

              {/* Sections — same collapsible colored cards as item spec */}
              <div className="px-5 py-4 bg-slate-50/50 space-y-3">
                {(spec.sections ?? []).map((sec, sidx) => {
                  const key = `${spec.Item_Code}-sec-${sidx}`;
                  const isOpen = expanded[key] !== false;
                  const c = getSectionColors(sec.title);
                  const initial = sec.title?.charAt(0)?.toUpperCase() ?? "S";

                  return (
                    <div key={sidx} className={`border ${c.border} rounded-xl overflow-hidden`}>
                      <button
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-all ${isOpen ? c.header : ""}`}
                        onClick={() => toggle(key)}
                      >
                        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${c.bg} text-white text-xs font-bold`}>
                          {initial}
                        </span>
                        <span className="flex-1 font-bold text-slate-800 text-sm">{sec.title || `Section ${sidx + 1}`}</span>
                        <svg className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="m19 9-7 7-7-7" />
                        </svg>
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 pt-2">
                          {sec.description && (
                            <div
                              className="text-sm text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-100"
                              dangerouslySetInnerHTML={{ __html: sec.description }}
                            />
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
          ))
        )}
      </div>
    </div>
  );
}
