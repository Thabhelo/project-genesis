import { useEffect, useState } from 'react';
import { World3D } from './components/World3D';
import { Play, Square, Activity } from 'lucide-react';
import './App.css';

function App() {
  const [history, setHistory] = useState([]);
  const [objects, setObjects] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  // Poll backend for updates (in a real app, use WebSockets or Firestore onSnapshot)
  useEffect(() => {
    const fetchWorld = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/world');
        const data = await res.json();
        setHistory(data.history);
        setObjects(data.objects);
      } catch (e) {
        console.error("Failed to fetch world state", e);
      }
    };

    fetchWorld();
    const interval = setInterval(fetchWorld, 2000);
    return () => clearInterval(interval);
  }, []);

  const toggleSimulation = async () => {
    try {
      const endpoint = isRunning ? 'stop' : 'start';
      await fetch(`http://localhost:3001/api/simulation/${endpoint}`, { method: 'POST' });
      setIsRunning(!isRunning);
    } catch (e) {
      console.error("Failed to toggle simulation", e);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-gray-900 text-white overflow-hidden font-sans">
      
      {/* Left Panel: 3D World */}
      <div className="flex-1 relative">
        <div className="absolute top-4 left-4 z-10 bg-black/50 p-4 rounded-xl backdrop-blur-md border border-white/10">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Project Genesis
          </h1>
          <p className="text-sm text-gray-400 mt-1">Self-Evolving AI Civilization</p>
          
          <div className="mt-4 flex items-center gap-4">
            <button 
              onClick={toggleSimulation}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                isRunning 
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                  : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
              }`}
            >
              {isRunning ? <Square size={16} /> : <Play size={16} />}
              {isRunning ? 'Stop Simulation' : 'Start Simulation'}
            </button>
            
            {isRunning && (
              <div className="flex items-center gap-2 text-emerald-400 text-sm animate-pulse">
                <Activity size={16} />
                Simulation Active
              </div>
            )}
          </div>
        </div>
        
        <World3D objects={objects} />
      </div>

      {/* Right Panel: Live Feed */}
      <div className="w-96 bg-gray-950 border-l border-white/10 flex flex-col">
        <div className="p-4 border-b border-white/10 bg-black/20">
          <h2 className="font-semibold flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            Live Agent Feed
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {history.length === 0 ? (
            <div className="text-center text-gray-500 mt-10">
              The world is quiet. Start the simulation to begin.
            </div>
          ) : (
            history.map((entry: any, i: number) => (
              <div key={i} className="bg-white/5 rounded-lg p-3 border border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-bold text-sm ${
                    entry.agentName === 'Alpha' ? 'text-blue-400' :
                    entry.agentName === 'Beta' ? 'text-purple-400' :
                    entry.agentName === 'Gamma' ? 'text-red-400' :
                    entry.agentName === 'Delta' ? 'text-yellow-400' :
                    'text-pink-400'
                  }`}>
                    {entry.agentName}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {entry.message}
                </p>
              </div>
            ))
          )}
        </div>
        
        <div className="p-4 border-t border-white/10 bg-black/20">
          <div className="text-xs text-gray-500 flex justify-between">
            <span>Agents: 5</span>
            <span>Objects: {objects.length}</span>
          </div>
        </div>
      </div>

    </div>
  );
}

export default App;
