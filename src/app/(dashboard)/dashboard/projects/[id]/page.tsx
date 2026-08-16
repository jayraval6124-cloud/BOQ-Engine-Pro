"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Edit, FileText, Calendar, CheckCircle, AlertCircle,
  Database, Pencil, X, Check, Clock, Plus, ChevronRight,
  ClipboardList, BarChart3, IndianRupee, Copy, Trash2, Loader2,
} from "lucide-react";
import {
  formatDate, formatCurrency, PROJECT_STATUS_COLORS, PROJECT_STATUS_LABELS,
  DIVISIONS_GUJARAT, SOR_YEARS, BOQ_STATUS_LABELS,
} from "@/lib/utils";
import { toast } from "@/components/ui/toaster";
import { useRouter } from "next/navigation";

interface MeasurementSheet { id: string; name: string; status: string; createdAt: string; _count?: { rows: number } }
interface BOQ {
  id: string; name: string; boqNo: string; status: string; revisionNo: number;
  grandTotal: number | string; totalAmount: string; createdAt: string;
  breakdown?: { tenderAmount: number; totalWithGST: number; netEstimated: number };
  measurementSheet?: MeasurementSheet | null;
  _count?: { items: number };
}
interface Project {
  id: string; projectNo: string; name: string;
  sorDivision: string; state: string; sorYear: string;
  status: string; createdAt: string;
  createdBy: { name: string; email: string };
  measurementSheets: MeasurementSheet[];
  boqs: BOQ[];
  auditLogs: Array<{ id: string; action: string; description: string; createdAt: string; user: { name: string } }>;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT:     "bg-slate-100 text-slate-600",
  SUBMITTED: "bg-blue-100 text-blue-700",
  APPROVED:  "bg-emerald-100 text-emerald-700",
  LOCKED:    "bg-purple-100 text-purple-700",
  REVISED:   "bg-amber-100 text-amber-700",
};

const AUDIT_ICONS: Record<string, React.ReactNode> = {
  PROJECT_CREATED:    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />,
  PROJECT_UPDATED:    <Edit className="w-3.5 h-3.5 text-blue-500" />,
  MEASUREMENT_ADDED:  <FileText className="w-3.5 h-3.5 text-purple-500" />,
  BOQ_GENERATED:      <FileText className="w-3.5 h-3.5 text-orange-500" />,
  BOQ_APPROVED:       <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />,
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject]   = useState<Project | null>(null);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState("boqs");
  const [editingDivision, setEditingDivision] = useState(false);
  const [divisionValue, setDivisionValue] = useState("");
  const [divisionYear, setDivisionYear]   = useState("");
  const [savingDivision, setSavingDivision] = useState(false);

  // Duplicate
  const [dupSource, setDupSource]   = useState<BOQ | null>(null);
  const [dupName, setDupName]       = useState("");
  const [duplicating, setDuplicating] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setProject(d);
        setDivisionValue(d.sorDivision || "");
        setDivisionYear(d.sorYear || "2024-25");
        setLoading(false);
      })
      .catch(() => { toast({ title: "Failed to load project", variant: "destructive" }); setLoading(false); });
  }, [id]);

  const saveDivision = async () => {
    setSavingDivision(true);
    const res = await fetch(`/api/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sorDivision: divisionValue, sorYear: divisionYear }),
    });
    if (res.ok) {
      const updated = await res.json();
      setProject((p) => p ? { ...p, sorDivision: updated.sorDivision, sorYear: updated.sorYear } : p);
      setEditingDivision(false);
      toast({ title: "Division updated", variant: "success" });
    } else toast({ title: "Failed to update", variant: "destructive" });
    setSavingDivision(false);
  };

  const deleteBOQ = async (boqId: string, name: string) => {
    if (!confirm(`Delete BOQ "${name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/boq/${boqId}`, { method: "DELETE" });
    if (res.ok) {
      setProject((p) => p ? { ...p, boqs: p.boqs.filter((b) => b.id !== boqId) } : p);
      toast({ title: "BOQ deleted", variant: "destructive" });
    } else toast({ title: "Failed to delete", variant: "destructive" });
  };

  const runDuplicate = async () => {
    if (!dupSource) return;
    setDuplicating(true);
    try {
      const res  = await fetch(`/api/boq/${dupSource.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: id, name: dupName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Duplicate failed");
      toast({ title: `Duplicated as "${data.name}"`, variant: "success" });
      setDupSource(null);
      router.push(`/dashboard/boq/${data.id}`);
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Duplicate failed", variant: "destructive" });
    } finally { setDuplicating(false); }
  };

  const totalEstimate = project?.boqs.reduce((s, b) => {
    const totalRs = Number(b.grandTotal) || 0;
    const netEst  = b.breakdown?.netEstimated ?? Math.round(totalRs * 1.01 * 1.18 * 1.07);
    return s + netEst;
  }, 0) ?? 0;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );

  if (!project) return (
    <div className="text-center py-20">
      <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
      <p className="text-slate-500">Project not found</p>
      <Link href="/dashboard/projects" className="text-blue-600 text-sm mt-2 inline-block">Back to projects</Link>
    </div>
  );

  const tabs = [
    { id: "boqs",         label: `BOQs (${project.boqs.length})` },
    { id: "measurements", label: `Measurement Sheets (${project.measurementSheets.length})` },
    { id: "audit",        label: "Activity" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/dashboard/projects" className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg mt-0.5">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{project.projectNo}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${PROJECT_STATUS_COLORS[project.status]}`}>
                  {PROJECT_STATUS_LABELS[project.status]}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-800">{project.name}</h1>
              <p className="text-slate-400 text-sm mt-0.5">{project.sorDivision || "—"} &bull; SOR {project.sorYear}</p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/dashboard/boq/spreadsheet?projectId=${project.id}`}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" /> New BOQ
              </Link>
              <Link href={`/dashboard/projects/${project.id}/edit`} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50">
                <Edit className="w-3.5 h-3.5" /> Edit
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-2"><ClipboardList className="w-3.5 h-3.5" /> Total BOQs</div>
          <p className="text-2xl font-bold text-slate-800">{project.boqs.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-2"><FileText className="w-3.5 h-3.5" /> Measurement Sheets</div>
          <p className="text-2xl font-bold text-slate-800">{project.measurementSheets.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-2"><BarChart3 className="w-3.5 h-3.5" /> Approved BOQs</div>
          <p className="text-2xl font-bold text-emerald-600">{project.boqs.filter((b) => b.status === "APPROVED").length}</p>
        </div>
        <div className="bg-blue-600 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-blue-200 text-xs mb-2"><IndianRupee className="w-3.5 h-3.5" /> Total Estimate Value</div>
          <p className="text-lg font-bold text-white">{formatCurrency(totalEstimate)}</p>
        </div>
      </div>

      {/* SOR Rate Settings */}
      <div className="bg-white rounded-xl border border-blue-100 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-semibold text-slate-700">SOR Rate Settings</span>
            <span className="text-xs text-slate-400">— controls which rates are used in BOQs</span>
          </div>
          {!editingDivision && (
            <button onClick={() => { setDivisionValue(project.sorDivision || ""); setDivisionYear(project.sorYear); setEditingDivision(true); }}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50">
              <Pencil className="w-3 h-3" /> Change
            </button>
          )}
        </div>
        {editingDivision ? (
          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 shrink-0">Division</label>
              <select value={divisionValue} onChange={(e) => setDivisionValue(e.target.value)}
                className="px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Not set —</option>
                {DIVISIONS_GUJARAT.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 shrink-0">SOR Year</label>
              <select value={divisionYear} onChange={(e) => setDivisionYear(e.target.value)}
                className="px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                {SOR_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button onClick={saveDivision} disabled={savingDivision}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-60">
              <Check className="w-3 h-3" /> {savingDivision ? "Saving..." : "Save"}
            </button>
            <button onClick={() => setEditingDivision(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4 mt-2">
            <span className="text-sm">
              <span className="text-slate-400 text-xs">Division: </span>
              <span className={`font-semibold ${project.sorDivision ? "text-slate-800" : "text-amber-500"}`}>{project.sorDivision || "Not set"}</span>
            </span>
            <span className="text-sm">
              <span className="text-slate-400 text-xs">SOR Year: </span>
              <span className="font-semibold text-slate-800">{project.sorYear}</span>
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-4 flex items-center justify-between">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
                {tab.label}
              </button>
            ))}
          </div>
          {activeTab === "boqs" && (
            <Link href={`/dashboard/boq/spreadsheet?projectId=${project.id}`}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 my-2">
              <Plus className="w-3.5 h-3.5" /> New BOQ
            </Link>
          )}
          {activeTab === "measurements" && (
            <Link href={`/dashboard/boq/spreadsheet?projectId=${project.id}`}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 my-2">
              <Plus className="w-3.5 h-3.5" /> New BOQ with Sheet
            </Link>
          )}
        </div>

        <div className="p-5">
          {/* ── BOQs tab ── */}
          {activeTab === "boqs" && (
            <div className="space-y-3">
              {project.boqs.length === 0 ? (
                <div className="text-center py-16">
                  <ClipboardList className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No BOQs yet</p>
                  <p className="text-slate-400 text-sm mt-1">Create a BOQ to start estimating this project</p>
                  <Link href={`/dashboard/boq/spreadsheet?projectId=${project.id}`}
                    className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
                    <Plus className="w-4 h-4" /> Create First BOQ
                  </Link>
                </div>
              ) : project.boqs.map((boq) => {
                const totalRs   = Number(boq.grandTotal) || Number(boq.totalAmount) || 0;
                const bd        = boq.breakdown;
                const tender    = bd ? bd.tenderAmount  : totalRs * 1.01;
                const withGST   = bd ? bd.totalWithGST  : tender * 1.18;
                const netEst    = bd ? bd.netEstimated  : Math.round(withGST * 1.07);
                return (
                  <div key={boq.id} className="border border-slate-200 rounded-xl overflow-hidden hover:border-blue-200 transition-colors group">
                    {/* BOQ row header */}
                    <div className="flex items-center gap-4 px-4 py-3 bg-slate-50 group-hover:bg-blue-50/40">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-400">{boq.boqNo}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[boq.status]}`}>
                            {BOQ_STATUS_LABELS[boq.status]}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-800 mt-0.5">{boq.name}</p>
                        <p className="text-xs text-slate-400">{boq._count?.items ?? 0} items &bull; {formatDate(boq.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Link href={`/dashboard/boq/${boq.id}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50">
                          Open <ChevronRight className="w-3 h-3" />
                        </Link>
                        <button onClick={() => { setDupSource(boq); setDupName(`${boq.name} (Copy)`); }}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteBOQ(boq.id, boq.name)}
                          disabled={boq.status === "LOCKED"}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Amount summary row */}
                    <div className="grid grid-cols-3 border-t border-slate-100">
                      <div className="px-4 py-2.5 border-r border-slate-100">
                        <p className="text-xs text-slate-400">Total Rs.</p>
                        <p className="text-sm font-semibold text-slate-700">{formatCurrency(totalRs)}</p>
                      </div>
                      <div className="px-4 py-2.5 border-r border-slate-100">
                        <p className="text-xs text-slate-400">Tender Amount Rs.</p>
                        <p className="text-sm font-semibold text-slate-700">{formatCurrency(tender)}</p>
                      </div>
                      <div className="px-4 py-2.5 bg-blue-50">
                        <p className="text-xs text-blue-500">Net Estimated Amount Rs.</p>
                        <p className="text-sm font-bold text-blue-700">{formatCurrency(netEst)}</p>
                      </div>
                    </div>

                    {/* Sheet links */}
                    <div className="grid grid-cols-3 border-t border-slate-100 text-xs">
                      <Link href={`/dashboard/boq/${boq.id}`}
                        className="flex items-center gap-2 text-slate-500 hover:text-blue-600 hover:bg-slate-50 px-4 py-2 border-r border-slate-100 transition-colors">
                        <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="font-medium">Measurement Sheet</span>
                        <ChevronRight className="w-3 h-3 ml-auto opacity-40" />
                      </Link>
                      <Link href={`/dashboard/boq/${boq.id}`}
                        className="flex items-center gap-2 text-slate-500 hover:text-blue-600 hover:bg-slate-50 px-4 py-2 border-r border-slate-100 transition-colors">
                        <ClipboardList className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="font-medium">BOQ Sheet</span>
                        <ChevronRight className="w-3 h-3 ml-auto opacity-40" />
                      </Link>
                      <Link href={`/dashboard/boq/${boq.id}#abstract`}
                        className="flex items-center gap-2 text-slate-500 hover:text-blue-600 hover:bg-slate-50 px-4 py-2 transition-colors">
                        <BarChart3 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="font-medium">Summary Sheet</span>
                        <ChevronRight className="w-3 h-3 ml-auto opacity-40" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Measurement Sheets tab ── */}
          {activeTab === "measurements" && (
            <div className="space-y-2">
              {project.measurementSheets.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-sm">
                  <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  Measurement sheets are created automatically when you create a BOQ
                </div>
              ) : project.measurementSheets.map((ms) => (
                <div key={ms.id} className="flex items-center justify-between border border-slate-200 rounded-lg px-4 py-3 hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">{ms.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatDate(ms.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">{ms.status}</span>
                    <Link href={`/dashboard/measurements/${ms.id}`}
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                      Open <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Activity tab ── */}
          {activeTab === "audit" && (
            <div className="space-y-3">
              {project.auditLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">No activity yet</div>
              ) : project.auditLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 text-sm">
                  <div className="mt-0.5">{AUDIT_ICONS[log.action] || <Clock className="w-3.5 h-3.5 text-slate-400" />}</div>
                  <div className="flex-1">
                    <p className="text-slate-700">{log.description}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{log.user.name} &bull; {formatDate(log.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Duplicate BOQ modal */}
      {dupSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setDupSource(null)}>
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-[400px]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800">Duplicate BOQ</h3>
              <button onClick={() => setDupSource(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">New BOQ Name</label>
              <input value={dupName} onChange={(e) => setDupName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button onClick={() => setDupSource(null)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={runDuplicate} disabled={!dupName.trim() || duplicating}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                {duplicating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Duplicating…</> : <><Copy className="w-3.5 h-3.5" />Duplicate</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
