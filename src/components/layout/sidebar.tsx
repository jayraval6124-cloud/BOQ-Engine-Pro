"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, FolderOpen, Database,
  FileText, Settings, ChevronRight, HardHat,
  User, FilePlus2, ScrollText, LineChart, Layers,
  LayoutTemplate, Wand2,
} from "lucide-react";

const navGroups = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard",          label: "Dashboard",    icon: LayoutDashboard },
      { href: "/dashboard/projects", label: "All Projects", icon: FolderOpen },
    ],
  },
  {
    label: "Estimation",
    items: [
      { href: "/dashboard/templates", label: "Templates",     icon: LayoutTemplate },
      { href: "/dashboard/wizard",    label: "Smart Wizard",  icon: Wand2 },
    ],
  },
  {
    label: "Drawing Intelligence",
    items: [
      { href: "/dashboard/drawings", label: "Drawings", icon: Layers },
    ],
  },
  {
    label: "Rate Database",
    items: [
      { href: "/dashboard/sor",           label: "SOR Database",  icon: Database },
      { href: "/dashboard/rate-analysis", label: "Rate Analysis", icon: LineChart },
    ],
  },
  {
    label: "Reports & Output",
    items: [
      { href: "/dashboard/reports",        label: "Reports",        icon: FileText },
      { href: "/dashboard/dtp",            label: "DTP Generator",  icon: FilePlus2 },
      { href: "/dashboard/specifications", label: "Specifications", icon: ScrollText },
    ],
  },
  {
    label: "Personal",
    items: [
      { href: "/dashboard/profile",  label: "My Profile", icon: User },
      { href: "/dashboard/settings", label: "Settings",   icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-white border-r border-slate-200 flex flex-col z-30 shadow-sm">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-slate-200">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
          <HardHat className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800 leading-tight">BOQ Engine Pro</p>
          <p className="text-xs text-slate-400">Personal Edition</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="sidebar-link-group">{group.label}</p>
            {group.items.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href} className={cn("sidebar-link", isActive && "active")}>
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-slate-200">
        <p className="text-xs text-slate-400 text-center">BOQ Engine Pro — Personal Edition</p>
      </div>
    </aside>
  );
}
