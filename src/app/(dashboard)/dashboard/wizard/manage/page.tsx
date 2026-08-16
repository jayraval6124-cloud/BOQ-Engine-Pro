"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, Pencil, Trash2, Save, X,
  Loader2, Settings, AlertCircle, ListChecks, SlidersHorizontal, List, Ruler,
} from "lucide-react";
import { toast } from "@/components/ui/toaster";

// ─── Types ───────────────────────────────────────────────────────────────────

type ParamDims = "n" | "l" | "b" | "h" | "d" | "lxb" | "lxbxh";

const DIM_OPTIONS: { value: ParamDims; label: string; title: string }[] = [
  { value: "n",      label: "N",       title: "Count / Number" },
  { value: "l",      label: "L",       title: "Length" },
  { value: "b",      label: "B",       title: "Breadth / Width" },
  { value: "h",      label: "H",       title: "Height / Depth" },
  { value: "d",      label: "D",       title: "Diameter" },
  { value: "lxb",    label: "L×B",     title: "Length × Breadth (Area)" },
  { value: "lxbxh",  label: "L×B×H",  title: "Length × Breadth × Height (Volume)" },
];

interface Param {
  name: string;
  label: string;
  unit: string;
  dims?: ParamDims;
}

interface BoqFormula {
  description: string;
  unit: string;
  sorCode: string;
  chapter: string;
  groupHeader: string;
  formula: string;
  sortOrder: number;
}

interface MeasSubRow {
  subDesc: string;       // e.g. "Col @ c/c 3m"
  nosFormula: string;
  lengthFormula: string;
  breadthFormula: string;
  heightFormula: string;
}

interface MeasFormula {
  description: string;
  unit: string;
  gsrtcCode: string;
  rows: MeasSubRow[];
  sortOrder: number;
  steelMode?: boolean;  // when true: L=Qty(CUM), B=Kg/CUM, H hidden → total = Nos×Qty×Kg/CUM
}

function newSubRow(): MeasSubRow {
  return { subDesc: "", nosFormula: "1", lengthFormula: "", breadthFormula: "0", heightFormula: "0" };
}

// Convert old flat format or new rows format
function normalizeMeas(raw: unknown): MeasFormula {
  const f = raw as Record<string, unknown>;
  const base = {
    description: String(f.description || ""),
    unit: String(f.unit || ""),
    gsrtcCode: String(f.gsrtcCode || ""),
    sortOrder: Number(f.sortOrder ?? 0),
    steelMode: Boolean(f.steelMode ?? false),
  };
  if (Array.isArray(f.rows) && f.rows.length > 0) return { ...base, rows: f.rows as MeasSubRow[] };
  return {
    ...base,
    rows: [{
      subDesc: "",
      nosFormula: String(f.nosFormula || "1"),
      lengthFormula: String(f.lengthFormula || ""),
      breadthFormula: String(f.breadthFormula || "0"),
      heightFormula: String(f.heightFormula || "0"),
    }],
  };
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  parameters: Param[];
  boqItemFormulas: BoqFormula[];
  measurementPresets: MeasFormula[];
  usageCount: number;
  isActive: boolean;
  isUserCreated: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugify(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "param";
}

const EMOJI_OPTIONS = ["🏗️","🏢","🏠","🏫","🏥","🏨","🏭","🌉","🛣️","🚌","🏪","⛪","🏟️","🌁","🔧","📐","🧱","🏔️","🛤️","🚧"];

// ─── Parameter Editor ─────────────────────────────────────────────────────────

function ParamEditor({ params, onChange }: { params: Param[]; onChange: (p: Param[]) => void }) {
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const add = () => onChange([...params, { name: `section_${params.length + 1}`, label: "", unit: "", dims: undefined }]);

  const addBulk = () => {
    const lines = bulkText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
    const newParams: Param[] = lines.map((label) => ({
      name: slugify(label) || `section_${Math.random().toString(36).slice(2, 6)}`,
      label, unit: "", dims: undefined,
    }));
    onChange([...params, ...newParams]);
    setBulkText("");
    setShowBulk(false);
  };

  const update = (idx: number, patch: Partial<Param>) => {
    onChange(params.map((p, i) => {
      if (i !== idx) return p;
      const updated = { ...p, ...patch };
      if (patch.label !== undefined) updated.name = slugify(patch.label) || `section_${idx}`;
      return updated;
    }));
  };

  const remove = (idx: number) => onChange(params.filter((_, i) => i !== idx));
  const bulkLineCount = bulkText.split("\n").filter((l) => l.trim()).length;

  return (
    <div className="space-y-2">
      {params.length === 0 && !showBulk && (
        <div className="text-center py-4 text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg">
          No parameters yet.
        </div>
      )}

      {params.length > 0 && (
        <div className="space-y-1.5">
          {params.map((p, idx) => (
            <div key={idx} className="bg-white rounded-lg border border-slate-200 p-2 space-y-1">
              {/* Row 1: Label + Unit + Delete */}
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={p.label}
                  onChange={(e) => update(idx, { label: e.target.value })}
                  placeholder="Parameter name"
                  className="flex-1 min-w-0 px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
                <input
                  type="text"
                  value={p.unit}
                  onChange={(e) => update(idx, { unit: e.target.value })}
                  placeholder="Unit"
                  className="w-14 px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-center"
                />
                <button onClick={() => remove(idx)} className="p-1 text-slate-300 hover:text-red-500 rounded flex-shrink-0">
                  <X className="w-3 h-3" />
                </button>
              </div>
              {/* Row 2: Wizard input type */}
              <select
                value={p.dims ?? ""}
                onChange={(e) => update(idx, { dims: (e.target.value as ParamDims) || undefined })}
                className="w-full px-2 py-0.5 text-[11px] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 text-slate-600"
              >
                <option value="">📋 Full table (Nos × L × B × H)</option>
                <option value="n">🔢 Count / Number (N)</option>
                <option value="l">📏 Single Length (L)</option>
                <option value="b">📐 Single Breadth (B)</option>
                <option value="h">📏 Single Height (H)</option>
                <option value="d">⭕ Single Diameter (D)</option>
                <option value="lxb">▭ Length × Breadth (L × B)</option>
                <option value="lxbxh">📦 L × B × H (Volume)</option>
              </select>
              {p.name && <div className="text-[9px] text-slate-300 font-mono pl-0.5">{p.name}</div>}
            </div>
          ))}
        </div>
      )}

      {showBulk && (
        <div className="border border-blue-200 rounded-lg p-3 bg-blue-50 space-y-2">
          <p className="text-xs font-semibold text-blue-700">Type one section name per line:</p>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={6}
            autoFocus
            placeholder={"Rooms / Plinth Area\nBeams\nColumns\nFootings\nCompound Wall\nRoad Work\nPlatform"}
            className="w-full px-3 py-2 text-sm border border-blue-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-mono resize-none"
          />
          <div className="flex gap-2">
            <button type="button" onClick={addBulk} disabled={bulkLineCount === 0} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-40">
              <Plus className="w-4 h-4" /> Add {bulkLineCount > 0 ? bulkLineCount : ""} Section{bulkLineCount !== 1 ? "s" : ""}
            </button>
            <button type="button" onClick={() => { setShowBulk(false); setBulkText(""); }} className="px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-md hover:bg-white">Cancel</button>
          </div>
        </div>
      )}

      {!showBulk && (
        <div className="flex items-center gap-4 mt-1">
          <button type="button" onClick={add} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium">
            <Plus className="w-4 h-4" /> Add Section
          </button>
          <span className="text-slate-200 select-none">|</span>
          <button type="button" onClick={() => setShowBulk(true)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
            <List className="w-4 h-4" /> Quick Add Multiple
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Formula Input with Parameter Picker ─────────────────────────────────────

function FormulaInput({ value, onChange, params, placeholder, className }: {
  value: string;
  onChange: (v: string) => void;
  params: Param[];
  placeholder?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const openPicker = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const dropdownW = 224;
      // Prefer opening below-left aligned; if that overflows right edge, shift left
      const left = Math.max(4, Math.min(r.left, window.innerWidth - dropdownW - 8));
      setPos({ top: r.bottom + 2, left });
    }
    setOpen((o) => !o);
  };

  const insertParam = (name: string) => {
    const input = inputRef.current;
    if (!input) { onChange(value + name); setOpen(false); return; }
    const start = input.selectionStart ?? value.length;
    const end = input.selectionEnd ?? value.length;
    const next = value.substring(0, start) + name + value.substring(end);
    onChange(next);
    setOpen(false);
    setTimeout(() => { input.focus(); input.setSelectionRange(start + name.length, start + name.length); }, 0);
  };

  if (params.length === 0) {
    return (
      <input ref={inputRef} type="text" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className ?? "w-full px-1.5 py-1 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-mono text-xs"} />
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      <input ref={inputRef} type="text" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`flex-1 min-w-0 px-1.5 py-1 border border-slate-200 rounded-l focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-mono text-xs ${className ?? ""}`} />
      <button ref={btnRef} type="button" onMouseDown={(e) => e.preventDefault()} onClick={openPicker}
        title="Insert parameter"
        className="flex-shrink-0 px-1 py-1 border border-l-0 border-slate-200 rounded-r bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-400 text-[10px] font-bold h-[26px] leading-none select-none">
        {"{p}"}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[190]" onClick={() => setOpen(false)} />
          <div className="fixed z-[200] bg-white border border-slate-200 rounded-lg shadow-2xl py-1 w-64 max-h-72 overflow-y-auto"
            style={{ top: pos.top, left: pos.left }}>
            <div className="px-3 py-1.5 text-[10px] text-slate-400 font-semibold uppercase tracking-wide border-b border-slate-100">Parameters</div>
            {params.flatMap((p) => {
              const subs: string[] = [];
              if (!p.dims) {
                subs.push(`${p.name}_nos`, `${p.name}_l`, `${p.name}_b`, `${p.name}_h`);
              } else if (p.dims === "lxb" || p.dims === "lxbxh") {
                subs.push(`${p.name}_l`, `${p.name}_b`);
                if (p.dims === "lxbxh") subs.push(`${p.name}_h`);
              } else if (p.dims === "d") { subs.push(`${p.name}_d`);
              } else if (p.dims === "n") { subs.push(`${p.name}_n`);
              } else if (p.dims === "l") { subs.push(`${p.name}_l`);
              } else if (p.dims === "b") { subs.push(`${p.name}_b`);
              } else if (p.dims === "h") { subs.push(`${p.name}_h`);
              }
              return [
                <button key={p.name} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertParam(p.name)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 flex items-center justify-between gap-2 border-b border-slate-50">
                  <span className="font-mono text-blue-700 font-semibold">{p.name}</span>
                  <span className="text-slate-400 text-[10px]">{p.dims ? `(${p.dims})` : "table"}{p.unit ? ` ${p.unit}` : ""}</span>
                </button>,
                ...subs.map((s) => (
                  <button key={s} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertParam(s)}
                    className="w-full text-left pl-5 pr-3 py-1.5 text-xs hover:bg-indigo-50 flex items-center gap-2">
                    <span className="font-mono text-indigo-600">{s}</span>
                  </button>
                )),
              ];
            })}
            {/* Math helpers for depth splits / floor splits */}
            <div className="px-3 py-1.5 text-[10px] text-slate-400 font-semibold uppercase tracking-wide border-b border-slate-100 border-t border-slate-100 mt-1">Depth / Floor Split</div>
            {[
              { label: "Up to 1.5m",    expr: "Math.min(depth, 1.5)",      hint: "first slab" },
              { label: "Beyond 1.5m",   expr: "Math.max(0, depth-1.5)",    hint: "extra depth" },
              { label: "Up to 3.0m",    expr: "Math.min(depth, 3.0)",      hint: "first slab" },
              { label: "Beyond 3.0m",   expr: "Math.max(0, depth-3.0)",    hint: "extra depth" },
              { label: "Min(a, limit)", expr: "Math.min(, )",              hint: "clamp to limit" },
              { label: "Max(0, a-b)",   expr: "Math.max(0, -)",            hint: "remainder after deduction" },
            ].map((h) => (
              <button key={h.expr} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertParam(h.expr)}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-amber-50 flex items-center justify-between gap-2">
                <span className="font-mono text-amber-700 text-[10px]">{h.expr}</span>
                <span className="text-slate-400 text-[10px] whitespace-nowrap">{h.hint}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Auto-build BOQ formulas from Measurement Sheet items ────────────────────

function buildBoqFromMeas(measItems: MeasFormula[]): BoqFormula[] {
  return measItems
    .filter((m) => m.description || m.gsrtcCode)
    .map((m, i) => {
      const rowExprs = m.rows
        .filter((sr) => sr.lengthFormula && sr.lengthFormula.trim() !== "")
        .map((sr) => {
          const nos = sr.nosFormula?.trim() || "1";
          const L = sr.lengthFormula.trim();
          const B = sr.breadthFormula?.trim();
          const H = sr.heightFormula?.trim();
          let expr = nos === "1" ? `(${L})` : `(${nos})*(${L})`;
          if (B && B !== "0") expr += `*(${B})`;
          if (H && H !== "0") expr += `*(${H})`;
          return expr;
        });
      return {
        description: m.description || "",
        unit: m.unit || "",
        sorCode: m.gsrtcCode || "",
        chapter: "",
        groupHeader: "",
        formula: rowExprs.length > 0 ? rowExprs.join("+") : "0",
        sortOrder: m.sortOrder ?? i,
      };
    });
}

// ─── SOR code auto-lookup (no division — description is same across divisions) ─

async function lookupSorCode(code: string): Promise<{ description: string; unit: string } | null> {
  if (!code.trim()) return null;
  try {
    const res = await fetch(`/api/sor/lookup?code=${encodeURIComponent(code.trim())}`);
    if (!res.ok) return null;
    const item = await res.json();
    return item ? { description: item.description ?? "", unit: item.unit ?? "" } : null;
  } catch { return null; }
}

// ─── BOQ Item Editor ──────────────────────────────────────────────────────────

function BoqItemEditor({ items, params, onChange }: {
  items: BoqFormula[];
  params: Param[];
  onChange: (items: BoqFormula[]) => void;
}) {
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const add = () => onChange([...items, { description: "", unit: "", sorCode: "", chapter: "", groupHeader: "", formula: "", sortOrder: items.length }]);
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const update = (idx: number, patch: Partial<BoqFormula>) =>
    onChange(items.map((item, i) => i === idx ? { ...item, ...patch } : item));

  const handleCode = (idx: number, code: string) => {
    update(idx, { sorCode: code });
    clearTimeout(timers.current[idx]);
    if (code.trim().length >= 3) {
      timers.current[idx] = setTimeout(async () => {
        const found = await lookupSorCode(code);
        if (found) {
          onChange(
            items.map((item, i) =>
              i === idx
                ? { ...item, sorCode: code, description: item.description || found.description, unit: item.unit || found.unit }
                : item,
            ),
          );
        }
      }, 600);
    }
  };

  const paramHint = params[0]?.name || "param";

  return (
    <div className="space-y-3">
      {params.length > 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-amber-700 mb-1.5">Parameter variables (sum of wizard rows):</p>
          <div className="flex flex-wrap gap-1.5">
            {params.map((p) => (
              <code key={p.name} className="text-xs bg-amber-100 border border-amber-400 text-amber-900 px-2 py-0.5 rounded font-mono font-bold">{p.name}</code>
            ))}
          </div>
          <p className="text-xs text-amber-600 mt-1.5">Use in Qty Formula, e.g. <code className="font-mono bg-white px-1 rounded">{paramHint} * 0.6 * 1.5</code></p>
        </div>
      ) : (
        <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">Add Parameters first — use their names in Qty Formula.</div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="px-2 py-2 text-center font-semibold w-8">#</th>
              <th className="px-2 py-2 text-center font-semibold w-20">GSRTC Code</th>
              <th className="px-2 py-2 text-left font-semibold">Item Description</th>
              <th className="px-2 py-2 text-center font-semibold w-14">Unit</th>
              <th className="px-2 py-2 text-left font-semibold w-44">Qty Formula</th>
              <th className="w-7"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-400">No BOQ items yet. Click &ldquo;Add BOQ Item&rdquo; below.</td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <td className="px-2 py-1.5 text-center text-slate-400">{idx + 1}</td>
                  <td className="px-1 py-1">
                    <input
                      type="text" value={item.sorCode}
                      onChange={(e) => handleCode(idx, e.target.value)}
                      placeholder="RJ001"
                      className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-mono text-center"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      type="text" value={item.description}
                      onChange={(e) => update(idx, { description: e.target.value })}
                      placeholder="Auto-fills from GSRTC code…"
                      className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      type="text" value={item.unit}
                      onChange={(e) => update(idx, { unit: e.target.value })}
                      placeholder="Cum"
                      className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-center"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <FormulaInput
                      value={item.formula}
                      onChange={(v) => update(idx, { formula: v })}
                      params={params}
                      placeholder={`${paramHint} * 0.6 * 1.5`}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <button onClick={() => remove(idx)} className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={add} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium">
        <Plus className="w-4 h-4" /> Add BOQ Item
      </button>
    </div>
  );
}

// ─── Build volume/qty formula from any meas item's sub-rows ──────────────────

function buildVolumeFormula(mi: MeasFormula): string {
  const parts = mi.rows
    .filter((sr) => sr.lengthFormula?.trim())
    .map((sr) => {
      const nos = sr.nosFormula?.trim() || "1";
      const L = sr.lengthFormula.trim();
      const B = sr.breadthFormula?.trim();
      const H = sr.heightFormula?.trim();
      let expr = nos === "1" ? `(${L})` : `(${nos})*(${L})`;
      if (B && B !== "0") expr += `*(${B})`;
      if (H && H !== "0") expr += `*(${H})`;
      return expr;
    });
  return parts.join("+") || "0";
}

// ─── Measurement Item Editor ──────────────────────────────────────────────────

type CfField = "nosFormula" | "lengthFormula" | "breadthFormula" | "heightFormula";
type CfTarget = { itemIdx: number; rowIdx: number; field: CfField; pos: { top: number; left: number } };

function MeasItemEditor({ items, params, onChange }: {
  items: MeasFormula[];
  params: Param[];
  onChange: (items: MeasFormula[]) => void;
}) {
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const [cfOpen, setCfOpen] = useState<CfTarget | null>(null);;

  const addItem = () => onChange([...items, {
    description: "", unit: "", gsrtcCode: "",
    rows: [newSubRow()],
    sortOrder: items.length,
  }]);

  const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  const updateItem = (idx: number, patch: Partial<MeasFormula>) =>
    onChange(items.map((item, i) => i === idx ? { ...item, ...patch } : item));

  const handleCode = (idx: number, code: string) => {
    updateItem(idx, { gsrtcCode: code });
    clearTimeout(timers.current[idx]);
    if (code.trim().length >= 3) {
      timers.current[idx] = setTimeout(async () => {
        const found = await lookupSorCode(code);
        if (found) {
          onChange(items.map((item, i) =>
            i === idx ? { ...item, gsrtcCode: code, description: item.description || found.description, unit: item.unit || found.unit } : item,
          ));
        }
      }, 600);
    }
  };

  const addSubRow = (idx: number) =>
    updateItem(idx, { rows: [...items[idx].rows, newSubRow()] });

  const removeSubRow = (idx: number, rowIdx: number) =>
    updateItem(idx, { rows: items[idx].rows.filter((_, ri) => ri !== rowIdx) });

  const updateSubRow = (idx: number, rowIdx: number, patch: Partial<MeasSubRow>) =>
    updateItem(idx, {
      rows: items[idx].rows.map((r, ri) => ri === rowIdx ? { ...r, ...patch } : r),
    });

  const paramHint = params[0]?.name || "running_meter";

  return (
    <div className="space-y-3">
      {params.length > 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-emerald-700 mb-1.5">Parameter variables (sum of wizard rows):</p>
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {params.map((p) => (
              <code key={p.name} className="text-xs bg-emerald-100 border border-emerald-400 text-emerald-900 px-2 py-0.5 rounded font-mono font-bold">{p.name}</code>
            ))}
          </div>
          <p className="text-xs text-emerald-600">
            Use in Nos / L / B / H. Negative Nos for deductions. &nbsp;|&nbsp;
            <strong>Depth split:</strong> add 2 items — first item H = <code className="bg-white px-1 rounded font-mono">Math.min(depth,1.5)</code>, second item H = <code className="bg-white px-1 rounded font-mono">Math.max(0,depth-1.5)</code> with different GSRTC codes. &nbsp;|&nbsp;
            <strong>Floor-wise:</strong> add separate parameter per floor height and one item per floor with its own GSRTC code.
          </p>
        </div>
      ) : (
        <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">Add Parameters first.</div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-5 text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg">
          No items yet. Click &ldquo;Add Item&rdquo; below.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="border border-slate-200 rounded-lg overflow-hidden">
              {/* Item header row */}
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-white">
                <span className="text-xs text-slate-400 w-5 text-center">{idx + 1}</span>
                <input
                  type="text" value={item.gsrtcCode}
                  onChange={(e) => handleCode(idx, e.target.value)}
                  placeholder="GSRTC Code"
                  className="w-20 px-1.5 py-0.5 text-xs bg-slate-700 border border-slate-600 rounded font-mono text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 text-center"
                />
                <input
                  type="text" value={item.description}
                  onChange={(e) => updateItem(idx, { description: e.target.value })}
                  placeholder="Auto-fills from GSRTC code…"
                  className="flex-1 px-1.5 py-0.5 text-xs bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
                <input
                  type="text" value={item.unit}
                  onChange={(e) => updateItem(idx, { unit: e.target.value })}
                  placeholder="Unit"
                  className="w-14 px-1.5 py-0.5 text-xs bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 text-center"
                />
                {/* Steel mode toggle */}
                <button
                  type="button"
                  title="Toggle Steel/Weight mode: Nos × Qty(CUM) × Kg/CUM = Total Kg"
                  onClick={() => updateItem(idx, { steelMode: !item.steelMode })}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded flex-shrink-0 transition-colors ${item.steelMode ? "bg-orange-500 text-white" : "bg-slate-700 text-slate-400 hover:text-orange-300 border border-slate-600"}`}
                >
                  ⚖ Kg
                </button>
                <button onClick={() => removeItem(idx)} className="p-1 text-slate-400 hover:text-red-400 rounded flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Steel mode hint */}
              {item.steelMode && (
                <div className="px-3 py-1.5 bg-orange-50 border-b border-orange-200 text-[10px] text-orange-700 flex items-center gap-2">
                  <span className="font-semibold">Steel mode:</span>
                  <span>Nos × Qty(CUM) × Kg/CUM × Area(0=skip) = Total Kg &nbsp;|&nbsp; <strong>Qty</strong>: concrete volume formula (carry forward) &nbsp;|&nbsp; <strong>Area</strong>: enter sqm if rate is Kg/Sqm instead of Kg/CUM</span>
                </div>
              )}

              {/* Sub-rows table */}
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th className="px-2 py-1 text-left font-medium text-slate-500 min-w-[120px]">Sub-description</th>
                    <th className="px-2 py-1 text-center font-medium text-slate-500 w-20">Nos</th>
                    <th className={`px-2 py-1 text-center font-medium w-36 ${item.steelMode ? "text-orange-600" : "text-slate-500"}`}>
                      {item.steelMode ? "Qty (CUM)" : "L"}
                    </th>
                    <th className={`px-2 py-1 text-center font-medium w-24 ${item.steelMode ? "text-orange-600" : "text-slate-500"}`}>
                      {item.steelMode ? "Kg / CUM" : <span>B <span className="font-normal text-slate-400">(0=skip)</span></span>}
                    </th>
                    <th className={`px-2 py-1 text-center font-medium w-24 ${item.steelMode ? "text-orange-500" : "text-slate-500"}`}>
                      {item.steelMode
                        ? <span>× Area <span className="font-normal text-orange-400">(Sqm, 0=skip)</span></span>
                        : <span>H <span className="font-normal text-slate-400">(0=skip)</span></span>}
                    </th>
                    <th className="px-2 py-1 text-right font-medium text-slate-500 w-28">Qty</th>
                    <th className="w-7"></th>
                  </tr>
                </thead>
                <tbody>
                  {item.rows.map((sr, ri) => {
                    // Build qty formula preview
                    const nos = sr.nosFormula?.trim() || "1";
                    const L = sr.lengthFormula?.trim() || "";
                    const B = sr.breadthFormula?.trim() || "0";
                    const H = sr.heightFormula?.trim() || "0";
                    let qtyPreview = "—";
                    if (L) {
                      try {
                        const n = parseFloat(nos); const l = parseFloat(L);
                        const b = parseFloat(B); const h = parseFloat(H);
                        if ([n,l,b,h].every((x) => !isNaN(x))) {
                          const v = n * l * (b > 0 ? b : 1) * (h > 0 ? h : 1);
                          qtyPreview = v % 1 === 0 ? v.toString() : v.toFixed(3);
                        } else {
                          const parts: string[] = [];
                          if (nos !== "1") parts.push(nos.length > 10 ? nos.slice(0,10)+"…" : nos);
                          if (L) parts.push(L.length > 12 ? L.slice(0,12)+"…" : L);
                          if (B !== "0") parts.push(B.length > 8 ? B.slice(0,8)+"…" : B);
                          if (H !== "0") parts.push(H.length > 8 ? H.slice(0,8)+"…" : H);
                          qtyPreview = parts.join(" × ") || "—";
                        }
                      } catch { qtyPreview = "err"; }
                    }
                    // Helper: open CF picker for a given field
                    const openCf = (field: CfField, e: React.MouseEvent) => {
                      const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                      setCfOpen({ itemIdx: idx, rowIdx: ri, field, pos: { top: r.bottom + 2, left: Math.max(4, Math.min(r.left, window.innerWidth - 288 - 8)) } });
                    };
                    const cfBtn = (field: CfField) => (
                      <button
                        type="button"
                        title={`Carry Forward quantity from another item into this field`}
                        onClick={(e) => openCf(field, e)}
                        className="flex-shrink-0 px-1 py-1 border border-blue-200 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 text-[9px] font-bold h-[26px] leading-none whitespace-nowrap"
                      >CF↑</button>
                    );
                    return (
                    <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="px-1 py-1">
                        <input type="text" value={sr.subDesc}
                          onChange={(e) => updateSubRow(idx, ri, { subDesc: e.target.value })}
                          placeholder={item.steelMode ? "e.g. Footing, Column, Beam…" : "e.g. For footing, Wall base, Deduction…"}
                          className="w-full px-1.5 py-1 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-xs" />
                      </td>
                      {/* Nos — CF available for all items */}
                      <td className="px-1 py-1">
                        <div className="flex items-center gap-0.5">
                          <FormulaInput value={sr.nosFormula}
                            onChange={(v) => updateSubRow(idx, ri, { nosFormula: v })}
                            params={params} placeholder="1" />
                          {cfBtn("nosFormula")}
                        </div>
                      </td>
                      {/* L / Qty(CUM) — CF available for all items */}
                      <td className="px-1 py-1">
                        <div className="flex items-center gap-0.5">
                          <FormulaInput value={sr.lengthFormula}
                            onChange={(v) => updateSubRow(idx, ri, { lengthFormula: v })}
                            params={params}
                            placeholder={item.steelMode ? "concrete vol formula" : "1.65"} />
                          {cfBtn("lengthFormula")}
                        </div>
                      </td>
                      {/* B / Kg per CUM — CF available */}
                      <td className="px-1 py-1">
                        <div className="flex items-center gap-0.5">
                          <FormulaInput value={sr.breadthFormula}
                            onChange={(v) => updateSubRow(idx, ri, { breadthFormula: v })}
                            params={params}
                            placeholder={item.steelMode ? "80" : "1.65"} />
                          {cfBtn("breadthFormula")}
                        </div>
                      </td>
                      {/* H / Area — CF available */}
                      <td className="px-1 py-1">
                        <div className="flex items-center gap-0.5">
                          <FormulaInput value={sr.heightFormula}
                            onChange={(v) => updateSubRow(idx, ri, { heightFormula: v })}
                            params={params}
                            placeholder={item.steelMode ? "0" : "1.5"} />
                          {cfBtn("heightFormula")}
                        </div>
                      </td>
                      {/* Qty preview */}
                      <td className="px-2 py-1 text-right">
                        <span className={`text-[10px] font-mono ${qtyPreview === "—" ? "text-slate-300" : "text-emerald-700 font-semibold"}`}>
                          {qtyPreview}
                        </span>
                      </td>
                      <td className="px-1 py-1">
                        {item.rows.length > 1 && (
                          <button onClick={() => removeSubRow(idx, ri)} className="p-1 text-slate-300 hover:text-red-500 rounded">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200">
                <button type="button" onClick={() => addSubRow(idx)}
                  className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 font-medium">
                  <Plus className="w-3 h-3" /> Add Sub-row
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button type="button" onClick={addItem} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium">
        <Plus className="w-4 h-4" /> Add Item
      </button>

      {/* Carry-forward picker — available for all items, all fields */}
      {cfOpen && (
        <>
          <div className="fixed inset-0 z-[190]" onClick={() => setCfOpen(null)} />
          <div className="fixed z-[200] bg-white border border-blue-200 rounded-lg shadow-2xl py-1 w-72 max-h-80 overflow-y-auto"
            style={{ top: cfOpen.pos.top, left: cfOpen.pos.left }}>
            <div className="px-3 py-1.5 text-[10px] text-blue-700 font-semibold uppercase tracking-wide border-b border-blue-100 bg-blue-50">
              ↑ Carry Forward into &ldquo;{cfOpen.field === "nosFormula" ? "Nos" : cfOpen.field === "lengthFormula" ? "L / Qty" : cfOpen.field === "breadthFormula" ? "B / Kg" : "H / Area"}&rdquo;
            </div>
            {items.filter((m, i) => i !== cfOpen.itemIdx && (m.description || m.gsrtcCode)).length === 0 ? (
              <div className="px-3 py-3 text-xs text-slate-400">No other items found.</div>
            ) : (
              items
                .filter((m, i) => i !== cfOpen.itemIdx && (m.description || m.gsrtcCode))
                .map((m, i) => {
                  const formula = buildVolumeFormula(m);
                  return (
                    <button key={i} type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        updateSubRow(cfOpen.itemIdx, cfOpen.rowIdx, { [cfOpen.field]: formula });
                        setCfOpen(null);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b border-slate-50 transition-colors">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`font-mono font-semibold text-[10px] px-1 rounded ${m.steelMode ? "text-orange-700 bg-orange-50" : "text-blue-700 bg-blue-50"}`}>
                          {m.gsrtcCode || "—"}
                        </span>
                        <span className="text-slate-700 truncate font-medium">{m.description || "(no description)"}</span>
                        {m.steelMode && <span className="text-[9px] text-orange-500 flex-shrink-0">⚖</span>}
                      </div>
                      <div className="font-mono text-[9px] text-slate-400 truncate pl-1">{formula}</div>
                    </button>
                  );
                })
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Template Form ─────────────────────────────────────────────────────────────

function TemplateForm({ template, onSave, onClose }: { template: Template | null; onSave: (t: Template) => void; onClose: () => void }) {
  const isEdit = !!template;
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [icon, setIcon] = useState(template?.icon ?? "🏗️");
  const [params, setParams] = useState<Param[]>(template?.parameters ?? []);
  const [measFormulas, setMeasFormulas] = useState<MeasFormula[]>(
    (template?.measurementPresets ?? []).map(normalizeMeas)
  );
  const [activeTab, setActiveTab] = useState<"params" | "measSheet" | "boqItems">("params");
  const [saving, setSaving] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);

  // BOQ formulas are always derived from meas sheet — never edited directly
  const derivedBoq = buildBoqFromMeas(measFormulas);

  const handleSave = async () => {
    if (!name.trim() || name.trim().length < 2) { toast({ title: "Name must be at least 2 characters.", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const url = isEdit ? `/api/wizard/templates/${template!.id}` : "/api/wizard/templates";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), description: description.trim(), icon, parameters: params, boqItemFormulas: derivedBoq, measurementPresets: measFormulas }) });
      const data = await res.json();
      if (!res.ok) { toast({ title: data.error || "Save failed", variant: "destructive" }); return; }
      toast({ title: isEdit ? "Project type updated!" : "Project type created!", variant: "success" });
      onSave(data);
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* ── Header bar ── */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200 bg-white flex-shrink-0">
        {/* Icon picker */}
        <div className="relative">
          <button type="button" onClick={() => setShowEmoji((s) => !s)}
            className="w-9 h-9 text-xl flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-xl border-2 border-slate-200 transition-colors" title="Choose icon">
            {icon}
          </button>
          {showEmoji && (
            <div className="absolute top-11 left-0 z-[210] bg-white border border-slate-200 rounded-xl shadow-xl p-3 w-52">
              <div className="grid grid-cols-5 gap-1.5">
                {EMOJI_OPTIONS.map((e) => (
                  <button key={e} type="button" onClick={() => { setIcon(e); setShowEmoji(false); }}
                    className={`text-xl p-1.5 rounded-lg hover:bg-slate-100 ${icon === e ? "bg-blue-100" : ""}`}>{e}</button>
                ))}
              </div>
            </div>
          )}
        </div>
        {/* Title */}
        <div className="text-sm font-semibold text-slate-700 whitespace-nowrap">
          {isEdit ? "Edit Project Type" : "New Project Type"}
        </div>
        {/* Inline name + description */}
        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Project Type Name *"
          className="w-60 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description (optional)"
          className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        {/* Actions */}
        <button onClick={onClose} className="px-4 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap flex-shrink-0">Cancel</button>
        <button onClick={handleSave} disabled={saving || !name.trim()}
          className="flex items-center gap-2 px-5 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Create"}
        </button>
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg flex-shrink-0 ml-1"><X className="w-4 h-4" /></button>
      </div>

      {/* ── Full-width tabbed body ── */}
      <div className="flex flex-1 min-h-0 flex-col">
        {/* Tab bar */}
        <div className="flex border-b border-slate-200 bg-slate-50 flex-shrink-0">
          <button type="button" onClick={() => setActiveTab("params")}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "params" ? "border-blue-600 text-blue-600 bg-white" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100"}`}>
            <SlidersHorizontal className="w-4 h-4" /> Parameters
            {params.length > 0 && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{params.length}</span>}
          </button>
          <button type="button" onClick={() => setActiveTab("measSheet")}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "measSheet" ? "border-emerald-600 text-emerald-600 bg-white" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100"}`}>
            <Ruler className="w-4 h-4" /> Meas. Sheet
            {measFormulas.length > 0 && <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">{measFormulas.length}</span>}
          </button>
          <button type="button" onClick={() => setActiveTab("boqItems")}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "boqItems" ? "border-indigo-600 text-indigo-600 bg-white" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100"}`}>
            <ListChecks className="w-4 h-4" /> BOQ Preview
            {derivedBoq.length > 0 && <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">{derivedBoq.length}</span>}
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "params" && (
            <div className="max-w-2xl">
              <p className="text-xs text-slate-400 mb-4">Each parameter = one measurement group. Its total is used in Meas. Sheet &amp; BOQ formulas. Set the <strong>Wizard input</strong> type so users see the right fields when creating a project.</p>
              <ParamEditor params={params} onChange={setParams} />
            </div>
          )}
          {activeTab === "measSheet" && (
            <MeasItemEditor items={measFormulas} params={params} onChange={setMeasFormulas} />
          )}
          {activeTab === "boqItems" && (
            <BoqPreview items={derivedBoq} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── BOQ Preview (read-only, auto-derived from Meas Sheet) ───────────────────

function BoqPreview({ items }: { items: BoqFormula[] }) {
  return (
    <div className="space-y-3">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs font-semibold text-blue-700 mb-1">Auto-generated from Measurement Sheet</p>
        <p className="text-xs text-blue-600">BOQ items are derived from the Meas. Sheet tab. GSRTC codes here come from the codes you enter per meas item. Rates are auto-filled from your SOR database when you generate a project.</p>
      </div>
      {items.length === 0 ? (
        <div className="text-center py-8 text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg">
          No items yet — add items in the Meas. Sheet tab.
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="px-2 py-2 text-center font-semibold w-8">#</th>
                <th className="px-2 py-2 text-center font-semibold w-20">GSRTC Code</th>
                <th className="px-2 py-2 text-left font-semibold">Item Description</th>
                <th className="px-2 py-2 text-center font-semibold w-14">Unit</th>
                <th className="px-2 py-2 text-left font-semibold">Qty Formula (derived)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <td className="px-2 py-1.5 text-center text-slate-400">{idx + 1}</td>
                  <td className="px-2 py-1.5 text-center font-mono text-blue-700">{item.sorCode || "—"}</td>
                  <td className="px-2 py-1.5 text-slate-700">{item.description || <span className="text-slate-300 italic">No description</span>}</td>
                  <td className="px-2 py-1.5 text-center text-slate-500">{item.unit || "—"}</td>
                  <td className="px-2 py-1.5 font-mono text-slate-500 text-[10px] break-all">{item.formula}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WizardManagePage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [formTarget, setFormTarget] = useState<Template | null | "new">(undefined as unknown as Template | null | "new");
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/wizard/templates?userOnly=false")
      .then(async (r) => { const text = await r.text(); try { return JSON.parse(text); } catch { return []; } })
      .then((d) => setTemplates(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setFormTarget(null); setShowForm(true); };
  const openEdit = (t: Template) => { setFormTarget(t); setShowForm(true); };

  const onSaved = (saved: Template) => {
    setTemplates((prev) => { const idx = prev.findIndex((t) => t.id === saved.id); if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; } return [saved, ...prev]; });
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/wizard/templates/${id}`, { method: "DELETE" });
      if (!res.ok) { toast({ title: "Delete failed", variant: "destructive" }); return; }
      toast({ title: "Project type deleted.", variant: "success" });
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      setDeleteId(null);
    } finally { setDeleting(false); }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Project Type Manager</h1>
            <p className="text-slate-500 text-sm">Create and manage your project types for the Smart Wizard</p>
          </div>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> New Project Type
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
      ) : (
        <>
          {templates.length === 0 ? (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center">
              <div className="text-4xl mb-3">🏗️</div>
              <h3 className="font-semibold text-slate-700 mb-1">No project types yet</h3>
              <p className="text-sm text-slate-400 mb-4">Create project types with measurement parameters and BOQ item formulas.</p>
              <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                <Plus className="w-4 h-4" /> Create Your First Project Type
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((t) => (
                <TemplateCard key={t.id} template={t} onEdit={() => openEdit(t)} onDelete={() => setDeleteId(t.id)}
                  isDeleting={deleteId === t.id && deleting} showConfirm={deleteId === t.id}
                  onConfirmDelete={() => handleDelete(t.id)} onCancelDelete={() => setDeleteId(null)} />
              ))}
            </div>
          )}
        </>
      )}

      {showForm && (
        <TemplateForm template={formTarget as Template | null} onSave={onSaved} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}

// ─── Template Card ─────────────────────────────────────────────────────────────

function TemplateCard({ template, onEdit, onDelete, onConfirmDelete, onCancelDelete, isDeleting, showConfirm }: {
  template: Template; onEdit?: () => void; onDelete?: () => void; onConfirmDelete?: () => void; onCancelDelete?: () => void;
  isDeleting?: boolean; showConfirm?: boolean;
}) {
  const params = (template.parameters as Param[]) || [];
  const formulas = (template.boqItemFormulas as BoqFormula[]) || [];
  const measItems = (template.measurementPresets as MeasFormula[]) || [];

  return (
    <div className="bg-white rounded-xl border border-slate-200 hover:border-blue-200 hover:shadow-md p-5 transition-all">
      <div className="flex items-start gap-3 mb-3">
        <div className="text-3xl leading-none mt-0.5">{template.icon || "🏗️"}</div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-800 text-sm leading-tight">{template.name}</div>
          {template.description && <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{template.description}</div>}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={onDelete} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {params.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {params.slice(0, 4).map((p) => (
            <span key={p.name} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              {p.label}{p.unit ? ` (${p.unit})` : ""}
            </span>
          ))}
          {params.length > 4 && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">+{params.length - 4} more</span>}
        </div>
      ) : (
        <div className="text-xs text-slate-400 mb-2">No parameters defined</div>
      )}

      <div className="flex items-center justify-between text-xs text-slate-400 mt-3">
        <div className="flex items-center gap-3">
          <span>{params.length} param{params.length !== 1 ? "s" : ""}</span>
          {formulas.length > 0 && (
            <span className="flex items-center gap-1 text-green-600"><ListChecks className="w-3 h-3" />{formulas.length} BOQ</span>
          )}
          {measItems.length > 0 && (
            <span className="flex items-center gap-1 text-emerald-600"><Ruler className="w-3 h-3" />{measItems.length} Meas.</span>
          )}
        </div>
        <span>Used {template.usageCount}×</span>
      </div>

      {showConfirm && (
        <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-center gap-2 text-red-700 text-xs font-medium mb-2"><AlertCircle className="w-3.5 h-3.5" /> Delete this project type?</div>
          <div className="flex gap-2">
            <button onClick={onConfirmDelete} disabled={isDeleting} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-red-600 text-white rounded-md text-xs font-medium hover:bg-red-700 disabled:opacity-40">
              {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />} Delete
            </button>
            <button onClick={onCancelDelete} className="flex-1 px-2 py-1.5 border border-slate-200 rounded-md text-xs text-slate-600 hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
