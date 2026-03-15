import { useEffect, useState, useRef } from 'react';
import { World3D } from './components/World3D';
import { 
  Play, Square, RotateCcw, Save, Download, 
  LayoutGrid, Star, Clock, Users, Trash, Folder,
  Search, Activity,
  Box, Eye, Zap, Database, Github, Globe, Map, BookOpen, DownloadCloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

const REPO_URL = 'https://github.com/Thabhelo/project-genesis';

const AGENTS = [
  { name: "Alpha", role: "The Architect", icon: Box, color: "text-[#818cf8]", bg: "bg-[#818cf8]/10", border: "border-[#818cf8]/20", gradient: "from-[#818cf8] to-[#6366f1]" },
  { name: "Beta", role: "The Diplomat", icon: Users, color: "text-[#c084fc]", bg: "bg-[#c084fc]/10", border: "border-[#c084fc]/20", gradient: "from-[#c084fc] to-[#a855f7]" },
  { name: "Gamma", role: "The Critique", icon: Zap, color: "text-[#f472b6]", bg: "bg-[#f472b6]/10", border: "border-[#f472b6]/20", gradient: "from-[#f472b6] to-[#d946ef]" },
  { name: "Delta", role: "The Merchant", icon: Database, color: "text-[#fbbf24]", bg: "bg-[#fbbf24]/10", border: "border-[#fbbf24]/20", gradient: "from-[#fbbf24] to-[#f59e0b]" },
  { name: "Epsilon", role: "The Philosopher", icon: Eye, color: "text-[#34d399]", bg: "bg-[#34d399]/10", border: "border-[#34d399]/20", gradient: "from-[#34d399] to-[#10b981]" }
];

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function App() {
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
    const eventSource = new EventSource(`${API_BASE}/api/stream`);

    eventSource.addEventListener('init', (e) => {
      const data = JSON.parse(e.data);
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
      const data = JSON.parse(e.data);
      setIsRunning(data.isRunning);
      if (!data.isRunning) setThinkingLogs([]);
    });

    eventSource.addEventListener('agentStatus', (e) => {
      const data = JSON.parse(e.data);
      setAgentStates(prev => ({
        ...prev,
        [data.agentName]: { activity: data.activity, details: data.details }
      }));
    });

    eventSource.addEventListener('thinkingLog', (e) => {
      const data = JSON.parse(e.data);
      setThinkingLogs(prev => [...prev, { id: data.id, agentName: data.agentName, message: data.message, elapsedMs: data.elapsedMs }]);
    });

    eventSource.addEventListener('tick', (e) => {
      const data = JSON.parse(e.data);
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

    return () => eventSource.close();
  }, []);

  const apiCall = async (endpoint: string) => {
    try {
      await fetch(`${API_BASE}/api/simulation/${endpoint}`, { method: 'POST' });
    } catch (e) {
      console.error(`Failed to call ${endpoint}`, e);
    }
  };

  const exportTimelapse = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/export/timelapse`);
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

  return (
    <div className="flex h-screen w-screen bg-[#09090b] text-[#f4f4f5] font-sans overflow-hidden text-[13px]">
      
      {/* LEFT SIDEBAR */}
      <div className="w-[240px] bg-[#09090b] border-r border-[#27272a] flex flex-col p-3 z-20 shrink-0">
        
        <div className="flex items-center gap-2 px-2 mb-4 mt-1">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-[#818cf8] to-[#c084fc] flex items-center justify-center">
            <Globe size={12} className="text-white" />
          </div>
          <span className="font-medium text-[14px] text-white">Project Genesis</span>
        </div>

        <button 
          onClick={() => apiCall(isRunning ? 'stop' : 'start')}
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
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Creator" alt="Creator" className="w-7 h-7 rounded-full bg-[#27272a]" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-[#f4f4f5] truncate leading-tight">The Creator</div>
              <div className="text-[11px] text-[#71717a] truncate leading-tight">admin@genesis.ai</div>
            </div>
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
          
          <div className="flex-1 flex flex-col gap-6 min-w-0">
            <div className="grid grid-cols-5 gap-4">
              {AGENTS.map(agent => {
                const state = agentStates[agent.name] || { activity: 'Idle', details: 'Awaiting turn' };
                const isThinking = state.activity === 'observing' || state.activity === 'thinking';
                
                return (
                  <div key={agent.name} className="bg-[#09090b] border border-[#27272a] rounded-xl p-4 flex flex-col relative group hover:bg-[#18181b] transition-colors">
                    <div className="flex items-start justify-between mb-6">
                      <div className={`w-10 h-10 rounded-xl bg-[#18181b] border border-[#27272a] flex items-center justify-center ${agent.color}`}>
                        {isThinking ? <Activity size={18} className="animate-pulse" /> : <agent.icon size={18} />}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-[#f4f4f5] text-[14px] mb-1">{agent.name}</h3>
                      <div className="flex justify-between items-center text-[12px] text-[#71717a]">
                        <span className="truncate pr-2">{state.activity === 'Idle' ? agent.role : state.activity}</span>
                        <span>{isThinking ? '...' : ''}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex-1 bg-[#09090b] border border-[#27272a] rounded-xl overflow-hidden relative flex flex-col min-h-[400px]">
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

          {/* RIGHT SIDEBAR */}
          <div className="w-[300px] flex flex-col gap-6 shrink-0">
            
            {/* Agent Thinking Logs - HextaUI-style */}
            <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5 flex-1 flex flex-col min-h-0">
              <div className="flex justify-between items-center mb-4 shrink-0">
                <h3 className="font-medium text-[#f4f4f5] text-[14px]">Agent Thinking</h3>
                {isRunning && thinkingLogs.length > 0 && (
                  <span className="text-[11px] text-[#71717a]">
                    {thinkingLogs[thinkingLogs.length - 1]?.elapsedMs 
                      ? `${(thinkingLogs[thinkingLogs.length - 1].elapsedMs / 1000).toFixed(1)}s` 
                      : ''}
                  </span>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar min-h-[180px]">
                {!isRunning && thinkingLogs.length === 0 ? (
                  <div className="text-[12px] text-[#71717a] italic">Simulation paused. Start to see agent thinking.</div>
                ) : thinkingLogs.length === 0 ? (
                  <div className="flex items-center gap-2 text-[#71717a]">
                    <div className="w-2 h-2 rounded-full bg-[#818cf8] animate-pulse" />
                    <span className="text-[12px]">Waiting for next agent...</span>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {thinkingLogs.map((log) => {
                      const agent = AGENTS.find(a => a.name === log.agentName) || AGENTS[0];
                      return (
                        <motion.div
                          key={log.id ?? `${log.agentName}-${log.message}-${log.elapsedMs}`}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex gap-2 items-start"
                        >
                          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-gradient-to-br ${agent.gradient}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] text-[#a1a1aa] leading-relaxed">{log.message}</p>
                            {log.elapsedMs > 0 && (
                              <span className="text-[10px] text-[#71717a]">{((log.elapsedMs || 0) / 1000).toFixed(1)}s</span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
                <div ref={thinkingEndRef} />
              </div>
            </div>

            {archive.length > 0 && (
              <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-[#f4f4f5] text-[14px]">Shared Archive</h3>
                  <span className="text-[12px] text-[#71717a]">{archive.length} entries</span>
                </div>
                <div className="space-y-2 max-h-[100px] overflow-y-auto custom-scrollbar pr-2">
                  {archive.slice(-5).reverse().map((a: any) => (
                    <div key={a.id} className="bg-[#18181b] rounded px-2 py-1.5 text-[11px]">
                      <span className="text-[#818cf8] font-medium">{a.key}:</span>{' '}
                      <span className="text-[#a1a1aa] truncate block">{a.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {images.length > 0 && (
              <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-[#f4f4f5] text-[14px]">Visual Artifacts</h3>
                  <span className="text-[12px] text-[#71717a]">{images.length}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto custom-scrollbar">
                  {images.slice(-4).reverse().map((img: any) => (
                    <div key={img.id} className="rounded overflow-hidden border border-[#27272a] bg-[#18181b]">
                      <img 
                        src={`data:image/png;base64,${img.imageBase64}`} 
                        alt={img.prompt} 
                        className="w-full h-16 object-cover"
                      />
                      <p className="text-[10px] text-[#71717a] px-1 py-0.5 truncate" title={img.prompt}>{img.prompt}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-[#f4f4f5] text-[14px]">Constitution Ledger</h3>
                <span className="text-[12px] text-[#71717a]">{constitution.length} Articles</span>
              </div>
              <div className="space-y-3 max-h-[160px] overflow-y-auto custom-scrollbar pr-2">
                {constitution.length === 0 ? (
                  <div className="text-[12px] text-[#71717a] text-center italic mt-2">No laws established yet.</div>
                ) : (
                  constitution.map((c, i) => {
                    const agent = AGENTS.find(a => a.name === c.agentName) || AGENTS[0];
                    return (
                      <div key={c.id} className="bg-[#18181b] rounded-md p-3 border border-[#27272a]">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[10px] font-bold text-[#f4f4f5] uppercase tracking-wider">Article {i + 1}</span>
                          <span className={`text-[10px] font-medium ${agent.color}`}>by {c.agentName}</span>
                        </div>
                        <p className="text-[12px] text-[#a1a1aa] leading-relaxed">"{c.law}"</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-[#f4f4f5] text-[14px]">Citizens</h3>
                <span className="text-[12px] text-[#71717a]">5 active</span>
              </div>
              <div className="flex items-center">
                {AGENTS.map((agent) => (
                  <div 
                    key={agent.name}
                    className={`w-8 h-8 rounded-full border-2 border-[#09090b] flex items-center justify-center bg-gradient-to-br ${agent.gradient} -ml-2 first:ml-0`}
                    title={agent.name}
                  >
                    <span className="text-white text-[10px] font-medium">{agent.name[0]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5 flex-1 flex flex-col min-h-0">
              <div className="flex justify-between items-center mb-5 shrink-0">
                <h3 className="font-medium text-[#f4f4f5] text-[14px]">Recent Activity</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                {filteredHistory.length === 0 ? (
                  <div className="text-[13px] text-[#71717a] text-center mt-4">
                    {searchQuery ? 'No matches.' : 'No activity recorded.'}
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {[...filteredHistory].reverse().map((entry: any, i: number) => {
                      const agent = AGENTS.find(a => a.name === entry.agentName) || AGENTS[0];
                      return (
                        <motion.div 
                          key={i} 
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex gap-3 items-start"
                        >
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br ${agent.gradient}`}>
                            <span className="text-white text-[10px] font-medium">{agent.name[0]}</span>
                          </div>
                          
                          <div className="flex-1 min-w-0 pt-0.5">
                            <p className="text-[13px] leading-snug">
                              <span className="font-medium text-[#f4f4f5]">{entry.agentName}</span>{' '}
                              <span className="text-[#71717a]">stated</span>{' '}
                              <span className="text-[#f4f4f5] block mt-0.5 truncate">"{entry.message}"</span>
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
            </div>

          </div>
        </div>
      </div>
    </div>
  );
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
