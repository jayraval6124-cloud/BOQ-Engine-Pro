"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Search, BookOpen, Loader2, X, Save, Trash2, Edit2, Tag } from "lucide-react";
import { toast } from "@/components/ui/toaster";
import { formatDate } from "@/lib/utils";

const KB_TYPES = ["NOTE","SPECIFICATION","REFERENCE","FORMULA_GUIDE","REGULATION"] as const;
type KBType = typeof KB_TYPES[number];

const TYPE_CONFIG: Record<KBType, { label: string; color: string }> = {
  NOTE: { label: "Note", color: "bg-slate-100 text-slate-600" },
  SPECIFICATION: { label: "Specification", color: "bg-blue-100 text-blue-700" },
  REFERENCE: { label: "Reference", color: "bg-purple-100 text-purple-700" },
  FORMULA_GUIDE: { label: "Formula Guide", color: "bg-amber-100 text-amber-700" },
  REGULATION: { label: "Regulation", color: "bg-red-100 text-red-700" },
};

interface KBItem {
  id: string;
  title: string;
  content: string;
  type: KBType;
  tags: string[];
  chapter?: string;
  sorYear?: string;
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: { name: string };
  project?: { name: string };
}

export default function KnowledgePage() {
  const [items, setItems] = useState<KBItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<KBType | "">("");
  const [selected, setSelected] = useState<KBItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", type: "NOTE" as KBType, tags: "", chapter: "", sorYear: "", isGlobal: true });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (typeFilter) params.set("type", typeFilter);
    const res = await fetch(`/api/knowledge?${params}`);
    setItems(await res.json());
    setLoading(false);
  }, [search, typeFilter]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  const openNew = () => {
    setEditMode(false);
    setForm({ title: "", content: "", type: "NOTE", tags: "", chapter: "", sorYear: "", isGlobal: true });
    setShowModal(true);
  };

  const openEdit = (item: KBItem) => {
    setEditMode(true);
    setSelected(item);
    setForm({ title: item.title, content: item.content, type: item.type, tags: (item.tags || []).join(", "), chapter: item.chapter || "", sorYear: item.sorYear || "", isGlobal: item.isGlobal });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.title || !form.content) { toast({ title: "Title and content required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload = { ...form, tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean) };
      const url = editMode && selected ? `/api/knowledge/${selected.id}` : "/api/knowledge";
      const method = editMode ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).error || "Save failed");
      toast({ title: `Item ${editMode ? "updated" : "added"}`, variant: "success" });
      setShowModal(false);
      load();
    } catch (e: unknown) {
      toast({ title: e instanceof Error ? e.message : "Error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    const res = await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
    if (res.ok) { toast({ title: "Deleted", variant: "success" }); load(); setSelected(null); }
  };

  const inputClass = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {/* Left */}
      <div className="w-80 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-base font-bold text-slate-800">Knowledge Base</h1>
            <button onClick={openNew} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">
              <Plus className="w-3.5 h-3.5" /> New
            </button>
          </div>
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Search..." />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as KBType | "")} className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg">
            <option value="">— All Types —</option>
            {KB_TYPES.map((t) => <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>)}
          </select>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center items-center h-20"><Loader2 className="w-5 h-5 animate-spin text-blue-500" /></div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">No items found. Add your first knowledge base entry.</div>
          ) : (
            items.map((item) => (
              <button key={item.id} onClick={() => setSelected(item)} className={`w-full text-left p-3 rounded-lg mb-1 transition-all ${selected?.id === item.id ? "bg-blue-50 border border-blue-200" : "hover:bg-slate-50 border border-transparent"}`}>
                <div className="flex items-start gap-2">
                  <BookOpen className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{item.title}</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${TYPE_CONFIG[item.type]?.color}`}>{TYPE_CONFIG[item.type]?.label}</span>
                      {item.chapter && <span className="text-xs text-slate-400">{item.chapter}</span>}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right */}
      <div className="flex-1 overflow-y-auto bg-slate-50">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <BookOpen className="w-10 h-10 mb-3 opacity-30" />
            <div className="text-sm font-medium">Select an item to view its content</div>
            <div className="text-xs mt-1">Store specs, notes, regulations, formula guides</div>
          </div>
        ) : (
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_CONFIG[selected.type]?.color}`}>{TYPE_CONFIG[selected.type]?.label}</span>
                  {selected.chapter && <span className="text-xs text-slate-400">Chapter: {selected.chapter}</span>}
                  {selected.sorYear && <span className="text-xs text-slate-400">SOR: {selected.sorYear}</span>}
                </div>
                <h2 className="text-lg font-bold text-slate-800">{selected.title}</h2>
                <div className="text-xs text-slate-400 mt-1">Added by {selected.createdBy?.name} · {formatDate(selected.updatedAt)}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(selected)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => deleteItem(selected.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-red-200 rounded-lg hover:bg-red-50 text-red-600">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>

            {/* Tags */}
            {(selected.tags || []).length > 0 && (
              <div className="flex items-center gap-1.5 mb-4 flex-wrap">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                {(selected.tags || []).map((tag) => (
                  <span key={tag} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{tag}</span>
                ))}
              </div>
            )}

            {/* Content */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">{selected.content}</div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">{editMode ? "Edit Item" : "New Knowledge Base Item"}</h3>
              <button onClick={() => setShowModal(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Title *</label>
                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={inputClass} placeholder="e.g. IS 456 - Plain and Reinforced Concrete Code" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                  <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as KBType }))} className={inputClass}>
                    {KB_TYPES.map((t) => <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Chapter</label>
                  <input value={form.chapter} onChange={(e) => setForm((f) => ({ ...f, chapter: e.target.value }))} className={inputClass} placeholder="Chapter 3" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">SOR Year</label>
                  <input value={form.sorYear} onChange={(e) => setForm((f) => ({ ...f, sorYear: e.target.value }))} className={inputClass} placeholder="2024-25" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tags (comma separated)</label>
                <input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} className={inputClass} placeholder="concrete, foundation, IS 456" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Content *</label>
                <textarea value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} rows={8} className={inputClass} placeholder="Enter detailed content, specifications, notes, or formula explanations..." />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-60">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Item</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
