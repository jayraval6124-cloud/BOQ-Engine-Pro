"use client";

import { useEffect, useState } from "react";
import { Layers, ChevronRight, Package } from "lucide-react";

interface ElementItem { id: string; description: string; unit: string; formulaType: string; defaultFormula?: string; sorItem?: { itemCode: string; rate: string } }
interface ElementTemplate { id: string; name: string; type: string; description?: string; items: ElementItem[] }

const TYPE_COLORS: Record<string, string> = {
  SUBSTRUCTURE: "bg-amber-50 text-amber-700 border-amber-200",
  SUPERSTRUCTURE: "bg-blue-50 text-blue-700 border-blue-200",
  FINISHING: "bg-emerald-50 text-emerald-700 border-emerald-200",
  EXTERNAL_WORKS: "bg-purple-50 text-purple-700 border-purple-200",
  ROADS: "bg-orange-50 text-orange-700 border-orange-200",
  DRAINAGE: "bg-cyan-50 text-cyan-700 border-cyan-200",
};

export default function ElementsPage() {
  const [templates, setTemplates] = useState<ElementTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ElementTemplate | null>(null);

  useEffect(() => {
    fetch("/api/elements").then((r) => r.json()).then((d) => { setTemplates(d); setLoading(false); });
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Element Library</h1>
        <p className="text-slate-500 text-sm">System-defined construction elements with linked work items</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Element List */}
        <div className="col-span-1 space-y-2">
          {loading ? (
            <div className="p-8 text-center"><div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" /></div>
          ) : (
            templates.map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => setSelected(tmpl)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${selected?.id === tmpl.id ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">{tmpl.name}</p>
                  <ChevronRight className={`w-4 h-4 ${selected?.id === tmpl.id ? "text-blue-500" : "text-slate-300"}`} />
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${TYPE_COLORS[tmpl.type] || "bg-slate-50 text-slate-600 border-slate-200"}`}>{tmpl.type.replace("_", " ")}</span>
                  <span className="text-xs text-slate-400">{tmpl.items.length} items</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Element Detail */}
        <div className="col-span-2">
          {selected ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="px-5 py-4 border-b border-slate-100">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg"><Layers className="w-5 h-5 text-blue-600" /></div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-800">{selected.name}</h2>
                    <p className="text-sm text-slate-500 mt-0.5">{selected.description}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium mt-2 inline-block ${TYPE_COLORS[selected.type] || "bg-slate-50 text-slate-600 border-slate-200"}`}>{selected.type.replace("_", " ")}</span>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Linked Work Items ({selected.items.length})</h3>
                <div className="space-y-2">
                  {selected.items.map((item, i) => (
                    <div key={item.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-xs font-mono text-slate-400 w-6 mt-0.5">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 font-medium">{item.description}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-slate-500">Unit: <span className="font-medium">{item.unit}</span></span>
                          <span className="text-xs text-slate-500">Formula: <span className="font-mono text-blue-600">{item.defaultFormula || "L × B × H × Nos"}</span></span>
                          {item.sorItem && <span className="text-xs text-slate-500">SOR: <span className="font-mono">{item.sorItem.itemCode}</span> @ ₹{Number(item.sorItem.rate).toLocaleString("en-IN")}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-20">
              <Package className="w-12 h-12 text-slate-200 mb-3" />
              <p className="text-slate-500 font-medium">Select an element to view details</p>
              <p className="text-slate-400 text-sm mt-1">Click any element from the left panel</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
