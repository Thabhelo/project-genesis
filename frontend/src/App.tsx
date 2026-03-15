import { useEffect, useState, useRef } from 'react';
import { World3D } from './components/World3D';
import AIThinking from './components/AIThinking';
import { ThinkingBar } from './components/prompt-kit/thinking-bar';
import { 
  Play, Square, RotateCcw, Save, Download, 
  LayoutGrid, Star, Clock, Users, Trash, Folder,
  Search, LogOut,
  Box, Database, Github, Globe, Map, BookOpen, DownloadCloud
} from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

const REPO_URL = 'https://github.com/Thabhelo/project-genesis';

const GREEK_LETTERS: Record<string, string> = { Alpha: "α", Beta: "β", Gamma: "γ", Delta: "δ", Epsilon: "ε" };

const AGENTS = [
  { name: "Alpha", role: "The Architect", color: "text-[#818cf8]", bg: "bg-[#818cf8]/10", border: "border-[#818cf8]/20", gradient: "from-[#818cf8] to-[#6366f1]" },
  { name: "Beta", role: "The Diplomat", color: "text-[#c084fc]", bg: "bg-[#c084fc]/10", border: "border-[#c084fc]/20", gradient: "from-[#c084fc] to-[#a855f7]" },
  { name: "Gamma", role: "The Critique", color: "text-[#f472b6]", bg: "bg-[#f472b6]/10", border: "border-[#f472b6]/20", gradient: "from-[#f472b6] to-[#d946ef]" },
  { name: "Delta", role: "The Merchant", color: "text-[#fbbf24]", bg: "bg-[#fbbf24]/10", border: "border-[#fbbf24]/20", gradient: "from-[#fbbf24] to-[#f59e0b]" },
  { name: "Epsilon", role: "The Philosopher", color: "text-[#34d399]", bg: "bg-[#34d399]/10", border: "border-[#34d399]/20", gradient: "from-[#34d399] to-[#10b981]" }
];

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
  
  const feedEndRef = useRef<HTMLDivElement>(null);
  const thinkingEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  useEffect(() => {
    thinkingEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thinkingLogs]);

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
        setAgentStates(prev => ({
          ...prev,
          [data.agentName]: { activity: data.activity, details: data.details }
        }));
      });

      eventSource.addEventListener('thinkingLog', (e) => {
        const data = JSON.parse((e as MessageEvent).data);
        setThinkingLogs(prev => [...prev, { id: data.id, agentName: data.agentName, message: data.message, elapsedMs: data.elapsedMs }]);
      });

      eventSource.addEventListener('tick', (e) => {
        const data = JSON.parse((e as MessageEvent).data);
        if (data.historyEntry) setHistory(prev => [...prev, data.historyEntry]);
        if (data.newObject) setObjects(prev => [...prev, data.newObject]);
        if (data.newLaw) setConstitution(prev => [...prev, data.newLaw]);
        if (data.archiveEntry) setArchive(prev => [...prev, data.archiveEntry]);
        if (data.newImage) setImages(prev => [...prev, data.newImage]);
        if (typeof data.resources === 'number') setResources(data.resources);
        if (data.audioBase64) {
          try {
            const audio = new Audio(`data:audio/mpeg;base64,${data.audioBase64}`);
            audio.play().catch(() => {});
          } catch (_) {}
        }
      });
    });

    return () => {
      eventSource?.close();
    };
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
      const res = await fetch(`${API_BASE}/api/export/timelapse`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
    <div className="flex h-screen w-screen bg-[#09090b] text-[#f4f4f5] font-sans overflow-hidden text-[13px]">
      
      {/* Sign-in required modal */}
      {signInPrompt && authReady && !user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setSignInPrompt(false)}>
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-6 max-w-sm mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-medium text-[#f4f4f5] text-[16px] mb-2">Sign in required</h3>
            <p className="text-[#a1a1aa] text-[13px] mb-4">Please sign in with Google or GitHub before starting the simulation. This ensures accountability and prevents unattended runs.</p>
            <div className="flex gap-2">
              <button onClick={signInWithGoogle} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-[#18181b] border border-[#27272a] hover:bg-[#27272a] text-[#f4f4f5] text-[12px] transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Sign in with Google
              </button>
              <button onClick={signInWithGitHub} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-[#18181b] border border-[#27272a] hover:bg-[#27272a] text-[#f4f4f5] text-[12px] transition-colors">
                <Github size={14} />
                Sign in with GitHub
              </button>
            </div>
            <button onClick={() => setSignInPrompt(false)} className="w-full mt-3 py-1.5 text-[12px] text-[#71717a] hover:text-[#f4f4f5] transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* LEFT SIDEBAR */}
      <div className="w-[240px] bg-[#09090b] border-r border-[#27272a] flex flex-col p-3 z-20 shrink-0">
        
        <div className="flex items-center gap-2 px-2 mb-4 mt-1">
          <img src="/logo.svg" alt="" className="w-6 h-6" />
          <span className="font-medium text-[14px] text-white">Project Genesis</span>
        </div>

        <button 
          onClick={() => {
            if (!isRunning && authReady && !user) {
              setSignInPrompt(true);
              return;
            }
            apiCall(isRunning ? 'stop' : 'start');
          }}
          className="w-full bg-[#f4f4f5] text-[#09090b] hover:bg-[#e4e4e7] transition-colors py-1.5 rounded-md font-medium text-[13px] flex items-center justify-center gap-2 mb-6"
        >
          {isRunning ? <Square size={14} className="fill-current" /> : <Play size={14} className="fill-current" />}
          {isRunning ? 'Halt Simulation' : 'Start Simulation'}
        </button>

        <div className="space-y-0.5 flex-1 overflow-y-auto">
          <NavItem icon={<LayoutGrid size={16}/>} label="All Entities" active={activeTab === "All Entities"} onClick={() => setActiveTab("All Entities")} />
          <NavItem icon={<Star size={16}/>} label="Milestones" active={activeTab === "Milestones"} onClick={() => setActiveTab("Milestones")} />
          <NavItem icon={<Clock size={16}/>} label="Timeline" active={activeTab === "Timeline"} onClick={() => setActiveTab("Timeline")} />
          <NavItem icon={<Users size={16}/>} label="Factions" active={activeTab === "Factions"} onClick={() => setActiveTab("Factions")} />
          <NavItem icon={<Trash size={16}/>} label="The Void" active={activeTab === "The Void"} onClick={() => setActiveTab("The Void")} />

          <div className="mt-6 mb-2 px-3 text-[11px] font-medium text-[#71717a] uppercase tracking-wider">
            Governance
          </div>
          <NavItem icon={<BookOpen size={16} className="text-[#f4f4f5]" />} label="Constitution" badge={constitution.length.toString()} active={activeTab === "Constitution"} onClick={() => setActiveTab("Constitution")} />

          <div className="mt-6 mb-2 px-3 text-[11px] font-medium text-[#71717a] uppercase tracking-wider">
            World Domains
          </div>
          <NavItem icon={<Box size={16} className="text-[#818cf8]" />} label="Infrastructure" badge={getObjectCount('box').toString()} active={activeTab === "Infrastructure"} onClick={() => setActiveTab("Infrastructure")} />
          <NavItem icon={<Map size={16} className="text-[#c084fc]" />} label="Monuments" badge={getObjectCount('sphere').toString()} active={activeTab === "Monuments"} onClick={() => setActiveTab("Monuments")} />
          <NavItem icon={<Database size={16} className="text-[#fbbf24]" />} label="Materials" badge={resources.toString()} active={activeTab === "Resources"} onClick={() => setActiveTab("Resources")} />
          <NavItem icon={<Folder size={16} className="text-[#34d399]" />} label="Nature" badge={getObjectCount('cylinder').toString()} active={activeTab === "Nature"} onClick={() => setActiveTab("Nature")} />
          <NavItem icon={<Folder size={16} className="text-[#f472b6]" />} label="Archives" badge={history.length.toString()} active={activeTab === "Archives"} onClick={() => setActiveTab("Archives")} />
        </div>

        <div className="mt-auto pt-4">
          <div className="px-3 mb-4">
            <div className="flex justify-between text-[12px] text-[#a1a1aa] mb-2">
              <span>Materials</span>
              <span>{resources} / 1000</span>
            </div>
            <div className="h-1 bg-[#27272a] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#f4f4f5] rounded-full transition-all duration-500" 
                style={{ width: `${Math.min((resources / 1000) * 100, 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="flex items-center gap-3 px-2 py-2 rounded-md mt-2">
            {authReady ? (
              user ? (
                <>
                  <img src={user.photoURL || undefined} alt="" className="w-7 h-7 rounded-full bg-[#27272a] object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-[#f4f4f5] truncate leading-tight">{user.displayName || 'Signed in'}</div>
                    <div className="text-[11px] text-[#71717a] truncate leading-tight">{user.email}</div>
                  </div>
                  <button onClick={signOut} className="p-1.5 rounded-md hover:bg-[#27272a] text-[#71717a] hover:text-[#f4f4f5] transition-colors" title="Sign out">
                    <LogOut size={14} />
                  </button>
                </>
              ) : authLoading ? (
                <div className="text-[12px] text-[#71717a]">Loading...</div>
              ) : (
                <div className="space-y-2">
                  <button onClick={signInWithGoogle} className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-md bg-[#18181b] border border-[#27272a] hover:bg-[#27272a] text-[#f4f4f5] text-[12px] transition-colors">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Sign in with Google
                  </button>
                  <button onClick={signInWithGitHub} className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-md bg-[#18181b] border border-[#27272a] hover:bg-[#27272a] text-[#f4f4f5] text-[12px] transition-colors">
                    <Github size={14} />
                    Sign in with GitHub
                  </button>
                </div>
              )
            ) : (
              <>
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Creator" alt="Creator" className="w-7 h-7 rounded-full bg-[#27272a]" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-[#f4f4f5] truncate leading-tight">The Creator</div>
                  <div className="text-[11px] text-[#71717a] truncate leading-tight">Sign in to personalize</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#09090b]">
        
        <header className="h-14 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4 text-[#a1a1aa]">
            <button onClick={() => apiCall('reset')} className="p-2 rounded-md hover:bg-[#18181b] hover:text-[#f4f4f5] transition-colors" title="Reset World">
              <RotateCcw size={16} />
            </button>
            <div className="flex items-center gap-2 text-[13px] text-[#f4f4f5]">
              <Globe size={14} className="text-[#71717a]" />
              <span>World State</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => apiCall('save')} className="p-2 rounded-md hover:bg-[#18181b] text-[#71717a] hover:text-[#f4f4f5] transition-colors" title="Save Checkpoint">
              <Save size={16} />
            </button>
            <button onClick={() => apiCall('load')} className="p-2 rounded-md hover:bg-[#18181b] text-[#71717a] hover:text-[#f4f4f5] transition-colors" title="Load Checkpoint">
              <Download size={16} />
            </button>
            <button onClick={exportTimelapse} className="p-2 rounded-md hover:bg-[#18181b] text-[#71717a] hover:text-[#f4f4f5] transition-colors flex items-center gap-2" title="Export Time-lapse">
              <DownloadCloud size={16} />
              <span className="text-[12px]">Export</span>
            </button>
            
            <div className="flex items-center gap-2 bg-[#18181b] border border-[#27272a] rounded-md px-3 py-1.5 w-64">
              <Search size={14} className="text-[#71717a]" />
              <input 
                type="text" 
                placeholder="Search simulation..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-[13px] w-full text-[#f4f4f5] placeholder:text-[#71717a]" 
              />
            </div>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="p-2 rounded-md hover:bg-[#18181b] text-[#71717a] hover:text-[#f4f4f5] transition-colors" title="View on GitHub">
              <Github size={16} />
            </a>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 pb-6 flex gap-6">
          
          <div className="flex-1 flex gap-6 min-w-0">
            {/* Left: Agent cards - vertical stack */}
            <div className="w-[220px] flex flex-col gap-3 shrink-0">
              {AGENTS.map(agent => {
                const state = agentStates[agent.name] || { activity: 'Idle', details: 'Awaiting turn' };
                const isThinking = state.activity === 'observing' || state.activity === 'thinking';
                return (
                  <div key={agent.name} className="bg-[#09090b] border border-[#27272a] rounded-xl p-5 flex flex-col min-h-[140px] relative group hover:bg-[#18181b] transition-colors">
                    <div className="flex flex-col items-center text-center gap-3">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${agent.gradient}`}>
                        <span className="text-white text-2xl font-medium">{GREEK_LETTERS[agent.name] ?? agent.name[0]}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#f4f4f5] text-[16px]">{agent.name}</h3>
                        <p className="text-[14px] text-[#a1a1aa] mt-1">{state.activity === 'Idle' ? agent.role : state.activity}</p>
                        {isThinking && <span className="text-[#818cf8] text-[11px]">...</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Center: Agent thinking process - main focus */}
            <div className="flex-1 flex flex-col gap-6 min-w-0">
              {thinkingLogs.length === 0 ? (
                <div className="flex-1 min-h-[360px] flex items-center justify-center rounded-xl border border-[#27272a] bg-[#09090b]">
                  <ThinkingBar
                    text={isRunning ? 'Waiting for next agent...' : 'Simulation paused. Start to see agent thinking.'}
                  />
                </div>
              ) : (
                <div className="flex-1 min-h-[360px] flex flex-col">
                  <AIThinking
                    key={isRunning ? 'running' : 'paused'}
                    spinner={isRunning}
                    message={thinkingLogs.map((log) => `[${log.agentName}] ${log.message}`).join('\n\n')}
                    agentName={thinkingLogs[thinkingLogs.length - 1]?.agentName}
                  />
                  <div ref={thinkingEndRef} />
                </div>
              )}

              {/* 3D World below thinking */}
              <div className="flex-1 bg-[#09090b] border border-[#27272a] rounded-xl overflow-hidden relative flex flex-col min-h-[320px]">
                <div className="p-4 border-b border-[#27272a] flex justify-between items-center bg-[#09090b] z-10">
                  <h2 className="font-medium text-[#f4f4f5] text-[14px]">Live World Render</h2>
                  <div className="flex items-center gap-4 text-[12px] text-[#71717a]">
                    <span>Constructs: {objects.length}</span>
                    <span>Materials: {resources}</span>
                  </div>
                </div>
                <div className="flex-1 relative">
                  <World3D objects={objects} />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="w-[300px] flex flex-col gap-6 shrink-0">
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
        </div>
      </div>
    </div>
  );
}

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
    <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
      {filteredHistory.length === 0 ? (
        <div className="text-[13px] text-[#71717a] text-center mt-4">
          {searchQuery ? 'No matches.' : 'No activity recorded.'}
        </div>
      ) : (
        <AnimatePresence initial={false}>
          {[...filteredHistory].reverse().map((entry: any, i: number) => {
            const agent = AGENTS.find((a: AgentDef) => a.name === entry.agentName) || AGENTS[0];
            return (
              <motion.div key={entry.timestamp ?? i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 items-start">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br ${agent.gradient}`}>
                  <span className="text-white text-[10px] font-medium">{agent.name[0]}</span>
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-[13px] leading-snug">
                    <span className="font-medium text-[#f4f4f5]">{entry.agentName}</span>{' '}
                    <span className="text-[#71717a]">stated</span>{' '}
                    <span className="text-[#f4f4f5] block mt-0.5 truncate">&quot;{entry.message}&quot;</span>
                  </p>
                  <span className="text-[11px] text-[#71717a] block mt-1">
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
    <div className="space-y-3 overflow-y-auto custom-scrollbar pr-2 max-h-[400px]">
      {constitution.length === 0 ? (
        <div className="text-[12px] text-[#71717a] text-center italic mt-2">No laws established yet.</div>
      ) : (
        constitution.map((c, i) => {
          const agent = AGENTS.find((a: AgentDef) => a.name === c.agentName) || AGENTS[0];
          return (
            <div key={c.id} className="bg-[#18181b] rounded-md p-3 border border-[#27272a]">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] font-bold text-[#f4f4f5] uppercase tracking-wider">Article {i + 1}</span>
                <span className={`text-[10px] font-medium ${agent.color}`}>by {c.agentName}</span>
              </div>
              <p className="text-[12px] text-[#a1a1aa] leading-relaxed">&quot;{c.law}&quot;</p>
            </div>
          );
        })
      )}
    </div>
  );

  const renderObjectList = (type: string, label: string) => {
    const items = objectsByType(type);
    return (
      <div className="space-y-2 overflow-y-auto custom-scrollbar pr-2 max-h-[400px]">
        {items.length === 0 ? (
          <div className="text-[12px] text-[#71717a] text-center italic mt-2">No {label.toLowerCase()} yet.</div>
        ) : (
          items.map((obj: any) => (
            <div key={obj.id} className="bg-[#18181b] rounded-md p-3 border border-[#27272a] text-[12px]">
              <span className="text-[#818cf8] font-medium">{obj.type}</span>
              {obj.creator && <span className="text-[#71717a] ml-2">by {obj.creator}</span>}
              {obj.position && <span className="text-[#a1a1aa] block mt-1">[{obj.position.join(', ')}]</span>}
            </div>
          ))
        )}
      </div>
    );
  };

  const content = (() => {
    switch (activeTab) {
      case 'All Entities':
        return (
          <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5 flex-1 flex flex-col min-h-0">
            <h3 className="font-medium text-[#f4f4f5] text-[14px] mb-4">Recent Activity</h3>
            {renderActivityFeed()}
          </div>
        );
      case 'Milestones':
      case 'Constitution':
        return (
          <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5 flex-1 flex flex-col min-h-0">
            <h3 className="font-medium text-[#f4f4f5] text-[14px] mb-4">Constitution Ledger ({constitution.length} Articles)</h3>
            {renderConstitution()}
          </div>
        );
      case 'Timeline':
        return (
          <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5 flex-1 flex flex-col min-h-0">
            <h3 className="font-medium text-[#f4f4f5] text-[14px] mb-4">Timeline (chronological)</h3>
            {renderActivityFeed()}
          </div>
        );
      case 'Factions':
        return (
          <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5 flex-1 flex flex-col min-h-0 overflow-y-auto">
            <h3 className="font-medium text-[#f4f4f5] text-[14px] mb-4">Activity by Faction</h3>
            <div className="space-y-4">
              {AGENTS.map((agent: AgentDef) => {
                const entries = historyByAgent[agent.name] || [];
                return (
                  <div key={agent.name} className="border border-[#27272a] rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${agent.gradient} flex items-center justify-center`}>
                        <span className="text-white text-[10px] font-medium">{agent.name[0]}</span>
                      </div>
                      <span className="font-medium text-[#f4f4f5]">{agent.name}</span>
                      <span className="text-[11px] text-[#71717a]">({entries.length} entries)</span>
                    </div>
                    <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                      {entries.slice(-5).reverse().map((e: any, i: number) => (
                        <p key={i} className="text-[11px] text-[#a1a1aa] truncate">&quot;{e.message}&quot;</p>
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
          <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5 flex-1 flex flex-col min-h-0">
            <h3 className="font-medium text-[#f4f4f5] text-[14px] mb-4">The Void</h3>
            <div className="text-[12px] text-[#71717a] italic text-center mt-8">Nothing has been discarded to the void.</div>
          </div>
        );
      case 'Infrastructure':
        return (
          <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5 flex-1 flex flex-col min-h-0">
            <h3 className="font-medium text-[#f4f4f5] text-[14px] mb-4">Infrastructure ({getCount('box')} constructs)</h3>
            {renderObjectList('box', 'Infrastructure')}
          </div>
        );
      case 'Monuments':
        return (
          <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5 flex-1 flex flex-col min-h-0">
            <h3 className="font-medium text-[#f4f4f5] text-[14px] mb-4">Monuments ({getCount('sphere')} constructs)</h3>
            {renderObjectList('sphere', 'Monuments')}
          </div>
        );
      case 'Nature':
        return (
          <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5 flex-1 flex flex-col min-h-0">
            <h3 className="font-medium text-[#f4f4f5] text-[14px] mb-4">Nature ({getCount('cylinder')} constructs)</h3>
            {renderObjectList('cylinder', 'Nature')}
          </div>
        );
      case 'Resources':
        return (
          <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5 flex-1 flex flex-col min-h-0">
            <h3 className="font-medium text-[#f4f4f5] text-[14px] mb-4">Materials</h3>
            <div className="space-y-4">
              <div className="bg-[#18181b] rounded-lg p-4 border border-[#27272a]">
                <div className="flex justify-between text-[14px] mb-2">
                  <span className="text-[#a1a1aa]">Available</span>
                  <span className="font-medium text-[#f4f4f5]">{resources} / 1000</span>
                </div>
                <div className="h-2 bg-[#27272a] rounded-full overflow-hidden">
                  <div className="h-full bg-[#f4f4f5] rounded-full transition-all" style={{ width: `${(resources / 1000) * 100}%` }} />
                </div>
              </div>
              <p className="text-[12px] text-[#71717a]">1 material consumed per construct built.</p>
            </div>
          </div>
        );
      case 'Archives':
        return (
          <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5 flex-1 flex flex-col min-h-0">
            <h3 className="font-medium text-[#f4f4f5] text-[14px] mb-4">Shared Archive ({archive.length} entries)</h3>
            <div className="space-y-2 overflow-y-auto custom-scrollbar pr-2 max-h-[400px]">
              {archive.length === 0 ? (
                <div className="text-[12px] text-[#71717a] italic">No archive entries yet.</div>
              ) : (
                archive.slice().reverse().map((a: any) => (
                  <div key={a.id} className="bg-[#18181b] rounded px-2 py-1.5 text-[11px]">
                    <span className="text-[#818cf8] font-medium">{a.key}:</span>{' '}
                    <span className="text-[#a1a1aa] truncate block">{a.value}</span>
                  </div>
                ))
              )}
            </div>
            {images.length > 0 && (
              <>
                <h3 className="font-medium text-[#f4f4f5] text-[14px] mt-6 mb-2">Visual Artifacts ({images.length})</h3>
                <div className="grid grid-cols-2 gap-2">
                  {images.slice(-4).reverse().map((img: any) => (
                    <div key={img.id} className="rounded overflow-hidden border border-[#27272a] bg-[#18181b]">
                      <img src={`data:image/png;base64,${img.imageBase64}`} alt={img.prompt} className="w-full h-16 object-cover" />
                      <p className="text-[10px] text-[#71717a] px-1 py-0.5 truncate" title={img.prompt}>{img.prompt}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      default:
        return (
          <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5 flex-1 flex flex-col min-h-0">
            <h3 className="font-medium text-[#f4f4f5] text-[14px] mb-4">Recent Activity</h3>
            {renderActivityFeed()}
          </div>
        );
    }
  })();

  return content;
}

function NavItem({ icon, label, active, badge, onClick }: { icon: React.ReactNode, label: string, active?: boolean, badge?: string, onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center justify-between px-3 py-1.5 rounded-md cursor-pointer transition-colors ${
      active ? 'bg-[#18181b] text-[#f4f4f5] font-medium shadow-sm' : 'text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#18181b]'
    }`}>
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-[13px]">{label}</span>
      </div>
      {badge && (
        <span className="text-[11px] text-[#71717a]">
          {badge}
        </span>
      )}
    </div>
  );
}

export default App;
