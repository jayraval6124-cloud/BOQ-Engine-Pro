"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Loader2, Layers, Edit2, Trash2, ChevronRight, X, Save, Calculator } from "lucide-react";
import { toast } from "@/components/ui/toaster";

interface SORItem { id: string; itemCode: string; description: string; unit: string; rate: number }
interface AssemblyItem {
  id?: string;
  sorItemId?: string;
  description: string;
  unit: string;
  formula: string;
  calculationNote?: string;
  isRequired: boolean;
  sequenceOrder: number;
  sorItem?: SORItem;
}
interface Assembly {
  id: string;
  name: string;
  elementTemplateId: string;
  description?: string;
  dimensionInputs: Array<{ name: string; label: string; unit?: string; defaultValue?: number }>;
  items: AssemblyItem[];
  elementTemplate: { name: string; type: string };
}
interface ElementTemplate { id: string; name: string; type: string }

export default function AssembliesPage() {
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Assembly | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [elements, setElements] = useState<ElementTemplate[]>([]);
  const [sorItems, setSorItems] = useState<SORItem[]>([]);
  const [sorSearch, setSorSearch] = useState("");
  const [form, setForm] = useState<{ name: string; elementTemplateId: string; description: string; dimensionInputs: Array<{ name: string; label: string; unit: string; defaultValue: number }>; items: AssemblyItem[] }>({
    name: "", elementTemplateId: "", description: "",
    dimensionInputs: [{ name: "L", label: "Length", unit: "m", defaultValue: 0 }, { name: "B", label: "Breadth", unit: "m", defaultValue: 0 }, { name: "H", label: "Height/Depth", unit: "m", defaultValue: 0 }, { name: "Nos", label: "Numbers", unit: "", defaultValue: 1 }],
    items: [],
  });
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, eRes] = await Promise.all([fetch("/api/assemblies"), fetch("/api/elements")]);
      setAssemblies(await aRes.json());
      setElements(await eRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (sorSearch.length >= 2) {
      fetch(`/api/sor?search=${encodeURIComponent(sorSearch)}&limit=20`)
        .then((r) => r.json())
        .then((d) => setSorItems(d.items || []));
    }
  }, [sorSearch]);

  const openNew = () => {
    setEditMode(false);
    setForm({ name: "", elementTemplateId: elements[0]?.id || "", description: "", dimensionInputs: [{ name: "L", label: "Length", unit: "m", defaultValue: 0 }, { name: "B", label: "Breadth", unit: "m", defaultValue: 0 }, { name: "H", label: "Height/Depth", unit: "m", defaultValue: 0 }, { name: "Nos", label: "Numbers", unit: "", defaultValue: 1 }], items: [] });
    setShowModal(true);
  };

  const openEdit = (a: Assembly) => {
    setEditMode(true);
    setForm({ name: a.name, elementTemplateId: a.elementTemplateId, description: a.description || "", dimensionInputs: a.dimensionInputs as Array<{ name: string; label: string; unit: string; defaultValue: number }> || [], items: a.items });
    setSelected(a);
    setShowModal(true);
  };

  const addItem = () => {
    setForm((f) => ({ ...f, items: [...f.items, { description: "", unit: "", formula: "Nos * L * B * H", isRequired: true, sequenceOrder: f.items.length }] }));
  };

  const updateItem = (idx: number, field: string, value: unknown) => {
    setForm((f) => { const items = [...f.items]; items[idx] = { ...items[idx], [field]: value }; return { ...f, items }; });
  };

  const removeItem = (idx: number) => {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };

  const save = async () => {
    if (!form.name || !form.elementTemplateId) {
      toast({ title: "Name and element template are required", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const url = editMode && selected ? `/api/assemblies/${selected.id}` : "/api/assemblies";
      const method = editMode ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error((await res.json()).error || "Save failed");
      toast({ title: `Assembly ${editMode ? "updated" : "created"}`, variant: "success" });
      setShowModal(false);
      load();
    } catch (e: unknown) {
      toast({ title: e instanceof Error ? e.message : "Error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteAssembly = async (id: string) => {
    if (!confirm("Delete this assembly?")) return;
    const res = await fetch(`/api/assemblies/${id}`, { method: "DELETE" });
    if (res.ok) { toast({ title: "Deleted", variant: "success" }); load(); setSelected(null); }
    else toast({ title: "Delete failed", variant: "destructive" });
  };

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {/* Left Panel */}
      <div className="w-72 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-base font-bold text-slate-800">Element Assemblies</h1>
            <button onClick={openNew} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">
              <Plus className="w-3.5 h-3.5" /> New
            </button>
          </div>
          <p className="text-xs text-slate-500">Reusable work item groups for auto-generating measurement rows.</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center items-center h-20"><Loader2 className="w-5 h-5 animate-spin text-blue-500" /></div>
          ) : assemblies.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">No assemblies yet. Create your first one.</div>
          ) : (
            assemblies.map((a) => (
              <button key={a.id} onClick={() => setSelected(a)} className={`w-full text-left p-3 rounded-lg mb-1 transition-all ${selected?.id === a.id ? "bg-blue-50 border border-blue-200" : "hover:bg-slate-50 border border-transparent"}`}>
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{a.name}</div>
                    <div className="text-xs text-slate-400">{a.elementTemplate?.name} · {a.items.length} items</div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 overflow-y-auto bg-slate-50">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Layers className="w-10 h-10 mb-3 opacity-30" />
            <div className="text-sm font-medium">Select an assembly</div>
            <div className="text-xs mt-1">or create a new one to get started</div>
          </div>
        ) : (
          <div className="p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-slate-800">{selected.name}</h2>
                <div className="text-sm text-slate-500 mt-0.5">{selected.elementTemplate?.name} · {selected.items.length} work items</div>
                {selected.description && <p className="text-sm text-slate-400 mt-1">{selected.description}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(selected)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => deleteAssembly(selected.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-red-200 rounded-lg hover:bg-red-50 text-red-600">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>

            {/* Dimension Inputs */}
            {(selected.dimensionInputs || []).length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
                <div className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wide">Dimension Inputs</div>
                <div className="flex flex-wrap gap-2">
                  {(selected.dimensionInputs as Array<{ name: string; label: string; unit?: string }>).map((d) => (
                    <span key={d.name} className="text-xs px-2.5 py-1 bg-blue-50 border border-blue-100 rounded-full text-blue-700">
                      {d.label} ({d.name}) {d.unit && `· ${d.unit}`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Work Items */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Work Items ({selected.items.length})</div>
              </div>
              {selected.items.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">No items in this assembly</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr className="text-xs text-slate-500">
                      <th className="px-4 py-2.5 text-left">#</th>
                      <th className="px-4 py-2.5 text-left">Description</th>
                      <th className="px-4 py-2.5 text-left">Unit</th>
                      <th className="px-4 py-2.5 text-left">Formula</th>
                      <th className="px-4 py-2.5 text-left">SOR Item</th>
                      <th className="px-4 py-2.5 text-center">Required</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selected.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-sm text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-3 text-sm text-slate-800 font-medium">{item.description}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{item.unit}</td>
                        <td className="px-4 py-3"><code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{item.formula}</code></td>
                        <td className="px-4 py-3 text-xs text-slate-500">{item.sorItem?.itemCode || "—"}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${item.isRequired ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                            {item.isRequired ? "Yes" : "No"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">{editMode ? "Edit Assembly" : "New Assembly"}</h3>
              <button onClick={() => setShowModal(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Assembly Name *</label>
                  <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="e.g. RCC Column Assembly" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Element Template *</label>
                  <select value={form.elementTemplateId} onChange={(e) => setForm((f) => ({ ...f, elementTemplateId: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                    {elements.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                  <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                </div>
              </div>

              {/* Work Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Work Items</label>
                  <button onClick={addItem} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>
                <div className="space-y-3">
                  {form.items.map((item, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 w-5 text-center">{idx + 1}</span>
                        <input value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} className="flex-1 px-2 py-1.5 text-xs border border-slate-200 rounded" placeholder="Work item description" />
                        <input value={item.unit} onChange={(e) => updateItem(idx, "unit", e.target.value)} className="w-20 px-2 py-1.5 text-xs border border-slate-200 rounded" placeholder="Unit" />
                        <button onClick={() => removeItem(idx)} className="p-1 text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
                      </div>
                      <div className="flex items-center gap-2 pl-7">
                        <Calculator className="w-3.5 h-3.5 text-slate-400" />
                        <input value={item.formula} onChange={(e) => updateItem(idx, "formula", e.target.value)} className="flex-1 px-2 py-1.5 text-xs border border-slate-200 rounded font-mono" placeholder="Nos * L * B * H" />
                        <label className="flex items-center gap-1 text-xs text-slate-500">
                          <input type="checkbox" checked={item.isRequired} onChange={(e) => updateItem(idx, "isRequired", e.target.checked)} className="rounded" /> Required
                        </label>
                      </div>
                      <div className="flex items-center gap-2 pl-7">
                        <input
                          value={sorSearch}
                          onChange={(e) => setSorSearch(e.target.value)}
                          className="flex-1 px-2 py-1.5 text-xs border border-slate-200 rounded"
                          placeholder="Search SOR item (optional)..."
                        />
                        {sorItems.length > 0 && (
                          <select className="flex-1 px-2 py-1.5 text-xs border border-slate-200 rounded" onChange={(e) => updateItem(idx, "sorItemId", e.target.value)} value={item.sorItemId || ""}>
                            <option value="">— None —</option>
                            {sorItems.map((s) => <option key={s.id} value={s.id}>{s.itemCode} - {s.description.substring(0, 40)}</option>)}
                          </select>
                        )}
                      </div>
                    </div>
                  ))}
                  {form.items.length === 0 && (
                    <div className="text-center py-4 text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-lg">
                      Click "Add Item" to add work items to this assembly
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-60">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Assembly</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
