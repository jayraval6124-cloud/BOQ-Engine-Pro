"use client";

import React, { useState } from "react";
import { Printer, RotateCcw, ArrowLeft } from "lucide-react";
import Link from "next/link";

// ── Fixed Proforma data (never changes) ─────────────────────────────────────

const SECTIONS = [
  {
    no: "1.",
    title: "TENDER  FORM  :-",
    items: [
      { n: "i)",    q: "Where the old clauses are replaced by the latest clauses as for Government instruction ?",                                                                                                  a: "Revised printed form is used, hence question does not arrise." },
      { n: "ii)",   q: "If so, state the number wise details of clauses replaced.",                                                                                                                                a: "-- do --" },
      { n: "iii)",  q: "Whether time limit is entered ?  Is it in proportion with the amount and nature of work ?",                                                                                                a: "Yes" },
      { n: "iv)",   q: "Whether the correct name of work as per sanctioned estimate is entered ?",                                                                                                                 a: "Yes" },
      { n: "v)",    q: "Whether the order details vix. mention of security deposit etc. are written in the tender form ?",                                                                                         a: "Yes" },
    ],
  },
  {
    no: "2.",
    title: 'SCHEDULE  "A"  :-',
    items: [
      { n: "i)",    q: "Whether Schedule 'A' gives details of the material to be supplied by the Department ?",                                                                                                    a: "N.A." },
      { n: "ii)",   q: "Does it mention the correct place of delivery of materials to be supplied under Schedule 'A' ?",                                                                                           a: "N.A." },
      { n: "iii)",  q: "Whether the rates of materials are mentioned in the figures as well as in the words ?",                                                                                                    a: "N.A." },
      { n: "iv)",   q: "Whether the rate entered in Schedule 'A' is correctly derived ?",                                                                                                                         a: "N.A." },
      { n: "v)",    q: "Whether quantity of materials is correctly arrived at as per norms ?",                                                                                                                     a: "N.A." },
    ],
    footerNote: "I have personally verified the facts as stated above and found in order.",
  },
  {
    no: "3.",
    title: "BILL OF QUANTITY  :-",
    items: [
      { n: "i)",    q: "Whether the description of each item literally tally with the sanctioned estimates except specifying of leads and lifts etc.",                                                              a: "Yes" },
      { n: "ii)",   q: "Whether quantity of each item is as per sanctioned estimate ? If not, justification for deviation in covering letter of the S.B.D.",                                                      a: "Yes" },
      { n: "iii)",  q: "Whether the rate for each item is as per sanctioned estimate ? If not, state the reasons with justification for deviation in covering letter of the Analysis in the S.B.D.",              a: "Yes" },
      { n: "iv)",   q: "Whether the unit of each item is as per sanctioned estimate ? If not, state the reasons with due justification for deviation in covering letter of the S.B.D.",                           a: "Yes" },
      { n: "v)",    q: "Whether the rate of each item in Bill of Quantity is mentioned in words, in case of % rate tender ?",                                                                                      a: "Yes" },
      { n: "vi)",   q: "What are the standard method is adopted in each item in writing the unit ? (e.g. Cubic Meter to be abbreviated as per Cum. and not C.M. etc.)",                                          a: "Yes, as per Std." },
      { n: "vii)",  q: "Whether the Govt. remarks if any observed at the time of according sanction are fully incorporated in the S.B.D. ? If so, submit the compliance report.",                                 a: "Yes" },
      { n: "viii)", q: "Whether correct name of work is entered at the top of Bill of Quantity ?",                                                                                                                a: "Yes" },
      { n: "ix)",   q: "Whether standard form for Bill of Quantity is adopted ?",                                                                                                                                 a: "Yes" },
      { n: "x)",    q: 'Whether the standard words for discount of premium on tendered rate as "I/We am/are ……" is mentioned at the end ?',                                                                       a: "Yes" },
      { n: "xi)",   q: "Whether the amount worked out for each item is correctly calculated and summed up ?",                                                                                                     a: "Yes" },
      { n: "xii)",  q: "Whether alternate item are proposed in the S.B.D. ? If so, state the item no. for which alternate item is proposed with the reasons.",                                                    a: "No any alternative item." },
    ],
  },
  {
    no: "4.",
    title: "DETAILED  SPECIFICATION  :-",
    items: [
      { n: "i)",    q: "Whether the detailed specification correctly reflect the tender item ?",                                                                                                                   a: "Yes" },
      { n: "ii)",   q: "Whether items with specified lead and lift are converted into with all leads and lifts ?",                                                                                                 a: "Yes" },
      { n: "iii)",  q: "Whether the correct mode of measurement is mentioned ?",                                                                                                                                  a: "Yes" },
      { n: "iv)",   q: "Whether correct mode of payment is as per Bill of Quantity ?",                                                                                                                            a: "Yes" },
      { n: "v)",    q: "Whether suitable use of excavated material or cutting stuff is incorporated in the S.B.D. ?",                                                                                             a: "Yes" },
      { n: "vi)",   q: "Whether the mentioned regarding the tests to be carried out before execution is made in the respective item of S.B.D. ? If so, state the Item No. with description and details of tests to be carried out in brief.", a: "Testing schedule is attached" },
      { n: "vii)",  q: "Whether the mentioned regarding the tests to be carried out during execution is made ? State the item no. with description and details of tests to be carried out in brief.",             a: "Testing schedule is attached" },
      { n: "viii)", q: "Whether reference to P.W.D. Hand Book, I.S. Specification or I.R.C. Clauses are mentioned correctly and relevantly in the respective item ?",                                            a: "Yes" },
      { n: "ix)",   q: "Whether average rate of earthwork is derived and entered in Bill of Quantity ? If so, give Rate Analysis.",                                                                               a: "Not Applicable" },
      { n: "x)",    q: "Whether the specification of alternative item, if any, is incorporated ?",                                                                                                                a: "Not Applicable" },
      { n: "xi)",   q: "Whether the description of each item literally and exactly talleys with that in Bill of Quantity.",                                                                                       a: "Yes" },
    ],
  },
  {
    no: "5.",
    title: "G E N E R A L  :-",
    items: [
      { n: "i)",    q: "Whether statement of items not put to tender is incorporated with detailed justification ?",                                                                                               a: "Yes" },
      { n: "ii)",   q: "Whether the amount of sanctioned estimates tally with the total of amount put to tender and amount of items not put to tender ?",                                                         a: "Yes" },
      { n: "iii)",  q: "Whether page numbering in S.B.D. is made ?",                                                                                                                                             a: "Yes" },
      { n: "iv)",   q: "Whether permission to split up the work, if any, is sought from competent authority ?",                                                                                                   a: "Not Applicable" },
      { n: "v)",    q: "Whether the general specifications and other relevant records are incorporated in the S.B.D. ?",                                                                                          a: "Yes" },
      { n: "vi)",   q: "Whether Executive Engineer has signed the S.B.D. and all corrections are duly attested by him ?",                                                                                        a: "Yes" },
      { n: "vii)",  q: "Whether the S.B.D. are submitted in well bound volume and in neat and tidy fashion ?",                                                                                                   a: "Yes" },
    ],
  },
];

const CERTIFICATE = "I have personally examined the S.B.D. and I have personally verified all the above points and found to be in order. Further I have satisfied myself with the fact that there is no ambiguity or discrepancy, in the S.B.D. submitted herewith, which may lead to financial or contractual implications.";

// ── Styles ──────────────────────────────────────────────────────────────────

const FONT = '"Times New Roman", Times, serif';

const PAGE_STYLE: React.CSSProperties = {
  width: 794,
  background: "#fff",
  fontFamily: FONT,
  padding: "40px 52px 40px",
  boxSizing: "border-box",
};

const TH: React.CSSProperties = {
  border: "1px solid #000",
  padding: "3px 5px",
  fontWeight: "bold",
  fontSize: 10.5,
  textAlign: "center",
  verticalAlign: "middle",
};

const TD: React.CSSProperties = {
  border: "1px solid #000",
  padding: "3px 5px",
  fontSize: 10,
  verticalAlign: "top",
};

// ── Content component (shared between preview and print) ─────────────────────

function ProformaContent({ nameOfWork }: { nameOfWork: string }) {
  return (
    <div style={{ fontFamily: FONT }}>
      {/* Name of Work */}
      <div style={{ fontSize: 11, fontWeight: "bold", marginBottom: 6, textAlign: "center" }}>
        Name of Work :- {nameOfWork || <span style={{ fontStyle: "italic", fontWeight: "normal", color: "#888" }}>Name of Work will appear here…</span>}
      </div>

      {/* Title */}
      <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 13, letterSpacing: 1, marginBottom: 2 }}>
        PROFORMA  -  I
      </div>
      <div style={{ textAlign: "center", fontSize: 10.5, marginBottom: 10 }}>
        [To accompany with submission of S.B.D.]
      </div>

      {/* Main table */}
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "4%" }} />
          <col style={{ width: "5%" }} />
          <col style={{ width: "63%" }} />
          <col style={{ width: "4%" }} />
          <col style={{ width: "24%" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={TH}>Sr.<br />No.</th>
            <th style={TH}>No.</th>
            <th style={TH}>Particulars</th>
            <th style={TH}></th>
            <th style={TH}>Remarks / Reply</th>
          </tr>
        </thead>
        <tbody>
          {SECTIONS.map((sec) => (
            <React.Fragment key={sec.no}>
              {/* Section heading row */}
              <tr>
                <td style={{ ...TD, fontWeight: "bold", textAlign: "center", verticalAlign: "middle" }}>{sec.no}</td>
                <td colSpan={4} style={{ ...TD, fontWeight: "bold" }}>{sec.title}</td>
              </tr>

              {/* Items */}
              {sec.items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ ...TD, textAlign: "center" }}></td>
                  <td style={{ ...TD, textAlign: "center", whiteSpace: "nowrap" }}>{item.n}</td>
                  <td style={{ ...TD, lineHeight: 1.35 }}>{item.q}</td>
                  <td style={{ ...TD, textAlign: "center", fontWeight: "bold" }}>::-</td>
                  <td style={{ ...TD, lineHeight: 1.35 }}>{item.a}</td>
                </tr>
              ))}

              {/* Footer note (between Schedule A and Bill of Quantity) */}
              {sec.footerNote && (
                <tr>
                  <td colSpan={5} style={{ ...TD, fontStyle: "italic", textAlign: "center", padding: "5px 8px" }}>
                    {sec.footerNote}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      {/* Certificate */}
      <div style={{ marginTop: 14, textAlign: "center", fontWeight: "bold", fontSize: 11, letterSpacing: 1 }}>
        -::&nbsp;&nbsp;CERTIFICATE&nbsp;&nbsp;::-
      </div>
      <div style={{ marginTop: 8, fontSize: 10.5, lineHeight: 1.6, textAlign: "justify" }}>
        {CERTIFICATE}
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

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ProformaPage() {
  const [nameOfWork, setNameOfWork] = useState("");

  const handlePrint = () => {
    const el = document.getElementById("performa-a4");
    if (!el) return;
    const pw = window.open("", "_blank", "width=900,height=700");
    if (!pw) { alert("Please allow pop-ups for this site."); return; }
    pw.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Proforma - I</title>
  <style>
    @page { size: A4 portrait; margin: 10mm 13mm; }
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: white; font-family: "Times New Roman", Times, serif;
      -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    #performa-a4 { width: 100%; }
    table { border-collapse: collapse; width: 100%; table-layout: fixed; }
    td, th { border: 1px solid #000; }
  </style>
</head>
<body><div id="performa-a4">${el.innerHTML}</div></body>
</html>`);
    pw.document.close();
    pw.onload = () => { setTimeout(() => { pw.print(); pw.close(); }, 500); };
    setTimeout(() => { if (!pw.closed) { pw.print(); pw.close(); } }, 2500);
  };

  return (
    <div className="flex gap-6" style={{ height: "calc(100vh - 80px)" }}>

      {/* ── LEFT: Controls ─────────────────────────────────────── */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-4 overflow-y-auto pb-4">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/dtp" className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-slate-800">DTP — Proforma I</h1>
            <p className="text-xs text-slate-400">S.B.D. Check Proforma · GSRTC Format</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
            Name of Work
          </label>
          <textarea
            value={nameOfWork}
            onChange={(e) => setNameOfWork(e.target.value)}
            rows={5}
            placeholder={"Special Repairing Works at\nVADNAGAR BUS STATION & DEPOT\n@ MEHSANA DIVISION"}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
          />
          <p className="text-xs text-slate-400 mt-1">Same as your Front Page name of work.</p>
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
            onClick={() => setNameOfWork("")}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
          <p className="font-semibold mb-1">All content is fixed.</p>
          <p>Only the Name of Work changes. All 5 sections, answers and signatures are standard GSRTC format and print as-is.</p>
        </div>
      </div>

      {/* ── RIGHT: A4 Preview ──────────────────────────────────── */}
      <div className="flex-1 overflow-auto bg-slate-300 rounded-xl flex items-start justify-center py-8">
        <div
          id="performa-a4"
          style={{ ...PAGE_STYLE, boxShadow: "0 6px 32px rgba(0,0,0,0.22)", minWidth: 794 }}
        >
          <ProformaContent nameOfWork={nameOfWork} />
        </div>
      </div>
    </div>
  );
}
