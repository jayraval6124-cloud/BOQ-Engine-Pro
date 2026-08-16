"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Printer, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";

// ── Constants ─────────────────────────────────────────────────────────────────

const STEEL_CODES = ["RJ080", "RJ081", "RJ082"];

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
}

interface SteelRow {
  id:          string;
  gsrtcCode:   string;
  description: string;
  qty:         number;
  unit:        string;
  qtyMT:       number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtNum(n: number, dec = 3): string {
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
`;

const PAGE: React.CSSProperties = {
  width: 760, background: "#fff", fontFamily: FONT,
  padding: "28px 36px", boxSizing: "border-box",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SteelConsumptionPage() {
  const [nameOfWork, setNameOfWork] = useState("");
  const [projectId,  setProjectId]  = useState("");
  const [boqId,      setBoqId]      = useState("");
  const [projects,   setProjects]   = useState<ProjectOption[]>([]);
  const [boqList,    setBoqList]    = useState<BOQOption[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [loaded,     setLoaded]     = useState(false);
  const [rows,       setRows]       = useState<SteelRow[]>([]);

  // Load projects
  useEffect(() => {
    fetch("/api/projects?limit=100")
      .then((r) => r.json())
      .then((d) => setProjects(Array.isArray(d.projects) ? d.projects : []))
      .catch(() => {});
  }, []);

  // Load Civil BOQs on project change
  useEffect(() => {
    if (!projectId) { setBoqList([]); setBoqId(""); setLoaded(false); setRows([]); return; }
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

      // Keep only items whose GSRTC code matches one of the steel codes
      const filtered = rawItems.filter((item) => {
        const code = (item.gsrtcCode ?? item.itemCode ?? "").toUpperCase().trim();
        return STEEL_CODES.includes(code);
      });

      const built: SteelRow[] = filtered.map((item) => {
        const qty = parseFloat(String(item.quantity)) || 0;
        return {
          id:          item.id,
          gsrtcCode:   (item.gsrtcCode ?? item.itemCode ?? "-").trim(),
          description: item.description,
          qty,
          unit:        item.unit,
          qtyMT:       qty / 1000,
        };
      });

      setRows(built);
      if (!nameOfWork && data.project?.name) setNameOfWork(data.project.name);
    } finally {
      setLoaded(true);
      setLoading(false);
    }
  }, [boqId, nameOfWork]);

  // ── Total ──────────────────────────────────────────────────────────────────

  const totalMT = useMemo(
    () => rows.reduce((sum, r) => sum + r.qtyMT, 0),
    [rows],
  );

  // ── Print ──────────────────────────────────────────────────────────────────

  const handlePrint = () => {
    const el = document.getElementById("steel-a4");
    if (!el) return;
    const pw = window.open("", "_blank", "width=900,height=700");
    if (!pw) { alert("Please allow pop-ups for this site."); return; }
    pw.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Steel Consumption</title>
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
            <h1 className="text-base font-bold text-slate-800">Steel Consumption</h1>
            <p className="text-xs text-slate-400">RJ080 · RJ081 · RJ082 · Civil BOQ</p>
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

        {loaded && rows.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Total Steel (MT)</span>
              <span className="font-semibold text-slate-800">{fmtNum(totalMT)}</span>
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
        <div id="steel-a4" style={PAGE}>

          {/* Header */}
          <div style={{ fontSize: 10, marginBottom: 10 }}>
            <strong>Name of Work :-</strong>{" "}
            {nameOfWork || <span style={{ fontStyle: "italic", color: "#aaa" }}>Name of Work will appear here…</span>}
          </div>

          {/* Title */}
          <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 12, letterSpacing: 0.5, marginBottom: 8 }}>
            REQUIREMENT OF STEEL
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "6%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "46%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "6%" }} />
            </colgroup>
            <thead>
              <tr>
                <th style={TH}>Sr.<br />No.</th>
                <th style={TH}>GSRTC<br />Code</th>
                <th style={TH}>Description of Item</th>
                <th style={{ ...TH, textAlign: "right" }}>Qty</th>
                <th style={TH}>Unit</th>
                <th style={{ ...TH, textAlign: "right" }}>Qty<br />(In M.T.)</th>
                <th style={TH}>Unit</th>
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
                      : loaded ? "There is No Steel Item in BOQ"
                      : !projectId ? "Select a project to begin."
                      : !boqId ? "Select a Civil BOQ."
                      : "Click 'Load from BOQ' to load items."}
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={row.id}>
                    <td style={TDc}>{idx + 1}</td>
                    <td style={TDc}>{row.gsrtcCode}</td>
                    <td style={{ ...TD, lineHeight: 1.3, fontSize: 8 }}>{row.description}</td>
                    <td style={TDr}>{fmtNum(row.qty)}</td>
                    <td style={TDc}>{row.unit}</td>
                    <td style={TDr}>{fmtNum(row.qtyMT)}</td>
                    <td style={TDc}>M.T.</td>
                  </tr>
                ))
              )}

              <tr>
                <td colSpan={5} style={{ ...TD, fontWeight: "bold", textAlign: "right", fontSize: 8.5 }}>
                  Total Steel in MT :-
                </td>
                <td colSpan={2} style={{ ...TDr, fontWeight: "bold" }}>
                  {loaded ? (totalMT > 0 ? fmtNum(totalMT) : "-") : ""}
                </td>
              </tr>
            </tbody>
          </table>

        </div>
      </div>
    </div>
  );
}
