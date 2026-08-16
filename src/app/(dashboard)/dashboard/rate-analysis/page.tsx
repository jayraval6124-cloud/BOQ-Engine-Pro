"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Calculator, Trash2, Edit3, Settings } from "lucide-react";

type Project = {
  id: string;
  projectName: string;
  agencyName: string;
  createdAt: string;
  updatedAt: string;
};

export default function RateAnalysisIndexPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [creating, setCreating] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/rate-analysis-projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (!projectName.trim() || !agencyName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/rate-analysis-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName, agencyName })
      });
      if (res.ok) {
        const project = await res.json();
        router.push(`/dashboard/rate-analysis/${project.id}`);
      }
    } catch (e) {
      console.error(e);
      setCreating(false);
    }
  };

  const deleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
      await fetch(`/api/rate-analysis-projects/${id}`, { method: "DELETE" });
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Rate Analysis Projects</h1>
          <p className="text-slate-500">Manage and create tender rate analysis projects</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm"
        >
          <Plus className="w-5 h-5" /> New Project
        </button>
      </div>

      {loading ? (
        <div className="text-center text-slate-500 py-10">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 border border-slate-200 rounded-xl border-dashed">
          <Calculator className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700">No projects found</h3>
          <p className="text-slate-500 mb-6">Create your first rate analysis project to get started.</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mx-auto shadow-sm"
          >
            <Plus className="w-5 h-5" /> New Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div 
              key={project.id}
              onClick={() => router.push(`/dashboard/rate-analysis/${project.id}`)}
              className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group relative"
            >
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => deleteProject(project.id, e)}
                  className="p-1.5 text-slate-400 hover:text-red-500 bg-white rounded shadow-sm border border-slate-200"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4 text-blue-600">
                <Calculator className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 line-clamp-1 mb-1" title={project.projectName}>
                {project.projectName}
              </h3>
              <p className="text-sm text-slate-500 line-clamp-1 mb-4" title={project.agencyName}>
                Agency: {project.agencyName}
              </p>
              <div className="text-xs text-slate-400">
                Last updated: {new Date(project.updatedAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Create New Project</h2>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name of Work / Project</label>
                <input 
                  type="text" 
                  autoFocus
                  className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter project name"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name of Agency</label>
                <input 
                  type="text" 
                  className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter agency name"
                  value={agencyName}
                  onChange={e => setAgencyName(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                disabled={creating}
              >
                Cancel
              </button>
              <button 
                onClick={createProject}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={!projectName.trim() || !agencyName.trim() || creating}
              >
                {creating ? "Creating..." : "Create Project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
