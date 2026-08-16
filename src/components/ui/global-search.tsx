"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Loader2, X, FolderOpen, Database, Layers, BookOpen, FileText } from "lucide-react";
import { useRouter } from "next/navigation";

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  url: string;
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  project: FolderOpen,
  sor: Database,
  element: Layers,
  knowledge: BookOpen,
  boq: FileText,
};

const TYPE_LABELS: Record<string, string> = {
  project: "Project",
  sor: "SOR Item",
  element: "Element",
  knowledge: "Knowledge",
  boq: "BOQ",
};

const TYPE_COLORS: Record<string, string> = {
  project: "bg-blue-100 text-blue-700",
  sor: "bg-emerald-100 text-emerald-700",
  element: "bg-purple-100 text-purple-700",
  knowledge: "bg-amber-100 text-amber-700",
  boq: "bg-slate-100 text-slate-600",
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&types=projects,sor,elements,knowledge,boq`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResults(data.results || []);
      setSelected(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); setOpen(true); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50); }
    else { setQuery(""); setResults([]); }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && results[selected]) { navigate(results[selected]); }
  };

  const navigate = (result: SearchResult) => {
    setOpen(false);
    router.push(result.url);
  };

  if (!open) return (
    <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
      <Search className="w-3.5 h-3.5" />
      <span>Search...</span>
      <kbd className="ml-2 text-xs bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-400">Ctrl K</kbd>
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-24 z-50 px-4" onClick={() => setOpen(false)}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 text-sm text-slate-800 placeholder-slate-400 bg-transparent outline-none"
            placeholder="Search projects, SOR items, elements, knowledge..."
          />
          {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
          <button onClick={() => setOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
        </div>

        {query.length >= 2 && (
          <div className="max-h-80 overflow-y-auto py-2">
            {results.length === 0 && !loading ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">No results for "{query}"</div>
            ) : (
              results.map((result, idx) => {
                const Icon = TYPE_ICONS[result.type] || Search;
                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => navigate(result)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${idx === selected ? "bg-blue-50" : "hover:bg-slate-50"}`}
                  >
                    <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{result.title}</div>
                      {result.subtitle && <div className="text-xs text-slate-400 truncate">{result.subtitle}</div>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {result.meta && <span className="text-xs text-slate-400">{result.meta}</span>}
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${TYPE_COLORS[result.type]}`}>{TYPE_LABELS[result.type]}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        {query.length < 2 && (
          <div className="px-4 py-5 text-center text-xs text-slate-400">
            Type at least 2 characters to search · ↑↓ to navigate · Enter to open
          </div>
        )}
      </div>
    </div>
  );
}
