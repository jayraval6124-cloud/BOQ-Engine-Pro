"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Loader2, GitBranch, Lock, ChevronRight, AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { toast } from "@/components/ui/toaster";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

interface Revision {
  id: string;
  boqId: string;
  revisionNo: number;
  name: string;
  status: string;
  changeSummary?: string;
  snapshot: { grandTotal: number; items: Array<{ description: string; amount: number }> };
  diff?: { added: Array<{ description: string; amount: number }>; removed: Array<{ description: string; amount: number }>; modified: Array<{ description: string; oldAmount: number; newAmount: number; difference: number }> };
  createdAt: string;
  lockedAt?: string;
  project: { name: string; projectNo: string };
  boq: { boqNo: string; name: string; grandTotal: number };
  createdBy: { name: string };
}

interface BOQ { id: string; boqNo: string; name: string; grandTotal: number; status: string; projectId: string }
interface Project { id: string; name: string; projectNo: string }

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  ACTIVE: "bg-blue-100 text-blue-700",
  LOCKED: "bg-amber-100 text-amber-700",
  SUPERSEDED: "bg-slate-100 text-slate-400",
};

export default function RevisionsPage() {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Revision | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [boqs, setBoqs] = useState<BOQ[]>([]);
  const [form, setForm] = useState({ projectId: "", boqId: "", name: "", changeSummary: "" });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, pRes] = await Promise.all([fetch("/api/revisions"), fetch("/api/projects?limit=100")]);
      setRevisions(await rRes.json());
      const pd = await pRes.json();
      setProjects(pd.projects || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (form.projectId) {
      fetch(`/api/boq?projectId=${form.projectId}`).then((r) => r.json()).then((d) => setBoqs(Array.isArray(d) ? d : d.boqs || []));
    }
  }, [form.projectId]);

  const create = async () => {
    if (!form.boqId || !form.name) { toast({ title: "BOQ and revision name required", variant: "destructive" }); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/revisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boqId: form.boqId, name: form.name, changeSummary: form.changeSummary }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast({ title: "Revision created", variant: "success" });
      setShowCreate(false);
      load();
    } catch (e: unknown) {
      toast({ title: e instanceof Error ? e.message : "Error", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const lockRevision = async (id: string) => {
    const res = await fetch(`/api/revisions/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "lock" }) });
    if (res.ok) { toast({ title: "Revision locked", variant: "success" }); load(); setSelected(null); }
    else toast({ title: (await res.json()).error || "Lock failed", variant: "destructive" });
  };

  const snap = selected?.snapshot as { grandTotal?: number; items?: Array<{ description: string; amount: number }> } | undefined;
  const diff = selected?.diff as { added?: Array<{ description: string; amount: number }>; removed?: Array<{ description: string; amount: number }>; modified?: Array<{ description: string; oldAmount: number; newAmount: number; difference: number }> } | undefined;

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {/* Left */}
      <div className="w-80 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-base font-bold text-slate-800">Estimate Revisions</h1>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">
              <Plus className="w-3.5 h-3.5" /> New
            </button>
          </div>
          <p className="text-xs text-slate-500">Track BOQ revisions and compare changes.</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center items-center h-20"><Loader2 className="w-5 h-5 animate-spin text-blue-500" /></div>
          ) : revisions.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">No revisions yet.</div>
          ) : (
            revisions.map((r) => (
              <button key={r.id} onClick={() => setSelected(r)} className={`w-full text-left p-3 rounded-lg mb-1 transition-all ${selected?.id === r.id ? "bg-blue-50 border border-blue-200" : "hover:bg-slate-50 border border-transparent"}`}>
                <div className="flex items-start gap-2">
                  <GitBranch className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-slate-800 truncate">{r.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{r.project?.projectNo} · R{r.revisionNo}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{formatCurrency(r.snapshot?.grandTotal ?? 0)}</div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 mt-1" />
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
            <GitBranch className="w-10 h-10 mb-3 opacity-30" />
            <div className="text-sm font-medium">Select a revision to view details</div>
          </div>
        ) : (
          <div className="p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-800">{selected.name}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[selected.status]}`}>{selected.status}</span>
                </div>
                <div className="text-sm text-slate-500 mt-0.5">{selected.project?.name} · Revision {selected.revisionNo} · {selected.boq?.name}</div>
                <div className="text-xs text-slate-400 mt-1">Created by {selected.createdBy?.name} on {formatDate(selected.createdAt)}</div>
                {selected.changeSummary && <p className="text-sm text-slate-600 mt-2 italic">"{selected.changeSummary}"</p>}
              </div>
              {selected.status !== "LOCKED" && (
                <button onClick={() => lockRevision(selected.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-amber-200 rounded-lg hover:bg-amber-50 text-amber-700">
                  <Lock className="w-3.5 h-3.5" /> Lock Revision
                </button>
              )}
            </div>

            {/* Grand Total */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-xs text-slate-500 mb-1">Grand Total (Snapshot)</div>
                <div className="text-lg font-bold text-slate-800">{formatCurrency(snap?.grandTotal ?? 0)}</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-xs text-slate-500 mb-1">Current BOQ Total</div>
                <div className="text-lg font-bold text-blue-600">{formatCurrency(selected.boq?.grandTotal ?? 0)}</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-xs text-slate-500 mb-1">Difference</div>
                <div className={`text-lg font-bold ${Number(selected.boq?.grandTotal ?? 0) - (snap?.grandTotal ?? 0) >= 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {formatCurrency(Number(selected.boq?.grandTotal ?? 0) - (snap?.grandTotal ?? 0))}
                </div>
              </div>
            </div>

            {/* Diff View */}
            {diff && (
              <div className="space-y-4 mb-4">
                {(diff.added || []).length > 0 && (
                  <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden">
                    <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-semibold text-emerald-700">Added Items ({diff.added?.length})</span>
                    </div>
                    {(diff.added || []).map((item, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-slate-50 last:border-0 text-sm">
                        <span className="text-slate-700">{item.description}</span>
                        <span className="text-emerald-600 font-medium">+{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {(diff.removed || []).length > 0 && (
                  <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
                    <div className="px-4 py-2.5 bg-red-50 border-b border-red-100 flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-red-600" />
                      <span className="text-xs font-semibold text-red-700">Removed Items ({diff.removed?.length})</span>
                    </div>
                    {(diff.removed || []).map((item, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-slate-50 last:border-0 text-sm">
                        <span className="text-slate-700">{item.description}</span>
                        <span className="text-red-600 font-medium">-{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {(diff.modified || []).length > 0 && (
                  <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
                    <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
                      <Minus className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-semibold text-amber-700">Modified Items ({diff.modified?.length})</span>
                    </div>
                    {(diff.modified || []).map((item, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-slate-50 last:border-0 text-sm">
                        <span className="text-slate-700">{item.description}</span>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-slate-400 line-through">{formatCurrency(item.oldAmount)}</span>
                          <span className="text-slate-600">{formatCurrency(item.newAmount)}</span>
                          <span className={item.difference >= 0 ? "text-red-600 font-medium" : "text-emerald-600 font-medium"}>
                            {item.difference >= 0 ? "+" : ""}{formatCurrency(item.difference)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {!(diff.added?.length || diff.removed?.length || diff.modified?.length) && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4 text-center text-sm text-slate-400">No comparison data available</div>
                )}
              </div>
            )}

            {/* Items snapshot */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Items at Revision ({snap?.items?.length ?? 0})</span>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {(snap?.items || []).map((item: { description: string; amount: number }, i: number) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2 border-b border-slate-50 last:border-0 text-sm">
                    <span className="text-slate-700 truncate max-w-[60%]">{item.description}</span>
                    <span className="text-slate-600">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <Link href={`/dashboard/boq/${selected.boqId}`} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                View linked BOQ →
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Create Revision Snapshot</h3>
              <button onClick={() => setShowCreate(false)}><AlertTriangle className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Project *</label>
                <select value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value, boqId: "" }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                  <option value="">— Select Project —</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.projectNo} — {p.name}</option>)}
                </select>
              </div>
              {form.projectId && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">BOQ *</label>
                  <select value={form.boqId} onChange={(e) => setForm((f) => ({ ...f, boqId: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                    <option value="">— Select BOQ —</option>
                    {boqs.map((b) => <option key={b.id} value={b.id}>{b.boqNo} — {b.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Revision Name *</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" placeholder="e.g. R1 - Client Changes March 2025" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Change Summary</label>
                <textarea value={form.changeSummary} onChange={(e) => setForm((f) => ({ ...f, changeSummary: e.target.value }))} rows={2} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" placeholder="Describe what changed..." />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={create} disabled={creating || !form.boqId || !form.name} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-60">
                {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : "Create Snapshot"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
