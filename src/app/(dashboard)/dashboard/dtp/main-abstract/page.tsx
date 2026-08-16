"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Printer, ArrowLeft, RefreshCw } from "lucide-react";
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
    itemCode:            string;
    cementConsumption:   string | number | null;
    steelConsumption:    string | number | null;
    sandRatio:           string | number | null;
    aggregateRatio:      string | number | null;
    materialDescription: string | null;
    qtyPerTrip:          string | number | null;
  } | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtNum(n: number, dec = 2): string {
  return n.toLocaleString("en-IN", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtRs(n: number): string {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pct(part: number, total: number): string {
  if (!total) return "0.00";
  return ((part / total) * 100).toFixed(2);
}

// ── Styles ────────────────────────────────────────────────────────────────────

const FONT = '"Times New Roman", Times, serif';

const PRINT_STYLE = `
  @page { size: A4 portrait; margin: 12mm 14mm; }
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

const TD: React.CSSProperties  = { border: "1px solid #000", padding: "4px 8px", fontSize: 9.5, verticalAlign: "middle" };
const TDr: React.CSSProperties = { ...TD, textAlign: "right" };
const TDc: React.CSSProperties = { ...TD, textAlign: "center" };
const TDB: React.CSSProperties = { ...TD, fontWeight: "bold" };
const TDBr: React.CSSProperties = { ...TDr, fontWeight: "bold" };

const STEEL_CODES = ["RJ080", "RJ081", "RJ082"];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MainAbstractPage() {
  const [nameOfWork, setNameOfWork] = useState("");
  const [projectId,  setProjectId]  = useState("");
  const [boqId,      setBoqId]      = useState("");
  const [projects,   setProjects]   = useState<ProjectOption[]>([]);
  const [boqList,    setBoqList]    = useState<BOQOption[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [loaded,     setLoaded]     = useState(false);

  // Calculated base values (from BOQ)
  const [boqTotal,       setBoqTotal]       = useState(0);
  const [cementMT,       setCementMT]       = useState(0);
  const [steelMT,        setSteelMT]        = useState(0);
  const [sandCMT,        setSandCMT]        = useState(0);
  const [aggCMT,         setAggCMT]         = useState(0);
  const [matCost,        setMatCost]        = useState(0); // other material Section B cost

  // User-editable rates
  const [cementRate,     setCementRate]     = useState("");  // Rs per MT
  const [steelRate,      setSteelRate]      = useState("");  // Rs per MT
  const [sandRate,       setSandRate]       = useState("");  // Rs per CMT
  const [aggRate,        setAggRate]        = useState("");  // Rs per CMT
  const [polTotal,       setPolTotal]       = useState("");  // [E] from POL sheet
  const [plantPct,       setPlantPct]       = useState("25"); // % of F for plant & machinery

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
    setLoaded(false);
    try {
      const res = await fetch(`/api/boq/${boqId}`);
      if (!res.ok) return;
      const text = await res.text();
      if (!text) return;
      const data = JSON.parse(text);
      if (!data.items) return;

      const rawItems: BOQItemRaw[] = data.items;

      let totalBoqAmount = 0;
      let totalCementKg  = 0;
      let totalSteelKg   = 0;
      let totalSandCMT   = 0;
      let totalAggCMT    = 0;
      let totalMatCost   = 0;

      for (const item of rawItems) {
        const qty  = parseFloat(String(item.quantity)) || 0;
        const rate = parseFloat(String(item.rate ?? 0)) || 0;
        const code = (item.gsrtcCode ?? item.sorItem?.itemCode ?? item.itemCode ?? "").toUpperCase().trim();
        const isSteel = STEEL_CODES.includes(code);

        totalBoqAmount += qty * rate;

        const cement = parseFloat(String(item.sorItem?.cementConsumption ?? 0)) || 0;
        const sand   = parseFloat(String(item.sorItem?.sandRatio ?? 0)) || 0;
        const agg    = parseFloat(String(item.sorItem?.aggregateRatio ?? 0)) || 0;

        if (isSteel) {
          totalSteelKg += qty;
        } else {
          totalCementKg += qty * cement;
        }

        totalSandCMT += qty * sand;
        totalAggCMT  += qty * agg;

        // Material cost for other items (from materialDescription items)
        if (item.sorItem?.materialDescription && !isSteel && qty > 0) {
          // Material cost is captured from Cost of Material page; here we track BOQ amount only
          totalMatCost += 0; // placeholder — user will enter B and C totals from their sheets
        }
      }

      setBoqTotal(totalBoqAmount);
      setCementMT(totalCementKg / 1000);
      setSteelMT(totalSteelKg  / 1000);
      setSandCMT(totalSandCMT);
      setAggCMT(totalAggCMT);
      setMatCost(totalMatCost);

      if (!nameOfWork && data.project?.name) setNameOfWork(data.project.name);

      // Auto-fetch sand/agg rates from SOR (M158=Sand, M176=Aggregate)
      if (data.items[0]) {
        const division = data.project?.division || "";
        const year     = data.project?.sorYear   || "2024-25";
        if (division) {
          Promise.all([
            fetch(`/api/sor/lookup?code=M158&division=${division}&year=${year}`).then((r) => r.json()).catch(() => null),
            fetch(`/api/sor/lookup?code=M176&division=${division}&year=${year}`).then((r) => r.json()).catch(() => null),
          ]).then(([sandItem, aggItem]) => {
            if (sandItem?.rate) setSandRate(String(Number(sandItem.rate)));
            if (aggItem?.rate)  setAggRate(String(Number(aggItem.rate)));
          });
        }
      }
    } finally {
      setLoaded(true);
      setLoading(false);
    }
  }, [boqId, nameOfWork]);

  // ── Derived values ────────────────────────────────────────────────────────

  const { A, B, cementCost, steelCost, C, sandCost, aggCost, D, E, F, G } = useMemo(() => {
    const cR = parseFloat(cementRate) || 0;
    const sR = parseFloat(steelRate)  || 0;
    const saR = parseFloat(sandRate)  || 0;
    const agR = parseFloat(aggRate)   || 0;

    const cCost = cementMT * cR;
    const sCost = steelMT  * sR;
    const snCost = sandCMT * saR;
    const agCost = aggCMT  * agR;

    const a = boqTotal;
    const b = cCost + sCost;
    const c = snCost + agCost + matCost;
    const d = a - b;
    const e = parseFloat(polTotal) || 0;
    const f = d - c - e;
    const pctPlant = parseFloat(plantPct) / 100 || 0.25;
    const g = f * pctPlant;

    return { A: a, B: b, cementCost: cCost, steelCost: sCost, C: c, sandCost: snCost, aggCost: agCost, D: d, E: e, F: f, G: g };
  }, [boqTotal, cementMT, steelMT, cementRate, steelRate, sandCMT, aggCMT, sandRate, aggRate, matCost, polTotal, plantPct]);

  const handlePrint = () => {
    const el = document.getElementById("abstract-a4");
    if (!el) return;
    const pw = window.open("", "_blank", "width=900,height=700");
    if (!pw) { alert("Please allow pop-ups for this site."); return; }
    pw.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Main Abstract</title>
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
            <h1 className="text-base font-bold text-slate-800">Main Abstract</h1>
            <p className="text-xs text-slate-400">Labour · Material · POL Components</p>
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

        {/* Rates panel */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Material Rates</p>

          {loaded && (
            <div className="text-xs text-slate-500 space-y-1 bg-slate-50 rounded-lg p-2">
              <div className="flex justify-between"><span>Cement:</span><span className="font-medium">{fmtNum(cementMT, 3)} MT</span></div>
              <div className="flex justify-between"><span>Steel:</span><span className="font-medium">{fmtNum(steelMT, 3)} MT</span></div>
              <div className="flex justify-between"><span>Sand:</span><span className="font-medium">{fmtNum(sandCMT, 3)} CMT</span></div>
              <div className="flex justify-between"><span>Aggregate:</span><span className="font-medium">{fmtNum(aggCMT, 3)} CMT</span></div>
            </div>
          )}

          {[
            { label: "Cement Rate (Rs./MT)", value: cementRate, set: setCementRate },
            { label: "Steel Rate (Rs./MT)",  value: steelRate,  set: setSteelRate  },
            { label: "Sand Rate (Rs./CMT)",  value: sandRate,   set: setSandRate   },
            { label: "Agg Rate (Rs./CMT)",   value: aggRate,    set: setAggRate    },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <label className="block text-xs text-slate-500 mb-1">{label}</label>
              <input
                type="number"
                value={value}
                onChange={(e) => set(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
              />
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">POL &amp; Plant</p>
          <div>
            <label className="block text-xs text-slate-500 mb-1">[E] POL Total (Rs.) — from POL sheet</label>
            <input
              type="number"
              value={polTotal}
              onChange={(e) => setPolTotal(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">[G] Plant &amp; Machinery (% of [F])</label>
            <input
              type="number"
              value={plantPct}
              onChange={(e) => setPlantPct(e.target.value)}
              placeholder="25"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
            />
          </div>
        </div>

        {loaded && (
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
        {!loaded ? (
          <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
            Select a BOQ and click &quot;Load from BOQ&quot; to preview Main Abstract.
          </div>
        ) : (
          <div id="abstract-a4" style={PAGE}>

            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: "bold" }}>G.S.R.T.C. Central Office Ranip, Ahmedabad</div>
              <div style={{ fontSize: 10, marginTop: 6, fontWeight: "bold", textDecoration: "underline" }}>
                Details of Labour, Material &amp; P.O.L. Component
              </div>
              <div style={{ fontSize: 9, marginTop: 6 }}>
                <strong>Name of Work :-</strong>&nbsp;{nameOfWork || "—"}
              </div>
            </div>

            {/* Main table */}
            <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 16 }}>
              <colgroup>
                <col style={{ width: "6%" }}  />
                <col style={{ width: "64%" }} />
                <col style={{ width: "4%" }}  />
                <col style={{ width: "20%" }} />
                <col style={{ width: "6%" }}  />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ ...TD, fontWeight: "bold", textAlign: "center", background: "#f5f5f5" }}>Sr.</th>
                  <th style={{ ...TD, fontWeight: "bold", background: "#f5f5f5" }}>Description</th>
                  <th style={{ ...TD, fontWeight: "bold", textAlign: "center", background: "#f5f5f5" }}>Unit</th>
                  <th style={{ ...TD, fontWeight: "bold", textAlign: "right", background: "#f5f5f5" }}>Amount (Rs.)</th>
                  <th style={{ ...TD, fontWeight: "bold", textAlign: "center", background: "#f5f5f5" }}>Ref.</th>
                </tr>
              </thead>
              <tbody>
                {/* [A] */}
                <tr>
                  <td style={TDc}>[A]</td>
                  <td style={TD}>Estimated Amount put to Tender</td>
                  <td style={TDc}>Rs.</td>
                  <td style={TDBr}>
                    <input
                      type="number"
                      value={boqTotal || ""}
                      onChange={(e) => setBoqTotal(parseFloat(e.target.value) || 0)}
                      style={{ textAlign: "right", width: "100%", border: "none", background: "transparent", font: "inherit", fontWeight: "bold" }}
                    />
                  </td>
                  <td style={TDc}>A</td>
                </tr>

                {/* [B] */}
                <tr>
                  <td style={TDc}>[B]</td>
                  <td style={TD}>
                    Cost of Steel, Cement and Asphalt
                    <div style={{ fontSize: 7.5, color: "#555", marginTop: 2 }}>
                      Cement: {fmtNum(cementMT, 3)} MT × ₹{cementRate || "0"} = ₹{fmtRs(cementCost)}&nbsp;&nbsp;|&nbsp;&nbsp;
                      Steel: {fmtNum(steelMT, 3)} MT × ₹{steelRate || "0"} = ₹{fmtRs(steelCost)}
                    </div>
                  </td>
                  <td style={TDc}>Rs.</td>
                  <td style={TDBr}>{fmtRs(B)}</td>
                  <td style={TDc}>B</td>
                </tr>

                {/* [C] */}
                <tr>
                  <td style={TDc}>[C]</td>
                  <td style={TD}>
                    Cost of Materials Other than Steel, Cement &amp; Asphalt
                    <div style={{ fontSize: 7.5, color: "#555", marginTop: 2 }}>
                      Sand: {fmtNum(sandCMT, 3)} CMT × ₹{sandRate || "0"} = ₹{fmtRs(sandCost)}&nbsp;&nbsp;|&nbsp;&nbsp;
                      Agg: {fmtNum(aggCMT, 3)} CMT × ₹{aggRate || "0"} = ₹{fmtRs(aggCost)}
                    </div>
                  </td>
                  <td style={TDc}>Rs.</td>
                  <td style={TDBr}>{fmtRs(C)}</td>
                  <td style={TDc}>C</td>
                </tr>

                {/* [D] */}
                <tr style={{ background: "#f0f9ff" }}>
                  <td style={TDc}>[D]</td>
                  <td style={{ ...TDB }}>
                    Estimated Amount Excluding Steel, Cement &amp; Asphalt = [A] - [B]
                  </td>
                  <td style={TDc}>Rs.</td>
                  <td style={TDBr}>{fmtRs(D)}</td>
                  <td style={TDc}>D</td>
                </tr>

                {/* [E] */}
                <tr>
                  <td style={TDc}>[E]</td>
                  <td style={TD}>Cost of P.O.L.</td>
                  <td style={TDc}>Rs.</td>
                  <td style={TDBr}>
                    <input
                      type="number"
                      value={polTotal}
                      onChange={(e) => setPolTotal(e.target.value)}
                      placeholder="0.00"
                      style={{ textAlign: "right", width: "100%", border: "none", background: "transparent", font: "inherit", fontWeight: "bold" }}
                    />
                  </td>
                  <td style={TDc}>E</td>
                </tr>

                {/* [F] */}
                <tr style={{ background: "#f0f9ff" }}>
                  <td style={TDc}>[F]</td>
                  <td style={TDB}>
                    Cost of Labour = [A] - [B] - [C] - [E] = [D] - [C] - [E]
                  </td>
                  <td style={TDc}>Rs.</td>
                  <td style={TDBr}>{fmtRs(F)}</td>
                  <td style={TDc}>F</td>
                </tr>

                {/* [G] */}
                <tr>
                  <td style={TDc}>[G]</td>
                  <td style={TD}>
                    Cost of Plant &amp; Machinery = {plantPct}% of [F]
                  </td>
                  <td style={TDc}>Rs.</td>
                  <td style={TDBr}>{fmtRs(G)}</td>
                  <td style={TDc}>G</td>
                </tr>
              </tbody>
            </table>

            {/* Percentage breakdown */}
            <div style={{ fontWeight: "bold", fontSize: 10, marginBottom: 8, textDecoration: "underline" }}>
              Percentage Breakdown
            </div>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <colgroup>
                <col style={{ width: "5%" }}  />
                <col style={{ width: "65%" }} />
                <col style={{ width: "30%" }} />
              </colgroup>
              <tbody>
                {[
                  { sr: "1", label: `Percentage of Labour Component = [F] / [A] × 100`, value: `${pct(F, A)} %` },
                  { sr: "2", label: `Percentage of Material Component = [C] / [A] × 100`, value: `${pct(C, A)} %` },
                  { sr: "3", label: `Percentage of P.O.L. Component = [E] / [A] × 100`, value: `${pct(E, A)} %` },
                  { sr: "4", label: `Percentage of Steel Component = Steel Cost / [A] × 100`, value: `${pct(steelCost, A)} %` },
                  { sr: "5", label: `Percentage of Cement Component = Cement Cost / [A] × 100`, value: `${pct(cementCost, A)} %` },
                  { sr: "6", label: `Percentage of Plant & Machinery Component = [G] / [A] × 100`, value: `${pct(G, A)} %` },
                ].map(({ sr, label, value }) => (
                  <tr key={sr}>
                    <td style={TDc}>{sr}</td>
                    <td style={TD}>{label}</td>
                    <td style={{ ...TDr, fontWeight: "bold" }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Signature line */}
            <div style={{ marginTop: 32, display: "flex", justifyContent: "space-between", fontSize: 9 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ borderTop: "1px solid #000", width: 160, margin: "0 auto 4px" }}></div>
                Prepared by
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ borderTop: "1px solid #000", width: 160, margin: "0 auto 4px" }}></div>
                Checked by
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ borderTop: "1px solid #000", width: 160, margin: "0 auto 4px" }}></div>
                Approved by
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
