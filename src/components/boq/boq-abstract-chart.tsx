"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { formatCurrency } from "@/lib/utils";

interface AbstractData {
  chapterWise: Record<string, number>;
  elementWise: Record<string, number>;
  grandTotal: number;
  top10Items: Array<{ description: string; amount: number }>;
}

const COLORS = ["#3b82f6","#22c55e","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#84cc16","#ec4899","#6366f1"];

export function BOQAbstractChart({ boqId }: { boqId: string }) {
  const [data, setData] = useState<AbstractData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/boq/${boqId}/abstract`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [boqId]);

  if (loading) return <div className="flex items-center justify-center h-48"><div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full" /></div>;
  if (!data) return <div className="text-center text-slate-400 py-8">No abstract data available</div>;

  const chapterData = Object.entries(data.chapterWise).map(([name, value]) => ({ name: name.length > 20 ? name.slice(0, 20) + "…" : name, value })).sort((a, b) => b.value - a.value);
  const elementData = Object.entries(data.elementWise).map(([name, value]) => ({ name, value })).filter((d) => d.value > 0);

  return (
    <div className="space-y-8">
      {/* Chapter Wise Table */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Chapter-wise Summary</h3>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Chapter</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.entries(data.chapterWise).sort((a, b) => b[1] - a[1]).map(([ch, amt]) => (
                <tr key={ch} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-700">{ch}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{formatCurrency(amt)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-500">{((amt / data.grandTotal) * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-slate-300 bg-blue-50">
              <tr>
                <td className="px-4 py-2.5 font-bold text-slate-800">Grand Total</td>
                <td className="px-4 py-2.5 text-right font-bold text-blue-700">{formatCurrency(data.grandTotal)}</td>
                <td className="px-4 py-2.5 text-right font-bold text-blue-700">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Cost by Chapter</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chapterData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
              <Tooltip formatter={(v: number) => [formatCurrency(v), "Amount"]} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chapterData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Cost by Element</h3>
          {elementData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={elementData} cx="50%" cy="50%" outerRadius={90} dataKey="value" nameKey="name">
                  {elementData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend iconType="circle" formatter={(v) => <span className="text-xs text-slate-600">{v}</span>} />
                <Tooltip formatter={(v: number) => [formatCurrency(v), "Amount"]} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No element data</div>}
        </div>
      </div>
    </div>
  );
}
