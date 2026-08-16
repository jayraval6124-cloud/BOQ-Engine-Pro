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
  rate?:       number | string | null;
  sorItem?: {
    itemCode:           string;
    cementConsumption:  string | number | null;
    steelConsumption:   string | number | null;
    sandRatio:          string | number | null;
    aggregateRatio:     string | number | null;
    materialDescription:string | null;
    qtyPerTrip:         string | number | null;
  } | null;
}

interface POLRow {
  id:          string;
  srNo:        number;
  itemCode:    string;
  details:     string;
  qty:         number;
  unit:        string;
  qtyPerTrip:  string;   // editable
  avgLead:     string;   // editable
  section:     "A" | "B";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtNum(n: number, dec = 2): string {
  return n.toLocaleString("en-IN", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function trips(qty: number, per: number): number {
  if (!per || per <= 0) return 0;
  return qty / per;
}

function calcKm(qty: number, per: number, lead: number): number {
  return trips(qty, per) * lead;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const FONT = '"Times New Roman", Times, serif';

const TH: React.CSSProperties = {
  border: "1px solid #000", padding: "3px 4px", fontWeight: "bold",
  fontSize: 8.5, textAlign: "center", verticalAlign: "middle", background: "#f5f5f5",
};
const TD: React.CSSProperties  = { border: "1px solid #000", padding: "2px 4px", fontSize: 8, verticalAlign: "top" };
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
  padding: "24px 32px", boxSizing: "border-box",
};

const STEEL_CODES = ["RJ080", "RJ081", "RJ082"];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function POLPage() {
  const [nameOfWork, setNameOfWork] = useState("");
  const [projectId,  setProjectId]  = useState("");
  const [boqId,      setBoqId]      = useState("");
  const [projects,   setProjects]   = useState<ProjectOption[]>([]);
  const [boqList,    setBoqList]    = useState<BOQOption[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [rows,       setRows]       = useState<POLRow[]>([]);
  const [loaded,     setLoaded]     = useState(false);
  const [polRate,    setPolRate]    = useState("1.00");  // Rs per km

  // Section A fixed rows (cement + steel) — editable
  const [secARows, setSecARows] = useState<POLRow[]>([
    { id: "cement", srNo: 1, itemCode: "", details: "Cement", qty: 0, unit: "M.T.", qtyPerTrip: "20", avgLead: "25", section: "A" },
    { id: "steel",  srNo: 2, itemCode: "", details: "TMT Steel", qty: 0, unit: "M.T.", qtyPerTrip: "20", avgLead: "25", section: "A" },
  ]);

  // Section B rows (sand, agg, + material items from BOQ)
  const [secBRows, setSecBRows] = useState<POLRow[]>([]);

  // Load projects
  useEffect(() => {
    fetch("/api/projects?limit=100")
      .then((r) => r.json())
      .then((d) => setProjects(Array.isArray(d.projects) ? d.projects : []))
      .catch(() => {});
  }, []);

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

      // Section A: aggregate cement and steel totals
      let totalCementKg = 0;
      let totalSteelKg  = 0;

      // Section B: sand + agg totals from Statement-1 ratios, + material items
      let totalSandCMT = 0;
      let totalAggCMT  = 0;

      // Material items for Section B (non-steel, non-cement-work)
      const materialItems: POLRow[] = [];
      let matSr = 3; // after sand and agg

      for (const item of rawItems) {
        const qty     = parseFloat(String(item.quantity)) || 0;
        const code    = (item.gsrtcCode ?? item.sorItem?.itemCode ?? item.itemCode ?? "").toUpperCase().trim();
        const isSteel = STEEL_CODES.includes(code);
        const cement  = parseFloat(String(item.sorItem?.cementConsumption ?? 0)) || 0;
        const sand    = parseFloat(String(item.sorItem?.sandRatio ?? 0)) || 0;
        const agg     = parseFloat(String(item.sorItem?.aggregateRatio ?? 0)) || 0;
        const qpt     = parseFloat(String(item.sorItem?.qtyPerTrip ?? 0)) || 14;

        if (isSteel) {
          totalSteelKg += qty;
        } else {
          totalCementKg += qty * cement;
        }

        totalSandCMT += qty * sand;
        totalAggCMT  += qty * agg;

        // Add to Section B as material item if it has qtyPerTrip or a meaningful qty
        const matDesc = item.sorItem?.materialDescription || null;
        if (matDesc && qty > 0) {
          materialItems.push({
            id:          `mat-${item.id}`,
            srNo:        matSr++,
            itemCode:    code,
            details:     matDesc,
            qty,
            unit:        item.unit,
            qtyPerTrip:  String(qpt),
            avgLead:     "25",
            section:     "B",
          });
        }
      }

      const cementMT = totalCementKg / 1000;
      const steelMT  = totalSteelKg  / 1000;

      setSecARows([
        { id: "cement", srNo: 1, itemCode: "", details: "Cement", qty: cementMT, unit: "M.T.", qtyPerTrip: "20", avgLead: "25", section: "A" },
        { id: "steel",  srNo: 2, itemCode: "", details: "TMT Steel", qty: steelMT, unit: "M.T.", qtyPerTrip: "20", avgLead: "25", section: "A" },
      ]);

      const sandRow: POLRow = {
        id: "sand", srNo: 1, itemCode: "M158", details: "Sand",
        qty: totalSandCMT, unit: "CMT", qtyPerTrip: "14", avgLead: "25", section: "B",
      };
      const aggRow: POLRow = {
        id: "agg", srNo: 2, itemCode: "M176", details: "Kapchi / Aggregate",
        qty: totalAggCMT, unit: "CMT", qtyPerTrip: "14", avgLead: "25", section: "B",
      };

      setSecBRows([sandRow, aggRow, ...materialItems]);
      setRows(rawItems.map((i) => ({ ...i } as unknown as POLRow)));

      if (!nameOfWork && data.project?.name) setNameOfWork(data.project.name);
    } finally {
      setLoaded(true);
      setLoading(false);
    }
  }, [boqId, nameOfWork]);

  const updateRow = (
    section: "A" | "B",
    id: string,
    field: "qty" | "qtyPerTrip" | "avgLead",
    val: string,
  ) => {
    const setter = section === "A" ? setSecARows : setSecBRows;
    setter((prev) =>
      prev.map((r) => r.id === id ? { ...r, [field]: field === "qty" ? parseFloat(val) || 0 : val } : r),
    );
  };

  const removeRow = (section: "A" | "B", id: string) => {
    const setter = section === "A" ? setSecARows : setSecBRows;
    setter((prev) => prev.filter((r) => r.id !== id));
  };

  const { totalKmA, totalKmB, totalKm, totalRs } = useMemo(() => {
    const kmA = secARows.reduce((s, r) => {
      const per  = parseFloat(r.qtyPerTrip) || 1;
      const lead = parseFloat(r.avgLead) || 0;
      return s + calcKm(r.qty, per, lead);
    }, 0);
    const kmB = secBRows.reduce((s, r) => {
      const per  = parseFloat(r.qtyPerTrip) || 1;
      const lead = parseFloat(r.avgLead) || 0;
      return s + calcKm(r.qty, per, lead);
    }, 0);
    const km   = kmA + kmB;
    const rate = parseFloat(polRate) || 0;
    return { totalKmA: kmA, totalKmB: kmB, totalKm: km, totalRs: km * rate };
  }, [secARows, secBRows, polRate]);

  const handlePrint = () => {
    const el = document.getElementById("pol-a4");
    if (!el) return;
    const pw = window.open("", "_blank", "width=900,height=700");
    if (!pw) { alert("Please allow pop-ups for this site."); return; }
    pw.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>P.O.L.</title>
<style>${PRINT_STYLE}</style></head>
<body>${el.innerHTML}</body></html>`);
    pw.document.close();
    pw.onload = () => { setTimeout(() => { pw.print(); pw.close(); }, 500); };
    setTimeout(() => { if (!pw.closed) { pw.print(); pw.close(); } }, 2500);
  };

  const allLoaded = loaded && (secARows.length > 0 || secBRows.length > 0);

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
            <h1 className="text-base font-bold text-slate-800">P.O.L.</h1>
            <p className="text-xs text-slate-400">Petroleum, Oil &amp; Lubricants</p>
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

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">POL Settings</p>
          <div>
            <label className="block text-xs text-slate-500 mb-1">POL Rate (Rs. per km)</label>
            <input
              type="number"
              value={polRate}
              onChange={(e) => setPolRate(e.target.value)}
              step="0.01"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <p className="text-xs text-slate-400">Avg. Lead and Qty/Trip can be edited per row in the preview.</p>
        </div>

        {allLoaded && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2 text-xs">
            <p className="font-semibold text-slate-600 uppercase tracking-wide mb-1">Totals</p>
            <div className="flex justify-between">
              <span className="text-slate-500">Section A KM</span>
              <span className="font-medium">{fmtNum(totalKmA, 2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Section B KM</span>
              <span className="font-medium">{fmtNum(totalKmB, 2)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-1">
              <span className="text-slate-700 font-semibold">Total KM</span>
              <span className="font-bold">{fmtNum(totalKm, 2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700 font-semibold">Total Rs.</span>
              <span className="font-bold text-green-700">₹ {fmtNum(totalRs, 0)}</span>
            </div>
          </div>
        )}

        {allLoaded && (
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
        {!allLoaded ? (
          <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
            Select a BOQ and click &quot;Load from BOQ&quot; to preview P.O.L.
          </div>
        ) : (
          <div id="pol-a4" style={PAGE}>

            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: "bold" }}>G.S.R.T.C. Central Office Ranip, Ahmedabad</div>
              <div style={{ fontSize: 9, marginTop: 4 }}>
                <strong>Name of Work :-</strong>&nbsp;{nameOfWork || "—"}
              </div>
            </div>

            <div style={{ textAlign: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: "bold", textDecoration: "underline" }}>P.O.L.</div>
            </div>

            {/* Shared column layout */}
            {(() => {
              const colGroup = (
                <colgroup>
                  <col style={{ width: "5%" }}  />
                  <col style={{ width: "8%" }}  />
                  <col style={{ width: "30%" }} />
                  <col style={{ width: "8%" }}  />
                  <col style={{ width: "6%" }}  />
                  <col style={{ width: "7%" }}  />
                  <col style={{ width: "8%" }}  />
                  <col style={{ width: "7%" }}  />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "5%" }}  />
                </colgroup>
              );
              const thead = (
                <thead>
                  <tr>
                    <th style={TH}>Sr.<br/>No.</th>
                    <th style={TH}>Item<br/>Code</th>
                    <th style={TH}>Details of Material</th>
                    <th style={TH}>Qty</th>
                    <th style={TH}>Per</th>
                    <th style={TH}>Qty.Per<br/>(Load)</th>
                    <th style={TH}>No.Of<br/>Trip</th>
                    <th style={TH}>Avg.Lead<br/>(km)</th>
                    <th style={TH}>Total K.M.</th>
                    <th style={TH} className="no-print">×</th>
                  </tr>
                </thead>
              );

              const renderRows = (sectionRows: POLRow[], section: "A" | "B") =>
                sectionRows.map((row, idx) => {
                  const per   = parseFloat(row.qtyPerTrip) || 1;
                  const lead  = parseFloat(row.avgLead) || 0;
                  const tr    = trips(row.qty, per);
                  const km    = calcKm(row.qty, per, lead);
                  return (
                    <tr key={row.id}>
                      <td style={TDc}>{idx + 1}</td>
                      <td style={TDc}>{row.itemCode}</td>
                      <td style={TD}>{row.details}</td>
                      <td style={TDr}>
                        <input
                          type="number"
                          value={row.qty}
                          onChange={(e) => updateRow(section, row.id, "qty", e.target.value)}
                          style={{ textAlign: "right", width: "100%", border: "none", background: "transparent", font: "inherit" }}
                        />
                      </td>
                      <td style={TDc}>{row.unit}</td>
                      <td style={TDr}>
                        <input
                          type="number"
                          value={row.qtyPerTrip}
                          onChange={(e) => updateRow(section, row.id, "qtyPerTrip", e.target.value)}
                          style={{ textAlign: "right", width: "100%", border: "none", background: "transparent", font: "inherit" }}
                        />
                      </td>
                      <td style={TDr}>{fmtNum(tr, 2)}</td>
                      <td style={TDr}>
                        <input
                          type="number"
                          value={row.avgLead}
                          onChange={(e) => updateRow(section, row.id, "avgLead", e.target.value)}
                          style={{ textAlign: "right", width: "100%", border: "none", background: "transparent", font: "inherit" }}
                        />
                      </td>
                      <td style={TDr}>{fmtNum(km, 2)}</td>
                      <td style={TDc} className="no-print">
                        <button onClick={() => removeRow(section, row.id)} style={{ color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                          <X size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                });

              return (
                <>
                  {/* Section A */}
                  <div style={{ fontWeight: "bold", fontSize: 9, marginBottom: 4, textDecoration: "underline" }}>
                    A :- Cost Of Steel, Cement &amp; Asphalt
                  </div>
                  <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 8 }}>
                    {colGroup}
                    {thead}
                    <tbody>
                      {renderRows(secARows, "A")}
                      <tr>
                        <td style={{ ...TDr, fontWeight: "bold" }} colSpan={8}>Total K.M. (Section A)</td>
                        <td style={{ ...TDr, fontWeight: "bold" }}>{fmtNum(totalKmA, 2)}</td>
                        <td style={TDc} className="no-print"></td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Section B */}
                  <div style={{ fontWeight: "bold", fontSize: 9, marginBottom: 4, textDecoration: "underline" }}>
                    B :- Material Other than Steel, Cement &amp; Asphalt
                  </div>
                  <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 8 }}>
                    {colGroup}
                    {thead}
                    <tbody>
                      {renderRows(secBRows, "B")}
                      <tr>
                        <td style={{ ...TDr, fontWeight: "bold" }} colSpan={8}>Total K.M. (Section B)</td>
                        <td style={{ ...TDr, fontWeight: "bold" }}>{fmtNum(totalKmB, 2)}</td>
                        <td style={TDc} className="no-print"></td>
                      </tr>
                    </tbody>
                  </table>
                </>
              );
            })()}

            {/* Summary */}
            <table style={{ borderCollapse: "collapse", width: "60%", marginLeft: "auto", marginTop: 4 }}>
              <tbody>
                <tr>
                  <td style={{ ...TD, fontWeight: "bold", width: "60%" }}>Total K.M.</td>
                  <td style={{ ...TDr, fontWeight: "bold" }}>{fmtNum(totalKm, 2)}</td>
                </tr>
                <tr>
                  <td style={{ ...TD, fontWeight: "bold" }}>POL Rate (Rs./km)</td>
                  <td style={{ ...TDr, fontWeight: "bold" }}>
                    <input
                      type="number"
                      value={polRate}
                      onChange={(e) => setPolRate(e.target.value)}
                      style={{ textAlign: "right", width: "100%", border: "none", background: "transparent", font: "inherit", fontWeight: "bold" }}
                    />
                  </td>
                </tr>
                <tr>
                  <td style={{ ...TD, fontWeight: "bold" }}>Total Rs. :-</td>
                  <td style={{ ...TDr, fontWeight: "bold" }}>{fmtNum(totalRs, 2)}</td>
                </tr>
                <tr>
                  <td style={{ ...TD, fontWeight: "bold" }}>Say Rs. :-</td>
                  <td style={{ ...TDr, fontWeight: "bold" }}>{fmtNum(Math.round(totalRs), 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
