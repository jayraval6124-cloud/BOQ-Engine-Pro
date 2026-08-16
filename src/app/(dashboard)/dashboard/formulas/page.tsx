"use client";

import { useEffect, useState } from "react";
import { Plus, Calculator, CheckCircle, XCircle, X, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/toaster";

interface Formula { id: string; name: string; expression: string; variables: string[]; type: string; unit?: string; description?: string; isSystem: boolean }

const FORMULA_TYPES = ["VOLUME", "AREA", "LENGTH", "WEIGHT", "COUNT", "CUSTOM"];
const TYPE_COLORS: Record<string, string> = {
  VOLUME: "bg-blue-50 text-blue-700", AREA: "bg-emerald-50 text-emerald-700",
  LENGTH: "bg-purple-50 text-purple-700", WEIGHT: "bg-amber-50 text-amber-700",
  COUNT: "bg-orange-50 text-orange-700", CUSTOM: "bg-slate-100 text-slate-600",
};
const defaultForm = { name: "", expression: "", type: "VOLUME", unit: "", description: "", example: "" };

export default function FormulasPage() {
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [validation, setValidation] = useState<{ valid: boolean; error?: string; variables?: string[]; preview?: number | null } | null>(null);
  const [validating, setValidating] = useState(false);
  const [testVars, setTestVars] = useState<Record<string, string>>({});

  useEffect(() => { fetch("/api/formulas").then((r) => r.json()).then((d) => { setFormulas(d); setLoading(false); }); }, []);

  const validateFormula = async () => {
    if (!form.expression) return;
    setValidating(true);
    const varValues: Record<string, number> = {};
    Object.entries(testVars).forEach(([k, v]) => { varValues[k] = parseFloat(v) || 1; });
    const res = await fetch("/api/formulas/validate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expression: form.expression, variables: varValues }),
    });
    const json = await res.json();
    setValidation(json);
    setValidating(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/formulas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const json = await res.json();
    if (res.ok) {
      toast({ title: "Formula saved", variant: "success" });
      setFormulas((prev) => [...prev, json]);
      setShowForm(false); setForm(defaultForm); setValidation(null); setTestVars({});
    } else toast({ title: json.error || "Failed to save", variant: "destructive" });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Formula Library</h1>
          <p className="text-slate-500 text-sm">Reusable calculation formulas for measurement sheets</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Add Formula
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="p-8 text-center"><div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" /></div>
        ) : (
          formulas.map((f) => (
            <div key={f.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg mt-0.5"><Calculator className="w-4 h-4 text-blue-600" /></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-800">{f.name}</h3>
                      {f.isSystem && <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">System</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[f.type]}`}>{f.type}</span>
                    </div>
                    {f.description && <p className="text-sm text-slate-500 mt-0.5">{f.description}</p>}
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{f.expression}</span>
                      <span className="text-xs text-slate-500">Variables: <span className="font-mono">{Array.isArray(f.variables) ? f.variables.join(", ") : ""}</span></span>
                      {f.unit && <span className="text-xs text-slate-500">Unit: <span className="font-medium">{f.unit}</span></span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Formula Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowForm(false); setValidation(null); }} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6 z-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-slate-800">Add Formula</h2>
              <button onClick={() => { setShowForm(false); setValidation(null); }} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Formula Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Volume calculation" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Expression *</label>
                <div className="flex gap-2">
                  <input value={form.expression} onChange={(e) => { setForm({ ...form, expression: e.target.value }); setValidation(null); }} required className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" placeholder="L * B * D * Nos" />
                  <button type="button" onClick={validateFormula} disabled={validating} className="flex items-center gap-1 px-3 py-2 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 shrink-0">
                    {validating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calculator className="w-3.5 h-3.5" />} Test
                  </button>
                </div>
                {validation && (
                  <div className={`mt-2 p-2 rounded-lg flex items-start gap-2 ${validation.valid ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                    {validation.valid ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                    <div className="text-xs">
                      {validation.valid ? (
                        <div>
                          <span className="font-medium">Valid!</span> Variables: <span className="font-mono">{validation.variables?.join(", ")}</span>
                          {validation.preview !== null && validation.preview !== undefined && <span> &bull; Preview (all=1): <span className="font-semibold">{validation.preview}</span></span>}
                        </div>
                      ) : <span>{validation.error}</span>}
                    </div>
                  </div>
                )}
              </div>
              {validation?.valid && validation.variables && validation.variables.length > 0 && (
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-xs font-medium text-slate-600 mb-2">Test with values:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {validation.variables.map((v) => (
                      <div key={v}>
                        <label className="text-xs text-slate-500 font-mono">{v}</label>
                        <input type="number" step="any" value={testVars[v] || ""} onChange={(e) => setTestVars({ ...testVars, [v]: e.target.value })} className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 mt-0.5" placeholder="1" />
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={validateFormula} className="text-xs text-blue-600 hover:text-blue-700 mt-2">Run with these values →</button>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Type *</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {FORMULA_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Default Unit</label>
                  <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Cum" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="What does this formula calculate?" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setValidation(null); }} className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Save Formula</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
