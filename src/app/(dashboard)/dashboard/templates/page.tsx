"use client";

import Link from "next/link";
import {
  Building2, School, Bus, Layers, Waves,
  Milestone, FlaskConical, Droplets, Factory, BookTemplate, ArrowRight, Fence,
} from "lucide-react";

interface BuiltinTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  href: string;
  tag: string;
}

const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  {
    id: "compound-wall",
    name: "Compound Wall",
    description: "Full estimate for RCC compound wall with columns, footing, masonry, plaster and barbed wire. Enter wall length and dimensions — all 14 GSRTC items auto-calculate.",
    icon: Fence,
    color: "bg-amber-50 text-amber-600",
    href: "/dashboard/templates/compound-wall",
    tag: "Live Calculator",
  },
  {
    id: "residential-building",
    name: "Residential Building",
    description: "Standard BOQ for G+2 residential construction including substructure, superstructure, finishing and external works.",
    icon: Building2,
    color: "bg-blue-50 text-blue-600",
    href: "#",
    tag: "Coming Soon",
  },
  {
    id: "school-building",
    name: "School Building",
    description: "GSRTC school building template with classrooms, toilets, library and assembly hall elements.",
    icon: School,
    color: "bg-green-50 text-green-600",
    href: "#",
    tag: "Coming Soon",
  },
  {
    id: "bus-station",
    name: "Bus Station",
    description: "Full bus terminal estimate including platform, waiting hall, office, ticket counter and parking.",
    icon: Bus,
    color: "bg-purple-50 text-purple-600",
    href: "#",
    tag: "Coming Soon",
  },
  {
    id: "road-work",
    name: "Road Work",
    description: "Road widening or new road estimate with earthwork, sub-base, WBM, BM and surface dressing items.",
    icon: Milestone,
    color: "bg-orange-50 text-orange-600",
    href: "#",
    tag: "Coming Soon",
  },
  {
    id: "drainage-work",
    name: "Drainage Work",
    description: "Storm water drain estimate with excavation, PCC, brick masonry drain, grating and manhole items.",
    icon: Waves,
    color: "bg-cyan-50 text-cyan-600",
    href: "#",
    tag: "Coming Soon",
  },
  {
    id: "bridge",
    name: "Bridge / Culvert",
    description: "RCC box culvert and minor bridge estimate with foundation, abutment, deck slab and approach road.",
    icon: Layers,
    color: "bg-slate-50 text-slate-600",
    href: "#",
    tag: "Coming Soon",
  },
  {
    id: "toilet-block",
    name: "Toilet Block",
    description: "Stand-alone toilet block estimate with plinth, superstructure, tile finishing, plumbing and drainage.",
    icon: FlaskConical,
    color: "bg-teal-50 text-teal-600",
    href: "#",
    tag: "Coming Soon",
  },
  {
    id: "water-tank",
    name: "Overhead Water Tank",
    description: "RCC overhead water tank estimate with staging, ring beam, dome and plumbing connections.",
    icon: Droplets,
    color: "bg-sky-50 text-sky-600",
    href: "#",
    tag: "Coming Soon",
  },
  {
    id: "industrial-shed",
    name: "Industrial Shed",
    description: "Pre-engineered steel shed estimate with foundation, columns, roof, cladding and utilities.",
    icon: Factory,
    color: "bg-rose-50 text-rose-600",
    href: "#",
    tag: "Coming Soon",
  },
];

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Estimate Templates</h1>
        <p className="text-slate-500 text-sm mt-1">
          Ready-to-use estimate calculators — enter minimum inputs and get a complete BOQ with quantities, amounts and totals.
        </p>
      </div>

      {/* Live templates section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">Available Now</span>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {BUILTIN_TEMPLATES.filter((t) => t.href !== "#").map((t) => (
            <Link key={t.id} href={t.href}>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md hover:border-blue-300 transition-all flex items-start gap-4 group">
                <div className={`p-3 rounded-xl shrink-0 ${t.color}`}>
                  <t.icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-800 text-sm">{t.name}</h3>
                    <span className="text-xs px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full">{t.tag}</span>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">{t.description}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all shrink-0 mt-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Coming Soon section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">Coming Soon</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {BUILTIN_TEMPLATES.filter((t) => t.href === "#").map((t) => (
            <div key={t.id} className="bg-white rounded-xl border border-slate-200 p-4 opacity-60">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg shrink-0 ${t.color}`}>
                  <t.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">{t.name}</p>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{t.description}</p>
                  <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded">{t.tag}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom templates hint */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <BookTemplate className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-800">Need a custom template?</p>
          <p className="text-sm text-blue-600 mt-0.5">Use the <strong>Smart Wizard</strong> to create and save custom project templates with your own elements and BOQ items.</p>
        </div>
      </div>
    </div>
  );
}
