"use client";

import Link from "next/link";
import {
  FileText, Users, Wrench, ClipboardCheck, ListOrdered, LayoutList,
  TableProperties, Zap, FlaskConical, Layers, Boxes,
  MountainSnow, Fuel, PieChart, Sparkles,
} from "lucide-react";

const DTP_SECTIONS = [
  {
    id: "front-page",
    title: "Front Page",
    description: "Draft Tender Paper cover page with GSRTC seal, name of work and budget",
    icon: FileText,
    href: "/dashboard/dtp/front-page",
    color: "blue",
  },
  {
    id: "performa",
    title: "Proforma - I",
    description: "S.B.D. check proforma — 5-section checklist with fixed answers, only Name of Work changes",
    icon: ClipboardCheck,
    href: "/dashboard/dtp/performa",
    color: "indigo",
  },
  {
    id: "checklist",
    title: "Check List",
    description: "DTP check list — Name of Work, Estimated & Tender Amount from BOQ; EMD auto-calculated",
    icon: ListOrdered,
    href: "/dashboard/dtp/checklist",
    color: "violet",
  },
  {
    id: "summary",
    title: "Summary",
    description: "Work-wise tender amount summary — auto-loaded from BOQ, with total and SAY rows",
    icon: LayoutList,
    href: "/dashboard/dtp/summary",
    color: "violet",
  },
  {
    id: "tender-civil",
    title: "Tender Sheet — Civil",
    description: "Civil Work BOQ as tender sheet with item code, rate in words, 1% Welfare Cess · Landscape A4",
    icon: TableProperties,
    href: "/dashboard/dtp/tender-civil",
    color: "purple",
  },
  {
    id: "tender-subwork",
    title: "Tender Sheet — Sub Work",
    description: "Electrical / Borewell / Fire Fighting / Custom BOQ sheet — no item code, title auto-sets to work type · Landscape A4",
    icon: Zap,
    href: "/dashboard/dtp/tender-subwork",
    color: "rose",
  },
  {
    id: "cement-consumption",
    title: "Cement Consumption",
    description: "Cement & Steel requirement as per GSRTC Code from District SOR — data carried forward from Civil BOQ",
    icon: FlaskConical,
    href: "/dashboard/dtp/cement-consumption",
    color: "amber",
  },
  {
    id: "steel-consumption",
    title: "Steel Consumption",
    description: "TMT Bar (RJ080 / RJ081 / RJ082) quantities from Civil BOQ — Kg and MT requirement",
    icon: Layers,
    href: "/dashboard/dtp/steel-consumption",
    color: "slate",
  },
  {
    id: "cost-of-material",
    title: "Cost Of Material",
    description: "Section A: Cement & Steel (SOR fixed rates) · Section B: Sand, Aggregate (Basic Rate DB) + all other BOQ material items",
    icon: Boxes,
    href: "/dashboard/dtp/cost-of-material",
    color: "orange",
  },
  {
    id: "statement-1",
    title: "Statement-1",
    description: "Itemwise Quarry Materials — Sand & Aggregate quantities per BOQ item using SOR standard ratios",
    icon: MountainSnow,
    href: "/dashboard/dtp/statement-1",
    color: "teal",
  },
  {
    id: "pol",
    title: "P.O.L.",
    description: "Petroleum, Oil & Lubricants — transport cost for Cement, Steel, Sand, Aggregate & other materials",
    icon: Fuel,
    href: "/dashboard/dtp/pol",
    color: "yellow",
  },
  {
    id: "main-abstract",
    title: "Main Abstract",
    description: "Labour, Material & P.O.L. component breakdown — [A] BOQ total → [F] Labour → [G] Plant & % breakdown",
    icon: PieChart,
    href: "/dashboard/dtp/main-abstract",
    color: "green",
  },
  {
    id: "specifications",
    title: "Detailed Specifications",
    description: "Workmanship, Mode of Measurement & Payment for each RJ item code — auto-carried from BOQ item codes",
    icon: Wrench,
    href: "/dashboard/dtp/specifications",
    color: "rose",
  },
  {
    id: "agreement-form",
    title: "Agreement Form",
    description: "Contract agreement form — exact SBD format with undertakings, variable fields to be confirmed",
    icon: Users,
    href: "/dashboard/dtp/agreement",
    color: "blue",
  },
];

const COLOR_MAP: Record<string, { card: string; icon: string; badge: string }> = {
  blue:   { card: "border-blue-100   hover:border-blue-300   hover:bg-blue-50/40",   icon: "bg-blue-100   text-blue-600",   badge: "bg-blue-100   text-blue-700"   },
  indigo: { card: "border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50/40", icon: "bg-indigo-100 text-indigo-600", badge: "bg-indigo-100 text-indigo-700" },
  violet: { card: "border-violet-100 hover:border-violet-300 hover:bg-violet-50/40", icon: "bg-violet-100 text-violet-600", badge: "bg-violet-100 text-violet-700" },
  purple: { card: "border-purple-100 hover:border-purple-300 hover:bg-purple-50/40", icon: "bg-purple-100 text-purple-600", badge: "bg-purple-100 text-purple-700" },
  pink:   { card: "border-pink-100   hover:border-pink-300   hover:bg-pink-50/40",   icon: "bg-pink-100   text-pink-600",   badge: "bg-pink-100   text-pink-700"   },
  rose:   { card: "border-rose-100   hover:border-rose-300   hover:bg-rose-50/40",   icon: "bg-rose-100   text-rose-600",   badge: "bg-rose-100   text-rose-700"   },
  orange: { card: "border-orange-100 hover:border-orange-300 hover:bg-orange-50/40", icon: "bg-orange-100 text-orange-600", badge: "bg-orange-100 text-orange-700" },
  amber:  { card: "border-amber-100  hover:border-amber-300  hover:bg-amber-50/40",  icon: "bg-amber-100  text-amber-600",  badge: "bg-amber-100  text-amber-700"  },
  yellow: { card: "border-yellow-100 hover:border-yellow-300 hover:bg-yellow-50/40", icon: "bg-yellow-100 text-yellow-600", badge: "bg-yellow-100 text-yellow-700" },
  lime:   { card: "border-lime-100   hover:border-lime-300   hover:bg-lime-50/40",   icon: "bg-lime-100   text-lime-600",   badge: "bg-lime-100   text-lime-700"   },
  green:  { card: "border-green-100  hover:border-green-300  hover:bg-green-50/40",  icon: "bg-green-100  text-green-600",  badge: "bg-green-100  text-green-700"  },
  teal:   { card: "border-teal-100   hover:border-teal-300   hover:bg-teal-50/40",   icon: "bg-teal-100   text-teal-600",   badge: "bg-teal-100   text-teal-700"   },
  cyan:   { card: "border-cyan-100   hover:border-cyan-300   hover:bg-cyan-50/40",   icon: "bg-cyan-100   text-cyan-600",   badge: "bg-cyan-100   text-cyan-700"   },
  sky:    { card: "border-sky-100    hover:border-sky-300    hover:bg-sky-50/40",    icon: "bg-sky-100    text-sky-600",    badge: "bg-sky-100    text-sky-700"    },
  slate:  { card: "border-slate-200  hover:border-slate-400  hover:bg-slate-50/40",  icon: "bg-slate-100  text-slate-600",  badge: "bg-slate-100  text-slate-700"  },
};

export default function DTPGeneratorPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">DTP Generator</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Draft Tender Paper · GSRTC Format · {DTP_SECTIONS.length} sections available
        </p>
      </div>

      {/* Generate Full DTP — prominent hero card */}
      <Link href="/dashboard/dtp/generate" className="block">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:from-emerald-700 hover:to-teal-700 cursor-pointer">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-bold">Generate Full DTP Package</h2>
                <span className="text-xs font-semibold bg-white/25 px-2.5 py-0.5 rounded-full">All {DTP_SECTIONS.length} Sections</span>
              </div>
              <p className="text-emerald-100 text-sm leading-relaxed">
                Select one BOQ → instantly preview all DTP sections (Front Page, Proforma-I, Summary, Tender Sheets, Cement, Steel, Cost of Material, Statement-1, P.O.L., Main Abstract, Specifications, Agreement) — with one-click Print All.
              </p>
            </div>
            <div className="shrink-0 text-white/70 text-4xl font-light">›</div>
          </div>
        </div>
      </Link>

      <div className="grid grid-cols-3 gap-4">
        {DTP_SECTIONS.map((section) => {
          const c = COLOR_MAP[section.color] ?? COLOR_MAP.blue;
          const Icon = section.icon;
          return (
            <Link key={section.id} href={section.href} className="block h-full">
              <div className={`bg-white rounded-xl border p-5 transition-all duration-150 flex flex-col gap-3 h-full cursor-pointer shadow-sm ${c.card}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${c.icon}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${c.badge}`}>Ready</span>
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm leading-tight">{section.title}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{section.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
