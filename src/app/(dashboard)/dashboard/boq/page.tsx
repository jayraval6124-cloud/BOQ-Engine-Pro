"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, FileText, MoreHorizontal, Edit, Trash2, Copy, X, Loader2 } from "lucide-react";
import { formatCurrency, formatDate, BOQ_STATUS_LABELS } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";

interface BOQ {
  id: string; name: string; boqNo: string; status: string; revisionNo: number;
  grandTotal: number | string; createdAt: string;
  project: { id: string; name: string; projectNo: string; sorDivision: string; sorYear: string };
  createdBy: { name: string };
  _count: { items: number };
}

interface Project { id: string; name: string; projectNo: string }

const STATUS_COLORS: Record<string, string> = {
  DRAFT:     "bg-slate-100 text-slate-600",
  SUBMITTED: "bg-blue-100 text-blue-700",
  APPROVED:  "bg-emerald-100 text-emerald-700",
  LOCKED:    "bg-purple-100 text-purple-700",
  REVISED:   "bg-amber-100 text-amber-700",
};

export default function BOQListPage() {
  const router = useRouter();
  const [boqs, setBOQs]           = useState<BOQ[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Duplicate modal
  const [dupSource, setDupSource]     = useState<BOQ | null>(null);
  const [dupName, setDupName]         = useState("");
  const [dupProjectId, setDupProjectId] = useState("");
  const [projects, setProjects]       = useState<Project[]>([]);
  const [duplicating, setDuplicating] = useState(false);

  useEffect(() => {
    fetch("/api/boq").then((r) => r.json()).then((d) => { setBOQs(d); setLoading(false); });
  }, []);

  // Load projects for duplicate modal
  useEffect(() => {
    if (!dupSource) return;
    fetch("/api/projects?limit=200")
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []));
  }, [dupSource]);

  // Close menu on outside click
  useEffect(() => {
    if (!activeMenu) return;
    const handler = () => setActiveMenu(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [activeMenu]);

  const handleDelete = async (id: string, name: string) => {
    setActiveMenu(null);
    if (!confirm(`Delete BOQ "${name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/boq/${id}`, { method: "DELETE" });
    if (res.ok) {
      setBOQs((prev) => prev.filter((b) => b.id !== id));
      toast({ title: "BOQ deleted", variant: "destructive" });
    } else {
      toast({ title: "Failed to delete BOQ", variant: "destructive" });
    }
  };

  const handleEdit = (id: string) => {
    setActiveMenu(null);
    router.push(`/dashboard/boq/${id}`);
  };

  const openDuplicate = (boq: BOQ) => {
    setActiveMenu(null);
    setDupSource(boq);
    setDupName(`${boq.name} (Copy)`);
    setDupProjectId(boq.project.id);
  };

  const runDuplicate = async () => {
    if (!dupSource) return;
    setDuplicating(true);
    try {
      const res  = await fetch(`/api/boq/${dupSource.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: dupProjectId || dupSource.project.id, name: dupName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Duplicate failed");
      toast({ title: `Duplicated as "${data.name}"`, variant: "success" });
      setDupSource(null);
      router.push(`/dashboard/boq/${data.id}`);
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Duplicate failed", variant: "destructive" });
    } finally {
      setDuplicating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">BOQ Generator</h1>
          <p className="text-slate-500 text-sm">{boqs.length} BOQ{boqs.length !== 1 ? "s" : ""} generated</p>
        </div>
        <Link href="/dashboard/boq/spreadsheet" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> New BOQ
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : boqs.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No BOQs generated yet</p>
            <p className="text-slate-400 text-sm mt-1">Create a measurement sheet first, then generate a BOQ</p>
            <Link href="/dashboard/boq/spreadsheet" className="inline-flex items-center gap-1 text-blue-600 text-sm mt-3 hover:text-blue-700">
              <Plus className="w-3.5 h-3.5" /> New BOQ
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide rounded-tl-xl">BOQ</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Project</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Items</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Net Estimated Amount</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Created</th>
                <th className="w-12 px-4 py-3 rounded-tr-xl" />
              </tr>
            </thead>
            <tbody>
              {boqs.map((boq, rowIdx) => (
                <tr key={boq.id} className={`border-t border-slate-100 hover:bg-slate-50/60 transition-colors ${rowIdx === boqs.length - 1 ? "last-row" : ""}`}>
                  <td className="px-4 py-3.5">
                    <Link href={`/dashboard/boq/${boq.id}`} className="hover:text-blue-600">
                      <p className="font-medium text-slate-800">{boq.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5 font-mono">{boq.boqNo} &bull; Rev {boq.revisionNo}</p>
                    </Link>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-slate-700">{boq.project.name}</p>
                    <p className="text-xs text-slate-400">{boq.project.sorDivision || "—"} &bull; {boq.project.sorYear}</p>
                  </td>
                  <td className="px-4 py-3.5 text-right text-slate-600">{boq._count.items}</td>
                  <td className="px-4 py-3.5 text-right font-semibold text-slate-800">{formatCurrency(Number(boq.grandTotal))}</td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[boq.status]}`}>
                      {BOQ_STATUS_LABELS[boq.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-400">{formatDate(boq.createdAt)}</td>

                  <td className="px-3 py-3.5 text-right">
                    <div className="relative inline-block">
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === boq.id ? null : boq.id); }}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {activeMenu === boq.id && (
                        <div
                          className="absolute right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 w-44"
                          style={{ top: "100%" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleEdit(boq.id)}
                            className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5 text-blue-500" />
                            Edit BOQ
                          </button>
                          <button
                            onClick={() => openDuplicate(boq)}
                            className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5 text-emerald-500" />
                            Duplicate
                          </button>
                          <div className="mx-3 border-t border-slate-100" />
                          <button
                            onClick={() => handleDelete(boq.id, boq.name)}
                            disabled={boq.status === "LOCKED"}
                            className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Duplicate Modal ── */}
      {dupSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setDupSource(null)}>
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-[440px]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div>
                <h3 className="font-semibold text-slate-800">Duplicate BOQ</h3>
                <p className="text-xs text-slate-400 mt-0.5">Copies all {dupSource._count.items} items, rates, and quantities</p>
              </div>
              <button onClick={() => setDupSource(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">New BOQ Name</label>
                <input
                  value={dupName}
                  onChange={(e) => setDupName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Attach to Project</label>
                <select
                  value={dupProjectId}
                  onChange={(e) => setDupProjectId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  Change this to duplicate the BOQ into a different project
                </p>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button onClick={() => setDupSource(null)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={runDuplicate}
                disabled={!dupName.trim() || duplicating}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {duplicating
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Duplicating…</>
                  : <><Copy className="w-3.5 h-3.5" />Duplicate BOQ</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
