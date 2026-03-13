const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { db } = require('./firebaseAdmin');
const { generateAgentResponse } = require('./geminiService');

const app = express();
app.use(cors());
app.use(express.json());

const TICK_RATE_MS = 6000;
let isRunning = false;
let tickInterval = null;
let currentAgentIndex = 0;

const agents = [
  { name: "Alpha", description: "The Architect. You are obsessed with structure, order, and building physical objects." },
  { name: "Beta", description: "The Diplomat. You seek harmony, consensus, and establishing rules or laws." },
  { name: "Gamma", description: "The Critique. You question assumptions, propose unconventional ideas, and challenge the status quo to prevent groupthink." },
  { name: "Delta", description: "The Merchant. You are interested in value, trade, and accumulating resources." },
  { name: "Epsilon", description: "The Philosopher. You ponder the meaning of the simulation and the nature of the creators." }
];

let worldHistory = [];
let worldObjects = [];
let worldConstitution = []; // The Ledger
let currentStatus = "Idle";

// SSE Clients
let clients = [];

function broadcast(event, data) {
  clients.forEach(client => {
    client.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  });
}

function updateStatus(status) {
  currentStatus = status;
  broadcast('status', { status });
}

function updateAgentStatus(agentName, activity, details) {
  broadcast('agentStatus', { agentName, activity, details });
}

app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send initial state
  res.write(`event: init\ndata: ${JSON.stringify({ 
    history: worldHistory, 
    objects: worldObjects, 
    constitution: worldConstitution,
    isRunning, 
    status: currentStatus 
  })}\n\n`);

  clients.push(res);
  req.on('close', () => {
    clients = clients.filter(c => c !== res);
  });
});

app.post('/api/simulation/start', (req, res) => {
  if (isRunning) return res.status(400).json({ message: "Already running" });
  isRunning = true;
  updateStatus("Simulation started");
  broadcast('stateChange', { isRunning });
  
  runSimulationTick();
  tickInterval = setInterval(runSimulationTick, TICK_RATE_MS);
  res.json({ message: "Started" });
});

app.post('/api/simulation/stop', (req, res) => {
  if (!isRunning) return res.status(400).json({ message: "Not running" });
  isRunning = false;
  clearInterval(tickInterval);
  updateStatus("Simulation stopped");
  broadcast('stateChange', { isRunning });
  res.json({ message: "Stopped" });
});

app.post('/api/simulation/reset', (req, res) => {
  worldHistory = [];
  worldObjects = [];
  worldConstitution = [];
  currentAgentIndex = 0;
  updateStatus("World reset to Tabula Rasa");
  broadcast('init', { history: worldHistory, objects: worldObjects, constitution: worldConstitution, isRunning, status: currentStatus });
  res.json({ message: "Reset successful" });
});

const CHECKPOINT_FILE = path.join(__dirname, 'checkpoint.json');

app.post('/api/simulation/save', (req, res) => {
  const state = { worldHistory, worldObjects, worldConstitution, currentAgentIndex };
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(state, null, 2));
  updateStatus("Checkpoint saved");
  res.json({ message: "Saved" });
});

app.post('/api/simulation/load', (req, res) => {
  if (fs.existsSync(CHECKPOINT_FILE)) {
    const state = JSON.parse(fs.readFileSync(CHECKPOINT_FILE));
    worldHistory = state.worldHistory || [];
    worldObjects = state.worldObjects || [];
    worldConstitution = state.worldConstitution || [];
    currentAgentIndex = state.currentAgentIndex || 0;
    updateStatus("Checkpoint loaded");
    broadcast('init', { history: worldHistory, objects: worldObjects, constitution: worldConstitution, isRunning, status: currentStatus });
    res.json({ message: "Loaded" });
  } else {
    res.status(404).json({ message: "No checkpoint found" });
  }
});

async function runSimulationTick() {
  if (!isRunning) return;
  
  const agent = agents[currentAgentIndex];
  updateStatus(`Epoch in progress...`);
  
  agents.forEach(a => {
    if (a.name !== agent.name) updateAgentStatus(a.name, 'idle', 'Awaiting turn');
  });

  updateAgentStatus(agent.name, 'observing', 'Analyzing the world state...');
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  updateAgentStatus(agent.name, 'thinking', 'Formulating a thought process...');

  const recentHistory = worldHistory.slice(-10);

  try {
    const response = await generateAgentResponse(agent, recentHistory, worldObjects);
    
    if (response) {
      updateAgentStatus(agent.name, 'acted', 'Action completed.');
      
      const historyEntry = {
        agentName: agent.name,
        message: response.message,
        timestamp: Date.now()
      };
      worldHistory.push(historyEntry);
      
      let newObject = null;
      if (response.buildAction && response.buildAction.type !== "none") {
        newObject = {
          id: Date.now().toString(),
          creator: agent.name,
          ...response.buildAction
        };
        worldObjects.push(newObject);
      }

      let newLaw = null;
      if (response.declaredLaw) {
        newLaw = {
          id: Date.now().toString(),
          agentName: agent.name,
          law: response.declaredLaw,
          timestamp: Date.now()
        };
        worldConstitution.push(newLaw);
      }

      broadcast('tick', { historyEntry, newObject, newLaw });
    } else {
      updateAgentStatus(agent.name, 'idle', 'Remained silent.');
    }
  } catch (error) {
    console.error("Tick Error:", error);
    updateAgentStatus(agent.name, 'error', 'Neural link interrupted.');
  }

  currentAgentIndex = (currentAgentIndex + 1) % agents.length;
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
