import { useEffect, useState, useRef } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { World3D } from './components/World3D';
import AIThinking from './components/AIThinking';
import { ThinkingBar } from './components/prompt-kit/thinking-bar';
import {
  Play, Square, RotateCcw, Save, FolderDown, CloudDownload,
  LayoutGrid, Trophy, History, Users2, Ghost,
  ScrollText, Globe2, LogOut,
  Building2, Landmark, Gem, TreePine, Archive,
  Search, Github, Sparkles,
} from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

const REPO_URL = 'https://github.com/Thabhelo/project-genesis';

const GREEK_LETTERS: Record<string, string> = { Alpha: "α", Beta: "β", Gamma: "γ", Delta: "δ", Epsilon: "ε" };

// Agent colors shifted darker for WCAG AA on #E0E5EC
const AGENTS = [
  { name: "Alpha",   role: "The Architect",   color: "text-[#4F46E5]", bg: "bg-[#4F46E5]/10", border: "border-[#4F46E5]/20", gradient: "from-[#818cf8] to-[#6366f1]" },
  { name: "Beta",    role: "The Diplomat",    color: "text-[#9333EA]", bg: "bg-[#9333EA]/10", border: "border-[#9333EA]/20", gradient: "from-[#c084fc] to-[#a855f7]" },
  { name: "Gamma",   role: "The Critique",    color: "text-[#DB2777]", bg: "bg-[#DB2777]/10", border: "border-[#DB2777]/20", gradient: "from-[#f472b6] to-[#d946ef]" },
  { name: "Delta",   role: "The Merchant",    color: "text-[#D97706]", bg: "bg-[#D97706]/10", border: "border-[#D97706]/20", gradient: "from-[#fbbf24] to-[#f59e0b]" },
  { name: "Epsilon", role: "The Philosopher", color: "text-[#059669]", bg: "bg-[#059669]/10", border: "border-[#059669]/20", gradient: "from-[#34d399] to-[#10b981]" },
];

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ──────────────────────────────────────────────────────────
// Reusable shadow tokens as Tailwind arbitrary-value strings
// ──────────────────────────────────────────────────────────
const NEU_RAISED     = "shadow-[9px_9px_16px_rgb(163,177,198,0.6),-9px_-9px_16px_rgba(255,255,255,0.55)]";
const NEU_LIFTED     = "shadow-[12px_12px_20px_rgb(163,177,198,0.7),-12px_-12px_20px_rgba(255,255,255,0.6)]";
const NEU_SM         = "shadow-[5px_5px_10px_rgb(163,177,198,0.55),-5px_-5px_10px_rgba(255,255,255,0.5)]";
const NEU_INSET      = "shadow-[inset_6px_6px_10px_rgb(163,177,198,0.6),inset_-6px_-6px_10px_rgba(255,255,255,0.5)]";
const NEU_INSET_DEEP = "shadow-[inset_10px_10px_20px_rgb(163,177,198,0.7),inset_-10px_-10px_20px_rgba(255,255,255,0.6)]";
const NEU_INSET_SM   = "shadow-[inset_3px_3px_6px_rgb(163,177,198,0.55),inset_-3px_-3px_6px_rgba(255,255,255,0.5)]";

function App() {
  const { user, loading: authLoading, authReady, signInWithGoogle, signInWithGitHub, signOut, getIdToken } = useAuth();
  const [signInPrompt, setSignInPrompt] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [objects, setObjects] = useState<any[]>([]);
  const [constitution, setConstitution] = useState<any[]>([]);
  const [archive, setArchive] = useState<any[]>([]);
  const [resources, setResources] = useState(1000);
  const [images, setImages] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [agentStates, setAgentStates] = useState<Record<string, {activity: string, details: string}>>({});
  const [thinkingLogs, setThinkingLogs] = useState<{id?: string; agentName: string; message: string; elapsedMs: number}[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState("All Entities");
  const [navPct, setNavPct] = useState(12);

  const feedEndRef = useRef<HTMLDivElement>(null);
  const thinkingEndRef = useRef<HTMLDivElement>(null);
  const audioQueueRef = useRef<string[]>([]);
  const audioPlayingRef = useRef(false);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  useEffect(() => {
    thinkingEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thinkingLogs]);

  const playNextInAudioQueue = useRef(() => {
    if (audioPlayingRef.current || audioQueueRef.current.length === 0) return;
    const base64 = audioQueueRef.current.shift()!;
    audioPlayingRef.current = true;
    try {
      const audio = new Audio(`data:audio/mpeg;base64,${base64}`);
      audio.playbackRate = 1.15;
      audio.onended = () => { audioPlayingRef.current = false; playNextInAudioQueue.current(); };
      audio.onerror  = () => { audioPlayingRef.current = false; playNextInAudioQueue.current(); };
      audio.play().catch(() => { audioPlayingRef.current = false; playNextInAudioQueue.current(); });
    } catch {
      audioPlayingRef.current = false;
      playNextInAudioQueue.current();
    }
  });

  useEffect(() => {
    if (user) setSignInPrompt(false);
  }, [user]);

  useEffect(() => {
    if (!authReady || !user) return;
    let eventSource: EventSource | null = null;
    getIdToken().then((token) => {
      if (!token) return;
      const url = `${API_BASE}/api/stream?token=${encodeURIComponent(token)}`;
      eventSource = new EventSource(url);
      eventSource.addEventListener('init', (e) => {
        const data = JSON.parse((e as MessageEvent).data);
        setHistory(data.history || []);
        setObjects(data.objects || []);
        setConstitution(data.constitution || []);
        setArchive(data.archive || []);
        setResources(data.resources ?? 1000);
        setImages(data.images || []);
        setIsRunning(data.isRunning);
        setThinkingLogs([]);
      });
      eventSource.addEventListener('stateChange', (e) => {
        const data = JSON.parse((e as MessageEvent).data);
        setIsRunning(data.isRunning);
        if (!data.isRunning) setThinkingLogs([]);
      });
      eventSource.addEventListener('agentStatus', (e) => {
        const data = JSON.parse((e as MessageEvent).data);
        setAgentStates(prev => ({ ...prev, [data.agentName]: { activity: data.activity, details: data.details } }));
      });
      eventSource.addEventListener('thinkingLog', (e) => {
        const data = JSON.parse((e as MessageEvent).data);
        setThinkingLogs(prev => [...prev, { id: data.id, agentName: data.agentName, message: data.message, elapsedMs: data.elapsedMs }]);
      });
      eventSource.addEventListener('tick', (e) => {
        const data = JSON.parse((e as MessageEvent).data);
        if (data.historyEntry) setHistory(prev => [...prev, data.historyEntry]);
        if (data.newObject)    setObjects(prev => [...prev, data.newObject]);
        if (data.newLaw)       setConstitution(prev => [...prev, data.newLaw]);
        if (data.archiveEntry) setArchive(prev => [...prev, data.archiveEntry]);
        if (data.newImage)     setImages(prev => [...prev, data.newImage]);
        if (typeof data.resources === 'number') setResources(data.resources);
        if (data.audioBase64) {
          audioQueueRef.current.push(data.audioBase64);
          playNextInAudioQueue.current();
        }
      });
    });
    return () => { eventSource?.close(); };
  }, [authReady, user, getIdToken]);

  const apiCall = async (endpoint: string) => {
    try {
      const token = await getIdToken();
      if (!token) return;
      await fetch(`${API_BASE}/api/simulation/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      console.error(`Failed to call ${endpoint}`, e);
    }
  };

  const exportTimelapse = async () => {
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`${API_BASE}/api/export/timelapse`, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `genesis-timelapse-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
    }
  };

  const getObjectCount = (type: string) => objects.filter(o => o.type === type).length;

  const filteredHistory = searchQuery.trim()
    ? history.filter(h =>
        h.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.agentName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : history;

  const historyByAgent = AGENTS.reduce((acc, a) => {
    acc[a.name] = history.filter(h => h.agentName === a.name);
    return acc;
  }, {} as Record<string, typeof history>);

  const objectsByType = (type: string) => objects.filter(o => o.type === type);

  return (
    <div className="flex h-screen w-screen bg-[#E0E5EC] text-[#3D4852] overflow-hidden text-[17px]">

      {/* ── Sign-in modal ── */}
      <AnimatePresence>
        {signInPrompt && authReady && !user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#E0E5EC]/50 backdrop-blur-sm"
            onClick={() => setSignInPrompt(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={`glass-modal rounded-[32px] p-8 max-w-sm mx-4`}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br from-[#6C63FF] to-[#38B2AC] flex items-center justify-center ${NEU_SM}`}>
                  <Sparkles size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-[#3D4852] text-[18px] leading-tight">Sign in required</h3>
                  <p className="text-[#6B7280] text-[14px]">To run the simulation</p>
                </div>
              </div>
              <p className="text-[#6B7280] text-[15px] mb-6 leading-relaxed">
                Sign in with Google or GitHub before starting. This ensures accountability and prevents unattended runs.
              </p>
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={signInWithGoogle}
                  className={`flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl bg-[#E0E5EC] text-[#3D4852] text-[15px] font-medium transition-all duration-300 ${NEU_SM} hover:${NEU_RAISED} active:${NEU_INSET_SM}`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </button>
                <button
                  onClick={signInWithGitHub}
                  className={`flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl bg-[#E0E5EC] text-[#3D4852] text-[15px] font-medium transition-all duration-300 ${NEU_SM} hover:${NEU_RAISED} active:${NEU_INSET_SM}`}
                >
                  <Github size={15} />
                  Continue with GitHub
                </button>
              </div>
              <button
                onClick={() => setSignInPrompt(false)}
                className="w-full mt-4 py-2 text-[14px] text-[#6B7280] hover:text-[#3D4852] transition-colors rounded-xl"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main layout ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#E0E5EC] overflow-hidden">

        {/* Header */}
        <header className={`h-14 flex items-center justify-between px-5 shrink-0 bg-[#E0E5EC] ${NEU_SM} z-10`} style={{ boxShadow: '0 4px 12px rgb(163 177 198 / 0.45), 0 -2px 6px rgba(255 255 255 / 0.6)' }}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => apiCall('reset')}
              title="Reset World"
              className={`p-2 rounded-xl text-[#6B7280] hover:text-[#3D4852] transition-all duration-200 bg-[#E0E5EC] ${NEU_SM} hover:${NEU_RAISED} active:${NEU_INSET_SM}`}
            >
              <RotateCcw size={15} />
            </button>
            <div className="flex items-center gap-2 text-[15px] text-[#3D4852] font-medium">
              <Globe2 size={14} className="text-[#6C63FF]" />
              <span className="font-display">World State</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Save */}
            <button
              onClick={() => apiCall('save')}
              title="Save Checkpoint"
              className={`p-2 rounded-xl text-[#6B7280] hover:text-[#3D4852] transition-all duration-200 bg-[#E0E5EC] ${NEU_SM} hover:${NEU_RAISED} active:${NEU_INSET_SM}`}
            >
              <Save size={15} />
            </button>
            {/* Load */}
            <button
              onClick={() => apiCall('load')}
              title="Load Checkpoint"
              className={`p-2 rounded-xl text-[#6B7280] hover:text-[#3D4852] transition-all duration-200 bg-[#E0E5EC] ${NEU_SM} hover:${NEU_RAISED} active:${NEU_INSET_SM}`}
            >
              <FolderDown size={15} />
            </button>
            {/* Export */}
            <button
              onClick={exportTimelapse}
              title="Export Time-lapse"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[#6B7280] hover:text-[#3D4852] transition-all duration-200 text-[14px] bg-[#E0E5EC] ${NEU_SM} hover:${NEU_RAISED} active:${NEU_INSET_SM}`}
            >
              <CloudDownload size={15} />
              <span className="font-medium">Export</span>
            </button>

            {/* Search */}
            <div className={`flex items-center gap-2 bg-[#E0E5EC] ${NEU_INSET} rounded-2xl px-3 py-2 w-56 focus-within:${NEU_INSET_DEEP} transition-all duration-300`}>
              <Search size={13} className="text-[#6B7280] shrink-0" />
              <input
                type="text"
                placeholder="Search simulation…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-[15px] w-full text-[#3D4852] placeholder:text-[#A0AEC0]"
              />
            </div>

            {/* GitHub */}
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="View on GitHub"
              className={`p-2 rounded-xl text-[#6B7280] hover:text-[#3D4852] transition-all duration-200 bg-[#E0E5EC] ${NEU_SM} hover:${NEU_RAISED} active:${NEU_INSET_SM}`}
            >
              <Github size={15} />
            </a>
          </div>
        </header>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0 px-4 pb-4 pt-3">

          {/* Agent strip — sits above Group, padded to align after nav */}
          <div className="flex gap-3 mb-3 shrink-0" style={{ paddingLeft: `calc(${navPct}% + 8px)` }}>
            {AGENTS.map((agent, agentIdx) => {
              const state = agentStates[agent.name] || { activity: 'Idle', details: 'Awaiting turn' };
              const isActive = state.activity === 'observing' || state.activity === 'thinking';
              const cycleCount = history.filter(h => h.agentName === agent.name).length;
              const agentId = `${GREEK_LETTERS[agent.name]}${String(agentIdx + 1).padStart(3, '0')}`;
              return (
                <motion.div
                  key={agent.name}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={`flex-1 flex gap-4 px-5 py-4 rounded-2xl bg-[#E0E5EC] cursor-default relative overflow-hidden
                    transition-shadow duration-300 ${NEU_RAISED} hover:${NEU_LIFTED}`}
                >
                  {/* Active gradient stripe */}
                  {isActive && (
                    <div className={`absolute top-0 left-5 right-5 h-[3px] rounded-full bg-gradient-to-r ${agent.gradient} opacity-80`} />
                  )}
                  {/* Greek letter badge */}
                  <div className={`w-14 rounded-2xl shrink-0 flex items-center justify-center self-stretch
                    bg-gradient-to-br ${agent.gradient}
                    shadow-[inset_4px_4px_10px_rgba(0,0,0,0.2),inset_-4px_-4px_10px_rgba(255,255,255,0.18)]`}>
                    <span className="text-white leading-none select-none"
                      style={{ fontSize: '34px', fontFamily: "'Georgia','Times New Roman',serif", fontWeight: 400 }}>
                      {GREEK_LETTERS[agent.name]}
                    </span>
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-display font-bold text-[#3D4852] text-[17px] leading-none truncate">{agent.name}</div>
                        <div className={`text-[13px] mt-1 font-medium truncate ${isActive ? agent.color : 'text-[#6B7280]'}`}>
                          {state.activity === 'Idle' ? agent.role : state.activity}
                        </div>
                      </div>
                      <div className={`shrink-0 px-2.5 py-1 rounded-full font-mono text-[11px] font-bold tracking-widest uppercase
                        ${isActive ? `bg-gradient-to-r ${agent.gradient} text-white` : `shadow-[inset_2px_2px_4px_rgb(163,177,198,0.55),inset_-2px_-2px_4px_rgba(255,255,255,0.5)] text-[#6B7280]`}`}>
                        {isActive ? (state.activity || 'ACTIVE').slice(0, 9).toUpperCase() : 'STANDBY'}
                      </div>
                    </div>
                    {/* Terminal readout */}
                    <div className="flex items-center gap-2 mt-2.5">
                      <code className="font-mono text-[12px] text-[#6B7280]/65 shrink-0">#{agentId}</code>
                      <span className="text-[#6B7280]/25">·</span>
                      <span className="font-mono text-[12px] text-[#6B7280]/65">{cycleCount} cycles</span>
                      {isActive && (
                        <>
                          <span className="text-[#6B7280]/25">·</span>
                          <div className="flex items-end gap-[2px]">
                            {[5, 8, 4, 10, 6, 9, 5, 7].map((h, i) => (
                              <motion.span key={i}
                                className={`w-[2.5px] rounded-full bg-current ${agent.color}`}
                                animate={{ scaleY: [1, 0.3, 1.4, 0.6, 1] }}
                                transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.1, ease: "easeInOut" }}
                                style={{ height: `${h}px`, display: 'block', transformOrigin: 'bottom', opacity: 0.6 }}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <Group orientation="horizontal" className="flex-1 min-h-0 gap-0">

            {/* ── Left: Nav sidebar ── */}
            <Panel id="nav" defaultSize={12} minSize={8} maxSize={22} onResize={(size) => setNavPct(size.asPercentage)} className="min-w-0 flex flex-col overflow-hidden">
              <div className={`h-full flex flex-col p-3 bg-[#E0E5EC] ${NEU_RAISED} rounded-2xl mr-2 overflow-hidden`}>
                {/* Logo */}
                <div className="flex items-center gap-2.5 px-2 mb-5 mt-1 shrink-0">
                  <div className={`w-7 h-7 rounded-xl bg-gradient-to-br from-[#6C63FF] to-[#38B2AC] flex items-center justify-center shrink-0 ${NEU_SM}`}>
                    <Sparkles size={13} className="text-white" />
                  </div>
                  <span className="font-display font-bold text-[16px] text-[#3D4852] truncate">Genesis</span>
                </div>

                {/* Start / Stop CTA */}
                <button
                  onClick={() => {
                    if (!isRunning && authReady && !user) { setSignInPrompt(true); return; }
                    apiCall(isRunning ? 'stop' : 'start');
                  }}
                  className={`w-full py-2.5 rounded-2xl font-display font-semibold text-[15px] flex items-center justify-center gap-2 mb-6 shrink-0 transition-all duration-300
                    ${isRunning
                      ? 'bg-gradient-to-r from-[#f472b6] to-[#d946ef] text-white shadow-[5px_5px_12px_rgba(219,39,119,0.35),-5px_-5px_12px_rgba(255,255,255,0.6)] hover:shadow-[7px_7px_16px_rgba(219,39,119,0.45),-7px_-7px_16px_rgba(255,255,255,0.65)] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.2)]'
                      : 'bg-gradient-to-r from-[#6C63FF] to-[#38B2AC] text-white shadow-[5px_5px_12px_rgba(108,99,255,0.35),-5px_-5px_12px_rgba(255,255,255,0.6)] hover:shadow-[7px_7px_16px_rgba(108,99,255,0.45),-7px_-7px_16px_rgba(255,255,255,0.65)] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.2)]'
                    }`}
                >
                  {isRunning
                    ? <Square size={13} className="fill-current" />
                    : <Play  size={13} className="fill-current" />}
                  {isRunning ? 'Halt Simulation' : 'Start Simulation'}
                </button>

                {/* Nav items */}
                <div className="space-y-0.5 flex-1 overflow-y-auto min-h-0">
                  <NavItem icon={<LayoutGrid size={15}/>}   label="All Entities"  active={activeTab === "All Entities"}  onClick={() => setActiveTab("All Entities")} />
                  <NavItem icon={<Trophy   size={15}/>}   label="Milestones"    active={activeTab === "Milestones"}    onClick={() => setActiveTab("Milestones")} />
                  <NavItem icon={<History  size={15}/>}   label="Timeline"      active={activeTab === "Timeline"}      onClick={() => setActiveTab("Timeline")} />
                  <NavItem icon={<Users2   size={15}/>}   label="Factions"      active={activeTab === "Factions"}      onClick={() => setActiveTab("Factions")} />
                  <NavItem icon={<Ghost    size={15}/>}   label="The Void"      active={activeTab === "The Void"}      onClick={() => setActiveTab("The Void")} />

                  <div className="mt-5 mb-2 px-3 text-[12px] font-display font-semibold text-[#6B7280] uppercase tracking-widest">Governance</div>
                  <NavItem
                    icon={<ScrollText size={15} className="text-[#6C63FF]" />}
                    label="Constitution"
                    badge={constitution.length.toString()}
                    active={activeTab === "Constitution"}
                    onClick={() => setActiveTab("Constitution")}
                  />

                  <div className="mt-5 mb-2 px-3 text-[12px] font-display font-semibold text-[#6B7280] uppercase tracking-widest">World Domains</div>
                  <NavItem icon={<Building2 size={15} className="text-[#4F46E5]" />} label="Infrastructure" badge={getObjectCount('box').toString()}      active={activeTab === "Infrastructure"} onClick={() => setActiveTab("Infrastructure")} />
                  <NavItem icon={<Landmark  size={15} className="text-[#9333EA]" />} label="Monuments"      badge={getObjectCount('sphere').toString()}    active={activeTab === "Monuments"}      onClick={() => setActiveTab("Monuments")} />
                  <NavItem icon={<Gem       size={15} className="text-[#D97706]" />} label="Materials"      badge={resources.toString()}                   active={activeTab === "Resources"}      onClick={() => setActiveTab("Resources")} />
                  <NavItem icon={<TreePine  size={15} className="text-[#059669]" />} label="Nature"         badge={getObjectCount('cylinder').toString()}  active={activeTab === "Nature"}         onClick={() => setActiveTab("Nature")} />
                  <NavItem icon={<Archive   size={15} className="text-[#DB2777]" />} label="Archives"       badge={history.length.toString()}              active={activeTab === "Archives"}       onClick={() => setActiveTab("Archives")} />
                </div>

                {/* Resources gauge */}
                <div className="mt-auto pt-4 shrink-0">
                  <div className="px-2 mb-4">
                    <div className="flex justify-between text-[13px] text-[#6B7280] mb-2">
                      <span className="font-medium">Materials</span>
                      <span className="tabular-nums">{resources} / 1000</span>
                    </div>
                    <div className={`h-1.5 ${NEU_INSET_SM} rounded-full overflow-hidden`}>
                      <div
                        className="h-full bg-gradient-to-r from-[#6C63FF] to-[#38B2AC] rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((resources / 1000) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* User section */}
                  <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl mt-1">
                    {authReady ? (
                      user ? (
                        <>
                          <img
                            src={user.photoURL || undefined}
                            alt=""
                            className={`w-8 h-8 rounded-full object-cover shrink-0 ${NEU_SM}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-[15px] font-medium text-[#3D4852] truncate leading-tight">{user.displayName || 'Signed in'}</div>
                            <div className="text-[13px] text-[#6B7280] truncate leading-tight">{user.email}</div>
                          </div>
                          <button
                            onClick={signOut}
                            title="Sign out"
                            className={`p-1.5 rounded-lg text-[#6B7280] hover:text-[#3D4852] transition-all duration-200 ${NEU_SM} hover:${NEU_RAISED} active:${NEU_INSET_SM} shrink-0`}
                          >
                            <LogOut size={13} />
                          </button>
                        </>
                      ) : authLoading ? (
                        <div className="text-[14px] text-[#6B7280]">Loading…</div>
                      ) : (
                        <div className="space-y-2 w-full">
                          <button
                            onClick={signInWithGoogle}
                            className={`flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl bg-[#E0E5EC] text-[#3D4852] text-[14px] font-medium transition-all duration-200 ${NEU_SM} hover:${NEU_RAISED} active:${NEU_INSET_SM}`}
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            Google
                          </button>
                          <button
                            onClick={signInWithGitHub}
                            className={`flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl bg-[#E0E5EC] text-[#3D4852] text-[14px] font-medium transition-all duration-200 ${NEU_SM} hover:${NEU_RAISED} active:${NEU_INSET_SM}`}
                          >
                            <Github size={13} />
                            GitHub
                          </button>
                        </div>
                      )
                    ) : (
                      <>
                        <img
                          src="https://api.dicebear.com/7.x/avataaars/svg?seed=Creator"
                          alt="Creator"
                          className={`w-8 h-8 rounded-full shrink-0 ${NEU_SM}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-[15px] font-medium text-[#3D4852] truncate leading-tight">The Creator</div>
                          <div className="text-[13px] text-[#6B7280] truncate leading-tight">Sign in to begin</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Panel>

            <Separator className="shrink-0 bg-[#E0E5EC] hover:bg-[#d4dae7] data-[resize-handle-state=drag]:bg-[#6C63FF]/20 transition-colors cursor-col-resize w-2" />

            {/* Center: Thinking + World */}
            <Panel id="center" defaultSize={66} minSize={45} maxSize={80} className="min-w-0 flex flex-col overflow-hidden">
                    <Group orientation="vertical" className="h-full min-h-0 flex-1 flex">

                      {/* Thinking panel */}
                      <Panel id="thinking" defaultSize={28} minSize={10} maxSize={55} className="min-h-0 flex flex-col overflow-hidden">
                        <div className="h-full overflow-hidden mb-1">
                          {thinkingLogs.length === 0 ? (
                            <div
                              className={`h-full flex items-center justify-center rounded-2xl bg-[#E0E5EC] relative overflow-hidden cursor-pointer ${NEU_RAISED}`}
                              onClick={() => {
                                if (!isRunning) {
                                  if (authReady && !user) { setSignInPrompt(true); return; }
                                  apiCall('start');
                                }
                              }}
                            >
                              {/* Concentric rings — rotate when running */}
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                                <motion.div className="absolute w-64 h-64 rounded-full"
                                  animate={{ rotate: isRunning ? 360 : 0 }}
                                  transition={isRunning ? { duration: 28, repeat: Infinity, ease: "linear" } : { duration: 1.5 }}
                                  style={{ boxShadow: '14px 14px 28px rgb(163,177,198,0.5),-14px -14px 28px rgba(255,255,255,0.58)', opacity: 0.55 }}>
                                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#6C63FF]/25" />
                                </motion.div>
                                <motion.div className="absolute w-48 h-48 rounded-full"
                                  animate={{ rotate: isRunning ? -360 : 0 }}
                                  transition={isRunning ? { duration: 20, repeat: Infinity, ease: "linear" } : { duration: 1.5 }}
                                  style={{ boxShadow: 'inset 10px 10px 20px rgb(163,177,198,0.48),inset -10px -10px 20px rgba(255,255,255,0.55)', opacity: 0.6 }} />
                                <motion.div className="absolute w-32 h-32 rounded-full"
                                  animate={{ rotate: isRunning ? 360 : 0 }}
                                  transition={isRunning ? { duration: 14, repeat: Infinity, ease: "linear" } : { duration: 1.5 }}
                                  style={{ boxShadow: '8px 8px 16px rgb(163,177,198,0.5),-8px -8px 16px rgba(255,255,255,0.55)', opacity: 0.65 }}>
                                  <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#38B2AC]/30" />
                                </motion.div>
                                <div className="absolute w-16 h-16 rounded-full"
                                  style={{ boxShadow: 'inset 5px 5px 10px rgb(163,177,198,0.55),inset -5px -5px 10px rgba(255,255,255,0.55)', opacity: 0.75 }} />
                                <div className="absolute w-6 h-6 rounded-full"
                                  style={{ boxShadow: '3px 3px 6px rgb(163,177,198,0.6),-3px -3px 6px rgba(255,255,255,0.6)', opacity: 0.9 }} />
                              </div>
                              <ThinkingBar className="relative z-10 mx-8"
                                text={isRunning ? 'Waiting for next agent...' : 'Simulation paused. Click to resume.'} />
                            </div>
                          ) : (
                            <div className="h-full">
                              <AIThinking
                                key={isRunning ? 'running' : 'paused'}
                                spinner={isRunning}
                                message={thinkingLogs.map(log => `[${log.agentName}] ${log.message}`).join('\n\n')}
                                agentName={thinkingLogs[thinkingLogs.length - 1]?.agentName}
                              />
                              <div ref={thinkingEndRef} />
                            </div>
                          )}
                        </div>
                      </Panel>

                      <Separator className="shrink-0 bg-[#E0E5EC] hover:bg-[#d4dae7] data-[resize-handle-state=drag]:bg-[#6C63FF]/20 transition-colors cursor-row-resize h-2" />

                      {/* World 3D */}
                      <Panel id="world" defaultSize={72} minSize={45} maxSize={90} className="min-h-0 flex flex-col overflow-hidden">
                        <div className={`h-full ${NEU_INSET_DEEP} rounded-2xl overflow-hidden flex flex-col mt-1 bg-[#E0E5EC]`}>
                          <div className="px-4 py-3 flex justify-between items-center bg-black/25 backdrop-blur-sm shrink-0">
                            <h2 className="font-display font-semibold text-white/90 text-[17px] tracking-wide flex items-center gap-2.5">
                              <motion.span className="w-2.5 h-2.5 rounded-full bg-[#38B2AC] inline-block shrink-0"
                                animate={isRunning ? { scale: [1, 1.5, 1], opacity: [1, 0.4, 1] } : { scale: 1 }}
                                transition={isRunning ? { duration: 1.4, repeat: Infinity } : {}} />
                              Live World Render
                            </h2>
                            <div className="flex items-center gap-5 font-mono text-[13px] text-white/50 tabular-nums">
                              <span>constructs: <span className="text-white/85 font-semibold">{objects.length}</span></span>
                              <span>materials: <span className="text-white/85 font-semibold">{resources}</span></span>
                            </div>
                          </div>
                          <div className="flex-1 relative min-h-0">
                            <World3D objects={objects} />
                          </div>
                        </div>
                      </Panel>
                    </Group>
                  </Panel>

            <Separator className="shrink-0 bg-[#E0E5EC] hover:bg-[#d4dae7] data-[resize-handle-state=drag]:bg-[#6C63FF]/20 transition-colors cursor-col-resize w-2" />

            {/* Sidebar */}
            <Panel id="sidebar" defaultSize={22} minSize={15} maxSize={40} className="min-w-0 pl-2 flex flex-col overflow-hidden">
              <div className="h-full overflow-y-auto flex flex-col gap-4">
                <TabContent
                  activeTab={activeTab}
                  filteredHistory={filteredHistory}
                  searchQuery={searchQuery}
                  constitution={constitution}
                  archive={archive}
                  images={images}
                  objectsByType={objectsByType}
                  historyByAgent={historyByAgent}
                  resources={resources}
                  AGENTS={AGENTS}
                  feedEndRef={feedEndRef}
                  getObjectCount={getObjectCount}
                />
              </div>
            </Panel>

          </Group>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Shadow shorthand constants (repeated from above for TabContent scope)
// ──────────────────────────────────────────────
const S_RAISED   = "shadow-[9px_9px_16px_rgb(163,177,198,0.6),-9px_-9px_16px_rgba(255,255,255,0.55)]";
const S_SM       = "shadow-[5px_5px_10px_rgb(163,177,198,0.55),-5px_-5px_10px_rgba(255,255,255,0.5)]";
const S_INSET_SM = "shadow-[inset_3px_3px_6px_rgb(163,177,198,0.5),inset_-3px_-3px_6px_rgba(255,255,255,0.45)]";

type AgentDef = { name: string; role: string; color: string; bg: string; border: string; gradient: string };

function TabContent({
  activeTab,
  filteredHistory,
  searchQuery,
  constitution,
  archive,
  images,
  objectsByType,
  historyByAgent,
  resources,
  AGENTS,
  feedEndRef,
  getObjectCount
}: {
  activeTab: string;
  filteredHistory: any[];
  searchQuery: string;
  constitution: any[];
  archive: any[];
  images: any[];
  objectsByType: (type: string) => any[];
  historyByAgent: Record<string, any[]>;
  resources: number;
  AGENTS: AgentDef[];
  feedEndRef: React.RefObject<HTMLDivElement | null>;
  getObjectCount: (type: string) => number;
}) {
  const getCount = getObjectCount;

  const renderActivityFeed = () => (
    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
      {filteredHistory.length === 0 ? (
        <div className="text-[15px] text-[#6B7280] text-center mt-6 italic">
          {searchQuery ? 'No matches found.' : 'No activity yet.'}
        </div>
      ) : (
        <AnimatePresence initial={false}>
          {[...filteredHistory].reverse().map((entry: any, i: number) => {
            const agent = AGENTS.find((a: AgentDef) => a.name === entry.agentName) || AGENTS[0];
            return (
              <motion.div
                key={entry.timestamp ?? i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 items-start p-3 rounded-xl bg-[#E0E5EC] ${S_INSET_SM} transition-shadow duration-200`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br ${agent.gradient} shadow-[inset_2px_2px_4px_rgba(0,0,0,0.15),inset_-2px_-2px_4px_rgba(255,255,255,0.2)]`}>
                  <span className="text-white text-[12px] font-display font-bold">{agent.name[0]}</span>
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-[14px] leading-snug">
                    <span className="font-display font-semibold text-[#3D4852]">{entry.agentName}</span>{' '}
                    <span className="text-[#6B7280]">stated</span>
                  </p>
                  <p className="text-[14px] text-[#3D4852] mt-0.5 break-words leading-relaxed">"{entry.message}"</p>
                  <span className="text-[12px] text-[#6B7280] tabular-nums mt-1 block">
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
      <div ref={feedEndRef} />
    </div>
  );

  const renderConstitution = () => (
    <div className="space-y-2.5 overflow-y-auto pr-1 max-h-[400px]">
      {constitution.length === 0 ? (
        <div className="text-[14px] text-[#6B7280] text-center italic mt-4">No laws established yet.</div>
      ) : (
        constitution.map((c, i) => {
          const agent = AGENTS.find((a: AgentDef) => a.name === c.agentName) || AGENTS[0];
          return (
            <div key={c.id} className={`bg-[#E0E5EC] rounded-xl p-3.5 ${S_INSET_SM}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[12px] font-display font-bold text-[#3D4852] uppercase tracking-wider">
                  Article {i + 1}
                </span>
                <span className={`text-[12px] font-semibold ${agent.color}`}>by {c.agentName}</span>
              </div>
              <p className="text-[14px] text-[#6B7280] leading-relaxed">"{c.law}"</p>
            </div>
          );
        })
      )}
    </div>
  );

  const renderObjectList = (type: string, label: string) => {
    const items = objectsByType(type);
    return (
      <div className="space-y-2 overflow-y-auto pr-1 max-h-[400px]">
        {items.length === 0 ? (
          <div className="text-[14px] text-[#6B7280] text-center italic mt-4">No {label.toLowerCase()} yet.</div>
        ) : (
          items.map((obj: any) => (
            <div key={obj.id} className={`bg-[#E0E5EC] rounded-xl p-3 ${S_INSET_SM} text-[14px]`}>
              <span className="text-[#6C63FF] font-display font-semibold">{obj.type}</span>
              {obj.creator && <span className="text-[#6B7280] ml-2">by {obj.creator}</span>}
              {obj.position && <span className="text-[#3D4852] block mt-1 tabular-nums text-[13px]">[{obj.position.join(', ')}]</span>}
            </div>
          ))
        )}
      </div>
    );
  };

  const panelClass = `bg-[#E0E5EC] rounded-2xl p-5 flex-1 flex flex-col min-h-0 ${S_RAISED}`;
  const headingClass = "font-display font-bold text-[#3D4852] text-[15px] mb-4 flex items-center gap-2";

  const content = (() => {
    switch (activeTab) {
      case 'All Entities':
        return (
          <div className={panelClass}>
            <h3 className={headingClass}>
              <span className="w-2 h-2 rounded-full bg-[#6C63FF] inline-block" />
              Recent Activity
            </h3>
            {renderActivityFeed()}
          </div>
        );
      case 'Milestones':
      case 'Constitution':
        return (
          <div className={panelClass}>
            <h3 className={headingClass}>
              <span className="w-2 h-2 rounded-full bg-[#6C63FF] inline-block" />
              Constitution Ledger
              <span className={`ml-auto text-[13px] font-normal text-[#6B7280] tabular-nums px-2 py-0.5 rounded-lg ${S_INSET_SM}`}>
                {constitution.length} Articles
              </span>
            </h3>
            {renderConstitution()}
          </div>
        );
      case 'Timeline':
        return (
          <div className={panelClass}>
            <h3 className={headingClass}>
              <span className="w-2 h-2 rounded-full bg-[#38B2AC] inline-block" />
              Timeline
            </h3>
            {renderActivityFeed()}
          </div>
        );
      case 'Factions':
        return (
          <div className={`${panelClass} overflow-y-auto`}>
            <h3 className={headingClass}>
              <span className="w-2 h-2 rounded-full bg-[#9333EA] inline-block" />
              Activity by Faction
            </h3>
            <div className="space-y-3">
              {AGENTS.map((agent: AgentDef) => {
                const entries = historyByAgent[agent.name] || [];
                return (
                  <div key={agent.name} className={`rounded-xl p-3.5 bg-[#E0E5EC] ${S_INSET_SM}`}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${agent.gradient} flex items-center justify-center shadow-[inset_2px_2px_4px_rgba(0,0,0,0.12)]`}>
                        <span className="text-white text-[12px] font-display font-bold">{agent.name[0]}</span>
                      </div>
                      <span className="font-display font-semibold text-[#3D4852] text-[15px]">{agent.name}</span>
                      <span className={`ml-auto text-[12px] tabular-nums ${agent.color} font-medium`}>{entries.length}</span>
                    </div>
                    <div className="space-y-1.5 max-h-[100px] overflow-y-auto">
                      {entries.slice(-4).reverse().map((e: any, i: number) => (
                        <p key={i} className="text-[13px] text-[#6B7280] break-words leading-relaxed">"{e.message}"</p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 'The Void':
        return (
          <div className={panelClass}>
            <h3 className={headingClass}>
              <span className="w-2 h-2 rounded-full bg-[#6B7280] inline-block" />
              The Void
            </h3>
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[15px] text-[#6B7280] italic text-center">Nothing has been discarded to the void.</p>
            </div>
          </div>
        );
      case 'Infrastructure':
        return (
          <div className={panelClass}>
            <h3 className={headingClass}>
              <span className="w-2 h-2 rounded-full bg-[#4F46E5] inline-block" />
              Infrastructure
              <span className={`ml-auto text-[13px] font-normal text-[#6B7280] tabular-nums px-2 py-0.5 rounded-lg ${S_INSET_SM}`}>{getCount('box')} constructs</span>
            </h3>
            {renderObjectList('box', 'Infrastructure')}
          </div>
        );
      case 'Monuments':
        return (
          <div className={panelClass}>
            <h3 className={headingClass}>
              <span className="w-2 h-2 rounded-full bg-[#9333EA] inline-block" />
              Monuments
              <span className={`ml-auto text-[13px] font-normal text-[#6B7280] tabular-nums px-2 py-0.5 rounded-lg ${S_INSET_SM}`}>{getCount('sphere')} constructs</span>
            </h3>
            {renderObjectList('sphere', 'Monuments')}
          </div>
        );
      case 'Nature':
        return (
          <div className={panelClass}>
            <h3 className={headingClass}>
              <span className="w-2 h-2 rounded-full bg-[#059669] inline-block" />
              Nature
              <span className={`ml-auto text-[13px] font-normal text-[#6B7280] tabular-nums px-2 py-0.5 rounded-lg ${S_INSET_SM}`}>{getCount('cylinder')} constructs</span>
            </h3>
            {renderObjectList('cylinder', 'Nature')}
          </div>
        );
      case 'Resources':
        return (
          <div className={panelClass}>
            <h3 className={headingClass}>
              <span className="w-2 h-2 rounded-full bg-[#D97706] inline-block" />
              Materials
            </h3>
            <div className="space-y-4">
              <div className={`rounded-xl p-4 bg-[#E0E5EC] ${S_INSET_SM}`}>
                <div className="flex justify-between text-[15px] mb-3">
                  <span className="text-[#6B7280] font-medium">Available</span>
                  <span className="font-display font-semibold text-[#3D4852] tabular-nums">{resources} / 1000</span>
                </div>
                <div className={`h-2 rounded-full overflow-hidden ${S_INSET_SM}`}>
                  <div
                    className="h-full bg-gradient-to-r from-[#6C63FF] to-[#38B2AC] rounded-full transition-all duration-500"
                    style={{ width: `${(resources / 1000) * 100}%` }}
                  />
                </div>
              </div>
              <p className="text-[14px] text-[#6B7280]">1 material consumed per construct built.</p>
            </div>
          </div>
        );
      case 'Archives':
        return (
          <div className={panelClass}>
            <h3 className={headingClass}>
              <span className="w-2 h-2 rounded-full bg-[#DB2777] inline-block" />
              Shared Archive
              <span className={`ml-auto text-[13px] font-normal text-[#6B7280] tabular-nums px-2 py-0.5 rounded-lg ${S_INSET_SM}`}>{archive.length} entries</span>
            </h3>
            <div className="space-y-1.5 overflow-y-auto pr-1 max-h-[300px]">
              {archive.length === 0 ? (
                <div className="text-[14px] text-[#6B7280] italic">No archive entries yet.</div>
              ) : (
                archive.slice().reverse().map((a: any) => (
                  <div key={a.id} className={`bg-[#E0E5EC] rounded-xl px-3 py-2 ${S_INSET_SM} text-[13px]`}>
                    <span className="text-[#6C63FF] font-display font-semibold">{a.key}:</span>{' '}
                    <span className="text-[#6B7280] break-words">{a.value}</span>
                  </div>
                ))
              )}
            </div>
            {images.length > 0 && (
              <>
                <h3 className={`${headingClass} mt-5`}>
                  <span className="w-2 h-2 rounded-full bg-[#D97706] inline-block" />
                  Visual Artifacts
                  <span className="text-[#6B7280] text-[13px] font-normal">({images.length})</span>
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                  {images.slice(-4).reverse().map((img: any) => (
                    <div key={img.id} className={`rounded-xl overflow-hidden bg-[#E0E5EC] ${S_SM}`}>
                      <img src={`data:image/png;base64,${img.imageBase64}`} alt={img.prompt} className="w-full h-16 object-cover" />
                      <p className="text-[12px] text-[#6B7280] px-2 py-1 break-words leading-tight" title={img.prompt}>{img.prompt}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      default:
        return (
          <div className={panelClass}>
            <h3 className={headingClass}>
              <span className="w-2 h-2 rounded-full bg-[#6C63FF] inline-block" />
              Recent Activity
            </h3>
            {renderActivityFeed()}
          </div>
        );
    }
  })();

  return content;
}

function NavItem({
  icon, label, active, badge, onClick
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all duration-200 select-none
        ${active
          ? `bg-[#E0E5EC] shadow-[inset_3px_3px_6px_rgb(163,177,198,0.6),inset_-3px_-3px_6px_rgba(255,255,255,0.5)] text-[#6C63FF] font-semibold`
          : `text-[#6B7280] hover:text-[#3D4852] hover:shadow-[3px_3px_6px_rgb(163,177,198,0.4),-3px_-3px_6px_rgba(255,255,255,0.4)]`
        }`}
    >
      <div className="flex items-center gap-2.5">
        {icon}
        <span className="text-[15px] font-medium">{label}</span>
      </div>
      {badge && (
        <span className={`text-[12px] tabular-nums font-medium px-1.5 py-0.5 rounded-lg min-w-[20px] text-center
          ${active ? 'text-[#6C63FF]' : 'text-[#6B7280]'}
          shadow-[inset_2px_2px_4px_rgb(163,177,198,0.4),inset_-2px_-2px_4px_rgba(255,255,255,0.4)]`}>
          {badge}
        </span>
      )}
    </div>
  );
}

export default App;
