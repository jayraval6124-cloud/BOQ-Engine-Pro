"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, FolderOpen, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { formatDate, PROJECT_STATUS_COLORS, PROJECT_STATUS_LABELS, SOR_YEARS } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";

interface Project {
  id: string; projectNo: string; name: string; sorYear: string; sorDivision: string;
  status: string; createdAt: string;
  createdBy: { name: string };
  _count: { boqs: number; measurementSheets: number };
}

export default function ProjectsPage() {
  const [projects, setProjects]     = useState<Project[]>([]);
  const [loading, setLoading]       = useState(true);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterYear, setFilterYear]     = useState("");
  const [activeMenu, setActiveMenu]     = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), search, status: filterStatus, sorYear: filterYear });
    const res  = await fetch(`/api/projects?${params}`);
    const data = await res.json();
    setProjects(data.projects || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [page, search, filterStatus, filterYear]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete project "${name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) { toast({ title: "Project deleted", variant: "destructive" }); fetchProjects(); }
    else toast({ title: "Failed to delete project", variant: "destructive" });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Projects</h1>
          <p className="text-slate-500 text-sm">{total} project{total !== 1 ? "s" : ""} total</p>
        </div>
        <Link href="/dashboard/projects/new" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> New Project
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search projects..." className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Status</option>
            {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filterYear} onChange={(e) => { setFilterYear(e.target.value); setPage(1); }} className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Years</option>
            {SOR_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" /><p className="text-sm text-slate-400">Loading...</p></div>
        ) : projects.length === 0 ? (
          <div className="p-12 text-center">
            <FolderOpen className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No projects found</p>
            <Link href="/dashboard/projects/new" className="inline-flex items-center gap-1 text-blue-600 text-sm mt-3 hover:text-blue-700"><Plus className="w-3.5 h-3.5" /> Create Project</Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Project</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Division</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">SOR Year</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">BOQs</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Created</th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3.5">
                    <Link href={`/dashboard/projects/${p.id}`} className="hover:text-blue-600">
                      <p className="font-medium text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{p.projectNo}</p>
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">{p.sorDivision || <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3.5 text-slate-600">{p.sorYear}</td>
                  <td className="px-4 py-3.5 text-slate-600">{p._count.boqs} BOQ{p._count.boqs !== 1 ? "s" : ""}</td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${PROJECT_STATUS_COLORS[p.status]}`}>
                      {PROJECT_STATUS_LABELS[p.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-400">{formatDate(p.createdAt)}</td>
                  <td className="px-4 py-3.5 relative">
                    <button onClick={() => setActiveMenu(activeMenu === p.id ? null : p.id)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {activeMenu === p.id && (
                      <div className="absolute right-4 top-10 bg-white border border-slate-200 rounded-lg shadow-lg z-10 py-1 w-36">
                        <Link href={`/dashboard/projects/${p.id}/edit`} onClick={() => setActiveMenu(null)} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"><Edit className="w-3.5 h-3.5" /> Edit</Link>
                        <button onClick={() => { setActiveMenu(null); handleDelete(p.id, p.name); }} className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
