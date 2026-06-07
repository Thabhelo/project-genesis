import { useEffect, useState, useRef } from 'react';
import type { ReactNode, RefObject } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { World3D } from './components/World3D';
import AIThinking from './components/AIThinking';
import { ThinkingBar } from './components/prompt-kit/thinking-bar';
import {
  Play, Square, RotateCcw, Save, FolderDown, CloudDownload,
  LayoutGrid, Trophy, History, Users2, Ghost,
  ScrollText, Globe2, LogOut,
  Building2, Landmark, Gem, TreePine, Archive,
  Search, Github, Sparkles, User, Send,
} from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

const REPO_URL = 'https://github.com/Thabhelo/project-genesis';

const GREEK_LETTERS: Record<string, string> = { Alpha: "α", Beta: "β", Gamma: "γ", Delta: "δ", Epsilon: "ε" };

type Vector3 = [number, number, number];

type HistoryEntry = {
  agentName: string;
  message: string;
  timestamp: string | number | Date;
};

type GenesisObject = {
  id: string;
  type: string;
  color: string;
  position: Vector3;
  scale: Vector3;
  creator: string;
};

type ConstitutionEntry = {
  id: string;
  agentName: string;
  law: string;
};

type ArchiveEntry = {
  id: string;
  key: string;
  value: string;
};

type ImageEntry = {
  id: string;
  imageBase64: string;
  prompt: string;
};

// Agent accents inspired by civic ledgers, maps, and operations tools.
const AGENTS = [
  { name: "Alpha",   role: "The Architect",   color: "text-[#7A4E2D]", bg: "bg-[#7A4E2D]/10", border: "border-[#7A4E2D]/25", gradient: "from-[#7A4E2D] to-[#B56F39]" },
  { name: "Beta",    role: "The Diplomat",    color: "text-[#4F6F46]", bg: "bg-[#4F6F46]/10", border: "border-[#4F6F46]/25", gradient: "from-[#4F6F46] to-[#7A8F55]" },
  { name: "Gamma",   role: "The Critique",    color: "text-[#8A4B3B]", bg: "bg-[#8A4B3B]/10", border: "border-[#8A4B3B]/25", gradient: "from-[#8A4B3B] to-[#C06F4E]" },
  { name: "Delta",   role: "The Merchant",    color: "text-[#A36A21]", bg: "bg-[#A36A21]/10", border: "border-[#A36A21]/25", gradient: "from-[#A36A21] to-[#D49A36]" },
  { name: "Epsilon", role: "The Philosopher", color: "text-[#5F5366]", bg: "bg-[#5F5366]/10", border: "border-[#5F5366]/25", gradient: "from-[#5F5366] to-[#8E7B72]" },
];

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ──────────────────────────────────────────────────────────
// Production surface tokens for the warm operations-ledger system
// ──────────────────────────────────────────────────────────
const NEU_RAISED     = "border border-[#D8CBB7] bg-[#FFFDF6]/88 shadow-[0_18px_52px_rgba(61,48,31,0.13)] backdrop-blur-xl";
const NEU_SM         = "border border-[#D8CBB7] bg-[#FFFDF6]/78 shadow-[0_10px_26px_rgba(61,48,31,0.1)]";
const NEU_INSET      = "border border-[#D8CBB7] bg-[#F2EBDD]/84 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]";
const NEU_INSET_DEEP = "border border-[#3E352B] bg-[#181611] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_24px_70px_rgba(61,48,31,0.22)]";
const NEU_INSET_SM   = "border border-[#D8CBB7] bg-[#F8F2E8]/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]";

function App() {
  const { user, loading: authLoading, authReady, signInWithGoogle, signInWithGitHub, signOut, getIdToken } = useAuth();
  const [signInPrompt, setSignInPrompt] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [objects, setObjects] = useState<GenesisObject[]>([]);
  const [constitution, setConstitution] = useState<ConstitutionEntry[]>([]);
  const [archive, setArchive] = useState<ArchiveEntry[]>([]);
  const [resources, setResources] = useState(1000);
  const [images, setImages] = useState<ImageEntry[]>([]);
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

  const [humanMessage, setHumanMessage] = useState('');
  const [sendingHuman, setSendingHuman] = useState(false);
  const sendHumanMessage = async () => {
    const text = humanMessage.trim();
    if (!text || sendingHuman) return;
    try {
      setSendingHuman(true);
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`${API_BASE}/api/human/message`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      if (res.ok) {
        setHumanMessage('');
        // SSE broadcast will add the entry to history
      }
    } catch (e) {
      console.error('Failed to send message', e);
    } finally {
      setSendingHuman(false);
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
    <div className="flex h-screen w-screen bg-[#F4EFE6] text-[#1F241F] overflow-hidden text-[16px] selection:bg-[#D49A36]/25 selection:text-[#1F241F]">

      {/* ── Sign-in modal ── */}
      <AnimatePresence>
        {signInPrompt && authReady && !user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B251C]/45 backdrop-blur-md"
            onClick={() => setSignInPrompt(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="glass-modal rounded-[28px] p-8 max-w-sm mx-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br from-[#9A5B2F] to-[#4F6F46] flex items-center justify-center ${NEU_SM}`}>
                  <Sparkles size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-[#1F241F] text-[18px] leading-tight">Sign in required</h3>
                  <p className="text-[#6B6258] text-[14px]">To run the simulation</p>
                </div>
              </div>
              <p className="text-[#4D463E] text-[15px] mb-6 leading-relaxed">
                Sign in with Google or GitHub before starting. This ensures accountability and prevents unattended runs.
              </p>
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={signInWithGoogle}
                  className={`flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl text-[#1F241F] text-[15px] font-medium transition-all duration-200 cursor-pointer hover:border-[#9A5B2F]/45 ${NEU_SM}`}
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
                  className={`flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl text-[#1F241F] text-[15px] font-medium transition-all duration-200 cursor-pointer hover:border-[#9A5B2F]/45 ${NEU_SM}`}
                >
                  <Github size={15} />
                  Continue with GitHub
                </button>
              </div>
              <button
                onClick={() => setSignInPrompt(false)}
                className="w-full mt-4 py-2 text-[14px] text-[#6B6258] hover:text-[#1F241F] transition-colors rounded-xl cursor-pointer"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main layout ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-[radial-gradient(circle_at_top_left,rgba(154,91,47,0.18),transparent_30%),radial-gradient(circle_at_top_right,rgba(79,111,70,0.16),transparent_32%),linear-gradient(180deg,#F8F2E8_0%,#EFE6D8_100%)] overflow-hidden">

        {/* Header */}
        <header className="h-16 flex items-center justify-between px-5 shrink-0 border-b border-[#D8CBB7] bg-[#FFFDF6]/82 backdrop-blur-xl z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => apiCall('reset')}
              title="Reset World"
              className={`p-2 rounded-xl text-[#6B6258] hover:text-[#1F241F] transition-all duration-200 cursor-pointer hover:border-[#9A5B2F]/45 ${NEU_SM}`}
            >
              <RotateCcw size={15} />
            </button>
            <div className="flex items-center gap-2 text-[15px] text-[#1F241F] font-medium">
              <Globe2 size={14} className="text-[#4F6F46]" />
              <span className="font-display">World State</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Save */}
            <button
              onClick={() => apiCall('save')}
              title="Save Checkpoint"
              className={`p-2 rounded-xl text-[#6B6258] hover:text-[#1F241F] transition-all duration-200 cursor-pointer hover:border-[#9A5B2F]/45 ${NEU_SM}`}
            >
              <Save size={15} />
            </button>
            {/* Load */}
            <button
              onClick={() => apiCall('load')}
              title="Load Checkpoint"
              className={`p-2 rounded-xl text-[#6B6258] hover:text-[#1F241F] transition-all duration-200 cursor-pointer hover:border-[#9A5B2F]/45 ${NEU_SM}`}
            >
              <FolderDown size={15} />
            </button>
            {/* Export */}
            <button
              onClick={exportTimelapse}
              title="Export Time-lapse"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[#6B6258] hover:text-[#1F241F] transition-all duration-200 text-[14px] cursor-pointer hover:border-[#9A5B2F]/45 ${NEU_SM}`}
            >
              <CloudDownload size={15} />
              <span className="font-medium">Export</span>
            </button>

            {/* Search */}
            <div className={`flex items-center gap-2 ${NEU_INSET} rounded-2xl px-3 py-2 w-56 focus-within:border-[#9A5B2F]/55 transition-all duration-200`}>
              <Search size={13} className="text-[#8B7C69] shrink-0" />
              <input
                type="text"
                placeholder="Search simulation…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-[15px] w-full text-[#1F241F] placeholder:text-[#8B7C69]"
              />
            </div>

            {/* GitHub */}
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="View on GitHub"
              className={`p-2 rounded-xl text-[#6B6258] hover:text-[#1F241F] transition-all duration-200 cursor-pointer hover:border-[#9A5B2F]/45 ${NEU_SM}`}
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
                  className={`flex-1 flex gap-4 px-5 py-4 rounded-2xl cursor-default relative overflow-hidden
                    transition-all duration-300 hover:border-[#9A5B2F]/35 hover:bg-[#FFFDF6] hover:shadow-[0_22px_58px_rgba(61,48,31,0.16)] ${NEU_RAISED}`}
                >
                  {/* Active gradient stripe */}
                  {isActive && (
                    <div className={`absolute top-0 left-5 right-5 h-[3px] rounded-full bg-gradient-to-r ${agent.gradient} opacity-80`} />
                  )}
                  {/* Greek letter badge */}
                  <div className={`w-14 rounded-2xl shrink-0 flex items-center justify-center self-stretch
                    bg-gradient-to-br ${agent.gradient}
                    shadow-[0_12px_28px_rgba(61,48,31,0.18),inset_0_1px_0_rgba(255,255,255,0.25)]`}>
                    <span className="text-white leading-none select-none"
                      style={{ fontSize: '34px', fontFamily: "'Georgia','Times New Roman',serif", fontWeight: 400 }}>
                      {GREEK_LETTERS[agent.name]}
                    </span>
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-display font-bold text-[#1F241F] text-[17px] leading-none truncate">{agent.name}</div>
                        <div className={`text-[13px] mt-1 font-medium truncate ${isActive ? agent.color : 'text-[#6B6258]'}`}>
                          {state.activity === 'Idle' ? agent.role : state.activity}
                        </div>
                      </div>
                      <div className={`shrink-0 px-2.5 py-1 rounded-full font-mono text-[11px] font-bold tracking-widest uppercase
                        ${isActive ? `bg-gradient-to-r ${agent.gradient} text-white shadow-[0_12px_28px_rgba(154,91,47,0.18)]` : `border border-[#D8CBB7] bg-[#F8F2E8] text-[#6B6258]`}`}>
                        {isActive ? (state.activity || 'ACTIVE').slice(0, 9).toUpperCase() : 'STANDBY'}
                      </div>
                    </div>
                    {/* Terminal readout */}
                    <div className="flex items-center gap-2 mt-2.5">
                      <code className="font-mono text-[12px] text-[#8B7C69] shrink-0">#{agentId}</code>
                      <span className="text-[#C8B89F]">·</span>
                      <span className="font-mono text-[12px] text-[#8B7C69]">{cycleCount} cycles</span>
                      {isActive && (
                        <>
                          <span className="text-[#C8B89F]">·</span>
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
              <div className={`h-full flex flex-col p-3 ${NEU_RAISED} rounded-2xl mr-2 overflow-hidden`}>
                {/* Logo */}
                <div className="flex items-center gap-2.5 px-2 mb-5 mt-1 shrink-0">
                  <div className={`w-7 h-7 rounded-xl bg-gradient-to-br from-[#9A5B2F] to-[#4F6F46] flex items-center justify-center shrink-0 ${NEU_SM}`}>
                    <Sparkles size={13} className="text-white" />
                  </div>
                  <span className="font-display font-bold text-[16px] text-[#1F241F] truncate">Genesis</span>
                </div>

                {/* Start / Stop CTA */}
                <button
                  onClick={() => {
                    if (!isRunning && authReady && !user) { setSignInPrompt(true); return; }
                    apiCall(isRunning ? 'stop' : 'start');
                  }}
                  className={`w-full py-2.5 rounded-2xl font-display font-semibold text-[15px] flex items-center justify-center gap-2 mb-6 shrink-0 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#9A5B2F]/35
                    ${isRunning
                      ? 'bg-gradient-to-r from-[#8A4B3B] to-[#C06F4E] text-white shadow-[0_14px_30px_rgba(138,75,59,0.22)] hover:shadow-[0_18px_38px_rgba(138,75,59,0.3)] hover:-translate-y-0.5'
                      : 'bg-gradient-to-r from-[#9A5B2F] to-[#4F6F46] text-white shadow-[0_14px_30px_rgba(79,111,70,0.2)] hover:shadow-[0_18px_38px_rgba(154,91,47,0.24)] hover:-translate-y-0.5'
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

                  <div className="mt-5 mb-2 px-3 text-[11px] font-display font-semibold text-[#8B7C69] uppercase tracking-[0.18em]">Governance</div>
                  <NavItem
                    icon={<ScrollText size={15} className="text-[#7A4E2D]" />}
                    label="Constitution"
                    badge={constitution.length.toString()}
                    active={activeTab === "Constitution"}
                    onClick={() => setActiveTab("Constitution")}
                  />

                  <div className="mt-5 mb-2 px-3 text-[11px] font-display font-semibold text-[#8B7C69] uppercase tracking-[0.18em]">World Domains</div>
                  <NavItem icon={<Building2 size={15} className="text-[#7A4E2D]" />} label="Infrastructure" badge={getObjectCount('box').toString()}      active={activeTab === "Infrastructure"} onClick={() => setActiveTab("Infrastructure")} />
                  <NavItem icon={<Landmark  size={15} className="text-[#5F5366]" />} label="Monuments"      badge={getObjectCount('sphere').toString()}    active={activeTab === "Monuments"}      onClick={() => setActiveTab("Monuments")} />
                  <NavItem icon={<Gem       size={15} className="text-[#A36A21]" />} label="Materials"      badge={resources.toString()}                   active={activeTab === "Resources"}      onClick={() => setActiveTab("Resources")} />
                  <NavItem icon={<TreePine  size={15} className="text-[#4F6F46]" />} label="Nature"         badge={getObjectCount('cylinder').toString()}  active={activeTab === "Nature"}         onClick={() => setActiveTab("Nature")} />
                  <NavItem icon={<Archive   size={15} className="text-[#8A4B3B]" />} label="Archives"       badge={history.length.toString()}              active={activeTab === "Archives"}       onClick={() => setActiveTab("Archives")} />
                </div>

                {/* Resources gauge */}
                <div className="mt-auto pt-4 shrink-0">
                  <div className="px-2 mb-4">
                    <div className="flex justify-between text-[13px] text-[#6B6258] mb-2">
                      <span className="font-medium">Materials</span>
                      <span className="tabular-nums">{resources} / 1000</span>
                    </div>
                    <div className={`h-1.5 ${NEU_INSET_SM} rounded-full overflow-hidden`}>
                      <div
                        className="h-full bg-gradient-to-r from-[#9A5B2F] to-[#4F6F46] rounded-full transition-all duration-500 shadow-[0_0_14px_rgba(154,91,47,0.22)]"
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
                            <div className="text-[15px] font-medium text-[#1F241F] truncate leading-tight">{user.displayName || 'Signed in'}</div>
                            <div className="text-[13px] text-[#8B7C69] truncate leading-tight">{user.email}</div>
                          </div>
                          <button
                            onClick={signOut}
                            title="Sign out"
                            className={`p-1.5 rounded-lg text-[#6B6258] hover:text-[#1F241F] transition-all duration-200 cursor-pointer hover:border-[#9A5B2F]/45 ${NEU_SM} shrink-0`}
                          >
                            <LogOut size={13} />
                          </button>
                        </>
                      ) : authLoading ? (
                        <div className="text-[14px] text-[#6B6258]">Loading...</div>
                      ) : (
                        <div className="space-y-2 w-full">
                          <button
                            onClick={signInWithGoogle}
                            className={`flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl text-[#1F241F] text-[14px] font-medium transition-all duration-200 cursor-pointer hover:border-[#9A5B2F]/45 ${NEU_SM}`}
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
                            className={`flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl text-[#1F241F] text-[14px] font-medium transition-all duration-200 cursor-pointer hover:border-[#9A5B2F]/45 ${NEU_SM}`}
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
                          <div className="text-[15px] font-medium text-[#1F241F] truncate leading-tight">The Creator</div>
                          <div className="text-[13px] text-[#8B7C69] truncate leading-tight">Sign in to begin</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Panel>

            <Separator className="shrink-0 bg-transparent hover:bg-[#9A5B2F]/10 data-[resize-handle-state=drag]:bg-[#9A5B2F]/20 transition-colors cursor-col-resize w-2 rounded-full" />

            {/* Center: Thinking + World */}
            <Panel id="center" defaultSize={66} minSize={45} maxSize={80} className="min-w-0 flex flex-col overflow-hidden">
                    <Group orientation="vertical" className="h-full min-h-0 flex-1 flex">

                      {/* Thinking panel */}
                      <Panel id="thinking" defaultSize={28} minSize={10} maxSize={55} className="min-h-0 flex flex-col overflow-hidden">
                        <div className="h-full overflow-hidden mb-1">
                          {thinkingLogs.length === 0 ? (
                            <div
                              className={`h-full flex items-center justify-center rounded-2xl relative overflow-hidden cursor-pointer ${NEU_RAISED}`}
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
                                  style={{ boxShadow: '0 0 80px rgba(154,91,47,0.12), inset 0 0 0 1px rgba(154,91,47,0.16)', opacity: 0.75 }}>
                                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#9A5B2F]/65" />
                                </motion.div>
                                <motion.div className="absolute w-48 h-48 rounded-full"
                                  animate={{ rotate: isRunning ? -360 : 0 }}
                                  transition={isRunning ? { duration: 20, repeat: Infinity, ease: "linear" } : { duration: 1.5 }}
                                  style={{ boxShadow: 'inset 0 0 0 1px rgba(79,111,70,0.22), 0 0 70px rgba(79,111,70,0.12)', opacity: 0.7 }} />
                                <motion.div className="absolute w-32 h-32 rounded-full"
                                  animate={{ rotate: isRunning ? 360 : 0 }}
                                  transition={isRunning ? { duration: 14, repeat: Infinity, ease: "linear" } : { duration: 1.5 }}
                                  style={{ boxShadow: 'inset 0 0 0 1px rgba(154,91,47,0.18), 0 0 48px rgba(154,91,47,0.12)', opacity: 0.75 }}>
                                  <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#D49A36]/75" />
                                </motion.div>
                                <div className="absolute w-16 h-16 rounded-full"
                                  style={{ boxShadow: 'inset 0 0 0 1px rgba(154,91,47,0.15), 0 0 36px rgba(79,111,70,0.12)', opacity: 0.75 }} />
                                <div className="absolute w-6 h-6 rounded-full"
                                  style={{ boxShadow: '0 0 28px rgba(154,91,47,0.22)', opacity: 0.9 }} />
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

                      <Separator className="shrink-0 bg-transparent hover:bg-[#9A5B2F]/10 data-[resize-handle-state=drag]:bg-[#9A5B2F]/20 transition-colors cursor-row-resize h-2 rounded-full" />

                      {/* World 3D */}
                      <Panel id="world" defaultSize={72} minSize={45} maxSize={90} className="min-h-0 flex flex-col overflow-hidden">
                        <div className={`h-full ${NEU_INSET_DEEP} rounded-2xl overflow-hidden flex flex-col mt-1`}>
                          <div className="px-4 py-3 flex justify-between items-center border-b border-[#3E352B] bg-[#181611]/88 backdrop-blur-sm shrink-0">
                            <h2 className="font-display font-semibold text-white/90 text-[17px] tracking-wide flex items-center gap-2.5">
                              <motion.span className="w-2.5 h-2.5 rounded-full bg-[#7A8F55] shadow-[0_0_16px_rgba(122,143,85,0.5)] inline-block shrink-0"
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

            <Separator className="shrink-0 bg-transparent hover:bg-[#9A5B2F]/10 data-[resize-handle-state=drag]:bg-[#9A5B2F]/20 transition-colors cursor-col-resize w-2 rounded-full" />

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
                  humanMessage={humanMessage}
                  setHumanMessage={setHumanMessage}
                  sendHumanMessage={sendHumanMessage}
                  sendingHuman={sendingHuman}
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
const S_RAISED   = "border border-[#D8CBB7] bg-[#FFFDF6]/88 shadow-[0_18px_52px_rgba(61,48,31,0.13)] backdrop-blur-xl";
const S_SM       = "border border-[#D8CBB7] bg-[#FFFDF6]/78 shadow-[0_10px_26px_rgba(61,48,31,0.1)]";
const S_INSET_SM = "border border-[#D8CBB7] bg-[#F8F2E8]/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]";

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
  getObjectCount,
  humanMessage,
  setHumanMessage,
  sendHumanMessage,
  sendingHuman
}: {
  activeTab: string;
  filteredHistory: HistoryEntry[];
  searchQuery: string;
  constitution: ConstitutionEntry[];
  archive: ArchiveEntry[];
  images: ImageEntry[];
  objectsByType: (type: string) => GenesisObject[];
  historyByAgent: Record<string, HistoryEntry[]>;
  resources: number;
  AGENTS: AgentDef[];
  feedEndRef: RefObject<HTMLDivElement | null>;
  getObjectCount: (type: string) => number;
  humanMessage?: string;
  setHumanMessage?: (v: string) => void;
  sendHumanMessage?: () => void;
  sendingHuman?: boolean;
}) {
  const getCount = getObjectCount;

  const renderHumanInput = () => (
    <div className="shrink-0 pt-3 mt-2 border-t border-[#D8CBB7]">
      <p className="text-[12px] text-[#6B6258] mb-2 font-medium">Message all agents</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={humanMessage ?? ''}
          onChange={(e) => setHumanMessage?.(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendHumanMessage?.()}
          placeholder="Ask a question, give instructions..."
          className={`flex-1 px-3 py-2.5 rounded-xl text-[14px] text-[#1F241F] ${S_INSET_SM} placeholder:text-[#8B7C69] focus:outline-none focus:ring-2 focus:ring-[#9A5B2F]/35`}
          disabled={sendingHuman}
        />
        <button
          onClick={() => sendHumanMessage?.()}
          disabled={!humanMessage?.trim() || sendingHuman}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-1.5 text-[14px] font-medium transition-all ${(humanMessage?.trim() && !sendingHuman) ? 'bg-gradient-to-r from-[#9A5B2F] to-[#4F6F46] text-white shadow-[0_14px_30px_rgba(79,111,70,0.18)] hover:opacity-95 cursor-pointer' : 'border border-[#D8CBB7] bg-[#F2EBDD] text-[#B4A58E] cursor-not-allowed'}`}
        >
          <Send size={14} />
          Send
        </button>
      </div>
    </div>
  );

  const renderActivityFeed = () => (
    <>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
        {filteredHistory.length === 0 ? (
          <div className="text-[15px] text-[#8B7C69] text-center mt-6 italic">
            {searchQuery ? 'No matches found.' : 'No activity yet.'}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {[...filteredHistory].reverse().map((entry, i) => {
              const isHuman = entry.agentName === 'Human';
              const agent = isHuman ? null : AGENTS.find((a: AgentDef) => a.name === entry.agentName) || AGENTS[0];
              return (
                <motion.div
                  key={`${entry.timestamp}-${i}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 items-start p-3 rounded-xl ${S_INSET_SM} transition-shadow duration-200 ${isHuman ? 'ring-1 ring-[#9A5B2F]/30' : ''}`}
                >
                  {isHuman ? (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-[#9A5B2F] to-[#4F6F46] shadow-[0_10px_24px_rgba(61,48,31,0.16),inset_0_1px_0_rgba(255,255,255,0.22)]">
                      <User size={12} className="text-white" />
                    </div>
                  ) : (
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br ${agent!.gradient} shadow-[0_10px_24px_rgba(61,48,31,0.16),inset_0_1px_0_rgba(255,255,255,0.22)]`}>
                      <span className="text-white text-[12px] font-display font-bold">{agent!.name[0]}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-[14px] leading-snug">
                      <span className="font-display font-semibold text-[#1F241F]">{entry.agentName}</span>{' '}
                      <span className="text-[#8B7C69]">{isHuman ? 'intervened' : 'stated'}</span>
                    </p>
                    <p className="text-[14px] text-[#3B342C] mt-0.5 break-words leading-relaxed">"{entry.message}"</p>
                    <span className="text-[12px] text-[#8B7C69] tabular-nums mt-1 block">
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
      {(activeTab === 'All Entities' || activeTab === 'Timeline') && renderHumanInput()}
    </>
  );

  const renderConstitution = () => (
    <div className="space-y-2.5 overflow-y-auto pr-1 max-h-[400px]">
      {constitution.length === 0 ? (
        <div className="text-[14px] text-[#8B7C69] text-center italic mt-4">No laws established yet.</div>
      ) : (
        constitution.map((c, i) => {
          const agent = AGENTS.find((a: AgentDef) => a.name === c.agentName) || AGENTS[0];
          return (
            <div key={c.id} className={`rounded-xl p-3.5 ${S_INSET_SM}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[12px] font-display font-bold text-[#1F241F] uppercase tracking-wider">
                  Article {i + 1}
                </span>
                <span className={`text-[12px] font-semibold ${agent.color}`}>by {c.agentName}</span>
              </div>
              <p className="text-[14px] text-[#6B6258] leading-relaxed">"{c.law}"</p>
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
          <div className="text-[14px] text-[#8B7C69] text-center italic mt-4">No {label.toLowerCase()} yet.</div>
        ) : (
          items.map((obj) => (
            <div key={obj.id} className={`rounded-xl p-3 ${S_INSET_SM} text-[14px]`}>
              <span className="text-[#7A4E2D] font-display font-semibold">{obj.type}</span>
              {obj.creator && <span className="text-[#8B7C69] ml-2">by {obj.creator}</span>}
              {obj.position && <span className="text-[#3B342C] block mt-1 tabular-nums text-[13px]">[{obj.position.join(', ')}]</span>}
            </div>
          ))
        )}
      </div>
    );
  };

  const panelClass = `rounded-2xl p-5 flex-1 flex flex-col min-h-0 ${S_RAISED}`;
  const headingClass = "font-display font-bold text-[#1F241F] text-[15px] mb-4 flex items-center gap-2";

  const content = (() => {
    switch (activeTab) {
      case 'All Entities':
        return (
          <div className={panelClass}>
            <h3 className={headingClass}>
              <span className="w-2 h-2 rounded-full bg-[#9A5B2F] shadow-[0_0_12px_rgba(154,91,47,0.28)] inline-block" />
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
              <span className="w-2 h-2 rounded-full bg-[#9A5B2F] shadow-[0_0_12px_rgba(154,91,47,0.28)] inline-block" />
              Constitution Ledger
              <span className={`ml-auto text-[13px] font-normal text-[#6B6258] tabular-nums px-2 py-0.5 rounded-lg ${S_INSET_SM}`}>
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
              <span className="w-2 h-2 rounded-full bg-[#4F6F46] shadow-[0_0_12px_rgba(79,111,70,0.28)] inline-block" />
              Timeline
            </h3>
            {renderActivityFeed()}
          </div>
        );
      case 'Factions':
        return (
          <div className={`${panelClass} overflow-y-auto`}>
            <h3 className={headingClass}>
              <span className="w-2 h-2 rounded-full bg-[#5F5366] shadow-[0_0_12px_rgba(95,83,102,0.24)] inline-block" />
              Activity by Faction
            </h3>
            <div className="space-y-3">
              {AGENTS.map((agent: AgentDef) => {
                const entries = historyByAgent[agent.name] || [];
                return (
                  <div key={agent.name} className={`rounded-xl p-3.5 ${S_INSET_SM}`}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${agent.gradient} flex items-center justify-center shadow-[inset_2px_2px_4px_rgba(0,0,0,0.12)]`}>
                        <span className="text-white text-[12px] font-display font-bold">{agent.name[0]}</span>
                      </div>
                      <span className="font-display font-semibold text-[#1F241F] text-[15px]">{agent.name}</span>
                      <span className={`ml-auto text-[12px] tabular-nums ${agent.color} font-medium`}>{entries.length}</span>
                    </div>
                    <div className="space-y-1.5 max-h-[100px] overflow-y-auto">
                      {entries.slice(-4).reverse().map((e, i) => (
                        <p key={i} className="text-[13px] text-[#6B6258] break-words leading-relaxed">"{e.message}"</p>
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
              <span className="w-2 h-2 rounded-full bg-[#8B7C69] inline-block" />
              The Void
            </h3>
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[15px] text-[#8B7C69] italic text-center">Nothing has been discarded to the void.</p>
            </div>
          </div>
        );
      case 'Infrastructure':
        return (
          <div className={panelClass}>
            <h3 className={headingClass}>
              <span className="w-2 h-2 rounded-full bg-[#7A4E2D] shadow-[0_0_12px_rgba(122,78,45,0.26)] inline-block" />
              Infrastructure
              <span className={`ml-auto text-[13px] font-normal text-[#6B6258] tabular-nums px-2 py-0.5 rounded-lg ${S_INSET_SM}`}>{getCount('box')} constructs</span>
            </h3>
            {renderObjectList('box', 'Infrastructure')}
          </div>
        );
      case 'Monuments':
        return (
          <div className={panelClass}>
            <h3 className={headingClass}>
              <span className="w-2 h-2 rounded-full bg-[#5F5366] shadow-[0_0_12px_rgba(95,83,102,0.24)] inline-block" />
              Monuments
              <span className={`ml-auto text-[13px] font-normal text-[#6B6258] tabular-nums px-2 py-0.5 rounded-lg ${S_INSET_SM}`}>{getCount('sphere')} constructs</span>
            </h3>
            {renderObjectList('sphere', 'Monuments')}
          </div>
        );
      case 'Nature':
        return (
          <div className={panelClass}>
            <h3 className={headingClass}>
              <span className="w-2 h-2 rounded-full bg-[#4F6F46] shadow-[0_0_12px_rgba(79,111,70,0.28)] inline-block" />
              Nature
              <span className={`ml-auto text-[13px] font-normal text-[#6B6258] tabular-nums px-2 py-0.5 rounded-lg ${S_INSET_SM}`}>{getCount('cylinder')} constructs</span>
            </h3>
            {renderObjectList('cylinder', 'Nature')}
          </div>
        );
      case 'Resources':
        return (
          <div className={panelClass}>
            <h3 className={headingClass}>
              <span className="w-2 h-2 rounded-full bg-[#A36A21] shadow-[0_0_12px_rgba(163,106,33,0.28)] inline-block" />
              Materials
            </h3>
            <div className="space-y-4">
              <div className={`rounded-xl p-4 ${S_INSET_SM}`}>
                <div className="flex justify-between text-[15px] mb-3">
                  <span className="text-[#6B6258] font-medium">Available</span>
                  <span className="font-display font-semibold text-[#1F241F] tabular-nums">{resources} / 1000</span>
                </div>
                <div className={`h-2 rounded-full overflow-hidden ${S_INSET_SM}`}>
                  <div
                    className="h-full bg-gradient-to-r from-[#9A5B2F] to-[#4F6F46] rounded-full transition-all duration-500 shadow-[0_0_14px_rgba(154,91,47,0.22)]"
                    style={{ width: `${(resources / 1000) * 100}%` }}
                  />
                </div>
              </div>
              <p className="text-[14px] text-[#6B6258]">1 material consumed per construct built.</p>
            </div>
          </div>
        );
      case 'Archives':
        return (
          <div className={panelClass}>
            <h3 className={headingClass}>
              <span className="w-2 h-2 rounded-full bg-[#8A4B3B] shadow-[0_0_12px_rgba(138,75,59,0.24)] inline-block" />
              Shared Archive
              <span className={`ml-auto text-[13px] font-normal text-[#6B6258] tabular-nums px-2 py-0.5 rounded-lg ${S_INSET_SM}`}>{archive.length} entries</span>
            </h3>
            <div className="space-y-1.5 overflow-y-auto pr-1 max-h-[300px]">
              {archive.length === 0 ? (
                <div className="text-[14px] text-[#8B7C69] italic">No archive entries yet.</div>
              ) : (
                archive.slice().reverse().map((a) => (
                  <div key={a.id} className={`rounded-xl px-3 py-2 ${S_INSET_SM} text-[13px]`}>
                    <span className="text-[#7A4E2D] font-display font-semibold">{a.key}:</span>{' '}
                    <span className="text-[#6B6258] break-words">{a.value}</span>
                  </div>
                ))
              )}
            </div>
            {images.length > 0 && (
              <>
                <h3 className={`${headingClass} mt-5`}>
                  <span className="w-2 h-2 rounded-full bg-[#A36A21] shadow-[0_0_12px_rgba(163,106,33,0.28)] inline-block" />
                  Visual Artifacts
                  <span className="text-[#6B6258] text-[13px] font-normal">({images.length})</span>
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                  {images.slice(-4).reverse().map((img) => (
                    <div key={img.id} className={`rounded-xl overflow-hidden ${S_SM}`}>
                      <img src={`data:image/png;base64,${img.imageBase64}`} alt={img.prompt} className="w-full h-16 object-cover" />
                      <p className="text-[12px] text-[#6B6258] px-2 py-1 break-words leading-tight" title={img.prompt}>{img.prompt}</p>
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
              <span className="w-2 h-2 rounded-full bg-[#9A5B2F] shadow-[0_0_12px_rgba(154,91,47,0.28)] inline-block" />
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
  icon: ReactNode;
  label: string;
  active?: boolean;
  badge?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all duration-200 select-none focus-within:ring-2 focus-within:ring-[#9A5B2F]/30
        ${active
          ? `border border-[#9A5B2F]/30 bg-[#9A5B2F]/10 text-[#1F241F] font-semibold shadow-[0_10px_24px_rgba(154,91,47,0.08)]`
          : `text-[#6B6258] hover:text-[#1F241F] hover:bg-[#F8F2E8]`
        }`}
    >
      <div className="flex items-center gap-2.5">
        {icon}
        <span className="text-[15px] font-medium">{label}</span>
      </div>
      {badge && (
        <span className={`text-[12px] tabular-nums font-medium px-1.5 py-0.5 rounded-lg min-w-[20px] text-center
          ${active ? 'text-[#7A4E2D] bg-[#9A5B2F]/12 border border-[#9A5B2F]/24' : 'text-[#8B7C69] bg-[#F2EBDD] border border-[#D8CBB7]'}`}>
          {badge}
        </span>
      )}
    </div>
  );
}

export default App;
