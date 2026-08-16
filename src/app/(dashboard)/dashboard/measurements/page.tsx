"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, FileText, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";

interface Sheet {
  id: string; name: string; status: string; createdAt: string; version: number;
  project: { name: string; projectNo: string; sorDivision: string; sorYear: string };
  _count: { rows: number };
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT:     "bg-slate-100 text-slate-600",
  SUBMITTED: "bg-blue-100 text-blue-700",
  APPROVED:  "bg-emerald-100 text-emerald-700",
  LOCKED:    "bg-purple-100 text-purple-700",
};

export default function MeasurementsPage() {
  const router = useRouter();
  const [sheets, setSheets]       = useState<Sheet[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/measurements").then((r) => r.json()).then((d) => { setSheets(d); setLoading(false); });
  }, []);

  // Close menu on outside click
  useEffect(() => {
    if (!activeMenu) return;
    const handler = () => setActiveMenu(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [activeMenu]);

  const handleEdit = (id: string) => {
    setActiveMenu(null);
    router.push(`/dashboard/measurements/${id}`);
  };

  const handleDelete = async (id: string, name: string) => {
    setActiveMenu(null);
    if (!confirm(`Delete measurement sheet "${name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/measurements/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSheets((prev) => prev.filter((s) => s.id !== id));
      toast({ title: "Measurement sheet deleted", variant: "destructive" });
    } else {
      toast({ title: "Failed to delete sheet", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Measurement Sheets</h1>
          <p className="text-slate-500 text-sm">{sheets.length} sheet{sheets.length !== 1 ? "s" : ""} total</p>
        </div>
        <Link href="/dashboard/measurements/new" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> New Sheet
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : sheets.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No measurement sheets yet</p>
            <Link href="/dashboard/measurements/new" className="inline-flex items-center gap-1 text-blue-600 text-sm mt-3 hover:text-blue-700">
              <Plus className="w-3.5 h-3.5" /> Create Sheet
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide rounded-tl-xl">Sheet Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Project</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Rows</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Created</th>
                <th className="w-12 px-4 py-3 rounded-tr-xl" />
              </tr>
            </thead>
            <tbody>
              {sheets.map((s) => (
                <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3.5">
                    <Link href={`/dashboard/measurements/${s.id}`} className="font-medium text-slate-800 hover:text-blue-600">
                      {s.name}
                    </Link>
                    <p className="text-xs text-slate-400 mt-0.5">v{s.version}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-slate-700">{s.project.name}</p>
                    <p className="text-xs text-slate-400">{s.project.sorDivision || "—"} &bull; {s.project.sorYear}</p>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">{s._count.rows} rows</td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2.5 py-0.5 text-xs rounded-full font-medium ${STATUS_COLORS[s.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-400">{formatDate(s.createdAt)}</td>

                  {/* Actions */}
                  <td className="px-3 py-3.5 text-right">
                    <div className="relative inline-block">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenu(activeMenu === s.id ? null : s.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {activeMenu === s.id && (
                        <div
                          className="absolute right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 w-44"
                          style={{ top: "100%" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleEdit(s.id)}
                            className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5 text-blue-500" />
                            Edit Sheet
                          </button>
                          <div className="mx-3 border-t border-slate-100" />
                          <button
                            onClick={() => handleDelete(s.id, s.name)}
                            disabled={s.status === "LOCKED"}
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
    </div>
  );
}
