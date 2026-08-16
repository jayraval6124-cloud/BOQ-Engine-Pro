"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Printer, RotateCcw, ArrowLeft, Plus, Trash2, RefreshCw } from "lucide-react";
import Link from "next/link";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtAmt(n: number): string {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseAmt(s: string): number {
  const n = parseFloat(s.replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

// ── Fixed notes ───────────────────────────────────────────────────────────────

const NOTES = [
  "All work shall be carried out as per Public Works Department handbook and other specification of division or as directed.",
  "All the columns in schedule should be filled in ink and the total of the entries in the last column should be struck by the contractor under his signature.",
  "Rates quoted include clearance of site [Prior commencement of work and at its close] in all respects and hold good for work under all conditions, site moisture, weather etc.",
  "To be continued on additional sheets, if found necessary.",
  "Additional GST will be paid to Agencies on bill amount as per the Standard Bidding Document.",
  "2 % Cash Discount on each running bill will be deducted from Agency Bill. (Please refer Cash Discount & GST Condition as attached in Tender Document)",
  "Salvage amount will be deducted from Agency Bill as per Annexure Attached in Tender Document :- 86,400.00",
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface WorkItem { id: string; description: string; amount: string; }
interface ProjectOption { id: string; name: string; projectNo: string; }
interface BOQOption    { id: string; name: string; subWork: string; totalAmount: string; }

// ── Styles ────────────────────────────────────────────────────────────────────

const FONT = '"Times New Roman", Times, serif';
const TD: React.CSSProperties  = { border: "1px solid #000", padding: "4px 7px", fontSize: 10.5, verticalAlign: "middle" };
const TDc: React.CSSProperties = { ...TD, textAlign: "center" };
const TDr: React.CSSProperties = { ...TD, textAlign: "right" };

// ── A4 Content ────────────────────────────────────────────────────────────────

function SummaryContent({ nameOfWork, items }: { nameOfWork: string; items: WorkItem[] }) {
  const total = useMemo(() => items.reduce((s, i) => s + parseAmt(i.amount), 0), [items]);
  const say   = Math.round(total);

  return (
    <div style={{ fontFamily: FONT }}>
      {/* Name of Work */}
      <div style={{ fontSize: 11, fontWeight: "bold", marginBottom: 6, textAlign: "center" }}>
        Name of Work :-{" "}
        {nameOfWork || <span style={{ fontStyle: "italic", fontWeight: "normal", color: "#aaa" }}>Name of Work will appear here…</span>}
      </div>

      {/* Title */}
      <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 14, letterSpacing: 2, marginBottom: 10 }}>
        SUMMARY
      </div>

      {/* Main table */}
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "10%" }} />
          <col style={{ width: "60%" }} />
          <col style={{ width: "30%" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ ...TDc, fontWeight: "bold", background: "#f9f9f9" }}>No.</th>
            <th style={{ ...TD,  fontWeight: "bold", background: "#f9f9f9" }}>Description</th>
            <th style={{ ...TDr, fontWeight: "bold", background: "#f9f9f9" }}>Tender Amount (Rs.)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={item.id}>
              <td style={TDc}>{idx + 1}</td>
              <td style={TD}>{item.description || <em style={{ color: "#bbb" }}>Description</em>}</td>
              <td style={TDr}>
                {item.amount.trim() ? fmtAmt(parseAmt(item.amount)) : <em style={{ color: "#bbb" }}>—</em>}
              </td>
            </tr>
          ))}

          {/* TOTAL row */}
          <tr>
            <td colSpan={2} style={{ ...TD, fontWeight: "bold", textAlign: "right" }}>TOTAL Rs. :-</td>
            <td style={{ ...TDr, fontWeight: "bold" }}>{total > 0 ? fmtAmt(total) : ""}</td>
          </tr>

          {/* SAY row */}
          <tr>
            <td colSpan={2} style={{ ...TD, fontWeight: "bold", textAlign: "right" }}>SAY Rs. :-</td>
            <td style={{ ...TDr, fontWeight: "bold" }}>{total > 0 ? fmtAmt(say) : ""}</td>
          </tr>
        </tbody>
      </table>

      {/* Notes */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontWeight: "bold", fontSize: 10.5, marginBottom: 4 }}>Note :-</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {NOTES.map((note, i) => (
              <tr key={i}>
                <td style={{ ...TDc, width: "5%", verticalAlign: "top", fontSize: 10 }}>[{i + 1}]</td>
                <td style={{ ...TD, fontSize: 10, lineHeight: 1.45 }}>{note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Signatures */}
      <div style={{ marginTop: 28, display: "flex", justifyContent: "space-between", fontSize: 10.5 }}>
        {[
          ["Dy.Engg.(Tech.)", "GSRTC, C.O., A'bad"],
          ["Executive Engineer", "GSRTC, C.O., A'bad"],
          ["Chief Civil Engineer", "GSRTC, C.O., A'bad"],
        ].map(([role, office]) => (
          <div key={role} style={{ textAlign: "center", minWidth: 160 }}>
            <div style={{ borderTop: "1px solid #000", paddingTop: 4 }}>
              <div style={{ fontWeight: "bold" }}>{role}</div>
              <div>{office}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

let _uid = 0;
const uid = () => `row-${++_uid}`;

export default function SummaryPage() {
  const [nameOfWork,  setNameOfWork]  = useState("");
  const [projectId,   setProjectId]   = useState("");
  const [projects,    setProjects]    = useState<ProjectOption[]>([]);
  const [loadingBOQ,  setLoadingBOQ]  = useState(false);
  const [items, setItems] = useState<WorkItem[]>([
    { id: uid(), description: "Civil Work", amount: "" },
  ]);

  // Load projects on mount
  useEffect(() => {
    fetch("/api/projects?limit=100")
      .then((r) => r.json())
      .then((d) => setProjects(Array.isArray(d.projects) ? d.projects : []))
      .catch(() => {});
  }, []);

  // Load BOQs when project selected
  const loadFromBOQ = async () => {
    if (!projectId) return;
    setLoadingBOQ(true);
    try {
      const res  = await fetch(`/api/boq?projectId=${projectId}`);
      const boqs: BOQOption[] = await res.json();
      if (!Array.isArray(boqs) || boqs.length === 0) return;

      // Auto-fill Name of Work from project
      const proj = projects.find((p) => p.id === projectId);
      if (proj && !nameOfWork) setNameOfWork(proj.name);

      // Convert each BOQ to a row using subWork as description
      setItems(
        boqs.map((b) => ({
          id: uid(),
          description: b.subWork === "Civil" ? "Civil Work" : b.subWork,
          amount: b.totalAmount ? parseFloat(b.totalAmount).toFixed(2) : "",
        }))
      );
    } finally {
      setLoadingBOQ(false);
    }
  };

  const addRow = () => setItems((prev) => [...prev, { id: uid(), description: "", amount: "" }]);

  const removeRow = (id: string) =>
    setItems((prev) => prev.length > 1 ? prev.filter((r) => r.id !== id) : prev);

  const updateRow = (id: string, field: keyof WorkItem, val: string) =>
    setItems((prev) => prev.map((r) => r.id === id ? { ...r, [field]: val } : r));

  const handlePrint = () => {
    const el = document.getElementById("summary-a4");
    if (!el) return;
    const pw = window.open("", "_blank", "width=900,height=700");
    if (!pw) { alert("Please allow pop-ups for this site."); return; }
    pw.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Summary</title>
  <style>
    @page { size: A4 portrait; margin: 10mm 13mm; }
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: white;
      font-family: "Times New Roman", Times, serif;
      -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    table { border-collapse: collapse; width: 100%; table-layout: fixed; }
    td, th { border: 1px solid #000; }
    em { font-style: italic; }
  </style>
</head>
<body><div id="summary-a4">${el.innerHTML}</div></body>
</html>`);
    pw.document.close();
    pw.onload = () => { setTimeout(() => { pw.print(); pw.close(); }, 500); };
    setTimeout(() => { if (!pw.closed) { pw.print(); pw.close(); } }, 2500);
  };

  const resetAll = () => {
    setNameOfWork(""); setProjectId("");
    setItems([{ id: uid(), description: "Civil Work", amount: "" }]);
  };

  const PAGE: React.CSSProperties = {
    width: 794, background: "#fff", fontFamily: FONT,
    padding: "44px 52px 40px", boxSizing: "border-box",
  };

  return (
    <div className="flex gap-6" style={{ height: "calc(100vh - 80px)" }}>

      {/* ── LEFT ── */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-4 overflow-y-auto pb-4">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/dtp" className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-slate-800">DTP — Summary</h1>
            <p className="text-xs text-slate-400">Work-wise Tender Amount · GSRTC Format</p>
          </div>
        </div>

        {/* BOQ Loader */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Load from BOQ</p>
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
          <button
            onClick={loadFromBOQ}
            disabled={!projectId || loadingBOQ}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingBOQ ? "animate-spin" : ""}`} />
            {loadingBOQ ? "Loading…" : "Load BOQ Amounts"}
          </button>
          <p className="text-xs text-slate-400">Fills work items and amounts from all BOQs in the selected project.</p>
        </div>

        {/* Name of Work */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Name of Work</label>
          <textarea
            value={nameOfWork}
            onChange={(e) => setNameOfWork(e.target.value)}
            rows={4}
            placeholder={"Special Repairing Works at\nVADNAGAR BUS STATION & DEPOT\n@ MEHSANA DIVISION"}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
          />
        </div>

        {/* Work Items */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Work Items</p>
          {items.map((row, idx) => (
            <div key={row.id} className="flex items-start gap-2">
              <span className="text-xs text-slate-400 mt-2.5 w-4 shrink-0">{idx + 1}</span>
              <div className="flex-1 space-y-1">
                <input
                  type="text"
                  value={row.description}
                  onChange={(e) => updateRow(row.id, "description", e.target.value)}
                  placeholder="Work description"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={row.amount}
                  onChange={(e) => updateRow(row.id, "amount", e.target.value)}
                  placeholder="Amount (e.g. 20029513.59)"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
              <button
                onClick={() => removeRow(row.id)}
                className="mt-1.5 p-1 text-slate-300 hover:text-red-500 transition-colors shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 w-full justify-center px-3 py-1.5 text-xs text-slate-500 border border-dashed border-slate-300 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Row
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print / Save as PDF
          </button>
          <button
            onClick={resetAll}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      {/* ── RIGHT: A4 Preview ── */}
      <div className="flex-1 overflow-auto bg-slate-300 rounded-xl flex items-start justify-center py-8">
        <div
          id="summary-a4"
          style={{ ...PAGE, boxShadow: "0 6px 32px rgba(0,0,0,0.22)", minWidth: 794 }}
        >
          <SummaryContent nameOfWork={nameOfWork} items={items} />
        </div>
      </div>
    </div>
  );
}
