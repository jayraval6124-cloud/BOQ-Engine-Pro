import { prisma } from "@/lib/db";
import { formatCurrency, formatDate, PROJECT_STATUS_COLORS, PROJECT_STATUS_LABELS } from "@/lib/utils";
import { FolderOpen, FileText, IndianRupee, Database, Plus, TrendingUp } from "lucide-react";
import Link from "next/link";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";

async function getDashboardStats() {
  const [totalProjects, activeProjects, totalBOQs, sorCount, recentProjects, recentBOQs, boqStats] = await Promise.all([
    prisma.project.count({ where: { deletedAt: null } }),
    prisma.project.count({ where: { status: "ACTIVE", deletedAt: null } }),
    prisma.bOQ.count({ where: { deletedAt: null } }),
    prisma.sORItem.count({ where: { isActive: true } }),
    prisma.project.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, projectNo: true, name: true, status: true, sorDivision: true, sorYear: true, createdAt: true },
    }),
    prisma.bOQ.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { project: { select: { name: true } } },
    }),
    prisma.bOQ.aggregate({
      where: { deletedAt: null },
      _sum: { grandTotal: true },
    }),
  ]);

  return { totalProjects, activeProjects, totalBOQs, sorCount, recentProjects, recentBOQs, totalEstimateValue: boqStats._sum.grandTotal ?? 0 };
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  const statCards = [
    { label: "Total Projects", value: stats.totalProjects, icon: FolderOpen, color: "text-blue-600", bg: "bg-blue-50", change: "All time" },
    { label: "Active Projects", value: stats.activeProjects, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", change: "Currently active" },
    { label: "Total BOQs", value: stats.totalBOQs, icon: FileText, color: "text-purple-600", bg: "bg-purple-50", change: "Generated" },
    { label: "Total Estimate Value", value: formatCurrency(Number(stats.totalEstimateValue)), icon: IndianRupee, color: "text-orange-600", bg: "bg-orange-50", change: "Grand total" },
    { label: "SOR Items", value: stats.sorCount, icon: Database, color: "text-slate-600", bg: "bg-slate-100", change: "In database" },
  ];

  const quickActions = [
    { label: "Create Project", href: "/dashboard/projects/new", icon: Plus, color: "bg-blue-600 text-white hover:bg-blue-700" },
    { label: "Add SOR Item", href: "/dashboard/sor/new", icon: Database, color: "bg-emerald-600 text-white hover:bg-emerald-700" },
    { label: "New Estimate", href: "/dashboard/measurements/new", icon: FileText, color: "bg-purple-600 text-white hover:bg-purple-700" },
    { label: "Export Report", href: "/dashboard/reports", icon: FileText, color: "bg-slate-600 text-white hover:bg-slate-700" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">BOQ Engine Pro — Personal Edition</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">{new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className={`${card.bg} ${card.color} p-2 rounded-lg`}>
                <card.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-800">{card.value}</p>
            <p className="text-sm text-slate-600 mt-0.5">{card.label}</p>
            <p className="text-xs text-slate-400 mt-1">{card.change}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Quick Actions</h2>
        <div className="flex gap-3 flex-wrap">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${action.color}`}>
              <action.icon className="w-4 h-4" />
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      <DashboardCharts />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Recent Projects</h2>
            <Link href="/dashboard/projects" className="text-xs text-blue-600 hover:text-blue-700">View all</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {stats.recentProjects.length === 0 ? (
              <div className="p-8 text-center">
                <FolderOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No projects yet</p>
                <Link href="/dashboard/projects/new" className="text-xs text-blue-600 hover:text-blue-700 mt-1 inline-block">Create your first project</Link>
              </div>
            ) : (
              stats.recentProjects.map((p) => (
                <Link key={p.id} href={`/dashboard/projects/${p.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors group">
                  <div>
                    <p className="text-sm font-medium text-slate-700 group-hover:text-blue-600">{p.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{p.sorDivision || "—"} &bull; {p.sorYear}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PROJECT_STATUS_COLORS[p.status]}`}>
                      {PROJECT_STATUS_LABELS[p.status]}
                    </span>
                    <p className="text-xs text-slate-400 mt-1">{formatDate(p.createdAt)}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Recent BOQs</h2>
            <Link href="/dashboard/boq" className="text-xs text-blue-600 hover:text-blue-700">View all</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {stats.recentBOQs.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No BOQs generated yet</p>
              </div>
            ) : (
              stats.recentBOQs.map((boq) => (
                <Link key={boq.id} href={`/dashboard/boq/${boq.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors group">
                  <div>
                    <p className="text-sm font-medium text-slate-700 group-hover:text-blue-600">{boq.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{boq.project.name} &bull; Rev {boq.revisionNo}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-700">{formatCurrency(Number(boq.grandTotal))}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(boq.createdAt)}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
