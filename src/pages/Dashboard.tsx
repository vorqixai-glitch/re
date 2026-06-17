import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Project } from "../types";
import { Loader2, Sparkles, Search } from "lucide-react";

export default function Dashboard() {
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetch("/api/market")
      .then(r => r.json())
      .then(d => setProjects(d))
      .catch(console.error);
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return navigate("/auth");
    if (!idea) return;

    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ idea })
      });
      const data = await res.json();
      if (res.ok) {
         navigate(`/saas/${data.id}`);
      } else {
         alert(data.error);
      }
    } catch (e) {
      alert("Failed to generate.");
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(p => {
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || 
           p.solution.toLowerCase().includes(q) || 
           p.problem.toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col gap-4 h-full">
      <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 relative overflow-hidden shadow-2xl shrink-0">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <Sparkles className="w-32 h-32 text-indigo-500" />
        </div>
        <div className="max-w-3xl relative z-10">
          <span className="bg-indigo-500/10 text-indigo-400 text-[10px] px-2 py-1 rounded border border-indigo-500/20 font-bold uppercase mb-4 inline-block">AI Generation Engine</span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-4">Turn Ideas into Startups</h1>
          <p className="text-neutral-400 text-sm md:text-base max-w-2xl mb-8">
            Describe your SaaS concept naturally. Our AI generates a full business blueprint, technical structure, and downloadable source code.
          </p>
          <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row gap-3 max-w-2xl">
            <input 
              value={idea}
              onChange={e => setIdea(e.target.value)}
              disabled={loading}
              placeholder={token ? "e.g. A platform for dog walkers to manage schedules" : "Login to generate an idea"}
              className="flex-1 bg-black/40 border border-neutral-800 rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50 transition-all text-white placeholder:text-neutral-600 font-mono text-sm"
            />
            <button disabled={loading || !token || !idea?.trim()} type="submit" className="bg-white text-black hover:bg-neutral-200 px-6 py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate
            </button>
          </form>
        </div>
      </section>

      <section className="flex-1 flex flex-col">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 px-2">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-white tracking-tight">Community Marketplace</h2>
            <div className="bg-neutral-900 border border-neutral-800 px-3 py-1 rounded-full flex items-center gap-2">
               <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
               <span className="text-[10px] font-bold text-neutral-300 tracking-widest uppercase">{projects.length} LIVE</span>
            </div>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input 
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search blueprints..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-full pl-9 pr-4 py-2 outline-none focus:border-indigo-500/50 transition-all text-white placeholder:text-neutral-600 font-mono text-xs uppercase tracking-wider"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1 content-start">
          {filteredProjects.map((p, i) => {
            const borderColors = ['hover:border-pink-500/50', 'hover:border-cyan-500/50', 'hover:border-indigo-500/50', 'hover:border-amber-500/50'];
            const colorClass = borderColors[i % borderColors.length];
            return (
              <Link key={p.id} to={`/saas/${p.id}`} className={`bg-neutral-900 border border-neutral-800 rounded-2xl p-5 ${colorClass} transition-colors group flex flex-col min-h-[200px]`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="text-white font-bold text-sm truncate pr-2">{p.name}</div>
                  <span className="text-[10px] text-green-500 font-bold shrink-0">ACTIVE</span>
                </div>
                <p className="text-xs text-neutral-500 flex-1 line-clamp-4 leading-relaxed">{p.solution}</p>
                <div className="mt-4 pt-4 border-t border-neutral-800 flex justify-between items-center text-[10px] text-neutral-500 font-mono uppercase">
                  <span>{new Date(p.created_at).toLocaleDateString()}</span>
                  <span className="group-hover:text-white transition-colors font-bold tracking-widest">VIEW &rarr;</span>
                </div>
              </Link>
            );
          })}
          {filteredProjects.length === 0 && (
            <div className="col-span-full py-12 text-center border border-dashed border-neutral-800 rounded-2xl text-neutral-500 font-mono text-sm uppercase tracking-widest">
              [SYSTEM] No active instances found.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
