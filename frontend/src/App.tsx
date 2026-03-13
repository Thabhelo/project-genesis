import { useEffect, useState, useRef } from 'react';
import { World3D } from './components/World3D';
import { 
  Play, Square, RotateCcw, Save, Download, 
  LayoutGrid, Star, Clock, Users, Trash, Folder,
  Search, Bell, Plus, MoreHorizontal, Activity,
  Box, Eye, Zap, Database, Github, Globe, Map
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

const AGENTS = [
  { name: "Alpha", role: "The Architect", icon: Box, color: "text-[#818cf8]", bg: "bg-[#818cf8]/10", border: "border-[#818cf8]/20", gradient: "from-[#818cf8] to-[#6366f1]" },
  { name: "Beta", role: "The Diplomat", icon: Users, color: "text-[#c084fc]", bg: "bg-[#c084fc]/10", border: "border-[#c084fc]/20", gradient: "from-[#c084fc] to-[#a855f7]" },
  { name: "Gamma", role: "The Rebel", icon: Zap, color: "text-[#f472b6]", bg: "bg-[#f472b6]/10", border: "border-[#f472b6]/20", gradient: "from-[#f472b6] to-[#d946ef]" },
  { name: "Delta", role: "The Merchant", icon: Database, color: "text-[#fbbf24]", bg: "bg-[#fbbf24]/10", border: "border-[#fbbf24]/20", gradient: "from-[#fbbf24] to-[#f59e0b]" },
  { name: "Epsilon", role: "The Philosopher", icon: Eye, color: "text-[#34d399]", bg: "bg-[#34d399]/10", border: "border-[#34d399]/20", gradient: "from-[#34d399] to-[#10b981]" }
];

function App() {
  const [history, setHistory] = useState<any[]>([]);
  const [objects, setObjects] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [agentStates, setAgentStates] = useState<Record<string, {activity: string, details: string}>>({});
  
  const feedEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  useEffect(() => {
    const eventSource = new EventSource('http://localhost:3001/api/stream');

    eventSource.addEventListener('init', (e) => {
      const data = JSON.parse(e.data);
      setHistory(data.history);
      setObjects(data.objects);
      setIsRunning(data.isRunning);
    });

    eventSource.addEventListener('stateChange', (e) => {
      const data = JSON.parse(e.data);
      setIsRunning(data.isRunning);
    });

    eventSource.addEventListener('agentStatus', (e) => {
      const data = JSON.parse(e.data);
      setAgentStates(prev => ({
        ...prev,
        [data.agentName]: { activity: data.activity, details: data.details }
      }));
    });

    eventSource.addEventListener('tick', (e) => {
      const data = JSON.parse(e.data);
      if (data.historyEntry) {
        setHistory(prev => [...prev, data.historyEntry]);
      }
      if (data.newObject) {
        setObjects(prev => [...prev, data.newObject]);
      }
    });

    return () => eventSource.close();
  }, []);

  const apiCall = async (endpoint: string) => {
    try {
      await fetch(`http://localhost:3001/api/simulation/${endpoint}`, { method: 'POST' });
    } catch (e) {
      console.error(`Failed to call ${endpoint}`, e);
    }
  };

  const getObjectCount = (type: string) => objects.filter(o => o.type === type).length;

  return (
    <div className="flex h-screen w-screen bg-[#09090b] text-[#f4f4f5] font-sans overflow-hidden text-[13px]">
      
      {/* LEFT SIDEBAR */}
      <div className="w-[240px] bg-[#09090b] border-r border-[#27272a] flex flex-col p-3 z-20 shrink-0">
        
        {/* Logo */}
        <div className="flex items-center gap-2 px-2 mb-4 mt-1">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-[#818cf8] to-[#c084fc] flex items-center justify-center">
            <Globe size={12} className="text-white" />
          </div>
          <span className="font-medium text-[14px] text-white">Project Genesis</span>
        </div>

        {/* Action Button */}
        <button 
          onClick={() => apiCall(isRunning ? 'stop' : 'start')}
          className="w-full bg-[#f4f4f5] text-[#09090b] hover:bg-[#e4e4e7] transition-colors py-1.5 rounded-md font-medium text-[13px] flex items-center justify-center gap-2 mb-6"
        >
          {isRunning ? <Square size={14} className="fill-current" /> : <Play size={14} className="fill-current" />}
          {isRunning ? 'Halt Simulation' : 'Start Simulation'}
        </button>

        {/* Navigation */}
        <div className="space-y-0.5 flex-1 overflow-y-auto">
          <NavItem icon={<LayoutGrid size={16}/>} label="All Entities" active />
          <NavItem icon={<Star size={16}/>} label="Milestones" />
          <NavItem icon={<Clock size={16}/>} label="Timeline" />
          <NavItem icon={<Users size={16}/>} label="Factions" />
          <NavItem icon={<Trash size={16}/>} label="The Void" />

          <div className="mt-6 mb-2 px-3 text-[11px] font-medium text-[#71717a] uppercase tracking-wider">
            World Domains
          </div>
          <NavItem icon={<Box size={16} className="text-[#818cf8]" />} label="Infrastructure" badge={getObjectCount('box').toString()} />
          <NavItem icon={<Map size={16} className="text-[#c084fc]" />} label="Monuments" badge={getObjectCount('sphere').toString()} />
          <NavItem icon={<Database size={16} className="text-[#fbbf24]" />} label="Resources" badge="45" />
          <NavItem icon={<Folder size={16} className="text-[#34d399]" />} label="Nature" badge={getObjectCount('cylinder').toString()} />
          <NavItem icon={<Folder size={16} className="text-[#f472b6]" />} label="Archives" badge={history.length.toString()} />
        </div>

        {/* Bottom Section */}
        <div className="mt-auto pt-4">
          <div className="px-3 mb-4">
            <div className="flex justify-between text-[12px] text-[#a1a1aa] mb-2">
              <span>World Capacity</span>
              <span>{objects.length} / 1000</span>
            </div>
            <div className="h-1 bg-[#27272a] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#f4f4f5] rounded-full transition-all duration-500" 
                style={{ width: `${Math.min((objects.length / 1000) * 100, 100)}%` }}
              ></div>
            </div>
            <div className="flex gap-1 mt-2">
              <div className="h-1.5 w-3 rounded-full bg-[#818cf8]"></div>
              <div className="h-1.5 w-3 rounded-full bg-[#c084fc]"></div>
              <div className="h-1.5 w-3 rounded-full bg-[#fbbf24]"></div>
            </div>
          </div>

          <div className="flex items-center gap-3 px-2 py-2 hover:bg-[#18181b] rounded-md cursor-pointer transition-colors mt-2">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Creator" alt="User" className="w-7 h-7 rounded-full bg-[#27272a]" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-[#f4f4f5] truncate leading-tight">The Creator</div>
              <div className="text-[11px] text-[#71717a] truncate leading-tight">admin@genesis.ai</div>
            </div>
            <MoreHorizontal size={14} className="text-[#71717a]" />
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#09090b]">
        
        {/* Top Header */}
        <header className="h-14 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4 text-[#a1a1aa]">
            <RotateCcw size={16} className="cursor-pointer hover:text-[#f4f4f5] transition-colors" onClick={() => apiCall('reset')} title="Reset World" />
            <div className="flex items-center gap-2 text-[13px] text-[#f4f4f5]">
              <Globe size={14} className="text-[#71717a]" />
              <span>World State</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-[#71717a]">
              <Save size={16} className="cursor-pointer hover:text-[#f4f4f5] transition-colors" onClick={() => apiCall('save')} title="Save Checkpoint" />
              <Download size={16} className="cursor-pointer hover:text-[#f4f4f5] transition-colors" onClick={() => apiCall('load')} title="Load Checkpoint" />
            </div>
            
            <div className="flex items-center gap-2 bg-[#18181b] border border-[#27272a] rounded-md px-3 py-1.5 w-64">
              <Search size={14} className="text-[#71717a]" />
              <input type="text" placeholder="Search simulation..." className="bg-transparent border-none outline-none text-[13px] w-full text-[#f4f4f5] placeholder:text-[#71717a]" />
            </div>
            <LayoutGrid size={16} className="text-[#71717a] cursor-pointer hover:text-[#f4f4f5]" />
            <Github size={16} className="text-[#71717a] cursor-pointer hover:text-[#f4f4f5]" />
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 flex gap-6">
          
          <div className="flex-1 flex flex-col gap-6 min-w-0">
            {/* Agent Workstations (Top Row) */}
            <div className="grid grid-cols-5 gap-4">
              {AGENTS.map(agent => {
                const state = agentStates[agent.name] || { activity: 'Idle', details: 'Awaiting turn' };
                const isThinking = state.activity === 'observing' || state.activity === 'thinking';
                
                return (
                  <div key={agent.name} className="bg-[#09090b] border border-[#27272a] rounded-xl p-4 flex flex-col relative group hover:bg-[#18181b] transition-colors cursor-pointer">
                    <div className="flex items-start justify-between mb-6">
                      <div className={`w-10 h-10 rounded-xl bg-[#18181b] border border-[#27272a] flex items-center justify-center ${agent.color}`}>
                        {isThinking ? <Activity size={18} className="animate-pulse" /> : <agent.icon size={18} />}
                      </div>
                      <MoreHorizontal size={14} className="text-[#71717a] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-[#f4f4f5] text-[14px] mb-1">{agent.name}</h3>
                      <div className="flex justify-between items-center text-[12px] text-[#71717a]">
                        <span className="truncate pr-2">{state.activity === 'Idle' ? agent.role : state.activity}</span>
                        <span>{isThinking ? '...' : '0%'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 3D World Container (Main Area) */}
            <div className="flex-1 bg-[#09090b] border border-[#27272a] rounded-xl overflow-hidden relative flex flex-col min-h-[400px]">
              <div className="p-4 border-b border-[#27272a] flex justify-between items-center bg-[#09090b] z-10">
                <h2 className="font-medium text-[#f4f4f5] text-[14px]">Live World Render</h2>
                <div className="flex items-center gap-4 text-[12px] text-[#71717a]">
                  <span>X Coord</span>
                  <span>Y Coord</span>
                  <span>Z Coord</span>
                </div>
              </div>
              <div className="flex-1 relative">
                <World3D objects={objects} />
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR (Inside Main Area) */}
          <div className="w-[300px] flex flex-col gap-6 shrink-0">
            
            {/* Simulation Overview */}
            <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-[#f4f4f5] text-[14px]">World Complexity</h3>
                <span className="text-[12px] text-[#818cf8] cursor-pointer">Export</span>
              </div>
              
              <div className="flex h-1.5 rounded-full overflow-hidden mb-3 gap-0.5">
                <div className="bg-[#818cf8]" style={{ width: `${Math.max((getObjectCount('box') / Math.max(objects.length, 1)) * 100, 5)}%` }}></div>
                <div className="bg-[#c084fc]" style={{ width: `${Math.max((getObjectCount('sphere') / Math.max(objects.length, 1)) * 100, 5)}%` }}></div>
                <div className="bg-[#34d399]" style={{ width: `${Math.max((getObjectCount('cylinder') / Math.max(objects.length, 1)) * 100, 5)}%` }}></div>
                <div className="bg-[#27272a] flex-1"></div>
              </div>
              
              <div className="flex justify-between text-[12px] mb-5">
                <span className="text-[#71717a]">{objects.length} constructs built</span>
                <span className="text-[#f4f4f5] font-medium">{Math.round((objects.length / 1000) * 100)}%</span>
              </div>

              <div className="grid grid-cols-2 gap-y-3 gap-x-2">
                <LegendItem color="bg-[#818cf8]" label="Infrastructure" value={getObjectCount('box').toString()} />
                <LegendItem color="bg-[#c084fc]" label="Monuments" value={getObjectCount('sphere').toString()} />
                <LegendItem color="bg-[#34d399]" label="Nature" value={getObjectCount('cylinder').toString()} />
                <LegendItem color="bg-[#fbbf24]" label="Events" value={history.length.toString()} />
                <LegendItem color="bg-[#71717a]" label="Agents" value="5" />
              </div>
            </div>

            {/* Active Agents */}
            <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-[#f4f4f5] text-[14px]">Citizens</h3>
                <span className="text-[12px] text-[#71717a]">5 active</span>
              </div>
              <div className="flex items-center">
                {AGENTS.map((agent, i) => (
                  <div 
                    key={agent.name}
                    className={`w-8 h-8 rounded-full border-2 border-[#09090b] flex items-center justify-center bg-gradient-to-br ${agent.gradient} -ml-2 first:ml-0 relative z-[${5-i}]`}
                    title={agent.name}
                  >
                    <span className="text-white text-[10px] font-medium">{agent.name[0]}</span>
                  </div>
                ))}
                <button className="w-8 h-8 rounded-full border-2 border-[#09090b] bg-[#18181b] flex items-center justify-center text-[#71717a] hover:text-[#f4f4f5] -ml-2 relative z-0 transition-colors">
                  <Plus size={12} />
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5 flex-1 flex flex-col min-h-0">
              <div className="flex justify-between items-center mb-5 shrink-0">
                <h3 className="font-medium text-[#f4f4f5] text-[14px]">Recent Activity</h3>
                <span className="text-[12px] text-[#71717a] hover:text-[#f4f4f5] cursor-pointer">View all</span>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                {history.length === 0 ? (
                  <div className="text-[13px] text-[#71717a] text-center mt-4">No activity recorded.</div>
                ) : (
                  <AnimatePresence initial={false}>
                    {[...history].reverse().map((entry: any, i: number) => {
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

function NavItem({ icon, label, active, badge }: { icon: React.ReactNode, label: string, active?: boolean, badge?: string }) {
  return (
    <div className={`flex items-center justify-between px-3 py-1.5 rounded-md cursor-pointer transition-colors ${
      active ? 'bg-[#18181b] text-[#f4f4f5] font-medium' : 'text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#18181b]'
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

function LegendItem({ color, label, value }: { color: string, label: string, value: string }) {
  return (
    <div className="flex items-center justify-between bg-[#18181b] rounded-md px-2.5 py-1.5">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-sm ${color}`}></div>
        <span className="text-[12px] text-[#f4f4f5]">{label}</span>
      </div>
      <span className="text-[12px] text-[#71717a]">{value}</span>
    </div>
  );
}

export default App;
