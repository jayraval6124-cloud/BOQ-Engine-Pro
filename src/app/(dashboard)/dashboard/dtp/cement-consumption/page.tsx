"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Printer, ArrowLeft, RefreshCw, X } from "lucide-react";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProjectOption { id: string; name: string; projectNo: string; }
interface BOQOption     { id: string; name: string; subWork: string; boqNo: string; }

interface BOQItemRaw {
  id: string;
  gsrtcCode:   string | null;
  itemCode:    string | null;
  description: string;
  quantity:    number | string;
  unit:        string;
  sortOrder?:  number;
  sorItem?: { itemCode: string; cementConsumption: string | number | null } | null;
}

interface CementRow {
  id:          string;
  srNo:        number;
  gsrtcCode:   string;          // "-" when null
  description: string;
  qty:         number;
  unit:        string;
  rate:        string;          // editable, pre-filled from SOR
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtNum(n: number, dec = 2): string {
  return n.toLocaleString("en-IN", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

// ── Styles ────────────────────────────────────────────────────────────────────

const FONT = '"Times New Roman", Times, serif';

const TH: React.CSSProperties = {
  border: "1px solid #000", padding: "3px 4px", fontWeight: "bold",
  fontSize: 9, textAlign: "center", verticalAlign: "middle", background: "#f5f5f5",
};
const TD: React.CSSProperties  = { border: "1px solid #000", padding: "2px 4px", fontSize: 8.5, verticalAlign: "top" };
const TDc: React.CSSProperties = { ...TD, textAlign: "center", verticalAlign: "middle" };
const TDr: React.CSSProperties = { ...TD, textAlign: "right",  verticalAlign: "middle" };

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
  padding: "28px 36px", boxSizing: "border-box",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CementConsumptionPage() {
  const [nameOfWork, setNameOfWork] = useState("");
  const [projectId,  setProjectId]  = useState("");
  const [boqId,      setBoqId]      = useState("");
  const [projects,   setProjects]   = useState<ProjectOption[]>([]);
  const [boqList,    setBoqList]    = useState<BOQOption[]>([]);
  const [loading,    setLoading]    = useState(false);

  const [rows,    setRows]    = useState<CementRow[]>([]);
  const [rates,   setRates]   = useState<Record<string, string>>({});
  const [loaded,  setLoaded]  = useState(false);  // true once any load has completed

  // Load projects
  useEffect(() => {
    fetch("/api/projects?limit=100")
      .then((r) => r.json())
      .then((d) => setProjects(Array.isArray(d.projects) ? d.projects : []))
      .catch(() => {});
  }, []);

  // Load Civil BOQs on project change
  useEffect(() => {
    if (!projectId) { setBoqList([]); setBoqId(""); return; }
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
  }, [projectId]);

  const loadItems = useCallback(async () => {
    if (!boqId) return;
    setLoading(true);
    setRows([]);
    setLoaded(false);
    try {
      const res = await fetch(`/api/boq/${boqId}`);
      if (!res.ok) return;
      const text = await res.text();
      if (!text) return;
      const data = JSON.parse(text);
      if (!data.items) return;

      const rawItems: BOQItemRaw[] = data.items;

      // Exclude steel items; show all other BOQ items with editable cement rate
      const STEEL_CODES = ["RJ080", "RJ081", "RJ082"];
      const filtered = rawItems.filter((item) => {
        const code = (item.gsrtcCode ?? item.sorItem?.itemCode ?? item.itemCode ?? "").toUpperCase().trim();
        return !STEEL_CODES.includes(code);
      });

      const built: CementRow[] = filtered.map((item, idx) => ({
        id:          item.id,
        srNo:        idx + 1,
        gsrtcCode:   item.gsrtcCode?.trim() || item.sorItem?.itemCode?.trim() || "-",
        description: item.description,
        qty:         parseFloat(String(item.quantity)) || 0,
        unit:        item.unit,
        rate:        String(parseFloat(String(item.sorItem?.cementConsumption ?? 0)) || ""),
      }));

      setRows(built);
      const initRates: Record<string, string> = {};
      built.forEach((r) => { initRates[r.id] = r.rate; });
      setRates(initRates);
      if (!nameOfWork && data.project?.name) setNameOfWork(data.project.name);
    } finally {
      setLoaded(true);
      setLoading(false);
    }
  }, [boqId, nameOfWork]);

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    setRates((prev) => { const n = { ...prev }; delete n[id]; return n; });
  };

  const setRate = (id: string, val: string) => setRates((prev) => ({ ...prev, [id]: val }));

  // ── Totals ─────────────────────────────────────────────────────────────────

  const { totalKg, totalMT } = useMemo(() => {
    const kg = rows.reduce((sum, row) => {
      const rate = parseFloat(rates[row.id] || "0");
      return sum + (isNaN(rate) ? 0 : row.qty * rate);
    }, 0);
    return { totalKg: kg, totalMT: kg / 1000 };
  }, [rows, rates]);

  // ── Print ──────────────────────────────────────────────────────────────────

  const handlePrint = () => {
    const el = document.getElementById("cement-a4");
    if (!el) return;
    const pw = window.open("", "_blank", "width=900,height=700");
    if (!pw) { alert("Please allow pop-ups for this site."); return; }
    pw.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Cement Consumption</title>
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
            <h1 className="text-base font-bold text-slate-800">Cement Consumption</h1>
            <p className="text-xs text-slate-400">As per GSRTC Code · District SOR</p>
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

        {loaded && rows.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            No items found in this BOQ.
          </div>
        )}

        {loaded && rows.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            Enter cement consumption rate (kg per unit) in the Rate column. Use × to remove items that don&apos;t use cement.
          </div>
        )}


        {loaded && rows.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Total Cement (KG)</span>
              <span className="font-semibold text-slate-800">{fmtNum(totalKg)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Cement (MT)</span>
              <span className="font-semibold text-slate-800">{fmtNum(totalMT, 3)}</span>
            </div>
          </div>
        )}

        {loaded && (
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print / Save PDF
          </button>
        )}
      </div>

      {/* ── RIGHT: A4 Preview ── */}
      <div className="flex-1 overflow-auto bg-slate-100 rounded-xl p-4">
        <div id="cement-a4" style={PAGE}>

          {/* Header */}
          <div style={{ fontSize: 10, marginBottom: 10 }}>
            <strong>Name of Work :-</strong>{" "}
            {nameOfWork || <span style={{ fontStyle: "italic", color: "#aaa" }}>Name of Work will appear here…</span>}
          </div>

          {/* Title */}
          <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 12, letterSpacing: 0.5, marginBottom: 8 }}>
            REQUIREMENT OF CEMENT
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "6%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "40%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "14%" }} />
            </colgroup>
            <thead>
              <tr>
                <th style={TH}>Sr.<br />No.</th>
                <th style={TH}>Item<br />Code</th>
                <th style={TH}>Description of Item</th>
                <th style={{ ...TH, textAlign: "right" }}>Qty</th>
                <th style={TH}>Per</th>
                <th style={TH}>Rate of Cement<br />Consumption<br />(In KG)</th>
                <th style={TH}>Total Amount<br />of Cement<br />(In KG)</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{
                    ...TDc, padding: "10px 4px",
                    fontWeight: loaded ? "bold" : "normal",
                    fontStyle: loaded ? "normal" : "italic",
                    color: loaded ? "#000" : "#aaa",
                    fontSize: loaded ? 9 : 8.5,
                  }}>
                    {loading ? "Loading…"
                      : loaded ? "There is No Cement Item in BOQ"
                      : !projectId ? "Select a project to begin."
                      : !boqId ? "Select a Civil BOQ."
                      : "Click ‘Load from BOQ’ to load items."}
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => {
                  const rate  = parseFloat(rates[row.id] || "0");
                  const total = isNaN(rate) ? 0 : row.qty * rate;
                  return (
                    <tr key={row.id}>
                      <td style={TDc}>{idx + 1}</td>
                      <td style={TDc}>{row.gsrtcCode}</td>
                      <td style={{ ...TD, lineHeight: 1.3, fontSize: 8 }}>{row.description}</td>
                      <td style={TDr}>{fmtNum(row.qty, 3)}</td>
                      <td style={TDc}>{row.unit}</td>
                      <td style={TDr}>
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={rates[row.id] ?? ""}
                          onChange={(e) => setRate(row.id, e.target.value)}
                          style={{
                            width: "100%", textAlign: "right", fontSize: 8.5,
                            border: "1px solid #d1d5db", borderRadius: 3,
                            padding: "1px 3px", background: "#fffef0",
                          }}
                        />
                      </td>
                      <td style={TDr}>{total > 0 ? fmtNum(total) : ""}</td>
                      <td className="no-print" style={{ width: 18, border: "none", padding: 0, verticalAlign: "middle" }}>
                        <button
                          onClick={() => removeRow(row.id)}
                          title="Remove row"
                          style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: "0 2px" }}
                        >
                          <X size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}

              <tr>
                <td colSpan={5} style={{ ...TD, fontWeight: "bold", textAlign: "right", fontSize: 8.5 }}>
                  Total Required Cement In Kg. :-
                </td>
                <td colSpan={2} style={{ ...TDr, fontWeight: "bold" }}>
                  {loaded ? (totalKg > 0 ? fmtNum(totalKg) : "-") : ""}
                </td>
              </tr>
              <tr>
                <td colSpan={5} style={{ ...TD, fontWeight: "bold", textAlign: "right", fontSize: 8.5 }}>
                  Total Required Cement In M.T. :-
                </td>
                <td colSpan={2} style={{ ...TDr, fontWeight: "bold" }}>
                  {loaded ? (totalMT > 0 ? fmtNum(totalMT, 3) : "-") : ""}
                </td>
              </tr>
            </tbody>
          </table>

        </div>
      </div>
    </div>
  );
}
