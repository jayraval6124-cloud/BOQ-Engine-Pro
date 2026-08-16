"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "@/components/ui/toaster";

const schema = z.object({ projectId: z.string().min(1, "Select a project"), name: z.string().min(1, "Sheet name required"), description: z.string().optional() });
type FormData = z.infer<typeof schema>;

interface Project { id: string; name: string; projectNo: string }

export default function NewMeasurementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultProjectId = searchParams.get("projectId") || "";
  const [projects, setProjects] = useState<Project[]>([]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { projectId: defaultProjectId },
  });

  useEffect(() => {
    fetch("/api/projects?limit=100").then((r) => r.json()).then((d) => setProjects(d.projects || []));
  }, []);

  const onSubmit = async (data: FormData) => {
    const res = await fetch("/api/measurements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const json = await res.json();
    if (res.ok) { toast({ title: "Measurement sheet created", variant: "success" }); router.push(`/dashboard/measurements/${json.id}`); }
    else toast({ title: json.error || "Failed to create sheet", variant: "destructive" });
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/measurements" className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-4 h-4" /></Link>
        <div>
          <h1 className="text-xl font-bold text-slate-800">New Measurement Sheet</h1>
          <p className="text-slate-500 text-sm">Create a measurement sheet for a project</p>
        </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Project *</label>
          <select {...register("projectId")} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select a project</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.projectNo})</option>)}
          </select>
          {errors.projectId && <p className="text-xs text-red-500 mt-1">{errors.projectId.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Sheet Name *</label>
          <input {...register("name")} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., Substructure Measurements" />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
          <textarea {...register("description")} rows={3} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Optional description..." />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Link href="/dashboard/measurements" className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Cancel</Link>
          <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : "Create Sheet"}
          </button>
        </div>
      </form>
    </div>
  );
}
