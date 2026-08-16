"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Printer, ArrowLeft, RefreshCw, X } from "lucide-react";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────────

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
  sorItem?: {
    itemCode:      string;
    sandRatio:     string | number | null;
    aggregateRatio: string | number | null;
  } | null;
}

interface StatRow {
  id:          string;
  srNo:        number;
  itemCode:    string;
  description: string;
  qty:         number;
  unit:        string;
  sandRatio:   number;
  sandTotal:   number;
  aggRatio:    number;
  aggTotal:    number;
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

export default function Statement1Page() {
  const [nameOfWork, setNameOfWork] = useState("");
  const [projectId,  setProjectId]  = useState("");
  const [boqId,      setBoqId]      = useState("");
  const [projects,   setProjects]   = useState<ProjectOption[]>([]);
  const [boqList,    setBoqList]    = useState<BOQOption[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [rows,       setRows]       = useState<StatRow[]>([]);
  const [loaded,     setLoaded]     = useState(false);

  // Load projects
  useEffect(() => {
    fetch("/api/projects?limit=100")
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((d) => setProjects(Array.isArray(d.projects) ? d.projects : []))
      .catch(() => {});
  }, []);

  // Load BOQs on project change
  useEffect(() => {
    if (!projectId) { setBoqList([]); setBoqId(""); return; }
    fetch(`/api/boq?projectId=${projectId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
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
      let srNo = 1;
      const built: StatRow[] = rawItems.map((item) => {
        const qty      = parseFloat(String(item.quantity)) || 0;
        const sandRatio = parseFloat(String(item.sorItem?.sandRatio ?? 0)) || 0;
        const aggRatio  = parseFloat(String(item.sorItem?.aggregateRatio ?? 0)) || 0;
        return {
          id:          item.id,
          srNo:        srNo++,
          itemCode:    (item.gsrtcCode ?? item.sorItem?.itemCode ?? item.itemCode ?? "-").trim(),
          description: item.description,
          qty,
          unit:        item.unit,
          sandRatio,
          sandTotal:   qty * sandRatio,
          aggRatio,
          aggTotal:    qty * aggRatio,
        };
      });

      setRows(built);
      if (!nameOfWork && data.project?.name) setNameOfWork(data.project.name);
    } finally {
      setLoaded(true);
      setLoading(false);
    }
  }, [boqId, nameOfWork]);

  const removeRow = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  const { totalSand, totalAgg, hasRatios } = useMemo(() => ({
    totalSand: rows.reduce((s, r) => s + r.sandTotal, 0),
    totalAgg:  rows.reduce((s, r) => s + r.aggTotal,  0),
    hasRatios: rows.some((r) => r.sandRatio > 0 || r.aggRatio > 0),
  }), [rows]);

  const handlePrint = () => {
    const el = document.getElementById("stmt1-a4");
    if (!el) return;
    const pw = window.open("", "_blank", "width=900,height=700");
    if (!pw) { alert("Please allow pop-ups for this site."); return; }
    pw.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Statement-1</title>
<style>${PRINT_STYLE}</style></head>
<body>${el.innerHTML}</body></html>`);
    pw.document.close();
    pw.onload = () => { setTimeout(() => { pw.print(); pw.close(); }, 500); };
    setTimeout(() => { if (!pw.closed) { pw.print(); pw.close(); } }, 2500);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex gap-6" style={{ height: "calc(100vh - 80px)" }}>

      {/* ── LEFT PANEL ── */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-4 overflow-y-auto pb-4">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/dtp" className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-slate-800">Statement-1</h1>
            <p className="text-xs text-slate-400">Quarry Materials · Sand &amp; Aggregate</p>
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

        {loaded && !hasRatios && rows.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            Sand/Aggregate ratios are not in SOR yet. Import SOR data for this division to auto-fill ratios.
          </div>
        )}

        {loaded && rows.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2 text-xs">
            <p className="font-semibold text-slate-600 uppercase tracking-wide mb-1">Totals</p>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Sand (CMT)</span>
              <span className="font-bold text-slate-800">{fmtNum(totalSand, 3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Aggregate (CMT)</span>
              <span className="font-bold text-slate-800">{fmtNum(totalAgg, 3)}</span>
            </div>
          </div>
        )}

        {rows.length > 0 && (
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print / Export
          </button>
        )}
      </div>

      {/* ── RIGHT: A4 PREVIEW ── */}
      <div className="flex-1 overflow-auto bg-slate-100 rounded-xl p-4">
        {rows.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
            Select a BOQ and click &quot;Load from BOQ&quot; to preview Statement-1.
          </div>
        ) : (
          <div id="stmt1-a4" style={PAGE}>

            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: "bold" }}>G.S.R.T.C. Central Office Ranip, Ahmedabad</div>
              <div style={{ fontSize: 9, marginTop: 4 }}>
                <strong>Name of Work :-</strong>&nbsp;{nameOfWork || "—"}
              </div>
            </div>

            <div style={{ textAlign: "center", marginBottom: 6 }}>
              <div style={{ fontSize: 11, fontWeight: "bold", textDecoration: "underline" }}>STATEMENT [1]</div>
              <div style={{ fontSize: 9.5, fontWeight: "bold", marginTop: 2 }}>
                STATEMENT OF ITEMWISE Quarry Materials
              </div>
            </div>

            {/* Table */}
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <colgroup>
                <col style={{ width: "5%" }}  />
                <col style={{ width: "9%" }}  />
                <col style={{ width: "32%" }} />
                <col style={{ width: "7%" }}  />
                <col style={{ width: "6%" }}  />
                {/* Sand */}
                <col style={{ width: "8%" }}  />
                <col style={{ width: "10%" }} />
                {/* Aggregate */}
                <col style={{ width: "8%" }}  />
                <col style={{ width: "10%" }} />
                <col style={{ width: "5%" }}  />
              </colgroup>
              <thead>
                <tr>
                  <th style={TH} rowSpan={2}>Item<br/>No.</th>
                  <th style={TH} rowSpan={2}>Item<br/>Code</th>
                  <th style={TH} rowSpan={2}>Description of Item</th>
                  <th style={TH} rowSpan={2}>Qty</th>
                  <th style={TH} rowSpan={2}>Per</th>
                  <th style={{ ...TH, background: "#e8f4fd" }} colSpan={2}>Sand</th>
                  <th style={{ ...TH, background: "#fef9e8" }} colSpan={2}>Kapchi / Aggregate</th>
                  <th style={{ ...TH }} className="no-print">×</th>
                </tr>
                <tr>
                  <th style={{ ...TH, background: "#e8f4fd" }}>Std.<br/>Ratio</th>
                  <th style={{ ...TH, background: "#e8f4fd" }}>Total</th>
                  <th style={{ ...TH, background: "#fef9e8" }}>Std.<br/>Ratio</th>
                  <th style={{ ...TH, background: "#fef9e8" }}>Total</th>
                  <th style={TH} className="no-print"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td style={TDc}>{row.srNo}</td>
                    <td style={TDc}>{row.itemCode}</td>
                    <td style={TD}>{row.description}</td>
                    <td style={TDr}>{fmtNum(row.qty, 3)}</td>
                    <td style={TDc}>{row.unit}</td>
                    <td style={{ ...TDr, background: "#f0f9ff" }}>
                      {row.sandRatio > 0 ? fmtNum(row.sandRatio, 4) : "-"}
                    </td>
                    <td style={{ ...TDr, background: "#f0f9ff" }}>
                      {row.sandTotal > 0 ? fmtNum(row.sandTotal, 3) : "-"}
                    </td>
                    <td style={{ ...TDr, background: "#fffbeb" }}>
                      {row.aggRatio > 0 ? fmtNum(row.aggRatio, 4) : "-"}
                    </td>
                    <td style={{ ...TDr, background: "#fffbeb" }}>
                      {row.aggTotal > 0 ? fmtNum(row.aggTotal, 3) : "-"}
                    </td>
                    <td style={TDc} className="no-print">
                      <button onClick={() => removeRow(row.id)} style={{ color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                        <X size={12} />
                      </button>
                    </td>
                  </tr>
                ))}

                {/* Total row */}
                <tr>
                  <td style={{ ...TDc, fontWeight: "bold" }} colSpan={5}>
                    Total Qty :-
                  </td>
                  <td style={{ ...TDr, fontWeight: "bold", background: "#e0f2fe" }}></td>
                  <td style={{ ...TDr, fontWeight: "bold", background: "#e0f2fe" }}>
                    {fmtNum(totalSand, 3)}
                  </td>
                  <td style={{ ...TDr, fontWeight: "bold", background: "#fef3c7" }}></td>
                  <td style={{ ...TDr, fontWeight: "bold", background: "#fef3c7" }}>
                    {fmtNum(totalAgg, 3)}
                  </td>
                  <td style={TDc} className="no-print"></td>
                </tr>
                <tr>
                  <td style={{ ...TDc, fontWeight: "bold" }} colSpan={5}>
                    Unit Per :-
                  </td>
                  <td style={{ ...TDc, fontWeight: "bold", background: "#e0f2fe" }}></td>
                  <td style={{ ...TDc, fontWeight: "bold", background: "#e0f2fe" }}>CMT</td>
                  <td style={{ ...TDc, fontWeight: "bold", background: "#fef3c7" }}></td>
                  <td style={{ ...TDc, fontWeight: "bold", background: "#fef3c7" }}>CMT</td>
                  <td style={TDc} className="no-print"></td>
                </tr>
              </tbody>
            </table>

            {/* Footer note */}
            <div style={{ fontSize: 8, marginTop: 10, color: "#555" }}>
              Note: Sand and Aggregate quantities derived from BOQ quantities multiplied by SOR standard ratios.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
