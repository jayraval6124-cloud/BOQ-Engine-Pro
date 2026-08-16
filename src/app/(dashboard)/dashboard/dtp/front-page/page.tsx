"use client";

import { useState } from "react";
import { Printer, RotateCcw, ArrowLeft } from "lucide-react";
import Link from "next/link";

function DTPContent({
  nameLines, noWork, budgetTxt, noBudget,
}: {
  nameLines: string[] | null;
  noWork: boolean;
  budgetTxt: string;
  noBudget: boolean;
}) {
  return (
    <>
      {/* 1. GSRTC Seal — viewBox shows full seal; white rect covers left-side marks */}
      <svg
        width={120} height={120}
        viewBox="18 92 130 130"
        style={{ display: "block", flexShrink: 0 }}
      >
        <image href="/gsrtc-logo.jpg" width={553} height={391} />
        <rect x="18" y="92" width="26" height="130" fill="white" />
      </svg>

      {/* 2. Draft Tender Paper */}
      <div style={{ marginTop: 16, fontSize: 34, fontWeight: "bold", textAlign: "center", letterSpacing: "0.5px", lineHeight: 1.2 }}>
        Draft Tender Paper
      </div>

      {/* 3. (D.T.P.) */}
      <div style={{ marginTop: 8, fontSize: 20, fontWeight: "bold", textAlign: "center", letterSpacing: "2px" }}>
        (D.T.P.)
      </div>

      {/* 4. Name of Work + Budget — vertically centred */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", width: "100%", gap: 2 }}>
        {noWork ? (
          <div style={{ fontSize: 18, color: "#bbb", fontStyle: "italic" }}>Name of Work will appear here…</div>
        ) : (
          nameLines!.map((line, i) => (
            <div key={i} style={{ fontSize: 20, fontWeight: "bold", lineHeight: 1.75 }}>{line || " "}</div>
          ))
        )}
        <div style={{ marginTop: 20, fontSize: 18, fontWeight: "bold", color: noBudget ? "#bbb" : "#000", fontStyle: noBudget ? "italic" : "normal" }}>
          {budgetTxt}
        </div>
      </div>

      {/* 5. Footer */}
      <div style={{ width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 15, fontWeight: "bold", letterSpacing: "0.3px", marginBottom: 10 }}>
          Gujarat State Road Transport Corporation
        </div>
        <div style={{ borderTop: "2px solid #000", marginBottom: 12 }} />
        <div style={{ fontSize: 12.5, lineHeight: 2 }}>
          First Floor, Civil Engineering Department,<br />
          Central Office, Nr. Bus Port, Ranip,<br />
          Ahmedabad &#8209;382480
        </div>
      </div>
    </>
  );
}

const A4_STYLE: React.CSSProperties = {
  width: 794, minHeight: 1123,
  background: "#fff",
  fontFamily: '"Times New Roman", Times, serif',
  display: "flex", flexDirection: "column", alignItems: "center",
  padding: "52px 70px 48px",
  flexShrink: 0, boxSizing: "border-box",
};

export default function DTPFrontPage() {
  const [nameOfWork, setNameOfWork] = useState("");
  const [budgetNo,   setBudgetNo]   = useState("");
  const [year,       setYear]       = useState("2026-27");

  const nameLines = nameOfWork.trim() ? nameOfWork.split("\n") : null;
  const noWork    = !nameLines;
  const noBudget  = !budgetNo && !year;
  const budgetTxt = `(BUDGET ${budgetNo || "??"}/${year || "????-??"})`;

  const handlePrint = () => {
    const a4 = document.getElementById("dtp-a4");
    if (!a4) return;

    const pw = window.open("", "_blank", "width=900,height=700");
    if (!pw) { alert("Please allow pop-ups for this site to use the print function."); return; }

    pw.document.write(`<!DOCTYPE html>
<html>
<head>
  <base href="${window.location.origin}" />
  <meta charset="utf-8" />
  <title>DTP Front Page</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      margin: 0; padding: 0; background: white;
      width: 210mm; height: 297mm; overflow: hidden;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    #dtp-a4 {
      width: 210mm !important;
      min-height: unset !important;
      height: 297mm !important;
      box-shadow: none !important;
      font-family: "Times New Roman", Times, serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 14mm 18mm 12mm;
      box-sizing: border-box;
    }
  </style>
</head>
<body>${a4.outerHTML}</body>
</html>`);
    pw.document.close();

    pw.onload = () => {
      setTimeout(() => { pw.print(); pw.close(); }, 700);
    };
    setTimeout(() => { if (!pw.closed) { pw.print(); pw.close(); } }, 2500);
  };

  return (
    <div className="flex gap-6" style={{ height: "calc(100vh - 80px)", position: "relative" }}>

      {/* ── LEFT: Form ─────────────────────────────────────────── */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-4 overflow-y-auto pb-4">

        <div className="flex items-center gap-2">
          <Link href="/dashboard/dtp"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-slate-800">DTP — Front Page</h1>
            <p className="text-xs text-slate-400">Draft Tender Paper · GSRTC Format</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Name of Work
            </label>
            <textarea
              value={nameOfWork}
              onChange={(e) => setNameOfWork(e.target.value)}
              rows={6}
              placeholder={"Special Repairing Works at\nVADNAGAR BUS STATION & DEPOT\n@ MEHSANA DIVISION"}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
            />
            <p className="text-xs text-slate-400 mt-1">Press Enter for each line. Use ALL CAPS for station name.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Budget Number
            </label>
            <input
              value={budgetNo}
              onChange={(e) => setBudgetNo(e.target.value)}
              placeholder="e.g.  97"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Financial Year
            </label>
            <input
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="e.g.  2026-27"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
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
            onClick={() => { setNameOfWork(""); setBudgetNo(""); setYear("2026-27"); }}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 space-y-1">
          <p className="font-semibold">How to save as PDF:</p>
          <p>Click Print → Destination: <em>Save as PDF</em> → Paper: A4 Portrait → Save.</p>
          <p className="text-amber-600">If a pop-up blocker appears, allow pop-ups for this site.</p>
        </div>
      </div>

      {/* ── RIGHT: A4 Preview (screen only) ───────────────────── */}
      <div className="flex-1 overflow-auto bg-slate-300 rounded-xl flex items-start justify-center py-8">
        <div id="dtp-a4" style={{ ...A4_STYLE, boxShadow: "0 6px 32px rgba(0,0,0,0.22)" }}>
          <DTPContent nameLines={nameLines} noWork={noWork} budgetTxt={budgetTxt} noBudget={noBudget} />
        </div>
      </div>
    </div>
  );
}
