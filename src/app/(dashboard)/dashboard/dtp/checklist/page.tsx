"use client";

import React, { useState, useMemo } from "react";
import { Printer, RotateCcw, ArrowLeft } from "lucide-react";
import Link from "next/link";

// ── Helpers ──────────────────────────────────────────────────────────────────

function inrFmt(val: string): string {
  const n = parseFloat(val.replace(/,/g, ""));
  if (isNaN(n) || val.trim() === "") return val;
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function calcEmd(tenderRaw: string): string {
  const n = parseFloat(tenderRaw.replace(/,/g, ""));
  if (isNaN(n) || n <= 0) return "";
  const emd = Math.round((n * 0.01) / 10) * 10;
  return emd.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Fixed table data ─────────────────────────────────────────────────────────

const PRICE_ADJ = [
  { sub: "( A )", label: "Labour, PL",               clause: "Section 4 cl. 24 (i)",   page: "66", prefix: "PL =", val: "38"  },
  { sub: "( B )", label: "Cement, Pc",               clause: "Section 4 cl. 24 (ii)",  page: "66", prefix: "Pc =", val: "17.5"},
  { sub: "( C )", label: "Steel, Ps",                clause: "Section 4 cl. 24 (iii)", page: "67", prefix: "Ps =", val: "15.8"},
  { sub: "( D )", label: "Bitumen, Pb",              clause: "Section 4 cl. 24 (iv)",  page: "67", prefix: "Pb =", val: "0"   },
  { sub: "( E )", label: "POL, Pf",                  clause: "Section 4 cl. 24 (v)",   page: "68", prefix: "Pf =", val: "1"   },
  { sub: "(F )", label: "Plant and Machinery Spares Pp", clause: "Section 4 cl. 24 (vi)",  page: "68", prefix: "Pp =", val: "10"  },
  { sub: "( G )", label: "Other Materials, Pm",      clause: "Section 4 cl. 24 (vii)", page: "69", prefix: "Pm =", val: "17.7"},
];

const MILESTONES = [
  { sub: "( A )", label: "Milestone 1", pct: "25",  days: "75"  },
  { sub: "( B )", label: "Milestone 2", pct: "50",  days: "140" },
  { sub: "( C )", label: "Milestone 3", pct: "75",  days: "205" },
  { sub: "( D )", label: "Milestone 4", pct: "100", days: "270" },
];

// ── Styles ──────────────────────────────────────────────────────────────────

const FONT = '"Times New Roman", Times, serif';

const TH: React.CSSProperties = {
  border: "1px solid #000",
  padding: "3px 5px",
  fontWeight: "bold",
  fontSize: 10,
  textAlign: "center",
  verticalAlign: "middle",
  background: "#f9f9f9",
};

const TD: React.CSSProperties = {
  border: "1px solid #000",
  padding: "3px 5px",
  fontSize: 9.5,
  verticalAlign: "middle",
};

const TDc: React.CSSProperties = { ...TD, textAlign: "center" };

// ── Content Component ────────────────────────────────────────────────────────

interface Props {
  nameOfWork: string;
  estimatedAmt: string;
  sorYear: string;
  tenderAmt: string;
  tenderFee: string;
  timeLimit: string;
  annualTurnover: string;
  emd: string;
}

function ChecklistContent(p: Props) {
  const now = new Date();
  const dateStr = `${now.getDate().toString().padStart(2,"0")}/${(now.getMonth()+1).toString().padStart(2,"0")}/${now.getFullYear()}`;

  return (
    <div style={{ fontFamily: FONT }}>
      {/* Name of Work */}
      <div style={{ fontSize: 11, fontWeight: "bold", marginBottom: 6, textAlign: "center" }}>
        Name of Work :-{" "}
        {p.nameOfWork || <span style={{ fontStyle: "italic", fontWeight: "normal", color: "#aaa" }}>Name of Work will appear here…</span>}
      </div>

      {/* Title */}
      <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 13, letterSpacing: 1, marginBottom: 8 }}>
        CHECK LIST FOR DTP
      </div>

      {/* Main table */}
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "7%" }} />
          <col style={{ width: "46%" }} />
          <col style={{ width: "17%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "22%" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={TH}>Sr. No.</th>
            <th style={TH}>Description</th>
            <th style={TH}>Clause No.</th>
            <th style={TH}>Page No.</th>
            <th style={TH}>Remarks</th>
          </tr>
        </thead>
        <tbody>

          {/* 1 — Technical Approval Amount */}
          <tr>
            <td style={TDc}>1</td>
            <td style={TD}>Technical Approval Amount</td>
            <td style={TDc}>-</td>
            <td style={TDc}>-</td>
            <td style={TDc}>{inrFmt(p.estimatedAmt) || <em style={{color:"#bbb"}}>—</em>}</td>
          </tr>

          {/* 2 — SOR Year */}
          <tr>
            <td style={TDc}>2</td>
            <td style={TD}>SOR Year</td>
            <td style={TDc}>-</td>
            <td style={TDc}>-</td>
            <td style={TDc}>{p.sorYear || <em style={{color:"#bbb"}}>—</em>}</td>
          </tr>

          {/* 3 — DTP amount */}
          <tr>
            <td style={TDc}>3</td>
            <td style={TD}>DTP amount</td>
            <td style={TDc}>IFB</td>
            <td style={TDc}>4</td>
            <td style={TDc}>{inrFmt(p.tenderAmt) || <em style={{color:"#bbb"}}>—</em>}</td>
          </tr>

          {/* 4 — Tender Fee */}
          <tr>
            <td style={TDc}>4</td>
            <td style={TD}>Tender Fee Rs.</td>
            <td style={TDc}>-</td>
            <td style={TDc}>-</td>
            <td style={TDc}>{inrFmt(p.tenderFee) || <em style={{color:"#bbb"}}>—</em>}</td>
          </tr>

          {/* 5 — EMD */}
          <tr>
            <td style={TDc}>5</td>
            <td style={TD}>Earnest Money Deposit Rs.</td>
            <td style={TDc}>IFB Point 6</td>
            <td style={TDc}>4</td>
            <td style={TDc}>{p.emd || <em style={{color:"#bbb"}}>—</em>}</td>
          </tr>

          {/* 6 — Time Limit */}
          <tr>
            <td style={TDc}>6</td>
            <td style={TD}>Time Limit (Months)</td>
            <td style={TDc}>Section 3 cl. 17</td>
            <td style={TDc}>41</td>
            <td style={TDc}>{p.timeLimit || <em style={{color:"#bbb"}}>—</em>}</td>
          </tr>

          {/* 7 — Annual Turnover */}
          <tr>
            <td style={TDc}>7</td>
            <td style={TD}>Annual Financial Turnover Amount Rs.</td>
            <td style={TDc}>Section 1 Cl. 4.5.3.(a)</td>
            <td style={TDc}>9</td>
            <td style={TDc}>{p.annualTurnover || <em style={{color:"#bbb"}}>As Mentioned in SBD</em>}</td>
          </tr>

          {/* 8 — Defect Liability */}
          <tr>
            <td style={TDc}>8</td>
            <td style={TD}>Defect Liability Period</td>
            <td style={TDc}>Section 3 cl. 33.1</td>
            <td style={TDc}>46</td>
            <td style={TDc}>As Mentioned in SBD</td>
          </tr>

          {/* 9 — Free Maintenance */}
          <tr>
            <td style={TDc}>9</td>
            <td style={TD}>Free Maintenance Guarantee Period</td>
            <td style={TDc}>Section 3 cl. 33.2</td>
            <td style={TDc}>46</td>
            <td style={TDc}>As Mentioned in SBD</td>
          </tr>

          {/* 10 — Registration */}
          <tr>
            <td style={TDc}>10</td>
            <td style={TD}>Registration / Category required</td>
            <td style={TDc}>-</td>
            <td style={TDc}>-</td>
            <td style={TDc}>B &amp; Above</td>
          </tr>

          {/* 11 — Site Possession */}
          <tr>
            <td style={TDc}>11</td>
            <td style={TD}>Site Possession Date</td>
            <td style={TDc}>Section 3 cl. 21</td>
            <td style={TDc}>42</td>
            <td style={TDc}>1<sup>st</sup> day of Work Order</td>
          </tr>

          {/* 12 — Program Update */}
          <tr>
            <td style={TDc}>12</td>
            <td style={TD}>Period between Program Update (Days)</td>
            <td style={TDc}>Section 3 cl. 27.3</td>
            <td style={TDc}>44</td>
            <td style={TDc}>30 days</td>
          </tr>

          {/* 13 — Amount withheld */}
          <tr>
            <td style={TDc}>13</td>
            <td style={TD}>Amount to be withheld for late submission of Program</td>
            <td style={TDc}>Section 3 cl. 27.3</td>
            <td style={TDc}>44</td>
            <td style={TDc}>1 Lakh</td>
          </tr>

          {/* 14 — Milestones header */}
          <tr>
            <td style={TDc}>14</td>
            <td style={TD}>Milestone:-</td>
            <td style={TDc}>Section 3 cl. 49.1</td>
            <td style={TDc}>53</td>
            <td style={{ ...TD, padding: 0 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td style={{ ...TDc, border: "none", borderBottom: "1px solid #000", width: "50%", fontWeight: "bold", fontSize: 9 }}>%</td>
                    <td style={{ ...TDc, border: "none", borderBottom: "1px solid #000", fontWeight: "bold", fontSize: 9 }}>Days</td>
                  </tr>
                  {MILESTONES.map((m) => (
                    <tr key={m.sub}>
                      <td style={{ ...TDc, border: "none", borderBottom: "1px solid #ccc", fontSize: 9 }}>{m.pct}</td>
                      <td style={{ ...TDc, border: "none", borderBottom: "1px solid #ccc", fontSize: 9 }}>{m.days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </td>
          </tr>
          {MILESTONES.map((m) => (
            <tr key={m.sub}>
              <td style={TDc}>{m.sub}</td>
              <td style={TD}>{m.label}</td>
              <td style={TDc}>-</td>
              <td style={TDc}>-</td>
              <td style={{ ...TD, padding: 0 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <td style={{ ...TDc, border: "none", width: "50%", fontSize: 9 }}>{m.pct}</td>
                      <td style={{ ...TDc, border: "none", fontSize: 9 }}>{m.days}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          ))}

          {/* Note row */}
          <tr>
            <td colSpan={5} style={{ ...TD, fontStyle: "italic", fontSize: 8.5, paddingLeft: 6 }}>
              #In case of LA/FRA is in progress give likely date.
            </td>
          </tr>

          {/* 15 — Price Adjustment header */}
          <tr>
            <td style={TDc}>15</td>
            <td style={TD}>Price Adjustment Components</td>
            <td style={TDc}>Section 4 cl. 24</td>
            <td style={TDc}>66</td>
            <td style={TDc}>%</td>
          </tr>
          {PRICE_ADJ.map((pa) => (
            <tr key={pa.sub}>
              <td style={TDc}>{pa.sub}</td>
              <td style={TD}>{pa.label}</td>
              <td style={TDc}>{pa.clause}</td>
              <td style={TDc}>{pa.page}</td>
              <td style={TDc}>{pa.prefix} {pa.val}</td>
            </tr>
          ))}
          <tr>
            <td style={TDc}></td>
            <td style={{ ...TD, fontWeight: "bold" }}>Total:-</td>
            <td style={TDc}>-</td>
            <td style={TDc}>-</td>
            <td style={TDc}>100%</td>
          </tr>

          {/* 16 — Percentage Rate Contract */}
          <tr>
            <td style={TDc}>16</td>
            <td style={TD}>Percentage Rate Contract (upto INR 50 Cr.)</td>
            <td style={TDc}>Section 7</td>
            <td style={TDc}>78</td>
            <td style={TDc}>Percentage Rate Contract</td>
          </tr>

          {/* Asterisk note */}
          <tr>
            <td colSpan={5} style={{ ...TD, fontStyle: "italic", fontSize: 8, paddingLeft: 6 }}>
              *Input index/price for each component on 28 days preceding the date of opening of technical bid shall be noted.
            </td>
          </tr>

        </tbody>
      </table>

      {/* Certificate */}
      <div style={{ marginTop: 12, textAlign: "center", fontWeight: "bold", fontSize: 11, letterSpacing: 1 }}>
        CERTIFICATE
      </div>
      <div style={{ marginTop: 6, fontSize: 10, lineHeight: 1.6, textAlign: "justify" }}>
        This is to certify that the contract document prepared for the work{" "}
        <strong>Name of Work :- {p.nameOfWork || "___"}</strong>{" "}
        is based on the standard bidding procurement of civil works published by R&amp;B department
        Letter No. RBD/0346/10/2023 Dated 12/10/2023.
      </div>
      <div style={{ marginTop: 6, fontSize: 10, lineHeight: 1.6 }}>
        No further modification and alteration in this standard format has been made by this office.
      </div>

      {/* Signatures */}
      <div style={{ marginTop: 28, display: "flex", justifyContent: "space-between", fontSize: 10 }}>
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

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ChecklistPage() {
  const [nameOfWork,    setNameOfWork]    = useState("");
  const [estimatedAmt, setEstimatedAmt]  = useState("");
  const [tenderAmt,    setTenderAmt]     = useState("");
  const [sorYear,      setSorYear]       = useState("2024-25");
  const [tenderFee,    setTenderFee]     = useState("");
  const [timeLimit,    setTimeLimit]     = useState("");
  const [annualTurnover, setAnnualTurnover] = useState("");

  const emd = useMemo(() => calcEmd(tenderAmt), [tenderAmt]);

  const handlePrint = () => {
    const el = document.getElementById("checklist-a4");
    if (!el) return;
    const pw = window.open("", "_blank", "width=900,height=700");
    if (!pw) { alert("Please allow pop-ups for this site."); return; }
    pw.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Check List for DTP</title>
  <style>
    @page { size: A4 portrait; margin: 10mm 13mm; }
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: white; font-family: "Times New Roman", Times, serif;
      -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    table { border-collapse: collapse; width: 100%; table-layout: fixed; }
    td, th { border: 1px solid #000; }
    em { font-style: italic; }
    sup { vertical-align: super; font-size: 0.75em; }
  </style>
</head>
<body><div id="checklist-a4">${el.innerHTML}</div></body>
</html>`);
    pw.document.close();
    pw.onload = () => { setTimeout(() => { pw.print(); pw.close(); }, 500); };
    setTimeout(() => { if (!pw.closed) { pw.print(); pw.close(); } }, 2500);
  };

  const PAGE: React.CSSProperties = {
    width: 794,
    background: "#fff",
    fontFamily: FONT,
    padding: "40px 48px 40px",
    boxSizing: "border-box",
  };

  return (
    <div className="flex gap-6" style={{ height: "calc(100vh - 80px)" }}>

      {/* ── LEFT ── */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-4 overflow-y-auto pb-4">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/dtp" className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-slate-800">DTP — Check List</h1>
            <p className="text-xs text-slate-400">DTP Summary Checklist · GSRTC Format</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Name of Work</label>
            <textarea
              value={nameOfWork}
              onChange={(e) => setNameOfWork(e.target.value)}
              rows={4}
              placeholder={"Special Repairing Works at\nVADNAGAR BUS STATION & DEPOT\n@ MEHSANA DIVISION"}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Estimated Amount (₹)</label>
            <input
              type="text"
              value={estimatedAmt}
              onChange={(e) => setEstimatedAmt(e.target.value)}
              placeholder="e.g. 28090340"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 mt-0.5">Technical Approval Amount — from sanctioned estimate</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Tender Amount (₹)</label>
            <input
              type="text"
              value={tenderAmt}
              onChange={(e) => setTenderAmt(e.target.value)}
              placeholder="e.g. 22248012"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 mt-0.5">DTP Amount — as per BOQ total</p>
          </div>

          {emd && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              <p className="text-xs text-blue-600 font-semibold">Auto-calculated EMD</p>
              <p className="text-sm font-bold text-blue-800">₹ {emd}</p>
              <p className="text-xs text-slate-400">1% of Tender Amount, rounded to nearest ₹10</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">SOR Year</label>
              <input
                type="text"
                value={sorYear}
                onChange={(e) => setSorYear(e.target.value)}
                placeholder="2024-25"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Time Limit (Mo.)</label>
              <input
                type="text"
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value)}
                placeholder="e.g. 9"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Tender Fee (₹)</label>
            <input
              type="text"
              value={tenderFee}
              onChange={(e) => setTenderFee(e.target.value)}
              placeholder="e.g. 4248"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Annual Turnover (₹)</label>
            <input
              type="text"
              value={annualTurnover}
              onChange={(e) => setAnnualTurnover(e.target.value)}
              placeholder="As Mentioned in SBD"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 mt-0.5">Leave blank to show "As Mentioned in SBD"</p>
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
            onClick={() => { setNameOfWork(""); setEstimatedAmt(""); setTenderAmt(""); setSorYear("2024-25"); setTenderFee(""); setTimeLimit(""); setAnnualTurnover(""); }}
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
          id="checklist-a4"
          style={{ ...PAGE, boxShadow: "0 6px 32px rgba(0,0,0,0.22)", minWidth: 794 }}
        >
          <ChecklistContent
            nameOfWork={nameOfWork}
            estimatedAmt={estimatedAmt}
            sorYear={sorYear}
            tenderAmt={tenderAmt}
            tenderFee={tenderFee}
            timeLimit={timeLimit}
            annualTurnover={annualTurnover}
            emd={emd}
          />
        </div>
      </div>
    </div>
  );
}
