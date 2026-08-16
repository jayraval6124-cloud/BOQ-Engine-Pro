"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { formatCurrency } from "@/lib/utils";

interface ChartData {
  projectsByStatus: { name: string; value: number }[];
  topBOQs: { name: string; amount: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#94a3b8",
  ACTIVE: "#22c55e",
  COMPLETED: "#3b82f6",
  ON_HOLD: "#f59e0b",
  CANCELLED: "#ef4444",
};

export function DashboardCharts() {
  const [data, setData] = useState<ChartData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/charts")
      .then(async (r) => {
        const text = await r.text();
        try {
          return JSON.parse(text);
        } catch (err) {
          console.error("Dashboard API Error:", text);
          throw new Error("Failed to parse JSON");
        }
      })
      .then(setData)
      .catch(console.error);
  }, []);

  if (!data) return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[1, 2].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 h-64 flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center gap-2">
            <div className="w-32 h-32 bg-slate-100 rounded-full" />
            <div className="w-24 h-3 bg-slate-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Projects by Status */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Projects by Status</h2>
        {data.projectsByStatus.every((d) => d.value === 0) ? (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No project data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data.projectsByStatus.filter((d) => d.value > 0)} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {data.projectsByStatus.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "#94a3b8"} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top BOQs by Value */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Top BOQs by Value</h2>
        {data.topBOQs.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No BOQ data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.topBOQs} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
              <Tooltip formatter={(value: number) => [formatCurrency(value), "Amount"]} />
              <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
