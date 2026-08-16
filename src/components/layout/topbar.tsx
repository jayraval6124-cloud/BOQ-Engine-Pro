"use client";

import { Bell, ChevronDown, Settings, User } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { GlobalSearch } from "@/components/ui/global-search";

export function Topbar({ title }: { title?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-60 right-0 h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20 shadow-sm">
      <div>
        {title && <h1 className="text-sm font-semibold text-slate-700">{title}</h1>}
      </div>

      <div className="flex items-center gap-3">
        <GlobalSearch />
        <button className="relative p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
          <Bell className="w-4 h-4" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-semibold">A</span>
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold text-slate-700 leading-tight">Admin</p>
              <p className="text-xs text-slate-400">Personal Edition</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl border border-slate-200 shadow-lg z-20 py-1">
                <Link href="/dashboard/profile" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50" onClick={() => setMenuOpen(false)}>
                  <User className="w-4 h-4" /> My Profile
                </Link>
                <Link href="/dashboard/settings" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50" onClick={() => setMenuOpen(false)}>
                  <Settings className="w-4 h-4" /> Settings
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
