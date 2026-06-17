import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ProjectView from "./pages/ProjectView";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-neutral-950 text-neutral-300 font-sans flex flex-col selection:bg-indigo-500/30 selection:text-white">
        <nav className="border-b border-neutral-800 bg-neutral-950 pb-4 pt-6 px-6 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">S</div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white line-clamp-1">SaaSForge Factory</h1>
                <p className="text-xs text-neutral-500 font-mono uppercase tracking-widest hidden sm:block">Active Instance: 0x8842-Alpha</p>
              </div>
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/" className="text-neutral-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider hidden sm:block">Marketplace</Link>
              <AuthNav />
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-6 py-6 w-full flex-1 flex flex-col items-stretch">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/saas/:id" element={<ProjectView />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function AuthNav() {
  const token = localStorage.getItem("token");
  if (token) {
    return (
      <button 
        onClick={() => { localStorage.removeItem("token"); window.location.href = "/"; }}
        className="bg-neutral-900 border border-neutral-800 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 hover:bg-neutral-800 transition-colors text-white uppercase"
      >
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        LOGGED IN (QUIT)
      </button>
    );
  }
  return <Link to="/auth" className="bg-white text-black text-xs font-bold px-6 py-2 rounded-full hover:bg-neutral-200 uppercase transition-colors">AUTHORIZE</Link>;
}
