"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Download, CheckCircle, Lock, FileText, ShieldCheck,
  GitBranch, Loader2, X, RefreshCw,
} from "lucide-react";
import { formatDate, BOQ_STATUS_LABELS } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";
import { BOQAbstractChart } from "@/components/boq/boq-abstract-chart";

// ── Types ────────────────────────────────────────────────────────────────────
interface SheetQty { sheetName: string; qty: number }
interface BOQItem {
  id: string; itemCode?: string; gsrtcCode?: string; description: string; unit: string;
  quantity: string; rate: string; amount: string; chapter?: string; elementLabel?: string;
  isManualEntry: boolean; isOverridden: boolean; remarks?: string;
  sheetQtys?: Record<string, SheetQty>;
}
interface MeasRow {
  id: string; nos: number | null; length: number | null; breadth: number | null;
  height: number | null; quantity: number | null; unit: string | null;
  description: string | null; gsrtcCode: string | null; isHeader: boolean; groupLabel: string | null;
}
interface Breakdown {
  totalRs: number; welfareCess: number; tenderAmount: number; gst18: number;
  totalWithGST: number; contingency5: number; workContingency2: number;
  estimatedAmount: number; netEstimated: number;
}
interface BOQ {
  id: string; name: string; boqNo: string; status: string; revisionNo: number;
  totalAmount: string; gstAmount: string; grandTotal: string; includeGST: boolean;
  notes?: string; createdAt: string; lockedAt?: string; approvedAt?: string;
  breakdown?: Breakdown;
  project: { id: string; name: string; projectNo: string; sorDivision: string; sorYear: string };
  measurementSheet?: { id: string; name: string; status: string; rows: MeasRow[] } | null;
  createdBy: { name: string };
  items: BOQItem[];
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SUBMITTED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  LOCKED: "bg-purple-100 text-purple-700",
  REVISED: "bg-amber-100 text-amber-700",
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const inr = (n: number) =>
  "₹ " + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inr0 = (n: number) =>
  "₹ " + Math.round(n).toLocaleString("en-IN");

// ── Editable cell for measurement rows ───────────────────────────────────────
function EditableCell({
  value, field, rowId, onSave, align = "right", width,
}: {
  value: number | null; field: string; rowId: string;
  onSave: (rowId: string, field: string, val: number | null, newQty: number) => void;
  align?: "left" | "right" | "center"; width?: string;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft]     = React.useState(value != null ? String(value) : "");
  const inputRef              = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  const commit = async () => {
    setEditing(false);
    const num = draft.trim() === "" ? null : Number(draft);
    if (num === value || (num === null && value === null)) return;
    const res = await fetch(`/api/measurements/rows/${rowId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: num }),
    });
    if (res.ok) { const d = await res.json(); onSave(rowId, field, num, d.quantity); }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setEditing(false); setDraft(value != null ? String(value) : ""); } }}
        className="w-full bg-blue-50 border border-blue-300 rounded px-1.5 py-0.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-400 tabular-nums"
        style={{ width }}
        type="number" step="any"
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      title="Click to edit"
      className={`block w-full cursor-pointer px-1.5 py-0.5 rounded hover:bg-blue-50 hover:ring-1 hover:ring-blue-200 transition-colors tabular-nums text-${align} select-none`}
    >
      {value != null ? Number(value).toFixed(3) : <span className="text-slate-300">—</span>}
    </span>
  );
}

export default function BOQDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [boq, setBOQ]                 = useState<BOQ | null>(null);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState("summary");
  const [validating, setValidating]   = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionForm, setRevisionForm] = useState({ name: "", changeSummary: "" });
  const [creatingRevision, setCreatingRevision] = useState(false);
  const [refreshing, setRefreshing]   = useState(false);

  useEffect(() => {
    fetch(`/api/boq/${id}`).then((r) => r.json()).then((d) => { setBOQ(d); setLoading(false); });
  }, [id]);

  const handleMeasCellSave = (rowId: string, field: string, val: number | null, newQty: number) => {
    setBOQ((prev) => {
      if (!prev?.measurementSheet) return prev;
      return {
        ...prev,
        measurementSheet: {
          ...prev.measurementSheet,
          rows: prev.measurementSheet.rows.map((r) =>
            r.id === rowId ? { ...r, [field]: val, quantity: newQty } : r
          ),
        },
      };
    });
  };

  const approve = async () => {
    const res = await fetch(`/api/boq/${id}/approve`, { method: "POST" });
    const data = await res.json();
    if (res.ok) { setBOQ((p) => p ? { ...p, ...data } : null); toast({ title: "BOQ approved", variant: "success" }); }
    else toast({ title: data.error || "Failed", variant: "destructive" });
  };

  const lock = async () => {
    if (!confirm("Lock this BOQ? It cannot be modified after locking.")) return;
    const res = await fetch(`/api/boq/${id}/lock`, { method: "POST" });
    const data = await res.json();
    if (res.ok) { setBOQ((p) => p ? { ...p, ...data } : null); toast({ title: "BOQ locked", variant: "success" }); }
    else toast({ title: data.error || "Failed", variant: "destructive" });
  };

  const runValidation = async () => {
    setValidating(true);
    try {
      const res = await fetch(`/api/validation/run?boqId=${id}`, { method: "POST" });
      const result = await res.json();
      if (result.hasErrors) toast({ title: `Validation: ${result.errors} error(s), ${result.warnings} warning(s)`, variant: "destructive" });
      else toast({ title: `Validation passed! ${result.warnings} warning(s)`, variant: "success" });
    } catch { toast({ title: "Validation failed", variant: "destructive" }); }
    finally { setValidating(false); }
  };

  const refreshFromMeasSheet = async () => {
    if (!confirm("Refresh quantities from measurement sheet? BOQ item quantities will be updated.")) return;
    setRefreshing(true);
    try {
      const res = await fetch(`/api/boq/${id}/refresh`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast({ title: `Updated ${data.updatedCount} item(s)`, variant: "success" });
        const r2 = await fetch(`/api/boq/${id}`);
        if (r2.ok) setBOQ(await r2.json());
      } else toast({ title: data.error || "Refresh failed", variant: "destructive" });
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    finally { setRefreshing(false); }
  };

  const createRevision = async () => {
    if (!revisionForm.name) { toast({ title: "Revision name required", variant: "destructive" }); return; }
    setCreatingRevision(true);
    try {
      const res = await fetch("/api/revisions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ boqId: id, ...revisionForm }) });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast({ title: "Snapshot created", variant: "success" });
      setShowRevisionModal(false);
    } catch (e: unknown) { toast({ title: e instanceof Error ? e.message : "Error", variant: "destructive" }); }
    finally { setCreatingRevision(false); }
  };

  const exportExcel = async () => {
    const res = await fetch(`/api/reports/export?boqId=${id}&format=excel`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${boq?.boqNo || "boq"}.xlsx`; a.click();
      toast({ title: "Excel exported", variant: "success" });
    } else toast({ title: "Export failed", variant: "destructive" });
  };

  const exportPDF = () => { window.open(`/api/reports/export?boqId=${id}&format=pdf`, "_blank"); };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" /></div>;
  if (!boq)    return <div className="text-center py-20 text-slate-400">BOQ not found</div>;

  // ── Measurement lookup (component-level, used by all tabs) ───────────────
  const measByCodeAll = new Map<string, MeasRow[]>();
  if (boq.measurementSheet) {
    boq.measurementSheet.rows.forEach((row) => {
      if (!row.isHeader && row.gsrtcCode) {
        const key = row.gsrtcCode.trim();
        if (!measByCodeAll.has(key)) measByCodeAll.set(key, []);
        measByCodeAll.get(key)!.push(row);
      }
    });
  }

  const resolveSameAs = (desc: string | null): number | null => {
    if (!desc) return null;
    const m = desc.match(/same\s+as\s+(.+)/i);
    if (!m) return null;
    const kw = m[1].toLowerCase().trim();
    const ref = boq.items.find((it) =>
      it.description.toLowerCase().includes(kw) ||
      (kw.includes("plaster") && it.description.toLowerCase().includes("plaster"))
    );
    return ref ? Number(ref.quantity) : null;
  };

  // Effective quantity per item: sums sub-rows, resolving "Same as" links
  const getEffectiveQty = (item: BOQItem): number => {
    const code = (item.gsrtcCode || item.itemCode || "").trim();
    const subRows = measByCodeAll.get(code) ?? [];
    if (subRows.length === 0) return Number(item.quantity);
    return subRows.reduce((s, r) => {
      const sa = resolveSameAs(r.description);
      return s + (sa !== null ? sa : Number(r.quantity ?? 0));
    }, 0);
  };

  // Effective items: qty and amount corrected for "Same as" items
  const effectiveItems = boq.items.map((item) => {
    const effQty = getEffectiveQty(item);
    const storedQty = Number(item.quantity);
    if (Math.abs(effQty - storedQty) < 0.001) return item;
    return { ...item, quantity: String(effQty), amount: String(effQty * Number(item.rate)) };
  });

  // ── Amount calculations (use effective items) ─────────────────────────────
  const totalRs   = effectiveItems.reduce((s, it) => s + Number(it.amount ?? 0), 0) || Number(boq.totalAmount);
  const bd        = boq.breakdown;
  const cess      = bd ? bd.welfareCess      : totalRs * 0.01;
  const tender    = bd ? bd.tenderAmount     : totalRs + cess;
  const gst18     = bd ? bd.gst18            : tender * 0.18;
  const withGST   = bd ? bd.totalWithGST     : tender + gst18;
  const cont5     = bd ? bd.contingency5     : withGST * 0.05;
  const cont2     = bd ? bd.workContingency2 : withGST * 0.02;
  const estimated = bd ? bd.estimatedAmount  : withGST + cont5 + cont2;
  const netEst    = bd ? bd.netEstimated     : Math.round(estimated);

  const tabs = [
    { id: "summary",     label: "Summary Sheet" },
    { id: "estimate",    label: `Estimate Sheet (${boq.items.length})` },
    { id: "measurement", label: "Measurement Sheet" },
  ];

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/boq" className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg mt-0.5">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{boq.boqNo}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[boq.status]}`}>
                {BOQ_STATUS_LABELS[boq.status]}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-800">{boq.name}</h1>
            <p className="text-slate-500 text-sm">{boq.project.name} &bull; {boq.createdBy.name}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50">
            <Download className="w-3.5 h-3.5" /> Excel
          </button>
          <button onClick={exportPDF} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50">
            <FileText className="w-3.5 h-3.5" /> PDF
          </button>
          {boq.status === "DRAFT" && (
            <button onClick={refreshFromMeasSheet} disabled={refreshing} className="flex items-center gap-1.5 px-3 py-2 border border-emerald-200 text-emerald-700 rounded-lg text-sm hover:bg-emerald-50 disabled:opacity-60">
              {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Refresh Qty
            </button>
          )}
          <button onClick={runValidation} disabled={validating} className="flex items-center gap-1.5 px-3 py-2 border border-amber-200 text-amber-700 rounded-lg text-sm hover:bg-amber-50 disabled:opacity-60">
            {validating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />} Validate
          </button>
          <button onClick={() => setShowRevisionModal(true)} className="flex items-center gap-1.5 px-3 py-2 border border-blue-200 text-blue-700 rounded-lg text-sm hover:bg-blue-50">
            <GitBranch className="w-3.5 h-3.5" /> Snapshot
          </button>
          {boq.status === "DRAFT" && (
            <button onClick={approve} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700">
              <CheckCircle className="w-3.5 h-3.5" /> Approve
            </button>
          )}
          {boq.status === "APPROVED" && (
            <button onClick={lock} className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
              <Lock className="w-3.5 h-3.5" /> Lock
            </button>
          )}
        </div>
      </div>

      {/* ── Top amount cards ── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Rs.",              value: inr(totalRs) },
          { label: "Tender Amount Rs.",      value: inr(tender)  },
          { label: "Total (with GST)",       value: inr(withGST) },
          { label: "Net Estimated Amount Rs.", value: inr0(netEst), highlight: true },
        ].map((card) => (
          <div key={card.label} className={`rounded-xl border p-4 shadow-sm ${card.highlight ? "bg-blue-600 border-blue-600" : "bg-white border-slate-200"}`}>
            <p className={`text-xs font-medium mb-1 ${card.highlight ? "text-blue-200" : "text-slate-500"}`}>{card.label}</p>
            <p className={`text-xl font-bold ${card.highlight ? "text-white" : "text-slate-800"}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-4 flex gap-1">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ════════════════ SUMMARY SHEET (Excel "Summary" tab format) ════════════════ */}
        {activeTab === "summary" && (
          <div className="p-0">
            {/* Name of Work banner */}
            <div className="px-8 pt-6 pb-2 text-center border-b border-slate-100">
              <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Name of Work</p>
              <p className="text-sm font-bold text-slate-800 leading-snug">{boq.project.name}</p>
              <p className="text-xs text-slate-500 mt-1">{boq.project.sorDivision} &nbsp;&bull;&nbsp; SOR Year: {boq.project.sorYear}</p>
            </div>

            {/* SUMMARY heading */}
            <div className="text-center py-4">
              <span className="text-base font-bold text-slate-800 underline underline-offset-4 tracking-wider">SUMMARY</span>
            </div>

            {/* Simple summary table */}
            <div className="px-8 pb-6">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100 border border-slate-300">
                    <th className="border border-slate-300 px-4 py-2.5 text-center font-semibold text-slate-600 w-12">No.</th>
                    <th className="border border-slate-300 px-4 py-2.5 text-left font-semibold text-slate-600">Description</th>
                    <th className="border border-slate-300 px-4 py-2.5 text-right font-semibold text-slate-600 w-44">Estimated Amount (Rs.)</th>
                    <th className="border border-slate-300 px-4 py-2.5 text-right font-semibold text-slate-600 w-44">Tender Amount (Rs.)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border border-slate-300">
                    <td className="border border-slate-300 px-4 py-3 text-center text-slate-600">1</td>
                    <td className="border border-slate-300 px-4 py-3 font-medium text-slate-700">{boq.name}</td>
                    <td className="border border-slate-300 px-4 py-3 text-right font-semibold text-slate-800 tabular-nums">
                      {estimated.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="border border-slate-300 px-4 py-3 text-right font-semibold text-slate-800 tabular-nums">
                      {tender.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border border-slate-300">
                    <td colSpan={2} className="border border-slate-300 px-4 py-2.5 text-right font-bold text-slate-700">TOTAL :-</td>
                    <td className="border border-slate-300 px-4 py-2.5 text-right font-bold text-slate-800 tabular-nums">
                      {estimated.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="border border-slate-300 px-4 py-2.5 text-right font-bold text-slate-800 tabular-nums">
                      {tender.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr className="bg-slate-800 text-white border border-slate-600">
                    <td colSpan={2} className="border border-slate-600 px-4 py-3 text-right font-bold text-base">SAY :-</td>
                    <td className="border border-slate-600 px-4 py-3 text-right font-bold text-base tabular-nums">
                      {Math.round(estimated).toLocaleString("en-IN")}.00
                    </td>
                    <td className="border border-slate-600 px-4 py-3 text-right font-bold text-base tabular-nums">
                      {Math.round(tender).toLocaleString("en-IN")}.00
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Signature block — matches Excel layout */}
            <div className="px-8 pt-2 pb-8 border-t border-slate-100">
              <div className="grid grid-cols-2 gap-16 mt-6 max-w-lg">
                {[
                  { title: "Dy. Engg  (Tech)", org: "GSRTC, C.O., A'bad" },
                  { title: "Div. Acc.",         org: "GSRTC, C.O., A'bad" },
                ].map((s) => (
                  <div key={s.title} className="text-center">
                    <div className="border-t border-slate-400 pt-2">
                      <p className="text-xs font-semibold text-slate-700">{s.title}</p>
                      <p className="text-xs text-slate-500">{s.org}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Technical sanction block */}
              <div className="mt-10 text-center text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                <p>Technically Sanctioned for Rs. <span className="font-semibold text-slate-700">{inr0(netEst)}</span></p>
                <p className="mt-1 italic">and Recorded at Serial Number ………… in the register of</p>
                <p>Technical Sanction for the Estimate on</p>
                <p>Date of ……………………</p>
              </div>

              <div className="mt-8 text-center">
                <div className="inline-block text-center border-t border-slate-400 pt-2 px-8">
                  <p className="text-xs font-semibold text-slate-700">Chief Civil Engineer</p>
                  <p className="text-xs text-slate-500">GSRTC, C.O., A'bad</p>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="px-6 pb-6 border-t border-slate-100 pt-5">
              <BOQAbstractChart boqId={id} />
            </div>
          </div>
        )}

        {/* ════════════════ ESTIMATE SHEET (ABSTRACT format) ════════════════ */}
        {activeTab === "estimate" && (
          <div className="p-0">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <p className="text-xs text-slate-400 uppercase tracking-widest font-medium mb-0.5">Abstract / Estimate Sheet</p>
              <p className="text-base font-bold text-slate-800">{boq.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {boq.project.name} &nbsp;&bull;&nbsp; {boq.project.sorDivision} &nbsp;&bull;&nbsp; SOR Year: {boq.project.sorYear}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-y border-slate-200 text-xs">
                    <th className="px-3 py-3 text-center font-semibold text-slate-600 w-10 border-r border-slate-200">No.</th>
                    <th className="px-3 py-3 text-center font-semibold text-slate-600 w-24 border-r border-slate-200">GSRTC Code</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 border-r border-slate-200">Description of Item</th>
                    <th className="px-3 py-3 text-right font-semibold text-slate-600 w-28 border-r border-slate-200">Quantity</th>
                    <th className="px-3 py-3 text-center font-semibold text-slate-600 w-14 border-r border-slate-200">Unit</th>
                    <th className="px-3 py-3 text-right font-semibold text-slate-600 w-28 border-r border-slate-200">Rate (Rs.)</th>
                    <th className="px-3 py-3 text-right font-semibold text-slate-600 w-32">Amount (Rs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {effectiveItems.map((item, i) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3 py-2.5 text-xs text-slate-400 text-center border-r border-slate-100">{i + 1}</td>
                      <td className="px-3 py-2.5 text-xs font-mono text-slate-700 text-center font-medium border-r border-slate-100">
                        {item.gsrtcCode || item.itemCode || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-700 leading-relaxed border-r border-slate-100">{item.description}</td>
                      <td className="px-3 py-2.5 text-right text-xs font-semibold text-slate-800 tabular-nums border-r border-slate-100">
                        {Number(item.quantity).toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                      </td>
                      <td className="px-3 py-2.5 text-center text-xs text-slate-500 border-r border-slate-100">{item.unit}</td>
                      <td className="px-3 py-2.5 text-right text-xs text-slate-600 tabular-nums border-r border-slate-100">
                        {Number(item.rate).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs font-semibold text-slate-800 tabular-nums">
                        {Number(item.amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  {[
                    { label: "Total Rs.",                   value: totalRs,   bold: false },
                    { label: "1%  Welfare Cess Rs.",         value: cess,      bold: false },
                    { label: "Tender Amount Rs.",            value: tender,    bold: true  },
                    { label: "18%  GST Rs.",                 value: gst18,     bold: false },
                    { label: "Total Amount (with GST) Rs.",  value: withGST,   bold: false },
                    { label: "5%  Contingencies Rs.",        value: cont5,     bold: false },
                    { label: "2%  Work Contingency Rs.",     value: cont2,     bold: false },
                    { label: "Estimated Amount Rs.",         value: estimated, bold: true  },
                  ].map(({ label, value, bold }) => (
                    <tr key={label} className="border-t border-slate-100">
                      <td colSpan={6} className={`px-4 py-2 text-right text-xs border-r border-slate-100 ${bold ? "font-bold text-slate-800" : "text-slate-500"}`}>{label}</td>
                      <td className={`px-3 py-2 text-right text-xs tabular-nums ${bold ? "font-bold text-slate-900" : "text-slate-600"}`}>{inr(value)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-800 border-t-2 border-slate-300">
                    <td colSpan={6} className="px-4 py-3.5 text-right font-bold text-white text-sm">Say Estimated Amount Rs.</td>
                    <td className="px-3 py-3.5 text-right font-bold text-white text-sm tabular-nums">{inr0(netEst)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="grid grid-cols-3 text-center border-t border-slate-100">
              {["Dy. Engg (Tech)", "Div. Accounts", "Executive Engineer"].map((s) => (
                <div key={s} className="py-5 px-4 border-r last:border-r-0 border-slate-100">
                  <div className="border-t border-slate-300 pt-2 text-xs text-slate-500">{s}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════ MEASUREMENT SHEET ════════════════ */}
        {activeTab === "measurement" && (() => {
          // Extract short label from description (last parenthesis or strip prefix)
          const shortLabel = (desc: string | null, itemDesc: string): string => {
            if (!desc) return "";
            const m = desc.match(/\(([^)]+)\)\s*$/);
            if (m) return m[1];
            const stripped = desc.replace(itemDesc, "").trim().replace(/^[,\-–\s]+/, "");
            return stripped || desc;
          };

          // "Same as X" → find BOQ item matching X and return its quantity
          const sameAsQty = (desc: string | null): { qty: number; label: string } | null => {
            if (!desc) return null;
            const m = desc.match(/same\s+as\s+(.+)/i);
            if (!m) return null;
            const keyword = m[1].toLowerCase().trim();
            const ref = boq.items.find((it) =>
              it.description.toLowerCase().includes(keyword) ||
              (keyword.includes("plaster") && it.description.toLowerCase().includes("plaster"))
            );
            return ref ? { qty: Number(ref.quantity), label: ref.gsrtcCode || ref.itemCode || "" } : null;
          };

          // Build map: gsrtcCode → sub-rows from measurement sheet
          const measByCode = new Map<string, MeasRow[]>();
          if (boq.measurementSheet) {
            boq.measurementSheet.rows.forEach((row) => {
              if (!row.isHeader && row.gsrtcCode) {
                const key = row.gsrtcCode.trim();
                if (!measByCode.has(key)) measByCode.set(key, []);
                measByCode.get(key)!.push(row);
              }
            });
          }

          return (
            <div>
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-widest font-medium mb-0.5">Measurement Sheet</p>
                  <p className="text-base font-bold text-slate-800">
                    {boq.measurementSheet?.name ?? boq.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {boq.project.name} &nbsp;&bull;&nbsp; {boq.project.sorDivision} &nbsp;&bull;&nbsp; SOR Year: {boq.project.sorYear}
                  </p>
                </div>
                {boq.measurementSheet && (
                  <span className="text-xs px-2.5 py-1 bg-white text-slate-600 border border-slate-200 rounded-full font-medium">
                    {boq.measurementSheet.status}
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse" style={{ minWidth: 900 }}>
                  <thead>
                    <tr className="bg-slate-100 border-y border-slate-200 text-slate-600">
                      <th className="px-3 py-3 text-center font-semibold w-10 border-r border-slate-200">No.</th>
                      <th className="px-3 py-3 text-center font-semibold w-24 border-r border-slate-200">GSRTC Code</th>
                      <th className="px-4 py-3 text-left font-semibold border-r border-slate-200">Description</th>
                      <th className="px-2 py-3 text-center font-semibold w-12 border-r border-slate-200">No.</th>
                      <th className="px-2 py-3 text-center font-semibold w-20 border-r border-slate-200">L (m)</th>
                      <th className="px-2 py-3 text-center font-semibold w-20 border-r border-slate-200">B (m)</th>
                      <th className="px-2 py-3 text-center font-semibold w-20 border-r border-slate-200">H (m)</th>
                      <th className="px-2 py-3 text-center font-semibold w-24 border-r border-slate-200">Sub Qty</th>
                      <th className="px-2 py-3 text-center font-semibold w-14 border-r border-slate-200">Unit</th>
                      <th className="px-2 py-3 text-center font-semibold w-24">Final Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boq.items.map((item, idx) => {
                      const code = (item.gsrtcCode || item.itemCode || "").trim();
                      const subRows = measByCode.get(code) ?? [];
                      // Effective total: sum sub-row quantities, substituting "Same as" links
                      const effectiveTotal = subRows.length > 0
                        ? subRows.reduce((s, r) => {
                            const sa = sameAsQty(r.description);
                            return s + (sa ? sa.qty : Number(r.quantity ?? 0));
                          }, 0)
                        : Number(item.quantity);

                      return (
                        <React.Fragment key={item.id}>
                          {/* Item header row — light grey, no colour */}
                          <tr className="bg-slate-50 border-t-2 border-slate-200">
                            <td className="px-3 py-2.5 text-center font-bold text-slate-700 border-r border-slate-200">{idx + 1}</td>
                            <td className="px-3 py-2.5 text-center font-mono font-semibold text-slate-700 border-r border-slate-200">{code || "—"}</td>
                            <td className="px-4 py-2.5 font-semibold text-slate-800 leading-snug border-r border-slate-200" colSpan={5}>
                              {item.description}
                            </td>
                            <td className="px-2 py-2.5 text-center text-slate-500 border-r border-slate-200">{item.unit}</td>
                            <td className="px-2 py-2.5 text-center font-bold text-slate-800 tabular-nums">
                              {effectiveTotal.toFixed(3)}
                            </td>
                          </tr>

                          {/* Sub measurement rows — editable */}
                          {subRows.map((row) => {
                            const label    = shortLabel(row.description, item.description);
                            const sameAs   = sameAsQty(row.description);
                            const dispQty  = sameAs ? sameAs.qty : (row.quantity != null ? Number(row.quantity) : null);
                            return (
                              <tr key={`sub-${row.id}`} className={`border-t border-slate-100 hover:bg-slate-50/40 transition-colors ${sameAs ? "bg-blue-50/30" : ""}`}>
                                <td className="px-3 py-1.5 border-r border-slate-100" />
                                <td className="px-3 py-1.5 border-r border-slate-100 text-center text-slate-400 font-mono text-xs">
                                  {sameAs?.label || ""}
                                </td>
                                <td className="px-4 py-1.5 border-r border-slate-100 pl-8">
                                  {sameAs ? (
                                    <span className="text-slate-500 italic">{label}</span>
                                  ) : (
                                    <span className="text-slate-500">{label}</span>
                                  )}
                                </td>
                                {sameAs ? (
                                  /* "Same as" row — show linked qty spanning dimension cols */
                                  <>
                                    <td colSpan={4} className="px-3 py-1.5 border-r border-slate-100 text-center text-xs text-slate-400 italic">
                                      same as above
                                    </td>
                                    <td className="px-2 py-1.5 text-right font-semibold text-slate-700 tabular-nums border-r border-slate-100">
                                      {sameAs.qty.toFixed(3)}
                                    </td>
                                  </>
                                ) : (
                                  /* Normal editable row */
                                  <>
                                    <td className="px-1 py-1 border-r border-slate-100">
                                      <EditableCell value={row.nos != null ? Number(row.nos) : null} field="nos" rowId={row.id} onSave={handleMeasCellSave} align="center" />
                                    </td>
                                    <td className="px-1 py-1 border-r border-slate-100">
                                      <EditableCell value={row.length != null ? Number(row.length) : null} field="length" rowId={row.id} onSave={handleMeasCellSave} />
                                    </td>
                                    <td className="px-1 py-1 border-r border-slate-100">
                                      <EditableCell value={row.breadth != null ? Number(row.breadth) : null} field="breadth" rowId={row.id} onSave={handleMeasCellSave} />
                                    </td>
                                    <td className="px-1 py-1 border-r border-slate-100">
                                      <EditableCell value={row.height != null ? Number(row.height) : null} field="height" rowId={row.id} onSave={handleMeasCellSave} />
                                    </td>
                                    <td className="px-2 py-1.5 text-right font-semibold text-slate-700 tabular-nums border-r border-slate-100">
                                      {row.quantity != null ? Number(row.quantity).toFixed(3) : "—"}
                                    </td>
                                  </>
                                )}
                                <td className="px-2 py-1.5 text-center text-slate-400 border-r border-slate-100">{row.unit || item.unit}</td>
                                <td className="px-2 py-1.5" />
                              </tr>
                            );
                          })}

                          {/* Total row */}
                          {subRows.length > 0 && (
                            <tr className="border-t-2 border-slate-200 bg-slate-50/60">
                              <td className="px-3 py-2 border-r border-slate-100" />
                              <td className="px-3 py-2 border-r border-slate-100" />
                              <td className="px-4 py-2 text-right font-semibold text-slate-500 text-xs tracking-wide border-r border-slate-100 uppercase" colSpan={5}>
                                Total
                              </td>
                              <td className="px-2 py-2 text-right font-bold text-slate-800 tabular-nums border-r border-slate-100">
                                {effectiveTotal.toFixed(3)}
                              </td>
                              <td className="px-2 py-2 text-center text-slate-400 border-r border-slate-100">{item.unit}</td>
                              <td className="px-2 py-2 text-center font-bold text-slate-800 tabular-nums">
                                {effectiveTotal.toFixed(3)}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {!boq.measurementSheet && (
                <div className="p-10 text-center">
                  <FileText className="w-9 h-9 mx-auto mb-3 text-slate-200" />
                  <p className="text-sm font-medium text-slate-400">No measurement sheet linked to this BOQ</p>
                  <p className="text-xs mt-1 text-slate-400">Measurement sub-rows will appear once a sheet is linked</p>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* ── Revision Modal ── */}
      {showRevisionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Create Revision Snapshot</h3>
              <button onClick={() => setShowRevisionModal(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-500">A snapshot captures the current BOQ state for future comparison and audit trail.</p>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Revision Name *</label>
                <input value={revisionForm.name} onChange={(e) => setRevisionForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" placeholder="e.g. R1 - Client Review" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Change Summary</label>
                <textarea value={revisionForm.changeSummary} onChange={(e) => setRevisionForm((f) => ({ ...f, changeSummary: e.target.value }))} rows={2} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" placeholder="Brief description of what changed..." />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowRevisionModal(false)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={createRevision} disabled={creatingRevision || !revisionForm.name} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-60">
                {creatingRevision ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><GitBranch className="w-4 h-4" /> Create Snapshot</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
