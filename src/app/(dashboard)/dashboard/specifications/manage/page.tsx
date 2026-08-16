"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Plus, Trash2, Pencil, X, Check } from "lucide-react";

interface Section { title: string; description: string; subsections: { title: string; description: string }[]; }
interface ItemSpec { id: string; itemCode: string; description: string; sections: Section[]; }

export default function ManageSpecificationsPage() {
  const [items, setItems] = useState<ItemSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<ItemSpec | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // New item form state
  const [newCode, setNewCode] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const fetchItems = useCallback(async (q = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/item-specs${q ? `?search=${encodeURIComponent(q)}` : ""}`);
      const data = await res.json();
      if (data.success) setItems(data.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  useEffect(() => {
    const t = setTimeout(() => fetchItems(search), 300);
    return () => clearTimeout(t);
  }, [search, fetchItems]);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  }

  async function handleDelete(code: string) {
    try {
      const res = await fetch(`/api/item-specs/${code}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.itemCode !== code));
        showToast(`${code} deleted`);
      }
    } catch { showToast("Delete failed", false); }
    setDeleteConfirm(null);
  }

  async function handleSaveEdit() {
    if (!editItem) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/item-specs/${editItem.itemCode}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: editItem.description, sections: editItem.sections }),
      });
      const data = await res.json();
      if (data.success) {
        setItems((prev) => prev.map((i) => i.itemCode === editItem.itemCode ? data.data : i));
        showToast(`${editItem.itemCode} updated`);
        setEditItem(null);
      } else { showToast("Update failed", false); }
    } catch { showToast("Update failed", false); }
    setSaving(false);
  }

  async function handleAddItem() {
    if (!newCode.trim() || !newDesc.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/item-specs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemCode: newCode.trim(), description: newDesc.trim(), sections: [] }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`${data.data.itemCode} created`);
        setShowAddForm(false); setNewCode(""); setNewDesc("");
        fetchItems(search);
      } else { showToast(data.error ?? "Create failed", false); }
    } catch { showToast("Create failed", false); }
    setSaving(false);
  }

  const filtered = items.filter((i) =>
    !search || i.itemCode.toLowerCase().includes(search.toLowerCase()) || i.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {toast && (
        <div className="fixed top-6 right-6 z-50">
          <div className={`flex items-center gap-3 rounded-2xl border px-5 py-3.5 shadow-2xl bg-white ${toast.ok ? "border-emerald-200" : "border-red-200"}`}>
            {toast.ok ? <Check className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-red-500" />}
            <span className="text-sm font-semibold text-slate-700">{toast.msg}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/specifications"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Manage Specifications</h1>
            <p className="text-sm text-slate-500">{items.length} item specifications</p>
          </div>
        </div>
        <button onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="mb-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">New Item Specification</h3>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Item Code</label>
              <input type="text" value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="e.g. RJ304"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono" />
            </div>
            <div className="col-span-3">
              <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
              <input type="text" value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Item description…"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddItem} disabled={!newCode.trim() || !newDesc.trim() || saving}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {saving ? "Saving…" : "Create Item"}
            </button>
            <button onClick={() => { setShowAddForm(false); setNewCode(""); setNewDesc(""); }}
              className="px-4 py-2 bg-white border border-slate-200 text-sm font-semibold text-slate-600 rounded-xl hover:bg-slate-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by item code or description…"
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400 text-sm">No items found.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide w-20">Sections</th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.itemCode} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{item.itemCode}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-md">
                    <div className="line-clamp-2 text-xs" dangerouslySetInnerHTML={{ __html: item.description }} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{item.sections?.length ?? 0}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditItem({ ...item })}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {deleteConfirm === item.itemCode ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDelete(item.itemCode)}
                            className="px-2 py-1 text-xs font-bold text-white bg-red-500 rounded hover:bg-red-600">Yes</button>
                          <button onClick={() => setDeleteConfirm(null)}
                            className="px-2 py-1 text-xs font-bold text-slate-600 bg-slate-100 rounded hover:bg-slate-200">No</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(item.itemCode)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditItem(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800">Edit Specification</h3>
                <p className="text-xs text-slate-500 font-mono">{editItem.itemCode}</p>
              </div>
              <button onClick={() => setEditItem(null)} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Description (HTML)</label>
                <textarea rows={4} value={editItem.description}
                  onChange={(e) => setEditItem({ ...editItem, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none font-mono" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Sections</label>
                {(editItem.sections ?? []).map((sec, si) => (
                  <div key={si} className="mb-4 p-4 border border-slate-200 rounded-xl bg-slate-50">
                    <div className="flex items-center justify-between mb-2">
                      <input type="text" value={sec.title}
                        onChange={(e) => {
                          const s = [...editItem.sections];
                          s[si] = { ...s[si], title: e.target.value };
                          setEditItem({ ...editItem, sections: s });
                        }}
                        className="text-sm font-semibold text-slate-700 bg-transparent border-b border-slate-300 focus:outline-none focus:border-indigo-400 flex-1 mr-2" />
                      <button onClick={() => setEditItem({ ...editItem, sections: editItem.sections.filter((_, i) => i !== si) })}
                        className="text-red-400 hover:text-red-600 p-1">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <textarea rows={4} value={sec.description}
                      onChange={(e) => {
                        const s = [...editItem.sections];
                        s[si] = { ...s[si], description: e.target.value };
                        setEditItem({ ...editItem, sections: s });
                      }}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300 resize-y font-mono bg-white" />
                  </div>
                ))}
                <button onClick={() => setEditItem({ ...editItem, sections: [...(editItem.sections ?? []), { title: "New Section", description: "", subsections: [] }] })}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 mt-1">
                  <Plus className="w-3.5 h-3.5" /> Add Section
                </button>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex gap-3">
              <button onClick={handleSaveEdit} disabled={saving}
                className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <button onClick={() => setEditItem(null)}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-200 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
