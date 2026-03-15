const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { generateAgentResponse } = require('./geminiService');
const { speakText } = require('./elevenlabsService');
const { generateImage } = require('./imageService');
const { saveState, loadState, appendEvent, isFirestore } = require('./firestoreService');

const app = express();
// Allow all origins (frontend on Cloud Run has dynamic URL)
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const TICK_RATE_MS = 6000;
const INITIAL_RESOURCES = 1000;

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
let worldConstitution = [];
let worldArchive = [];
let worldResources = INITIAL_RESOURCES;
let worldImages = [];
let currentStatus = "Idle";

let clients = [];

function broadcast(event, data) {
  clients.forEach(client => {
    try {
      client.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (e) {}
  });
}

function updateStatus(status) {
  currentStatus = status;
  broadcast('status', { status });
}

function updateAgentStatus(agentName, activity, details) {
  broadcast('agentStatus', { agentName, activity, details });
}

function emitThinkingLog(agentName, message, elapsedMs) {
  broadcast('thinkingLog', { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, agentName, message, elapsedMs, timestamp: Date.now() });
}

app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  res.write(`event: init\ndata: ${JSON.stringify({ 
    history: worldHistory, 
    objects: worldObjects, 
    constitution: worldConstitution,
    archive: worldArchive,
    resources: worldResources,
    images: worldImages,
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

app.post('/api/simulation/reset', async (req, res) => {
  worldHistory = [];
  worldObjects = [];
  worldConstitution = [];
  worldArchive = [];
  worldResources = INITIAL_RESOURCES;
  worldImages = [];
  currentAgentIndex = 0;
  await saveState({
    worldHistory, worldObjects, worldConstitution,
    worldArchive, worldResources, worldImages,
    currentAgentIndex
  }).catch(() => {});
  updateStatus("World reset to Tabula Rasa");
  broadcast('init', { 
    history: worldHistory, 
    objects: worldObjects, 
    constitution: worldConstitution, 
    archive: worldArchive, 
    resources: worldResources, 
    images: worldImages,
    isRunning, 
    status: currentStatus 
  });
  res.json({ message: "Reset successful" });
});

const CHECKPOINT_FILE = path.join(__dirname, 'checkpoint.json');

app.post('/api/simulation/save', (req, res) => {
  const state = { 
    worldHistory, worldObjects, worldConstitution, 
    worldArchive, worldResources, worldImages, 
    currentAgentIndex 
  };
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
    worldArchive = state.worldArchive || [];
    worldResources = state.worldResources ?? INITIAL_RESOURCES;
    worldImages = state.worldImages || [];
    currentAgentIndex = state.currentAgentIndex || 0;
    updateStatus("Checkpoint loaded");
    broadcast('init', { 
      history: worldHistory, 
      objects: worldObjects, 
      constitution: worldConstitution, 
      archive: worldArchive, 
      resources: worldResources, 
      images: worldImages,
      isRunning, 
      status: currentStatus 
    });
    res.json({ message: "Loaded" });
  } else {
    res.status(404).json({ message: "No checkpoint found" });
  }
});

app.get('/api/export/timelapse', (req, res) => {
  const payload = {
    exportedAt: Date.now(),
    history: worldHistory,
    objects: worldObjects,
    constitution: worldConstitution,
    archive: worldArchive,
    resources: worldResources,
    eventLog: worldHistory.map((h, i) => ({
      type: 'message',
      index: i,
      agentName: h.agentName,
      message: h.message,
      timestamp: h.timestamp
    }))
  };
  res.setHeader('Content-Disposition', 'attachment; filename="genesis-timelapse.json"');
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(payload, null, 2));
});

async function runSimulationTick() {
  if (!isRunning) return;
  
  const agent = agents[currentAgentIndex];
  const tickStart = Date.now();
  updateStatus(`Epoch in progress...`);
  
  agents.forEach(a => {
    if (a.name !== agent.name) updateAgentStatus(a.name, 'idle', 'Awaiting turn');
  });

  updateAgentStatus(agent.name, 'observing', 'Analyzing the world state...');
  emitThinkingLog(agent.name, `${agent.name} is observing the world state...`, 0);
  await new Promise(resolve => setTimeout(resolve, 400));
  emitThinkingLog(agent.name, `${agent.name} has noted ${worldObjects.length} constructs and ${worldResources} materials.`, Date.now() - tickStart);
  await new Promise(resolve => setTimeout(resolve, 400));
  emitThinkingLog(agent.name, `${agent.name} is reviewing the constitution (${worldConstitution.length} articles) and recent dialogue.`, Date.now() - tickStart);
  await new Promise(resolve => setTimeout(resolve, 400));
  updateAgentStatus(agent.name, 'thinking', 'Formulating a thought process...');
  emitThinkingLog(agent.name, `${agent.name} is formulating a response...`, Date.now() - tickStart);
  await new Promise(resolve => setTimeout(resolve, 300));

  const recentHistory = worldHistory.slice(-10);

  try {
    const response = await generateAgentResponse(
      agent, 
      recentHistory, 
      worldObjects, 
      worldArchive, 
      worldResources
    );
    
    if (response) {
      emitThinkingLog(agent.name, `${agent.name} has decided: "${response.message}"`, Date.now() - tickStart);
      if (response.buildAction?.type !== 'none') {
        emitThinkingLog(agent.name, `${agent.name} is building a ${response.buildAction.type} at [${response.buildAction.position?.join(', ')}].`, Date.now() - tickStart);
      }
      if (response.declaredLaw) {
        emitThinkingLog(agent.name, `${agent.name} declares a new law: "${response.declaredLaw}"`, Date.now() - tickStart);
      }
      updateAgentStatus(agent.name, 'acted', 'Action completed.');
      
      const historyEntry = {
        agentName: agent.name,
        message: response.message,
        timestamp: Date.now()
      };
      worldHistory.push(historyEntry);
      
      let newObject = null;
      if (response.buildAction && response.buildAction.type !== "none" && worldResources > 0) {
        worldResources -= 1;
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

      let archiveEntry = null;
      if (response.writeToArchive && response.writeToArchive.key) {
        archiveEntry = {
          id: Date.now().toString(),
          agentName: agent.name,
          key: response.writeToArchive.key,
          value: response.writeToArchive.value,
          timestamp: Date.now()
        };
        worldArchive.push(archiveEntry);
      }

      let audioBase64 = null;
      if (response.speak && response.message) {
        audioBase64 = await speakText(response.message);
      }

      let newImage = null;
      if (response.generateImage && response.generateImage.prompt) {
        const imgB64 = await generateImage(response.generateImage.prompt);
        if (imgB64) {
          newImage = {
            id: Date.now().toString(),
            creator: agent.name,
            prompt: response.generateImage.prompt,
            imageBase64: imgB64,
            timestamp: Date.now()
          };
          worldImages.push(newImage);
        }
      }

      broadcast('tick', { 
        historyEntry, 
        newObject, 
        newLaw, 
        archiveEntry, 
        audioBase64, 
        newImage,
        resources: worldResources 
      });

      const state = {
        worldHistory, worldObjects, worldConstitution,
        worldArchive, worldResources, worldImages,
        currentAgentIndex
      };
      saveState(state).catch(() => {});
      appendEvent({ type: 'tick', agentName: agent.name, historyEntry, newObject: !!newObject, newLaw: !!newLaw }).catch(() => {});
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

async function init() {
  const loaded = await loadState();
  if (loaded && 'worldHistory' in loaded) {
    worldHistory = loaded.worldHistory || [];
    worldObjects = loaded.worldObjects || [];
    worldConstitution = loaded.worldConstitution || [];
    worldArchive = loaded.worldArchive || [];
    worldResources = loaded.worldResources ?? INITIAL_RESOURCES;
    worldImages = loaded.worldImages || [];
    currentAgentIndex = loaded.currentAgentIndex ?? 0;
    console.log('Loaded state from Firestore:', worldHistory.length, 'events');
  }
}

init().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
    if (isFirestore()) console.log('Firestore persistence enabled.');
  });
});
