"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "@/components/ui/toaster";
import { DIVISIONS_GUJARAT, SOR_YEARS } from "@/lib/utils";

const schema = z.object({
  name:        z.string().min(2, "Project name is required"),
  sorYear:     z.string().min(1, "SOR year is required"),
  sorDivision: z.string().default(""),
  state:       z.string().default("Gujarat"),
});
type FormData = z.infer<typeof schema>;

export default function NewProjectPage() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { state: "Gujarat", sorYear: "2024-25", sorDivision: "" },
  });

  const onSubmit = async (data: FormData) => {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (res.ok) {
      toast({ title: "Project created", variant: "success" });
      router.push(`/dashboard/projects/${json.id}`);
    } else {
      toast({ title: json.error || "Failed to create project", variant: "destructive" });
    }
  };

  const inputClass  = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
  const errorClass  = "text-xs text-red-500 mt-1";
  const labelClass  = "block text-sm font-medium text-slate-700 mb-1.5";

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/projects" className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-800">New Project</h1>
          <p className="text-slate-500 text-sm">Create a new project</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div>
            <label className={labelClass}>Project Name *</label>
            <input {...register("name")} className={inputClass} placeholder="Construction of Primary Health Centre" />
            {errors.name && <p className={errorClass}>{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>SOR Year *</label>
              <select {...register("sorYear")} className={inputClass}>
                {SOR_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              {errors.sorYear && <p className={errorClass}>{errors.sorYear.message}</p>}
            </div>
            <div>
              <label className={labelClass}>SOR Division</label>
              <select {...register("sorDivision")} className={inputClass}>
                <option value="">— Select division —</option>
                {DIVISIONS_GUJARAT.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/dashboard/projects" className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
            Cancel
          </Link>
          <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : "Create Project"}
          </button>
        </div>
      </form>
    </div>
  );
}
