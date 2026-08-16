"use client";

import { useEffect, useState, useCallback } from "react";
import { ShieldCheck, Loader2, AlertTriangle, AlertCircle, Info, CheckCircle2, Play, Filter } from "lucide-react";
import { toast } from "@/components/ui/toaster";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

interface ValidationIssue {
  id: string;
  boqId: string;
  boqItemId?: string;
  severity: "ERROR" | "WARNING" | "INFO";
  code: string;
  message: string;
  field?: string;
  context?: Record<string, unknown>;
  isResolved: boolean;
  resolvedAt?: string;
  createdAt: string;
  boq: { boqNo: string; name: string };
  project?: { name: string; projectNo: string };
}

interface BOQ { id: string; boqNo: string; name: string; status: string; projectId: string }
interface Project { id: string; name: string; projectNo: string }

const SEVERITY_CONFIG = {
  ERROR: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50 border-red-200", badge: "bg-red-100 text-red-700" },
  WARNING: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", badge: "bg-amber-100 text-amber-700" },
  INFO: { icon: Info, color: "text-blue-600", bg: "bg-blue-50 border-blue-200", badge: "bg-blue-100 text-blue-700" },
};

export default function ValidationPage() {
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [boqs, setBoqs] = useState<BOQ[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedBOQ, setSelectedBOQ] = useState("");
  const [filter, setFilter] = useState<"ALL" | "ERROR" | "WARNING" | "INFO">("ALL");
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<{ total: number; errors: number; warnings: number; info: number; hasErrors: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/projects?limit=100").then((r) => r.json()).then((d) => setProjects(d.projects || []));
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetch(`/api/boq?projectId=${selectedProject}`).then((r) => r.json()).then((d) => setBoqs(Array.isArray(d) ? d : d.boqs || []));
    }
  }, [selectedProject]);

  const loadIssues = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedBOQ) params.set("boqId", selectedBOQ);
      else if (selectedProject) params.set("projectId", selectedProject);
      const res = await fetch(`/api/validation?${params}`);
      setIssues(await res.json());
    } finally {
      setLoading(false);
    }
  }, [selectedBOQ, selectedProject]);

  useEffect(() => { if (selectedBOQ || selectedProject) loadIssues(); }, [selectedBOQ, selectedProject, loadIssues]);

  const runValidation = async () => {
    if (!selectedBOQ) { toast({ title: "Select a BOQ to validate", variant: "destructive" }); return; }
    setRunning(true);
    try {
      const res = await fetch(`/api/validation/run?boqId=${selectedBOQ}`, { method: "POST" });
      const result = await res.json();
      setLastResult(result);
      setIssues(result.issues || []);
      toast({ title: result.hasErrors ? `Validation failed: ${result.errors} error(s)` : "Validation passed!", variant: result.hasErrors ? "destructive" : "success" });
    } catch {
      toast({ title: "Validation failed to run", variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const resolve = async (id: string) => {
    const res = await fetch(`/api/validation/${id}/resolve`, { method: "PUT" });
    if (res.ok) { toast({ title: "Issue marked as resolved", variant: "success" }); loadIssues(); }
  };

  const filtered = issues.filter((i) => {
    if (filter !== "ALL" && i.severity !== filter) return false;
    return true;
  });

  const errorCount = issues.filter((i) => i.severity === "ERROR" && !i.isResolved).length;
  const warnCount = issues.filter((i) => i.severity === "WARNING" && !i.isResolved).length;
  const infoCount = issues.filter((i) => i.severity === "INFO" && !i.isResolved).length;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Validation Center</h1>
          <p className="text-slate-500 text-sm mt-0.5">Run pre-approval checks on your BOQ before submitting</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Project</label>
            <select value={selectedProject} onChange={(e) => { setSelectedProject(e.target.value); setSelectedBOQ(""); }} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
              <option value="">— All Projects —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.projectNo} — {p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">BOQ</label>
            <select value={selectedBOQ} onChange={(e) => setSelectedBOQ(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" disabled={!selectedProject}>
              <option value="">— Select BOQ —</option>
              {boqs.map((b) => <option key={b.id} value={b.id}>{b.boqNo} — {b.name}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={runValidation} disabled={running || !selectedBOQ} className="flex items-center gap-2 w-full justify-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {running ? <><Loader2 className="w-4 h-4 animate-spin" /> Running...</> : <><Play className="w-4 h-4" /> Run Validation</>}
            </button>
          </div>
        </div>
      </div>

      {/* Summary */}
      {lastResult && (
        <div className={`rounded-xl border p-4 mb-5 ${lastResult.hasErrors ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}>
          <div className="flex items-center gap-3">
            {lastResult.hasErrors ? <AlertCircle className="w-5 h-5 text-red-600" /> : <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            <div className="flex-1">
              <div className={`font-semibold ${lastResult.hasErrors ? "text-red-800" : "text-emerald-800"}`}>
                {lastResult.hasErrors ? `Validation Failed — ${lastResult.errors} Error(s) Found` : "Validation Passed"}
              </div>
              <div className={`text-xs mt-0.5 ${lastResult.hasErrors ? "text-red-600" : "text-emerald-600"}`}>
                {lastResult.errors} errors · {lastResult.warnings} warnings · {lastResult.info} info · {lastResult.total} total issues
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      {issues.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-slate-400" />
          {(["ALL","ERROR","WARNING","INFO"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 text-xs rounded-full font-medium transition-all ${filter === f ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              {f === "ALL" ? `All (${issues.length})` : f === "ERROR" ? `Errors (${errorCount})` : f === "WARNING" ? `Warnings (${warnCount})` : `Info (${infoCount})`}
            </button>
          ))}
        </div>
      )}

      {/* Issues List */}
      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <ShieldCheck className="w-12 h-12 mb-3 opacity-30" />
          <div className="text-sm font-medium">{issues.length === 0 ? "Select a BOQ and run validation" : "No issues in this category"}</div>
          <div className="text-xs mt-1">All checks passed!</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((issue) => {
            const cfg = SEVERITY_CONFIG[issue.severity];
            const Icon = cfg.icon;
            return (
              <div key={issue.id} className={`rounded-xl border p-4 ${issue.isResolved ? "opacity-50" : cfg.bg}`}>
                <div className="flex items-start gap-3">
                  <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>{issue.severity}</span>
                      <code className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{issue.code}</code>
                      {issue.isResolved && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Resolved</span>}
                    </div>
                    <p className="text-sm text-slate-700 mt-1.5">{issue.message}</p>
                    <div className="text-xs text-slate-400 mt-1">
                      <Link href={`/dashboard/boq/${issue.boqId}`} className="text-blue-600 hover:underline">{issue.boq?.boqNo}</Link>
                      {issue.project && <> · {issue.project.projectNo}</>}
                      {" · "}{formatDate(issue.createdAt)}
                    </div>
                  </div>
                  {!issue.isResolved && (
                    <button onClick={() => resolve(issue.id)} className="flex-shrink-0 text-xs px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-white text-slate-600">
                      <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />Resolve
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
