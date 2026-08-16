"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Save, FileText, Lock } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";

interface MRow {
  tempId:      string;
  id?:         string;
  itemNo:      number;
  gsrtcCode:   string;
  description: string;
  nos:         string;
  length:      string;
  breadth:     string;
  height:      string;
  quantity:    number;
  unit:        string;
  sorItemId?:  string;
  sortOrder:   number;
  serialNo:    number;
  fetching?:   boolean;
}

interface Sheet {
  id: string; name: string; status: string; version: number;
  project: { id: string; name: string; projectNo: string; sorDivision: string; sorYear: string };
}

// Strip trailing "(Sub-Description)" from the SOR description to get the base item description
function extractBaseDesc(desc: string): string {
  return desc.replace(/\s*\([^()]+\)\s*$/, "").trim();
}
// Extract the sub-description part from "(Sub-Description)" at end of description
function extractSubDesc(desc: string): string {
  const m = desc.match(/\(([^()]+)\)\s*$/);
  return m ? m[1] : "";
}

function calcQty(nos: string, l: string, b: string, h: string): number {
  const factors: number[] = [];
  const nv = parseFloat(nos); if (!isNaN(nv)) factors.push(nv);
  const lv = parseFloat(l);   if (!isNaN(lv)) factors.push(lv);
  const bv = parseFloat(b);   if (!isNaN(bv)) factors.push(bv);
  const hv = parseFloat(h);   if (!isNaN(hv)) factors.push(hv);
  if (factors.length === 0) return 0;
  return factors.reduce((p, v) => p * v, 1);
}

function newRow(itemNo: number, order: number, serial: number): MRow {
  return {
    tempId: Math.random().toString(36).slice(2),
    itemNo, gsrtcCode: "", description: "",
    nos: "", length: "", breadth: "", height: "",
    quantity: 0, unit: "Cum",
    sortOrder: order, serialNo: serial,
  };
}

export default function MeasurementSheetPage() {
  const { id } = useParams<{ id: string }>();
  const [sheet, setSheet]     = useState<Sheet | null>(null);
  const [rows, setRows]       = useState<MRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [dirty, setDirty]     = useState(false);
  // CF↑ carry-forward picker: stores the tempId of the row whose L field we're filling
  const [cfTarget, setCfTarget] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/measurements/${id}`)
      .then((r) => r.json())
      .then((d: Sheet & { rows: Record<string, unknown>[] }) => {
        setSheet(d);
        const mapped: MRow[] = (d.rows || []).map((r, i) => {
          const nosStr = r.nos     ? String(r.nos)     : "";
          const lenStr = r.length  ? String(r.length)  : "";
          const breStr = r.breadth ? String(r.breadth) : "";
          const heiStr = r.height  ? String(r.height)  : "";
          // Recalculate from stored dimensions — fixes rows where stored qty=0 but dims are correct
          const liveQty = calcQty(nosStr, lenStr, breStr, heiStr);
          return {
            id:          r.id as string,
            tempId:      String(r.id || i),
            itemNo:      Number(r.itemNo ?? i + 1),
            gsrtcCode:   String(r.gsrtcCode  || ""),
            description: String(r.description || ""),
            nos:         nosStr,
            length:      lenStr,
            breadth:     breStr,
            height:      heiStr,
            quantity:    liveQty > 0 ? liveQty : Number(r.quantity ?? 0),
            unit:        String(r.unit || "Cum"),
            sorItemId:   r.sorItemId as string | undefined,
            sortOrder:   Number(r.sortOrder ?? i),
            serialNo:    Number(r.serialNo  ?? i + 1),
          };
        });
        const finalRows = mapped.length > 0 ? mapped : [newRow(1, 0, 1)];
        setRows(finalRows);
        // If any row had its quantity auto-corrected, mark dirty so user saves to DB
        const anyFixed = mapped.some((r, i) => r.quantity !== Number((d.rows || [])[i]?.quantity ?? 0));
        if (anyFixed) setDirty(true);
        setLoading(false);
      });
  }, [id]);

  // On blur of GSRTC Code, look up directly and auto-fill description + unit
  const fetchSORItem = useCallback(async (tempId: string, code: string) => {
    if (!code.trim()) return;
    const proj = sheet?.project;
    const params = new URLSearchParams({
      code,
      ...(proj?.sorDivision ? { division: proj.sorDivision } : {}),
      ...(proj?.sorYear     ? { year:     proj.sorYear     } : {}),
    });
    setRows((prev) => prev.map((r) => r.tempId === tempId ? { ...r, fetching: true } : r));
    try {
      const res  = await fetch(`/api/sor/lookup?${params}`);
      const item = await res.json();
      if (item) {
        setRows((prev) => prev.map((r) =>
          r.tempId === tempId
            ? { ...r, description: item.description, unit: item.unit, sorItemId: item.id, fetching: false }
            : r
        ));
        setDirty(true);
      } else {
        setRows((prev) => prev.map((r) => r.tempId === tempId ? { ...r, fetching: false } : r));
        toast({ title: `Code "${code}" not found`, variant: "destructive" });
      }
    } catch {
      setRows((prev) => prev.map((r) => r.tempId === tempId ? { ...r, fetching: false } : r));
    }
  }, [sheet]);

  // Update a row field; recalculate quantity for dimension fields
  const updateRow = (tempId: string, field: keyof MRow, value: string | number) => {
    setDirty(true);
    setRows((prev) => prev.map((r) => {
      if (r.tempId !== tempId) return r;
      const up = { ...r, [field]: value };
      if (["nos","length","breadth","height"].includes(field as string)) {
        up.quantity = calcQty(up.nos, up.length, up.breadth, up.height);
      }
      return up;
    }));
  };

  const maxItemNo = () => Math.max(0, ...rows.map((r) => r.itemNo));

  const addItem = () => {
    setDirty(true);
    setRows((prev) => {
      const order  = prev.length;
      const serial = prev.length + 1;
      return [...prev, newRow(maxItemNo() + 1, order, serial)];
    });
  };

  const addSubRow = (afterTempId: string) => {
    setDirty(true);
    setRows((prev) => {
      const idx    = prev.findIndex((r) => r.tempId === afterTempId);
      const srcRow = prev[idx];
      const nr     = {
        ...newRow(srcRow.itemNo, idx + 1, idx + 2),
        gsrtcCode:   srcRow.gsrtcCode,
        description: srcRow.description,
        unit:        srcRow.unit,
        sorItemId:   srcRow.sorItemId,
      };
      const next = [...prev];
      next.splice(idx + 1, 0, nr);
      return next.map((r, i) => ({ ...r, sortOrder: i, serialNo: i + 1 }));
    });
  };

  const deleteRow = (tempId: string) => {
    setDirty(true);
    setRows((prev) =>
      prev.filter((r) => r.tempId !== tempId).map((r, i) => ({ ...r, sortOrder: i, serialNo: i + 1 }))
    );
  };

  const save = async () => {
    setSaving(true);
    const res = await fetch(`/api/measurements/${id}/rows`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows: rows.map((r) => ({
          itemNo:      r.itemNo,
          gsrtcCode:   r.gsrtcCode || null,
          description: r.description,
          nos:         r.nos     !== "" ? parseFloat(r.nos)     : null,
          length:      r.length  !== "" ? parseFloat(r.length)  : null,
          breadth:     r.breadth !== "" ? parseFloat(r.breadth) : null,
          height:      r.height  !== "" ? parseFloat(r.height)  : null,
          unit:        r.unit,
          sorItemId:   r.sorItemId || null,
          sortOrder:   r.sortOrder,
          serialNo:    r.serialNo,
        })),
      }),
    });
    setSaving(false);
    if (res.ok) { toast({ title: "Sheet saved", variant: "success" }); setDirty(false); }
    else toast({ title: "Failed to save", variant: "destructive" });
  };

  // Final quantity = sum of all rows per itemNo
  const finalQty: Record<number, number> = {};
  rows.forEach((r) => { finalQty[r.itemNo] = (finalQty[r.itemNo] || 0) + r.quantity; });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );
  if (!sheet) return <div className="text-center py-20 text-slate-400">Sheet not found</div>;

  const isLocked = sheet.status === "LOCKED" || sheet.status === "APPROVED";

  const numCls = "w-full px-1.5 py-1.5 text-sm border-0 bg-transparent text-right font-mono focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-400 rounded";
  const txtCls = "w-full px-1.5 py-1.5 text-sm border-0 bg-transparent focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-400 rounded";

  return (
    <div className="flex flex-col space-y-3" style={{ height: "calc(100vh - 90px)" }}>
      {/* Header */}
      <div className="flex items-start justify-between flex-shrink-0">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/measurements" className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg mt-0.5">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{sheet.name}</h1>
            <p className="text-sm text-slate-500">
              {sheet.project.name}
              {sheet.project.sorDivision && (
                <> &bull; <span className="text-blue-600 font-medium">{sheet.project.sorDivision}</span></>
              )}
              &bull; SOR {sheet.project.sorYear}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isLocked && (
            <span className="flex items-center gap-1.5 px-3 py-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg">
              <Lock className="w-3.5 h-3.5" /> Locked
            </span>
          )}
          <Link
            href={`/dashboard/boq/new?projectId=${sheet.project.id}`}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            <FileText className="w-3.5 h-3.5" /> Generate BOQ
          </Link>
          {!isLocked && (
            <button
              onClick={save}
              disabled={saving || !dirty}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving
                ? <><span className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" /> Saving...</>
                : <><Save className="w-3.5 h-3.5" /> {dirty ? "Save *" : "Save"}</>
              }
            </button>
          )}
        </div>
      </div>

      {/* Table container — scrollable both directions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden flex-1 min-h-0">
        <div
          className="overflow-auto flex-1"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#94a3b8 #f1f5f9" }}
        >
          <table className="text-sm border-collapse" style={{ minWidth: "980px", width: "100%" }}>
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-800 text-white">
                <th className="px-2 py-2.5 text-xs font-semibold text-center border-r border-slate-600" style={{ width: 64 }}>Item No.</th>
                <th className="px-2 py-2.5 text-xs font-semibold text-center border-r border-slate-600" style={{ width: 110 }}>GSRTC Code</th>
                <th className="px-2 py-2.5 text-xs font-semibold text-left border-r border-slate-600" style={{ minWidth: 220 }}>Item Description</th>
                <th className="px-2 py-2.5 text-xs font-semibold text-center border-r border-slate-600" style={{ width: 80 }}>Nos</th>
                <th className="px-2 py-2.5 text-xs font-semibold text-center border-r border-slate-600" style={{ width: 90 }}>Length</th>
                <th className="px-2 py-2.5 text-xs font-semibold text-center border-r border-slate-600" style={{ width: 90 }}>Breadth</th>
                <th className="px-2 py-2.5 text-xs font-semibold text-center border-r border-slate-600" style={{ width: 90 }}>Height/Depth</th>
                <th className="px-2 py-2.5 text-xs font-semibold text-center border-r border-slate-600" style={{ width: 100 }}>Quantity</th>
                <th className="px-2 py-2.5 text-xs font-semibold text-center border-r border-slate-600" style={{ width: 64 }}>Unit</th>
                <th className="px-2 py-2.5 text-xs font-semibold text-center border-r border-slate-600" style={{ width: 100 }}>Final Qty</th>
                {!isLocked && <th className="px-2 py-2.5" style={{ width: 60 }} />}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const isFirstOfItem = idx === 0 || rows[idx - 1].itemNo !== row.itemNo;
                const isLastOfItem  = idx === rows.length - 1 || rows[idx + 1].itemNo !== row.itemNo;
                const isMultiItem   = !isLastOfItem || !isFirstOfItem; // item group has >1 sub-row

                const subDesc  = extractSubDesc(row.description);
                const baseDesc = extractBaseDesc(row.description);

                // Helper: sub-description row (compact dims row) — used for all sub-rows in multi-item groups
                const dimRow = (isFirst: boolean) => (
                  <tr
                    className={`border-b border-slate-100 hover:bg-amber-50/20 transition-colors bg-white`}
                  >
                    <td className="px-1 py-0.5 border-r border-slate-100 text-center">
                      <span className="text-slate-300 text-xs">{row.itemNo}</span>
                    </td>
                    <td className="px-1 py-0.5 border-r border-slate-100">
                      <span className="text-slate-300 text-[10px] font-mono pl-1">↳</span>
                    </td>
                    <td className="px-1 py-0.5 border-r border-slate-100">
                      <input
                        value={subDesc}
                        onChange={(e) => {
                          updateRow(row.tempId, "description", baseDesc ? `${baseDesc} (${e.target.value})` : e.target.value);
                        }}
                        disabled={isLocked}
                        className={`${txtCls} text-slate-500 italic text-[11px] pl-3`}
                        placeholder="Sub-description…"
                      />
                    </td>
                    {(["nos","length","breadth","height"] as const).map((f) => (
                      <td key={f} className="px-1 py-0.5 border-r border-slate-100">
                        {f === "length" && !isLocked ? (
                          <div className="flex items-center gap-0.5">
                            <input
                              value={row[f]}
                              onChange={(e) => updateRow(row.tempId, f, e.target.value)}
                              type="number" step="any"
                              className={`${numCls} ${!row[f] ? "bg-amber-50/60" : ""}`}
                              placeholder="—"
                            />
                            <button
                              type="button"
                              title="Carry Forward Final Qty from another item into this Length field"
                              onClick={() => setCfTarget(row.tempId)}
                              className="flex-shrink-0 px-0.5 py-0.5 text-[8px] font-bold text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded leading-none border border-blue-200 h-5"
                            >CF↑</button>
                          </div>
                        ) : (
                          <input
                            value={row[f]}
                            onChange={(e) => updateRow(row.tempId, f, e.target.value)}
                            disabled={isLocked}
                            type="number" step="any"
                            className={`${numCls} ${!row[f] ? "bg-amber-50/60" : ""}`}
                            placeholder="—"
                          />
                        )}
                      </td>
                    ))}
                    <td className="px-2 py-1 border-r border-slate-100 text-right">
                      <span className={`font-mono text-xs font-semibold ${row.quantity > 0 ? "text-slate-800" : "text-slate-300"}`}>
                        {row.quantity > 0 ? formatNumber(row.quantity, 4) : "—"}
                      </span>
                    </td>
                    <td className="px-1 py-0.5 border-r border-slate-100">
                      <span className="text-slate-400 text-xs text-center block">{row.unit}</span>
                    </td>
                    <td className="px-2 py-1 border-r border-slate-100 text-center">
                      {isLastOfItem && finalQty[row.itemNo] > 0 ? (
                        <span className="font-bold text-emerald-700 font-mono text-xs bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          {formatNumber(finalQty[row.itemNo], 3)}
                        </span>
                      ) : null}
                    </td>
                    {!isLocked && (
                      <td className="px-1 py-0.5">
                        <div className="flex items-center gap-0.5 justify-center">
                          <button onClick={() => addSubRow(row.tempId)} title="Add sub-row" className="p-1 text-slate-300 hover:text-blue-500 rounded transition-colors">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteRow(row.tempId)} title="Delete row" className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );

                // Multi-sub-row items: render a description-only header row + compact dim row
                if (isFirstOfItem && !isLastOfItem) {
                  return (
                    <Fragment key={row.tempId}>
                      {/* Header row: item no + GSRTC code + full description — no dimensions */}
                      <tr className="border-t-2 border-t-slate-300 bg-slate-50/60 border-b border-slate-100">
                        <td className="px-1 py-0.5 border-r border-slate-100 text-center">
                          <input
                            value={row.itemNo}
                            onChange={(e) => updateRow(row.tempId, "itemNo", parseInt(e.target.value) || 1)}
                            disabled={isLocked}
                            type="number" min="1"
                            className={`${numCls} text-center font-bold text-slate-700`}
                          />
                        </td>
                        <td className="px-1 py-0.5 border-r border-slate-100">
                          <div className="relative">
                            <input
                              value={row.gsrtcCode}
                              onChange={(e) => {
                                setDirty(true);
                                setRows((prev) => prev.map((r) =>
                                  r.tempId === row.tempId ? { ...r, gsrtcCode: e.target.value } : r
                                ));
                              }}
                              onBlur={(e) => fetchSORItem(row.tempId, e.target.value)}
                              disabled={isLocked}
                              className={`${txtCls} font-mono text-xs text-blue-700 ${row.fetching ? "pr-6" : ""}`}
                              placeholder="Enter code…"
                            />
                            {row.fetching && (
                              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 animate-spin w-3 h-3 border border-blue-500 border-t-transparent rounded-full" />
                            )}
                          </div>
                        </td>
                        {/* Base description (without sub-desc suffix) */}
                        <td className="px-1 py-1 border-r border-slate-100">
                          <textarea
                            value={baseDesc}
                            onChange={(e) => {
                              // Update this row and propagate base desc to all same-item rows
                              const newBase = e.target.value;
                              setDirty(true);
                              setRows((prev) => prev.map((r) => {
                                if (r.itemNo !== row.itemNo) return r;
                                const rSub = extractSubDesc(r.description);
                                return { ...r, description: rSub ? `${newBase} (${rSub})` : newBase };
                              }));
                              e.target.style.height = "auto";
                              e.target.style.height = e.target.scrollHeight + "px";
                            }}
                            disabled={isLocked}
                            rows={1}
                            className={`${txtCls} resize-none overflow-hidden leading-snug font-medium`}
                            placeholder={row.fetching ? "Fetching…" : "Item description…"}
                            style={{ minHeight: "28px" }}
                            ref={(el) => {
                              if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }
                            }}
                          />
                        </td>
                        {/* No dimension inputs in header row */}
                        {(["nos","length","breadth","height"] as const).map((f) => (
                          <td key={f} className="px-1 py-0.5 border-r border-slate-100 text-center">
                            <span className="text-slate-200 text-xs select-none">—</span>
                          </td>
                        ))}
                        <td className="px-2 py-1 border-r border-slate-100" />
                        <td className="px-1 py-0.5 border-r border-slate-100">
                          <input
                            value={row.unit}
                            onChange={(e) => updateRow(row.tempId, "unit", e.target.value)}
                            disabled={isLocked}
                            className={`${txtCls} text-center text-xs`}
                          />
                        </td>
                        <td className="px-2 py-1 border-r border-slate-100" />
                        {!isLocked && <td className="px-1 py-0.5" />}
                      </tr>
                      {/* First sub-row with its dimensions */}
                      {dimRow(true)}
                    </Fragment>
                  );
                }

                // Non-first sub-row in a multi-item group
                if (!isFirstOfItem) {
                  return <Fragment key={row.tempId}>{dimRow(false)}</Fragment>;
                }

                // Single-sub-row item (isFirstOfItem && isLastOfItem) — classic single row
                return (
                  <tr
                    key={row.tempId}
                    className="border-b border-slate-100 border-t-2 border-t-slate-300 bg-slate-50/50 hover:bg-amber-50/20 transition-colors"
                  >
                    <td className="px-1 py-0.5 border-r border-slate-100 text-center">
                      <input
                        value={row.itemNo}
                        onChange={(e) => updateRow(row.tempId, "itemNo", parseInt(e.target.value) || 1)}
                        disabled={isLocked}
                        type="number" min="1"
                        className={`${numCls} text-center font-bold text-slate-700`}
                      />
                    </td>
                    <td className="px-1 py-0.5 border-r border-slate-100">
                      <div className="relative">
                        <input
                          value={row.gsrtcCode}
                          onChange={(e) => {
                            setDirty(true);
                            setRows((prev) => prev.map((r) =>
                              r.tempId === row.tempId ? { ...r, gsrtcCode: e.target.value } : r
                            ));
                          }}
                          onBlur={(e) => fetchSORItem(row.tempId, e.target.value)}
                          disabled={isLocked}
                          className={`${txtCls} font-mono text-xs text-blue-700 ${row.fetching ? "pr-6" : ""}`}
                          placeholder="Enter code…"
                        />
                        {row.fetching && (
                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 animate-spin w-3 h-3 border border-blue-500 border-t-transparent rounded-full" />
                        )}
                      </div>
                    </td>
                    <td className="px-1 py-0.5 border-r border-slate-100">
                      <textarea
                        value={row.description}
                        onChange={(e) => {
                          updateRow(row.tempId, "description", e.target.value);
                          e.target.style.height = "auto";
                          e.target.style.height = e.target.scrollHeight + "px";
                        }}
                        disabled={isLocked}
                        rows={1}
                        className={`${txtCls} resize-none overflow-hidden leading-snug`}
                        placeholder={row.fetching ? "Fetching…" : "Description…"}
                        style={{ minHeight: "28px" }}
                        ref={(el) => {
                          if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }
                        }}
                      />
                    </td>
                    {(["nos","length","breadth","height"] as const).map((f) => (
                      <td key={f} className="px-1 py-0.5 border-r border-slate-100">
                        {f === "length" && !isLocked ? (
                          <div className="flex items-center gap-0.5">
                            <input
                              value={row[f]}
                              onChange={(e) => updateRow(row.tempId, f, e.target.value)}
                              type="number" step="any"
                              className={`${numCls} ${!row[f] ? "bg-amber-50/60" : ""}`}
                              placeholder="—"
                            />
                            <button
                              type="button"
                              title="Carry Forward Final Qty from another item into this Length field"
                              onClick={() => setCfTarget(row.tempId)}
                              className="flex-shrink-0 px-0.5 py-0.5 text-[8px] font-bold text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded leading-none border border-blue-200 h-5"
                            >CF↑</button>
                          </div>
                        ) : (
                          <input
                            value={row[f]}
                            onChange={(e) => updateRow(row.tempId, f, e.target.value)}
                            disabled={isLocked}
                            type="number" step="any"
                            className={`${numCls} ${!row[f] ? "bg-amber-50/60" : ""}`}
                            placeholder="—"
                          />
                        )}
                      </td>
                    ))}
                    <td className="px-2 py-1 border-r border-slate-100 text-right">
                      <span className={`font-mono text-xs font-semibold ${row.quantity > 0 ? "text-slate-800" : "text-slate-300"}`}>
                        {row.quantity > 0 ? formatNumber(row.quantity, 4) : "—"}
                      </span>
                    </td>
                    <td className="px-1 py-0.5 border-r border-slate-100">
                      <input
                        value={row.unit}
                        onChange={(e) => updateRow(row.tempId, "unit", e.target.value)}
                        disabled={isLocked}
                        className={`${txtCls} text-center text-xs`}
                      />
                    </td>
                    <td className="px-2 py-1 border-r border-slate-100 text-center">
                      {finalQty[row.itemNo] > 0 ? (
                        <span className="font-bold text-emerald-700 font-mono text-xs bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          {formatNumber(finalQty[row.itemNo], 3)}
                        </span>
                      ) : null}
                    </td>
                    {!isLocked && (
                      <td className="px-1 py-0.5">
                        <div className="flex items-center gap-0.5 justify-center">
                          <button onClick={() => addSubRow(row.tempId)} title="Add sub-row (same item)" className="p-1 text-slate-300 hover:text-blue-500 rounded transition-colors">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteRow(row.tempId)} title="Delete row" className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!isLocked && (
          <div className="border-t border-slate-200 px-3 py-2 bg-slate-50 flex items-center gap-2 flex-shrink-0">
            <button
              onClick={addItem}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add New Item
            </button>
            <span className="text-xs text-slate-400 ml-auto">
              {rows.length} row{rows.length !== 1 ? "s" : ""}
              &nbsp;&bull;&nbsp;{Object.keys(finalQty).length} item{Object.keys(finalQty).length !== 1 ? "s" : ""}
              &nbsp;&bull;&nbsp;Formula: Nos × L × B × H/D
            </span>
          </div>
        )}
      </div>

      {/* CF↑ Carry-Forward Picker — click L CF↑ button to pick a Final Qty from another item */}
      {cfTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setCfTarget(null)}>
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-80 max-h-96 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">CF↑ Carry Forward into L field</span>
              <button onClick={() => setCfTarget(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              <p className="text-xs text-slate-400 px-2 pb-2">Select an item — its Final Qty will be inserted into the Length field</p>
              {Object.entries(finalQty)
                .filter(([, qty]) => qty > 0)
                .map(([itemNoStr, qty]) => {
                  const itemNo = parseInt(itemNoStr);
                  const firstRow = rows.find((r) => r.itemNo === itemNo);
                  const baseD = firstRow ? extractBaseDesc(firstRow.description) || firstRow.description : "";
                  return (
                    <button
                      key={itemNo}
                      onClick={() => {
                        updateRow(cfTarget, "length", String(qty));
                        setCfTarget(null);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors mb-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-bold text-slate-500 mr-1.5">#{itemNo}</span>
                          <span className="text-xs text-slate-600 line-clamp-1">{baseD}</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-700 shrink-0 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          {formatNumber(qty, 3)}
                        </span>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
