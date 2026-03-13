const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { db } = require('./firebaseAdmin');
const { generateAgentResponse } = require('./geminiService');

const app = express();
app.use(cors());
app.use(express.json());

const TICK_RATE_MS = 15000; // 15 seconds per simulation tick to avoid rate limits
let isRunning = false;
let tickInterval = null;
let currentAgentIndex = 0;

const agents = [
  { name: "Alpha", description: "The Architect. You are obsessed with structure, order, and building physical objects." },
  { name: "Beta", description: "The Diplomat. You seek harmony, consensus, and establishing rules or laws." },
  { name: "Gamma", description: "The Rebel. You question authority, propose radical ideas, and sometimes destroy structures." },
  { name: "Delta", description: "The Merchant. You are interested in value, trade, and accumulating resources." },
  { name: "Epsilon", description: "The Philosopher. You ponder the meaning of the simulation and the nature of the creators." }
];

// In-memory state for the MVS (will be synced to Firestore)
let worldHistory = [];
let worldObjects = [];

app.post('/api/simulation/start', (req, res) => {
  if (isRunning) return res.status(400).json({ message: "Simulation already running" });
  isRunning = true;
  tickInterval = setInterval(runSimulationTick, TICK_RATE_MS);
  res.json({ message: "Simulation started" });
});

app.post('/api/simulation/stop', (req, res) => {
  if (!isRunning) return res.status(400).json({ message: "Simulation not running" });
  isRunning = false;
  clearInterval(tickInterval);
  res.json({ message: "Simulation stopped" });
});

app.get('/api/world', (req, res) => {
  res.json({ history: worldHistory, objects: worldObjects });
});

async function runSimulationTick() {
  console.log("--- Simulation Tick ---");
  const agent = agents[currentAgentIndex];
  console.log(`Agent ${agent.name} is thinking...`);

  // Get recent history
  const recentHistory = worldHistory.slice(-10);

  const response = await generateAgentResponse(agent, recentHistory, worldObjects);
  
  if (response) {
    console.log(`[${agent.name}]: ${response.message}`);
    
    // Add to history
    const historyEntry = {
      agentName: agent.name,
      message: response.message,
      timestamp: Date.now()
    };
    worldHistory.push(historyEntry);
    
    // Sync to DB
    try {
      await db.collection('history').add(historyEntry);
    } catch (e) {
      console.error("DB Error:", e);
    }

    // Handle build action
    if (response.buildAction && response.buildAction.type !== "none") {
      const newObject = {
        id: Date.now().toString(),
        creator: agent.name,
        ...response.buildAction
      };
      worldObjects.push(newObject);
      console.log(`[${agent.name}] built a ${newObject.type}`);
      
      try {
        await db.collection('objects').add(newObject);
      } catch (e) {
        console.error("DB Error:", e);
      }
    }
  } else {
    console.log(`Agent ${agent.name} failed to respond.`);
  }

  // Next agent
  currentAgentIndex = (currentAgentIndex + 1) % agents.length;
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
