import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Project } from "../types";
import { Lock, FileDown, CheckCircle, Package } from "lucide-react";

export default function ProjectView() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  // Check if we need to show a success toast
  const justPaid = searchParams.get('success') === 'true';

  useEffect(() => {
    fetch(`/api/saas/${id}`)
      .then(r => r.json())
      .then(d => {
        if (!d.error) setProject(d);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleCheckout = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
        alert("Please login first");
        return;
    }
    setPaying(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ projectId: id })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.dummy) {
        // dummy unlock without stripe
        window.location.href = window.location.pathname + '?success=true';
      } else {
        alert(data.error || "Failed to initiate payment");
        setPaying(false);
      }
    } catch (e) {
      alert("Checkout error");
      setPaying(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-neutral-500 font-mono text-sm uppercase tracking-widest">[SYSTEM] Loading blueprint...</div>;
  if (!project) return <div className="text-center py-20 text-red-500 font-mono text-sm uppercase tracking-widest">[ERROR] Project not found.</div>;

  const token = localStorage.getItem("token");
  let myId = null;
  if (token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window.atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      myId = JSON.parse(jsonPayload).id;
    } catch (e) {
      console.error("JWT parse error:", e);
    }
  }

  const isOwner = myId === project.user_id;
  const isUnlocked = myId && project.unlocked_by?.includes(myId);
  const canExport = isOwner || isUnlocked;

  return (
    <div className="space-y-4 animate-in fade-in duration-500 w-full h-full flex flex-col pt-2">
      {justPaid && (
        <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-2xl flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-widest max-w-3xl mx-auto w-full mb-2">
          <CheckCircle className="w-4 h-4" />
          Unlock sequence successful. Repository access granted.
        </div>
      )}

      {/* Header Bento */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-4 opacity-5">
           <svg width="160" height="160" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
        </div>
        <div className="relative z-10 flex-1">
          <span className="bg-indigo-500/10 text-indigo-400 text-[10px] px-2 py-1 rounded border border-indigo-500/20 font-bold uppercase mb-3 inline-block tracking-wider">Blueprint Instance</span>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white line-clamp-2">{project.name}</h1>
          <p className="text-xs text-neutral-500 font-mono uppercase tracking-widest mt-2 shrink-0 line-clamp-1">ID: {project.id}</p>
        </div>
        <div className="relative z-10 shrink-0">
          {canExport ? (
            <a 
              href={`/api/export/${project.id}?token=${token}`}
              className="bg-white text-black px-6 py-3 rounded-full text-xs font-bold transition-colors hover:bg-neutral-200 uppercase flex items-center justify-center gap-2 tracking-wider"
            >
              <FileDown className="w-4 h-4" />
              EXPORT REPO
            </a>
          ) : (
            <button 
              onClick={handleCheckout} 
              disabled={paying}
              className="bg-white text-black px-6 py-3 rounded-full text-xs font-bold uppercase hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 tracking-wider"
            >
              <Lock className="w-4 h-4 text-black" />
              {paying ? "PROCESSING..." : "UNLOCK ($19)"}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
        
        {/* Core Specs */}
        <div className="lg:col-span-2 space-y-4 flex flex-col">
           {/* Problem & Solution */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 hover:border-pink-500/50 transition-colors">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-3 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-pink-500 rounded-full"></div>
                  The Problem
                </h2>
                <p className="text-sm text-neutral-300 leading-relaxed">{project.problem}</p>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 hover:border-cyan-500/50 transition-colors">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-3 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></div>
                  The Solution
                </h2>
                <p className="text-sm text-neutral-300 leading-relaxed">{project.solution}</p>
              </div>
           </div>

           {/* MVP Execution Steps */}
           <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 hover:border-amber-500/50 transition-colors flex-1 flex flex-col">
             <div className="flex justify-between items-center mb-5 shrink-0">
                <h2 className="text-sm font-bold text-white uppercase tracking-widest">MVP Execution Plan</h2>
                <span className="text-[10px] text-amber-500 font-bold bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 uppercase tracking-widest">Compiling</span>
             </div>
             <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar">
               {project.mvp_steps.map((step, i) => (
                 <div key={i} className="flex gap-3 items-start select-none group">
                   <div className="shrink-0 w-6 h-6 rounded border border-neutral-700 bg-neutral-800/50 flex items-center justify-center font-mono text-[10px] text-neutral-400 group-hover:bg-amber-500/10 group-hover:text-amber-500 group-hover:border-amber-500/30 transition-colors">
                     0{i + 1}
                   </div>
                   <p className="text-sm text-neutral-400 mt-0.5 leading-relaxed group-hover:text-neutral-300 transition-colors">{step}</p>
                 </div>
               ))}
             </div>
           </div>
        </div>

        {/* Sidebar Data */}
        <div className="lg:col-span-1 space-y-4 flex flex-col">
           {/* Features */}
           <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 hover:border-indigo-500/50 transition-colors flex flex-col max-h-[350px]">
             <div className="flex justify-between items-center mb-4 shrink-0">
                <h2 className="text-sm font-bold text-white uppercase tracking-widest">Core Features</h2>
                <Package className="w-4 h-4 text-indigo-500" />
             </div>
             <ul className="space-y-2 overflow-y-auto pr-1">
               {project.features.map((f, i) => (
                 <li key={i} className="flex flex-col bg-black/40 rounded-xl p-3 border border-neutral-800/50">
                   <span className="text-indigo-400 font-mono text-[10px] uppercase mb-1 tracking-widest">Module {i+1}</span>
                   <span className="text-xs text-neutral-300 leading-relaxed line-clamp-2">{f}</span>
                 </li>
               ))}
             </ul>
           </div>

           {/* Pricing Table (Stacked) */}
           <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex-1 hover:border-neutral-700 transition-colors flex flex-col justify-end">
             <h2 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-4">Monetization Strategy</h2>
             <div className="space-y-2">
                <div className="bg-neutral-800/30 border border-neutral-700/50 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Free Tier</div>
                  <div className="text-xs text-neutral-300 truncate">{project.pricing.free}</div>
                </div>
                <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-3 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 bg-indigo-500 text-[9px] px-2 py-0.5 rounded-bl-lg font-bold text-white uppercase tracking-widest">PRO</div>
                  <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1 group-hover:text-indigo-300 transition-colors">Pro Tier</div>
                  <div className="text-xs text-indigo-100 truncate">{project.pricing.pro}</div>
                </div>
                <div className="bg-neutral-800/30 border border-neutral-700/50 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Enterprise</div>
                  <div className="text-xs text-neutral-300 truncate">{project.pricing.enterprise}</div>
                </div>
             </div>
           </div>
        </div>

      </div>
    </div>
  );
}
