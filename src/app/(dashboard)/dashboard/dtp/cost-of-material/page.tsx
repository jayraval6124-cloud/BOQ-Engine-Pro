"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Printer, ArrowLeft, RefreshCw, X } from "lucide-react";
import Link from "next/link";

// ── Constants ─────────────────────────────────────────────────────────────────

const STEEL_CODES = ["RJ080", "RJ081", "RJ082"];

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProjectOption { id: string; name: string; projectNo: string; sorDivision: string; sorYear: string; }
interface BOQOption     { id: string; name: string; subWork: string; boqNo: string; }
interface SORLookup    { rate: string | number; unit: string; description: string; }

interface BOQItemRaw {
  id: string;
  gsrtcCode:   string | null;
  itemCode:    string | null;
  description: string;
  quantity:    number | string;
  unit:        string;
  rate:        number | string;
  sortOrder?:  number;
  sorItem?: { itemCode: string; cementConsumption: string | number | null; materialDescription: string | null; sandRatio: string | number | null; aggregateRatio: string | number | null; } | null;
}

interface MatRow {
  id:          string;
  itemCode:    string;
  tenderItemNo: string;
  details:     string;
  qty:         string;
  rate:        string;
  unit:        string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtNum(n: number, dec = 2): string {
  return n.toLocaleString("en-IN", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function parseN(s: string | number): number {
  const n = parseFloat(String(s).replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

function rowAmount(qty: string, rate: string): number {
  return parseN(qty) * parseN(rate);
}

// ── Styles ────────────────────────────────────────────────────────────────────

const FONT = '"Times New Roman", Times, serif';
const TH: React.CSSProperties  = { border: "1px solid #000", padding: "3px 4px", fontWeight: "bold", fontSize: 9, textAlign: "center", verticalAlign: "middle", background: "#f5f5f5" };
const TD: React.CSSProperties  = { border: "1px solid #000", padding: "2px 4px", fontSize: 8.5, verticalAlign: "top" };
const TDc: React.CSSProperties = { ...TD, textAlign: "center", verticalAlign: "middle" };
const TDr: React.CSSProperties = { ...TD, textAlign: "right",  verticalAlign: "middle" };

const EDITABLE: React.CSSProperties = {
  width: "100%", textAlign: "right", fontSize: 8.5,
  border: "1px solid #d1d5db", borderRadius: 3,
  padding: "1px 3px", background: "#fffef0",
};

const PRINT_STYLE = `
  @page { size: A4 portrait; margin: 10mm 12mm; }
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: white;
    font-family: "Times New Roman", Times, serif;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid #000; }
  input { border: none !important; background: transparent !important;
    padding: 0 !important; font: inherit; text-align: right; width: 100%; outline: none; }
  .no-print { display: none !important; }
`;

const PAGE: React.CSSProperties = {
  width: 760, background: "#fff", fontFamily: FONT,
  padding: "26px 34px", boxSizing: "border-box",
};

// ── Editable cell ─────────────────────────────────────────────────────────────

function EditCell({ value, onChange, placeholder = "0" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="number"
      min="0"
      step="0.01"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={EDITABLE}
      placeholder={placeholder}
    />
  );
}

// ── Section table ─────────────────────────────────────────────────────────────

interface SectionTableProps {
  title: string;
  rows: MatRow[];
  onQtyChange?: (id: string, v: string) => void;
  onRateChange?: (id: string, v: string) => void;
  onRemove?: (id: string) => void;
  fixedIds?: string[];   // ids that cannot be removed
  totalAmt: number;
  loaded: boolean;
  loading: boolean;
}

function SectionTable({ title, rows, onQtyChange, onRateChange, onRemove, fixedIds = [], totalAmt, loaded, loading }: SectionTableProps) {
  const sayAmt = Math.ceil(totalAmt);

  return (
    <>
      <div style={{ fontWeight: "bold", fontSize: 9.5, marginBottom: 4 }}>{title}</div>
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", marginBottom: 2 }}>
        <colgroup>
          <col style={{ width: "5%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "33%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "10%" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={TH}>Sr.<br />No.</th>
            <th style={TH}>Item<br />Code</th>
            <th style={TH}>Tender<br />Item No.</th>
            <th style={TH}>Details of Material</th>
            <th style={{ ...TH, textAlign: "right" }}>Qty.</th>
            <th style={{ ...TH, textAlign: "right" }}>Input Rate</th>
            <th style={TH}>Per</th>
            <th style={{ ...TH, textAlign: "right" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ ...TDc, padding: "10px 4px", fontStyle: "italic", color: "#aaa", fontSize: 8 }}>
                {loading ? "Loading…" : loaded ? "No items found." : "Load BOQ to populate."}
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => {
              const amt = rowAmount(row.qty, row.rate);
              return (
                <tr key={row.id}>
                  <td style={TDc}>{idx + 1}</td>
                  <td style={TDc}>{row.itemCode || "-"}</td>
                  <td style={TDc}>{row.tenderItemNo}</td>
                  <td style={{ ...TD, lineHeight: 1.3, fontSize: 8 }}>{row.details}</td>
                  <td style={TDr}>
                    {onQtyChange
                      ? <EditCell value={row.qty} onChange={(v) => onQtyChange(row.id, v)} />
                      : fmtNum(parseN(row.qty), 3)}
                  </td>
                  <td style={TDr}>
                    {onRateChange
                      ? <EditCell value={row.rate} onChange={(v) => onRateChange(row.id, v)} />
                      : fmtNum(parseN(row.rate))}
                  </td>
                  <td style={TDc}>{row.unit}</td>
                  <td style={TDr}>{amt > 0 ? fmtNum(amt) : ""}</td>
                  {onRemove && !fixedIds.includes(row.id) && (
                    <td className="no-print" style={{ width: 18, border: "none", padding: 0, verticalAlign: "middle" }}>
                      <button
                        onClick={() => onRemove(row.id)}
                        style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: "0 2px" }}
                      >
                        <X size={12} />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })
          )}

          <tr>
            <td colSpan={6} style={{ ...TD, fontWeight: "bold", textAlign: "right", fontSize: 8.5 }}>Total Rs. :-</td>
            <td colSpan={2} style={{ ...TDr, fontWeight: "bold" }}>{loaded && totalAmt > 0 ? fmtNum(totalAmt) : ""}</td>
          </tr>
          <tr>
            <td colSpan={6} style={{ ...TD, fontWeight: "bold", textAlign: "right", fontSize: 8.5 }}>Say Rs. :-</td>
            <td colSpan={2} style={{ ...TDr, fontWeight: "bold" }}>{loaded && sayAmt > 0 ? fmtNum(sayAmt, 0) : ""}</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CostOfMaterialPage() {
  const [nameOfWork, setNameOfWork] = useState("");
  const [projectId,  setProjectId]  = useState("");
  const [boqId,      setBoqId]      = useState("");
  const [projects,   setProjects]   = useState<ProjectOption[]>([]);
  const [boqList,    setBoqList]    = useState<BOQOption[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [loaded,     setLoaded]     = useState(false);

  // Section A — Cement & Steel (fixed rows, fully editable)
  const [secA, setSecA] = useState<MatRow[]>([
    { id: "cement", itemCode: "-",    tenderItemNo: "Various",  details: "Cement",    qty: "", rate: "", unit: "M.T." },
    { id: "steel",  itemCode: "-",    tenderItemNo: "-",        details: "TMT Steel", qty: "", rate: "", unit: "M.T." },
  ]);

  // Section B — Sand + Aggregate (fixed) + BOQ material items
  const [secBFixed, setSecBFixed] = useState<MatRow[]>([
    { id: "sand", itemCode: "M158", tenderItemNo: "As Per Statement-1", details: "Sand",      qty: "", rate: "", unit: "CMT" },
    { id: "agg",  itemCode: "M176", tenderItemNo: "As Per Statement-1", details: "Aggregate", qty: "", rate: "", unit: "CMT" },
  ]);
  const [secBItems,    setSecBItems]    = useState<MatRow[]>([]);
  const [secBItemRates, setSecBItemRates] = useState<Record<string, string>>({});

  // Load projects
  useEffect(() => {
    fetch("/api/projects?limit=100")
      .then((r) => r.json())
      .then((d) => setProjects(Array.isArray(d.projects) ? d.projects : []))
      .catch(() => {});
  }, []);

  // Load Civil BOQs on project change
  useEffect(() => {
    if (!projectId) { setBoqList([]); setBoqId(""); setLoaded(false); setSecBItems([]); return; }
    fetch(`/api/boq?projectId=${projectId}`)
      .then((r) => r.json())
      .then((data: BOQOption[]) => {
        const civil = Array.isArray(data)
          ? data.filter((b) => !b.subWork || b.subWork === "Civil")
          : [];
        setBoqList(civil);
        setBoqId(civil.length === 1 ? civil[0].id : "");
      })
      .catch(() => {});

    // Look up Sand (M158) and Aggregate (M176) rates directly from SOR
    const proj = projects.find((p) => p.id === projectId);
    if (proj?.sorDivision && proj?.sorYear) {
      const div = encodeURIComponent(proj.sorDivision);
      const yr  = encodeURIComponent(proj.sorYear);
      Promise.all([
        fetch(`/api/sor/lookup?code=M158&division=${div}&year=${yr}`).then((r) => r.json() as Promise<SORLookup | null>),
        fetch(`/api/sor/lookup?code=M176&division=${div}&year=${yr}`).then((r) => r.json() as Promise<SORLookup | null>),
      ]).then(([sandItem, aggItem]) => {
        setSecBFixed((prev) => prev.map((row) => ({
          ...row,
          rate: row.id === "sand" && sandItem?.rate ? String(Number(sandItem.rate)) :
                row.id === "agg"  && aggItem?.rate  ? String(Number(aggItem.rate))  : row.rate,
          unit: row.id === "sand" && sandItem?.unit ? sandItem.unit :
                row.id === "agg"  && aggItem?.unit  ? aggItem.unit  : row.unit,
        })));
      }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const loadItems = useCallback(async () => {
    if (!boqId) return;
    setLoading(true);
    setLoaded(false);
    setSecBItems([]);
    try {
      const res = await fetch(`/api/boq/${boqId}`);
      if (!res.ok) return;
      const text = await res.text();
      if (!text) return;
      const data = JSON.parse(text);
      if (!data.items) return;

      const rawItems: BOQItemRaw[] = data.items;

      // Material items = no cement consumption in SOR AND not a steel code
      const matItems = rawItems.filter((item) => {
        const code = (item.gsrtcCode ?? item.itemCode ?? "").toUpperCase().trim();
        if (STEEL_CODES.includes(code)) return false;
        const cc = item.sorItem?.cementConsumption;
        if (cc !== null && cc !== undefined && cc !== "") {
          const n = parseFloat(String(cc));
          if (!isNaN(n) && n > 0) return false;
        }
        return true;
      });

      const built: MatRow[] = matItems.map((item, idx) => ({
        id:           item.id,
        itemCode:     (item.gsrtcCode ?? item.sorItem?.itemCode ?? item.itemCode ?? "-").trim(),
        tenderItemNo: String(idx + 1),
        details:      item.sorItem?.materialDescription || item.description,
        qty:          String(parseFloat(String(item.quantity)) || ""),
        rate:         String(parseFloat(String(item.rate)) || ""),
        unit:         item.unit,
      }));

      setSecBItems(built);
      const initRates: Record<string, string> = {};
      built.forEach((r) => { initRates[r.id] = r.rate; });
      setSecBItemRates(initRates);

      // Auto-calculate sand + aggregate totals from BOQ qty × SOR ratios (Statement-1 logic)
      let totalSandCMT = 0;
      let totalAggCMT  = 0;
      for (const item of rawItems) {
        const qty  = parseFloat(String(item.quantity)) || 0;
        const sand = parseFloat(String(item.sorItem?.sandRatio ?? 0)) || 0;
        const agg  = parseFloat(String(item.sorItem?.aggregateRatio ?? 0)) || 0;
        totalSandCMT += qty * sand;
        totalAggCMT  += qty * agg;
      }
      if (totalSandCMT > 0 || totalAggCMT > 0) {
        setSecBFixed((prev) => prev.map((row) => ({
          ...row,
          qty: row.id === "sand" ? String(parseFloat(totalSandCMT.toFixed(3))) :
               row.id === "agg"  ? String(parseFloat(totalAggCMT.toFixed(3)))  : row.qty,
        })));
      }

      if (!nameOfWork && data.project?.name) setNameOfWork(data.project.name);

      // Update Steel tender item no from BOQ
      const steelItem = rawItems.find((i) => {
        const code = (i.gsrtcCode ?? i.itemCode ?? "").toUpperCase().trim();
        return STEEL_CODES.includes(code);
      });
      if (steelItem) {
        setSecA((prev) => prev.map((row) =>
          row.id === "steel" ? { ...row, tenderItemNo: steelItem.gsrtcCode || "-" } : row,
        ));
      }
    } finally {
      setLoaded(true);
      setLoading(false);
    }
  }, [boqId, nameOfWork]);

  // Section A mutators
  const updateSecA = (id: string, field: "qty" | "rate", val: string) =>
    setSecA((prev) => prev.map((r) => r.id === id ? { ...r, [field]: val } : r));

  // Section B fixed mutators
  const updateSecBFixed = (id: string, field: "qty" | "rate", val: string) =>
    setSecBFixed((prev) => prev.map((r) => r.id === id ? { ...r, [field]: val } : r));

  // Section B item rate mutator
  const updateItemRate = (id: string, val: string) =>
    setSecBItemRates((prev) => ({ ...prev, [id]: val }));

  const removeSecBItem = (id: string) => {
    setSecBItems((prev) => prev.filter((r) => r.id !== id));
    setSecBItemRates((prev) => { const n = { ...prev }; delete n[id]; return n; });
  };

  // ── Totals ─────────────────────────────────────────────────────────────────

  const totalA = useMemo(
    () => secA.reduce((s, r) => s + rowAmount(r.qty, r.rate), 0),
    [secA],
  );

  const totalB = useMemo(() => {
    const fixedAmt = secBFixed.reduce((s, r) => s + rowAmount(r.qty, r.rate), 0);
    const itemsAmt = secBItems.reduce((s, r) => s + rowAmount(r.qty, secBItemRates[r.id] ?? r.rate), 0);
    return fixedAmt + itemsAmt;
  }, [secBFixed, secBItems, secBItemRates]);

  // Build merged Section B rows for the table (fixed rows first, then items)
  const secBMerged: MatRow[] = [
    ...secBFixed,
    ...secBItems.map((r) => ({ ...r, rate: secBItemRates[r.id] ?? r.rate })),
  ];

  // ── Print ──────────────────────────────────────────────────────────────────

  const handlePrint = () => {
    const el = document.getElementById("cost-material-a4");
    if (!el) return;
    const pw = window.open("", "_blank", "width=900,height=700");
    if (!pw) { alert("Please allow pop-ups for this site."); return; }
    pw.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Cost of Material</title>
<style>${PRINT_STYLE}</style></head>
<body>${el.innerHTML}</body></html>`);
    pw.document.close();
    pw.onload = () => { setTimeout(() => { pw.print(); pw.close(); }, 500); };
    setTimeout(() => { if (!pw.closed) { pw.print(); pw.close(); } }, 2500);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex gap-6" style={{ height: "calc(100vh - 80px)" }}>

      {/* ── LEFT ── */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-4 overflow-y-auto pb-4">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/dtp" className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-slate-800">Cost Of Material</h1>
            <p className="text-xs text-slate-400">Civil BOQ · Division Rates</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Name of Work</p>
          <textarea
            rows={3}
            value={nameOfWork}
            onChange={(e) => setNameOfWork(e.target.value)}
            placeholder="Enter name of work…"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Load from BOQ</p>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Project</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">— Select Project —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.projectNo} — {p.name}</option>
              ))}
            </select>
          </div>

          {boqList.length > 0 && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">Civil BOQ</label>
              <select
                value={boqId}
                onChange={(e) => setBoqId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">— Select BOQ —</option>
                {boqList.map((b) => (
                  <option key={b.id} value={b.id}>{b.boqNo} — {b.name}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={loadItems}
            disabled={!boqId || loading}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Loading…" : "Load from BOQ"}
          </button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-1">
          <p className="font-semibold">How rates work:</p>
          <p>• Cement &amp; Steel — edit inline (SOR fixed rate)</p>
          <p>• Sand &amp; Aggregate — pre-filled from Division Basic Rate DB; edit if needed</p>
          <p>• Other BOQ items — rates from BOQ; editable inline</p>
          <p>• Remove non-material items with ×</p>
        </div>

        {loaded && (
          <>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Section A Total</span>
                <span className="font-semibold text-slate-800">₹{fmtNum(totalA)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Section B Total</span>
                <span className="font-semibold text-slate-800">₹{fmtNum(totalB)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2 mt-1">
                <span className="font-semibold text-slate-700">Grand Total</span>
                <span className="font-bold text-slate-900">₹{fmtNum(totalA + totalB)}</span>
              </div>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>
          </>
        )}
      </div>

      {/* ── RIGHT: A4 Preview ── */}
      <div className="flex-1 overflow-auto bg-slate-100 rounded-xl p-4">
        <div id="cost-material-a4" style={PAGE}>

          {/* Header */}
          <div style={{ fontSize: 10, marginBottom: 8 }}>
            <strong>Name of Work :-</strong>{" "}
            {nameOfWork || <span style={{ fontStyle: "italic", color: "#aaa" }}>Name of Work will appear here…</span>}
          </div>

          {/* Main title */}
          <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 12, letterSpacing: 0.5, marginBottom: 10 }}>
            Cost of Materials
          </div>

          {/* ── Section A ── */}
          <SectionTable
            title="A :- Cost Of Steel, Cement &amp; Asphalt"
            rows={secA}
            onQtyChange={(id, v) => updateSecA(id, "qty", v)}
            onRateChange={(id, v) => updateSecA(id, "rate", v)}
            totalAmt={totalA}
            loaded={loaded}
            loading={loading}
          />

          <div style={{ marginBottom: 14 }} />

          {/* ── Section B ── */}
          <SectionTable
            title="B :- Material Other than Steel, Cement &amp; Asphalt"
            rows={secBMerged}
            onQtyChange={(id, v) => {
              if (id === "sand" || id === "agg") updateSecBFixed(id, "qty", v);
              // BOQ items qty is from BOQ, not editable here
            }}
            onRateChange={(id, v) => {
              if (id === "sand" || id === "agg") updateSecBFixed(id, "rate", v);
              else updateItemRate(id, v);
            }}
            onRemove={(id) => {
              if (id !== "sand" && id !== "agg") removeSecBItem(id);
            }}
            fixedIds={["sand", "agg"]}
            totalAmt={totalB}
            loaded={loaded}
            loading={loading}
          />

        </div>
      </div>
    </div>
  );
}
