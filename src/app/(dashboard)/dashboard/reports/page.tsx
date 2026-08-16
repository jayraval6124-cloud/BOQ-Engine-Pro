"use client";

import { useEffect, useState } from "react";
import { FileText, Download } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";

interface BOQReport {
  id: string; name: string; boqNo: string; status: string; grandTotal: string; createdAt: string;
  project: { name: string; sorDivision: string; sorYear: string };
}

export default function ReportsPage() {
  const [boqs, setBOQs] = useState<BOQReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => { fetch("/api/boq").then((r) => r.json()).then((d) => { setBOQs(d); setLoading(false); }); }, []);

  const exportReport = async (boqId: string, boqNo: string, format: "excel" | "pdf") => {
    setExporting(`${boqId}-${format}`);
    const res = await fetch(`/api/reports/export?boqId=${boqId}&format=${format}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${boqNo}.${format === "excel" ? "xlsx" : "pdf"}`;
      if (format === "pdf") { window.open(url, "_blank"); }
      else a.click();
      toast({ title: `${format.toUpperCase()} exported`, variant: "success" });
    } else toast({ title: "Export failed", variant: "destructive" });
    setExporting(null);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
        <p className="text-slate-500 text-sm">Export professional BOQ reports in PDF or Excel format</p>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-blue-700 mb-2">Report Types Available</h2>
        <div className="flex gap-3">
          {["BOQ PDF Report", "BOQ Excel Export"].map((t) => (
            <div key={t} className="bg-white rounded-lg px-3 py-2 text-xs text-slate-600 border border-blue-100 font-medium">{t}</div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">Generated BOQs — Available for Export</h2>
        </div>
        {loading ? (
          <div className="p-12 text-center"><div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" /></div>
        ) : boqs.length === 0 ? (
          <div className="p-12 text-center"><FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" /><p className="text-slate-500">No BOQs to export yet</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">BOQ</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Project</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Grand Total</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Export</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {boqs.map((boq) => (
                <tr key={boq.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-slate-800">{boq.name}</p>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">{boq.boqNo}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-slate-700">{boq.project.name}</p>
                    <p className="text-xs text-slate-400">{boq.project.sorDivision || "—"} &bull; {boq.project.sorYear}</p>
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-slate-800">{formatCurrency(Number(boq.grandTotal))}</td>
                  <td className="px-4 py-3.5"><span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">{boq.status}</span></td>
                  <td className="px-4 py-3.5 text-xs text-slate-400">{formatDate(boq.createdAt)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2 justify-center">
                      <button
                        onClick={() => exportReport(boq.id, boq.boqNo, "excel")}
                        disabled={exporting === `${boq.id}-excel`}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 disabled:opacity-50"
                      >
                        <Download className="w-3.5 h-3.5" /> Excel
                      </button>
                      <button
                        onClick={() => exportReport(boq.id, boq.boqNo, "pdf")}
                        disabled={exporting === `${boq.id}-pdf`}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50"
                      >
                        <FileText className="w-3.5 h-3.5" /> PDF
                      </button>
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
