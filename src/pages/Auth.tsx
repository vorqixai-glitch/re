import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const url = isLogin ? "/api/auth/login" : "/api/auth/register";
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("token", data.token);
        navigate("/");
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Network error");
    }
  };

  return (
    <div className="h-full flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
           <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20 text-sm">S</div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">{isLogin ? "System Login" : "Initialize Agent"}</h2>
              <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest">{isLogin ? "Session Token Request" : "New Operator Instance"}</p>
            </div>
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-3 py-2 rounded-xl mb-6 text-xs font-mono tracking-tight">{error}</div>}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Operator ID (Email)</label>
              <input 
                type="email" 
                required 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-neutral-800 rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50 transition-all text-sm text-white font-mono placeholder:text-neutral-700" 
                placeholder="sys_admin@forge.ai"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Access Key (Password)</label>
              <input 
                type="password" 
                required 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-neutral-800 rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50 transition-all text-sm text-white font-mono placeholder:text-neutral-700" 
                placeholder="••••••••"
              />
            </div>
            <button type="submit" className="w-full bg-white text-black hover:bg-neutral-200 py-3 rounded-xl text-xs font-bold transition-colors mt-2 uppercase tracking-wider">
              {isLogin ? "AUTHENTICATE" : "REGISTER"}
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-neutral-800 text-center text-xs text-neutral-500 tracking-tight">
            {isLogin ? "Awaiting credentials... " : "Awaiting registration... "}
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-white hover:text-indigo-400 font-bold transition-colors uppercase tracking-widest ml-1 text-[10px]">
              {isLogin ? "CREATE KEY" : "LOGIN NOW"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
