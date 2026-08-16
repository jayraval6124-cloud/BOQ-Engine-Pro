"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Printer, RotateCcw, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";

// ── Number → Words (Indian currency) ─────────────────────────────────────────

const ONES = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
              "Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen",
              "Seventeen","Eighteen","Nineteen"];
const TENS = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];

function sayNum(n: number): string {
  if (n === 0) return "";
  if (n < 20)   return ONES[n];
  if (n < 100)  return TENS[Math.floor(n/10)] + (n%10 ? " "+ONES[n%10] : "");
  if (n < 1000)     return ONES[Math.floor(n/100)]+" Hundred"    +(n%100    ?" "+sayNum(n%100)    :"");
  if (n < 100000)   return sayNum(Math.floor(n/1000))  +" Thousand"+(n%1000  ?" "+sayNum(n%1000)  :"");
  if (n < 10000000) return sayNum(Math.floor(n/100000))+" Lakh"   +(n%100000?" "+sayNum(n%100000):"");
  return               sayNum(Math.floor(n/10000000))  +" Crore"  +(n%10000000?" "+sayNum(n%10000000):"");
}

function toRupeesWords(n: number): string {
  if (!n || isNaN(n)) return "";
  const rupees = Math.floor(n);
  const paise  = Math.round((n - rupees) * 100);
  return "Rupees " + sayNum(rupees) + (paise > 0 ? " And Paise " + sayNum(paise) : "") + " Only";
}

// ── Formatting ────────────────────────────────────────────────────────────────

const fmtAmt = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtQty = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProjectOption { id: string; name: string; projectNo: string; }
interface BOQOption     { id: string; name: string; subWork: string; boqNo: string; totalAmount: string; }
interface BOQItem {
  id: string;
  description: string;
  quantity: number | string;
  unit: string;
  rate: number | string;
  amount: number | string;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const FONT = '"Times New Roman", Times, serif';

const TH: React.CSSProperties = {
  border: "1px solid #000", padding: "3px 4px", fontWeight: "bold",
  fontSize: 9, textAlign: "center", verticalAlign: "middle", background: "#f5f5f5",
};
const TD:  React.CSSProperties = { border: "1px solid #000", padding: "2px 4px", fontSize: 8.5, verticalAlign: "top" };
const TDc: React.CSSProperties = { ...TD, textAlign: "center", verticalAlign: "middle" };
const TDr: React.CSSProperties = { ...TD, textAlign: "right",  verticalAlign: "middle" };

// ── A4 Content ────────────────────────────────────────────────────────────────

interface ContentProps {
  nameOfWork: string;
  subWorkLabel: string;
  items: BOQItem[];
}

function TenderSubworkContent({ nameOfWork, subWorkLabel, items }: ContentProps) {
  const totalAmount = useMemo(
    () => items.reduce((s, i) => s + parseFloat(String(i.amount) || "0"), 0),
    [items],
  );
  const welfareCess  = totalAmount * 0.01;
  const tenderAmount = totalAmount + welfareCess;

  const title = subWorkLabel
    ? `Bill Of Quantities - ${subWorkLabel}`
    : "Bill Of Quantities";

  return (
    <div style={{ fontFamily: FONT }}>
      {/* Name of Work */}
      <div style={{ fontSize: 10, fontWeight: "bold", marginBottom: 5, textAlign: "center" }}>
        Name of Work :-{" "}
        {nameOfWork
          ? nameOfWork
          : <span style={{ fontStyle: "italic", fontWeight: "normal", color: "#aaa" }}>Name of Work will appear here…</span>}
      </div>

      {/* Title */}
      <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 12, letterSpacing: 1, marginBottom: 8 }}>
        {title}
      </div>

      {/* BOQ Table — 7 columns (no Item Code) */}
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "6%" }}  /> {/* Item No */}
          <col style={{ width: "44%" }} /> {/* Description */}
          <col style={{ width: "8%" }}  /> {/* Qty */}
          <col style={{ width: "5%" }}  /> {/* Unit */}
          <col style={{ width: "8%" }}  /> {/* Rate Rs */}
          <col style={{ width: "20%" }} /> {/* Rate in Words */}
          <col style={{ width: "9%" }}  /> {/* Amount */}
        </colgroup>

        <thead>
          <tr>
            <th style={TH} rowSpan={2}>Item<br />No.</th>
            <th style={TH} rowSpan={2}>Description Of Items</th>
            <th style={TH} rowSpan={2}>Quantities<br />Estimated<br />but May be<br />Much or Less</th>
            <th style={TH} rowSpan={2}>Unit</th>
            <th style={TH} colSpan={2}>Tender Rate (Rs.)</th>
            <th style={TH} rowSpan={2}>Total Amount According<br />to Estimated Quantities<br />(In Rs.)</th>
          </tr>
          <tr>
            <th style={TH}>Rate<br />(Rs.)</th>
            <th style={TH}>Rate<br />(In Words)</th>
          </tr>
        </thead>

        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ ...TDc, padding: "20px", color: "#bbb", fontStyle: "italic" }}>
                No items — select a project and BOQ, then click Load.
              </td>
            </tr>
          ) : (
            items.map((item, idx) => {
              const qty  = parseFloat(String(item.quantity));
              const rate = parseFloat(String(item.rate));
              const amt  = parseFloat(String(item.amount));
              const hasQty = qty > 0;

              return (
                <tr key={item.id}>
                  {/* Item No — only on first sub-item, blank for continuation rows */}
                  <td style={TDc}>{hasQty ? idx + 1 : ""}</td>
                  <td style={{ ...TD, lineHeight: 1.3 }}>{item.description}</td>
                  <td style={TDr}>{hasQty ? fmtQty(qty) : ""}</td>
                  <td style={TDc}>{hasQty ? item.unit : ""}</td>
                  <td style={TDr}>{hasQty ? fmtAmt(rate) : ""}</td>
                  <td style={{ ...TD, fontSize: 7.5, lineHeight: 1.3 }}>{hasQty ? toRupeesWords(rate) : ""}</td>
                  <td style={TDr}>{hasQty ? fmtAmt(amt) : ""}</td>
                </tr>
              );
            })
          )}

          {/* Total Amount */}
          <tr>
            <td colSpan={6} style={{ ...TDr, fontWeight: "bold", fontSize: 9 }}>Total Amount Rs.</td>
            <td style={{ ...TDr, fontWeight: "bold" }}>{totalAmount > 0 ? fmtAmt(totalAmount) : ""}</td>
          </tr>

          {/* 1% Welfare Cess */}
          <tr>
            <td colSpan={6} style={{ ...TDr, fontWeight: "bold", fontSize: 9 }}>1 % Welfare Cess</td>
            <td style={{ ...TDr, fontWeight: "bold" }}>{totalAmount > 0 ? fmtAmt(welfareCess) : ""}</td>
          </tr>

          {/* Tender Amount */}
          <tr>
            <td colSpan={6} style={{ ...TDr, fontWeight: "bold", fontSize: 9 }}>Tender Amount Rs.</td>
            <td style={{ ...TDr, fontWeight: "bold" }}>{totalAmount > 0 ? fmtAmt(tenderAmount) : ""}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TenderSubworkPage() {
  const [nameOfWork,    setNameOfWork]    = useState("");
  const [projectId,     setProjectId]     = useState("");
  const [boqId,         setBoqId]         = useState("");
  const [projects,      setProjects]      = useState<ProjectOption[]>([]);
  const [boqList,       setBoqList]       = useState<BOQOption[]>([]);
  const [items,         setItems]         = useState<BOQItem[]>([]);
  const [subWorkLabel,  setSubWorkLabel]  = useState("");
  const [loading,       setLoading]       = useState(false);

  // Load projects on mount
  useEffect(() => {
    fetch("/api/projects?limit=100")
      .then((r) => r.json())
      .then((d) => setProjects(Array.isArray(d.projects) ? d.projects : []))
      .catch(() => {});
  }, []);

  // Load non-Civil BOQs when project changes
  useEffect(() => {
    if (!projectId) { setBoqList([]); setBoqId(""); setItems([]); setSubWorkLabel(""); return; }
    fetch(`/api/boq?projectId=${projectId}`)
      .then((r) => r.json())
      .then((data: BOQOption[]) => {
        const nonCivil = Array.isArray(data)
          ? data.filter((b) => b.subWork && b.subWork !== "Civil")
          : [];
        setBoqList(nonCivil);
        if (nonCivil.length === 1) {
          setBoqId(nonCivil[0].id);
          setSubWorkLabel(nonCivil[0].subWork === "Civil" ? "Civil Work" : nonCivil[0].subWork);
        } else {
          setBoqId("");
          setSubWorkLabel("");
        }
      })
      .catch(() => {});
  }, [projectId]);

  // Update label when BOQ selection changes
  const handleBoqChange = (id: string) => {
    setBoqId(id);
    const b = boqList.find((b) => b.id === id);
    setSubWorkLabel(b ? b.subWork : "");
    setItems([]);
  };

  const loadItems = async () => {
    if (!boqId) return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/boq/${boqId}`);
      const data = await res.json();
      if (data.items) {
        setItems(data.items);
        if (!nameOfWork && data.project?.name) setNameOfWork(data.project.name);
        if (data.subWork) setSubWorkLabel(data.subWork);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const el = document.getElementById("tender-subwork-a4");
    if (!el) return;
    const pw = window.open("", "_blank", "width=1100,height=700");
    if (!pw) { alert("Please allow pop-ups for this site."); return; }
    pw.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Bill of Quantities — ${subWorkLabel}</title>
  <style>
    @page { size: A4 landscape; margin: 8mm 10mm; }
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: white;
      font-family: "Times New Roman", Times, serif;
      -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    table { border-collapse: collapse; width: 100%; table-layout: fixed; }
    td, th { border: 1px solid #000; }
  </style>
</head>
<body><div id="tender-subwork-a4">${el.innerHTML}</div></body>
</html>`);
    pw.document.close();
    pw.onload = () => { setTimeout(() => { pw.print(); pw.close(); }, 500); };
    setTimeout(() => { if (!pw.closed) { pw.print(); pw.close(); } }, 2500);
  };

  const selectedBOQ = boqList.find((b) => b.id === boqId);
  const totalWithCess = items.length > 0
    ? items.reduce((s, i) => s + parseFloat(String(i.amount) || "0"), 0) * 1.01
    : selectedBOQ ? parseFloat(selectedBOQ.totalAmount) * 1.01 : 0;

  const PAGE: React.CSSProperties = {
    width: 1050, background: "#fff", fontFamily: FONT,
    padding: "32px 40px 32px", boxSizing: "border-box",
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
            <h1 className="text-base font-bold text-slate-800">DTP — Tender Sheet</h1>
            <p className="text-xs text-slate-400">
              {subWorkLabel || "Electrical / Borewell / Fire Fighting / Custom"}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Select Sub-Work BOQ</p>

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
              <label className="block text-xs text-slate-500 mb-1">Sub-Work BOQ</label>
              <select
                value={boqId}
                onChange={(e) => handleBoqChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">— Select BOQ —</option>
                {boqList.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.subWork} — {b.boqNo}
                  </option>
                ))}
              </select>
            </div>
          )}

          {projectId && boqList.length === 0 && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              No non-Civil BOQs found for this project. Create an Electrical / Borewell / Fire Fighting / Custom BOQ first.
            </p>
          )}

          <button
            onClick={loadItems}
            disabled={!boqId || loading}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Loading…" : "Load BOQ Items"}
          </button>
        </div>

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

        {items.length > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 space-y-1">
            <p className="font-semibold">{items.length} items · {subWorkLabel}</p>
            <p>Tender Amount: ₹ {totalWithCess.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="text-slate-400">incl. 1% Welfare Cess</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print / Save as PDF
          </button>
          <button
            onClick={() => { setNameOfWork(""); setProjectId(""); setBoqId(""); setItems([]); setBoqList([]); setSubWorkLabel(""); }}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700">
          <p className="font-semibold mb-1">How it works</p>
          <p>Works for any non-Civil BOQ — Electrical, Borewell, Fire Fighting, or Custom. Title auto-sets to "Bill Of Quantities — [Work Type]". Sheet format has no Item Code column.</p>
        </div>
      </div>

      {/* ── RIGHT: Landscape A4 Preview ── */}
      <div className="flex-1 overflow-auto bg-slate-300 rounded-xl flex items-start justify-center py-8">
        <div
          id="tender-subwork-a4"
          style={{ ...PAGE, boxShadow: "0 6px 32px rgba(0,0,0,0.22)", minWidth: 1050 }}
        >
          <TenderSubworkContent
            nameOfWork={nameOfWork}
            subWorkLabel={subWorkLabel}
            items={items}
          />
        </div>
      </div>
    </div>
  );
}
