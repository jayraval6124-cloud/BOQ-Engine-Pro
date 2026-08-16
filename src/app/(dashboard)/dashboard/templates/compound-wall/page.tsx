"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, Download, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";

// ── Default inputs ─────────────────────────────────────────────────────────────
const DEFAULTS = {
  workName: "Construction of Compound Wall",
  division: "GSRTC",
  L: 300, Hw: 3.0, Hp: 1.2,
  cs: 0.35, sp: 2.5,
  Lf: 1.65, Hf: 1.5, tp: 0.15, tr: 0.30,
  gbw: 0.35, gbd: 0.45, ct: 0.15,
  wt: 0.23, ph: 2.82,
  Dl: 0, Dt: 0.30, Dh: 1.50,
  fw: 300, ss: 2.0,
  sr_f: 75, sr_gb: 150, sr_col: 175, sr_cop: 80,
};

const DEFAULT_RATES = [557.32, 316.22, 3064.60, 4482.00, 7085.00, 7085.00, 5559.00, 5559.00, 76.52, 5353.74, 312.56, 119.07, 150.00, 388.05];

type Inp = typeof DEFAULTS;

// ── Live quantity calculations ─────────────────────────────────────────────────
function calcAll(inp: Inp) {
  const { L, Hw, Hp, cs, sp, Lf, Hf, tp, tr, gbw, gbd, ct, wt, ph, Dl, Dt, Dh, fw, ss, sr_f, sr_gb, sr_col, sr_cop } = inp;
  const N   = Math.round(L / sp);
  const Hab = Hw - Hp;

  const q1  = Dl * Dt * Dh;
  const q2  = N * Lf * Lf * Hf + L * (gbw + 0.10) * (tr / 3);
  const q3  = N * Lf * Lf * tp + L * (gbw + 0.10) * (tr / 3);
  const A1  = (cs + 0.1) ** 2;
  const A2  = (Lf - 0.15) ** 2;
  const q4  = N * (Lf - 0.15) ** 2 * tr + N * (tr / 3) * (A1 + A2 + Math.sqrt(A1 * A2));
  const q5  = N * cs * cs * Hp;
  const q6  = N * cs * cs * Hab;
  const q7  = L * gbw * gbd - N * gbw * gbd;
  const q8  = L * cs * ct;
  const q9  = q4 * sr_f + q7 * sr_gb + (q5 + q6) * sr_col + q8 * sr_cop;
  const q10 = L * wt * Hab;
  const q11 = 2 * L * ph + N * 4 * Math.max((cs - wt) / 2, 0) * Hab + L * cs + 2 * L * ct;
  const q12 = q11;
  const q13 = Math.round(L / ss);
  const q14 = fw;

  return { N, Hab, qtys: [q1, q2, q3, q4, q5, q6, q7, q8, q9, q10, q11, q12, q13, q14] };
}

// ── Item definitions ───────────────────────────────────────────────────────────
const ITEMS = [
  { no: 1,  code: "RJ001", unit: "Cmt",  desc: "Demolition of B.B. / stone masonry wall incl. tools, scaffolding, stacking serviceable & disposing unserviceable materials (In C.M.)" },
  { no: 2,  code: "RJ013", unit: "Cmt",  desc: "Excavation for foundation in any kind of soil incl. dewatering, shoring, backfilling in layers of 20 cm with watering & consolidating etc. (A) 0.00–1.50 m" },
  { no: 3,  code: "RJ027", unit: "Cmt",  desc: "Providing & laying cement concrete 1:3:6 and curing complete excl. formwork. (A) Foundation, plinth & any place" },
  { no: 4,  code: "RJ030", unit: "Cmt",  desc: "Providing & Laying RCC M-250 using 12–20 mm aggregate incl. formwork, machine mixing, vibration, curing etc. complete. (A) Foundation & Plinth" },
  { no: 5,  code: "RJ032", unit: "Cmt",  desc: "Providing & Laying RCC M-250 complete. (A) Column — Upto Plinth Level" },
  { no: 6,  code: "RJ033", unit: "Cmt",  desc: "Providing & Laying RCC M-250 complete. (B) Column — Upto Ground Floor / Top of Wall" },
  { no: 7,  code: "RJ031", unit: "Cmt",  desc: "Providing & Laying RCC M-250 complete. (A) Ground Beam" },
  { no: 8,  code: "RJ053", unit: "Cmt",  desc: "Providing & Laying RCC M-250 complete. (A) Coping / Sills" },
  { no: 9,  code: "RJ080", unit: "Kg",   desc: "Providing TMT Bar FE 500D reinforcement for R.C.C. work including bending, binding and placing in position complete." },
  { no: 10, code: "RJ097", unit: "Cmt",  desc: "Providing & laying Bela / Brick masonry in C.M. (1:6) incl. dressing, racking, watering, curing, scaffolding etc. complete. (A) Above Plinth Level" },
  { no: 11, code: "RJ116", unit: "Smt",  desc: "Providing 20 mm thick Sand Faced Cement Plaster (12 mm C.M. 1:3 + 8 mm C.M. 1:1) incl. pattas, pattis, watering, curing, scaffolding etc." },
  { no: 12, code: "RJ152", unit: "Smt",  desc: "Finishing wall with weatherproof exterior emulsion paint (two coats) after brushing surface etc. complete" },
  { no: 13, code: "RJ273", unit: "Nos",  desc: "Providing & fixing 110 mm dia. PVC rain water spout pipe min. 60 cm length in C.M. (1:1) at max. 1 m c/c interval etc. complete" },
  { no: 14, code: "RJ166", unit: "Rmt",  desc: "Providing & fixing 1.20 m high barbed wire fencing with M.S. angle posts 40×40×6 mm at 3 m c/c, 5 horizontal + 2 diagonal G.I. barbed wire lines, oil paint 3 coats, posts fixed in C.C. (1:2:4) block etc. complete" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number, dec = 2) =>
  isNaN(n) || !isFinite(n) ? "—" : n.toLocaleString("en-IN", { minimumFractionDigits: dec, maximumFractionDigits: dec });

const fmtRs = (n: number) =>
  isNaN(n) || !isFinite(n) ? "—" : "₹ " + n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// ── Input field component ──────────────────────────────────────────────────────
function Field({
  label, value, onChange, unit, step = 0.01, min = 0,
}: {
  label: string; value: number | string; onChange: (v: number | string) => void;
  unit?: string; step?: number; min?: number;
}) {
  const isText = typeof value === "string";
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-600 flex-1 leading-tight">{label}</span>
      <div className="flex items-center gap-1 shrink-0">
        {isText ? (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-40 text-xs text-right border border-amber-300 rounded px-2 py-1 bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        ) : (
          <input
            type="number"
            value={value as number}
            step={step}
            min={min}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            className="w-20 text-xs text-right border border-amber-300 rounded px-2 py-1 bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        )}
        {unit && <span className="text-xs text-slate-400 w-8">{unit}</span>}
      </div>
    </div>
  );
}

// ── Accordion section ─────────────────────────────────────────────────────────
function Section({
  title, children, defaultOpen = true,
}: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{title}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
      </button>
      {open && <div className="px-3 py-2">{children}</div>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CompoundWallPage() {
  const [inp, setInp] = useState<Inp>(DEFAULTS);
  const [rates, setRates] = useState<number[]>(DEFAULT_RATES);
  const [exporting, setExporting] = useState(false);

  const set = useCallback((key: keyof Inp) => (v: number | string) => {
    setInp((prev) => ({ ...prev, [key]: v }));
  }, []);

  const { N, Hab, qtys } = useMemo(() => calcAll(inp), [inp]);

  const amounts = qtys.map((q, i) => q * (rates[i] ?? 0));
  const total   = amounts.reduce((s, a) => s + a, 0);
  const pct1    = total * 0.01;
  const tender  = total + pct1;
  const gst     = tender * 0.18;
  const withGst = tender + gst;
  const cont5   = withGst * 0.05;
  const des2    = withGst * 0.02;
  const estimated = withGst + cont5 + des2;
  const say     = Math.round(estimated);

  async function exportExcel() {
    setExporting(true);
    try {
      const res = await fetch("/api/templates/compound-wall/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inp, rates }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `CW_Estimate_${inp.workName.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/templates" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Compound Wall Estimate</h1>
            <p className="text-slate-500 text-xs">14-item GSRTC standard estimate — fill inputs, get instant quantities & amounts</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setInp(DEFAULTS); setRates(DEFAULT_RATES); }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset
          </button>
          <button
            onClick={exportExcel}
            disabled={exporting}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60 transition-colors font-medium"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? "Exporting…" : "Export Excel"}
          </button>
        </div>
      </div>

      {/* Derived summary cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "No. of Columns", value: N.toString(), unit: "nos" },
          { label: "Height Above Plinth", value: fmt(Hab), unit: "m" },
          { label: "Wall Length", value: fmt(inp.L, 0), unit: "m" },
          { label: "Say Estimated Cost", value: fmtRs(say), unit: "", bold: true },
        ].map((c) => (
          <div key={c.label} className={`bg-white rounded-xl border shadow-sm p-4 ${c.bold ? "border-amber-300 bg-amber-50" : "border-slate-200"}`}>
            <p className="text-xs text-slate-500">{c.label}</p>
            <p className={`text-lg font-bold mt-0.5 ${c.bold ? "text-amber-700" : "text-slate-800"}`}>
              {c.value} <span className="text-xs font-normal text-slate-400">{c.unit}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-4 items-start">
        {/* ── LEFT: Input panel ─────────────────────────────────────── */}
        <div className="w-80 shrink-0 space-y-2">
          <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
            ⚠ Fill yellow fields only — all quantities auto-calculate
          </p>

          <Section title="Project Details">
            <Field label="Name of Work" value={inp.workName} onChange={set("workName")} />
            <Field label="Division / Station" value={inp.division} onChange={set("division")} />
          </Section>

          <Section title="Wall Dimensions">
            <Field label="Total Wall Length  L" value={inp.L} onChange={set("L")} unit="m" step={1} />
            <Field label="Total Wall Height above GL  Hw" value={inp.Hw} onChange={set("Hw")} unit="m" />
            <Field label="Plinth Height above GL  Hp" value={inp.Hp} onChange={set("Hp")} unit="m" />
          </Section>

          <Section title="Column Details">
            <Field label="Column Size (square)  cs" value={inp.cs} onChange={set("cs")} unit="m" />
            <Field label="Column Spacing c/c  sp" value={inp.sp} onChange={set("sp")} unit="m" />
          </Section>

          <Section title="Foundation">
            <Field label="Footing Plan Size (square)  Lf" value={inp.Lf} onChange={set("Lf")} unit="m" />
            <Field label="Foundation Depth below GL  Hf" value={inp.Hf} onChange={set("Hf")} unit="m" />
            <Field label="PCC Thickness  tp" value={inp.tp} onChange={set("tp")} unit="m" />
            <Field label="RCC Footing Thickness  tr" value={inp.tr} onChange={set("tr")} unit="m" />
          </Section>

          <Section title="Ground Beam & Coping" defaultOpen={false}>
            <Field label="Ground Beam Width  gbw" value={inp.gbw} onChange={set("gbw")} unit="m" />
            <Field label="Ground Beam Depth  gbd" value={inp.gbd} onChange={set("gbd")} unit="m" />
            <Field label="Coping Thickness  ct" value={inp.ct} onChange={set("ct")} unit="m" />
          </Section>

          <Section title="Masonry & Finishes" defaultOpen={false}>
            <Field label="Wall Panel Thickness  wt" value={inp.wt} onChange={set("wt")} unit="m" />
            <Field label="Plaster Height per face  ph" value={inp.ph} onChange={set("ph")} unit="m" />
          </Section>

          <Section title="Miscellaneous" defaultOpen={false}>
            <Field label="Barbed Wire Length  fw" value={inp.fw} onChange={set("fw")} unit="m" step={1} />
            <Field label="Rain Water Spout Spacing  ss" value={inp.ss} onChange={set("ss")} unit="m" />
          </Section>

          <Section title="Demolition (0 if none)" defaultOpen={false}>
            <Field label="Old Wall Length  Dl" value={inp.Dl} onChange={set("Dl")} unit="m" step={1} />
            <Field label="Old Wall Thickness  Dt" value={inp.Dt} onChange={set("Dt")} unit="m" />
            <Field label="Old Wall Height  Dh" value={inp.Dh} onChange={set("Dh")} unit="m" />
          </Section>

          <Section title="Rebar Rates (kg/m³)" defaultOpen={false}>
            <Field label="Footing Rebar Rate  sr_f" value={inp.sr_f} onChange={set("sr_f")} unit="kg/m³" step={1} />
            <Field label="Ground Beam Rebar Rate  sr_gb" value={inp.sr_gb} onChange={set("sr_gb")} unit="kg/m³" step={1} />
            <Field label="Column Rebar Rate  sr_col" value={inp.sr_col} onChange={set("sr_col")} unit="kg/m³" step={1} />
            <Field label="Coping Rebar Rate  sr_cop" value={inp.sr_cop} onChange={set("sr_cop")} unit="kg/m³" step={1} />
          </Section>
        </div>

        {/* ── RIGHT: Estimate table ─────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Estimate table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-800 text-white px-4 py-3">
              <p className="text-sm font-bold">{inp.workName}</p>
              <p className="text-xs text-slate-300 mt-0.5">
                {inp.division} &nbsp;|&nbsp; Columns: {N} Nos @ {inp.sp} m c/c &nbsp;|&nbsp; Wall Length: {fmt(inp.L, 0)} m
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th className="px-3 py-2 text-left w-8 text-slate-500 font-semibold">No</th>
                    <th className="px-3 py-2 text-left w-20 text-slate-500 font-semibold">Code</th>
                    <th className="px-3 py-2 text-left text-slate-500 font-semibold">Description</th>
                    <th className="px-3 py-2 text-right w-24 text-slate-500 font-semibold">Qty</th>
                    <th className="px-3 py-2 text-center w-12 text-slate-500 font-semibold">Unit</th>
                    <th className="px-3 py-2 text-right w-28 text-slate-500 font-semibold">Rate (₹)</th>
                    <th className="px-3 py-2 text-right w-32 text-slate-500 font-semibold">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {ITEMS.map((item, i) => {
                    const qty = qtys[i] ?? 0;
                    const amt = amounts[i] ?? 0;
                    return (
                      <tr key={item.code} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2 text-center text-slate-500 font-semibold">{item.no}</td>
                        <td className="px-3 py-2 text-slate-600 font-mono">{item.code}</td>
                        <td className="px-3 py-2 text-slate-700 leading-relaxed">{item.desc}</td>
                        <td className="px-3 py-2 text-right font-semibold text-slate-800 tabular-nums">
                          {fmt(qty)}
                        </td>
                        <td className="px-3 py-2 text-center text-slate-500">{item.unit}</td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            value={rates[i] ?? 0}
                            step={0.01}
                            min={0}
                            onChange={(e) => {
                              const next = [...rates];
                              next[i] = parseFloat(e.target.value) || 0;
                              setRates(next);
                            }}
                            className="w-24 text-right border border-amber-300 rounded px-2 py-0.5 bg-amber-50 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 tabular-nums"
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-slate-800 tabular-nums">
                          {fmt(amt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary / Totals */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-800 text-white px-4 py-2.5">
              <p className="text-sm font-bold">Summary — Abstract of Cost</p>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {[
                  { label: "Total Rs.", value: total, bold: false, bg: "" },
                  { label: "1% Design & Quality Control Rs.", value: pct1, bold: false, bg: "" },
                  { label: "Tender Amount Rs.", value: tender, bold: true, bg: "bg-green-50" },
                  { label: "18% GST Rs.", value: gst, bold: false, bg: "" },
                  { label: "Total (with GST) Rs.", value: withGst, bold: false, bg: "" },
                  { label: "5% Contingencies Rs.", value: cont5, bold: false, bg: "" },
                  { label: "2% Design Charges Rs.", value: des2, bold: false, bg: "" },
                  { label: "Estimated Amount Rs.", value: estimated, bold: true, bg: "bg-amber-50" },
                ].map((row) => (
                  <tr key={row.label} className={`border-b border-slate-100 ${row.bg}`}>
                    <td className={`px-4 py-2.5 text-right text-slate-700 ${row.bold ? "font-bold" : ""}`}>{row.label}</td>
                    <td className={`px-4 py-2.5 text-right tabular-nums w-44 ${row.bold ? "font-bold text-slate-900" : "text-slate-700"}`}>
                      {fmt(row.value)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-800">
                  <td className="px-4 py-3 text-right text-white font-bold text-base">Say Estimated Amount Rs.</td>
                  <td className="px-4 py-3 text-right text-white font-bold text-base tabular-nums w-44">{fmtRs(say)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
