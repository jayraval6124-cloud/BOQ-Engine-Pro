"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "@/components/ui/toaster";
import { DIVISIONS_GUJARAT, SOR_YEARS, PROJECT_STATUS_LABELS } from "@/lib/utils";

const schema = z.object({
  name:        z.string().min(2),
  sorYear:     z.string().min(1),
  sorDivision: z.string().default(""),
  status:      z.enum(["DRAFT","ACTIVE","COMPLETED","ON_HOLD","CANCELLED"]),
});
type FormData = z.infer<typeof schema>;

export default function EditProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [loading, setLoading] = useState(true);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    fetch(`/api/projects/${id}`).then((r) => r.json()).then((d) => {
      reset({ name: d.name, sorYear: d.sorYear, sorDivision: d.sorDivision || "", status: d.status });
      setLoading(false);
    });
  }, [id, reset]);

  const onSubmit = async (data: FormData) => {
    const res = await fetch(`/api/projects/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (res.ok) { toast({ title: "Project updated", variant: "success" }); router.push(`/dashboard/projects/${id}`); }
    else { const json = await res.json(); toast({ title: json.error || "Update failed", variant: "destructive" }); }
  };

  const inputClass = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" /></div>;

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/dashboard/projects/${id}`} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-4 h-4" /></Link>
        <div><h1 className="text-xl font-bold text-slate-800">Edit Project</h1><p className="text-slate-500 text-sm">Update project settings</p></div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Project Name *</label>
            <input {...register("name")} className={inputClass} />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">SOR Year *</label>
              <select {...register("sorYear")} className={inputClass}>
                {SOR_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">SOR Division</label>
              <select {...register("sorDivision")} className={inputClass}>
                <option value="">— Not set —</option>
                {DIVISIONS_GUJARAT.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
            <select {...register("status")} className={inputClass}>
              {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Link href={`/dashboard/projects/${id}`} className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Cancel</Link>
          <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
