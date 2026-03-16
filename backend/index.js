const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { generateAgentResponse, getAgentKeysCount } = require('./geminiService');
const { speakText } = require('./elevenlabsService');
const { generateImage } = require('./imageService');
const { saveState, loadState, appendEvent, isFirestore } = require('./firestoreService');
const { verifyAuth } = require('./authMiddleware');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const TICK_RATE_MS = 6000;
const INITIAL_RESOURCES = 1000;

const agents = [
  { name: "Alpha", description: "The Architect. You are obsessed with structure, order, and building physical objects." },
  { name: "Beta", description: "The Diplomat. You seek harmony, consensus, and establishing rules or laws." },
  { name: "Gamma", description: "The Critique. You question assumptions, propose unconventional ideas, and challenge the status quo to prevent groupthink." },
  { name: "Delta", description: "The Merchant. You are interested in value, trade, and accumulating resources." },
  { name: "Epsilon", description: "The Philosopher. You ponder the meaning of the simulation and the nature of the creators." }
];

/** Per-user state: userId -> { worldHistory, worldObjects, ... } */
const userStates = new Map();

function getInitialPlanet() {
  return {
    id: 'planet-0',
    type: 'sphere',
    color: '#0ea5e9',
    position: [0, 0, 0],
    scale: [6, 6, 6],
    creator: 'World'
  };
}

function createEmptyState() {
  return {
    worldHistory: [],
    worldObjects: [getInitialPlanet()],
    worldConstitution: [],
    worldArchive: [],
    worldResources: INITIAL_RESOURCES,
    worldImages: [],
    currentAgentIndex: 0,
    currentStatus: "Idle",
    isRunning: false,
    tickInterval: null,
    tickInProgress: false,
    clients: []
  };
}

async function getOrCreateUserState(userId) {
  let state = userStates.get(userId);
  if (!state) {
    state = createEmptyState();
    const loaded = await loadState(userId);
    if (loaded && 'worldHistory' in loaded) {
      state.worldHistory = loaded.worldHistory || [];
      const loadedObjs = loaded.worldObjects || [];
      state.worldObjects = loadedObjs.length === 0 ? [getInitialPlanet()] : loadedObjs;
      state.worldConstitution = loaded.worldConstitution || [];
      state.worldArchive = loaded.worldArchive || [];
      state.worldResources = loaded.worldResources ?? INITIAL_RESOURCES;
      state.worldImages = loaded.worldImages || [];
      state.currentAgentIndex = loaded.currentAgentIndex ?? 0;
    }
    userStates.set(userId, state);
  }
  return state;
}

function broadcastToUser(state, event, data) {
  state.clients.forEach(client => {
    try {
      client.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (e) {}
  });
}

// Health check (no auth) - for curl testing
app.get('/api/health', (req, res) => {
  const agentKeysCount = getAgentKeysCount();
  res.json({
    status: 'ok',
    agentKeysCount,
    perAgentKeys: agentKeysCount >= 5,
    humanChatEnabled: true
  });
});

// SSE stream - requires token in query: /api/stream?token=...
app.get('/api/stream', verifyAuth, async (req, res) => {
  const { userId } = req;
  const state = await getOrCreateUserState(userId);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  res.write(`event: init\ndata: ${JSON.stringify({
    history: state.worldHistory,
    objects: state.worldObjects,
    constitution: state.worldConstitution,
    archive: state.worldArchive,
    resources: state.worldResources,
    images: state.worldImages,
    isRunning: state.isRunning,
    status: state.currentStatus
  })}\n\n`);

  state.clients.push(res);
  req.on('close', () => {
    state.clients = state.clients.filter(c => c !== res);
  });
});

app.post('/api/simulation/start', verifyAuth, async (req, res) => {
  const { userId } = req;
  const state = await getOrCreateUserState(userId);
  if (state.isRunning) return res.status(400).json({ message: "Already running" });
  state.isRunning = true;
  state.currentStatus = "Simulation started";
  broadcastToUser(state, 'status', { status: state.currentStatus });
  broadcastToUser(state, 'stateChange', { isRunning: true });
  runSimulationTick(userId);
  state.tickInterval = setInterval(() => runSimulationTick(userId), TICK_RATE_MS);
  res.json({ message: "Started" });
});

app.post('/api/simulation/stop', verifyAuth, async (req, res) => {
  const { userId } = req;
  const state = await getOrCreateUserState(userId);
  if (!state.isRunning) return res.status(400).json({ message: "Not running" });
  state.isRunning = false;
  clearInterval(state.tickInterval);
  state.tickInterval = null;
  state.currentStatus = "Simulation stopped";
  broadcastToUser(state, 'status', { status: state.currentStatus });
  broadcastToUser(state, 'stateChange', { isRunning: false });
  res.json({ message: "Stopped" });
});

app.post('/api/simulation/reset', verifyAuth, async (req, res) => {
  const { userId } = req;
  const state = await getOrCreateUserState(userId);
  state.worldHistory = [];
  state.worldObjects = [getInitialPlanet()];
  state.worldConstitution = [];
  state.worldArchive = [];
  state.worldResources = INITIAL_RESOURCES;
  state.worldImages = [];
  state.currentAgentIndex = 0;
  await saveState({
    worldHistory: state.worldHistory,
    worldObjects: state.worldObjects,
    worldConstitution: state.worldConstitution,
    worldArchive: state.worldArchive,
    worldResources: state.worldResources,
    worldImages: state.worldImages,
    currentAgentIndex: state.currentAgentIndex
  }, userId).catch(() => {});
  state.currentStatus = "World reset to Tabula Rasa";
  broadcastToUser(state, 'init', {
    history: state.worldHistory,
    objects: state.worldObjects,
    constitution: state.worldConstitution,
    archive: state.worldArchive,
    resources: state.worldResources,
    images: state.worldImages,
    isRunning: state.isRunning,
    status: state.currentStatus
  });
  res.json({ message: "Reset successful" });
});

app.post('/api/human/message', verifyAuth, async (req, res) => {
  const { userId } = req;
  const { message } = req.body || {};
  const text = typeof message === 'string' ? message.trim() : '';
  if (!text) return res.status(400).json({ message: 'Message is required' });

  const state = await getOrCreateUserState(userId);
  const historyEntry = {
    agentName: 'Human',
    message: text,
    timestamp: Date.now()
  };
  state.worldHistory.push(historyEntry);

  broadcastToUser(state, 'tick', {
    historyEntry,
    newObject: null,
    newLaw: null,
    archiveEntry: null,
    audioBase64: null,
    newImage: null,
    resources: state.worldResources
  });

  await saveState({
    worldHistory: state.worldHistory,
    worldObjects: state.worldObjects,
    worldConstitution: state.worldConstitution,
    worldArchive: state.worldArchive,
    worldResources: state.worldResources,
    worldImages: state.worldImages,
    currentAgentIndex: state.currentAgentIndex
  }, userId).catch(() => {});

  res.json({ message: 'Sent', historyEntry });
});

const CHECKPOINT_DIR = path.join(__dirname, 'checkpoints');

app.post('/api/simulation/save', verifyAuth, async (req, res) => {
  const { userId } = req;
  const state = await getOrCreateUserState(userId);
  if (!fs.existsSync(CHECKPOINT_DIR)) fs.mkdirSync(CHECKPOINT_DIR, { recursive: true });
  const file = path.join(CHECKPOINT_DIR, `${userId.replace(/\//g, '_')}.json`);
  fs.writeFileSync(file, JSON.stringify({
    worldHistory: state.worldHistory,
    worldObjects: state.worldObjects,
    worldConstitution: state.worldConstitution,
    worldArchive: state.worldArchive,
    worldResources: state.worldResources,
    worldImages: state.worldImages,
    currentAgentIndex: state.currentAgentIndex
  }, null, 2));
  state.currentStatus = "Checkpoint saved";
  res.json({ message: "Saved" });
});

app.post('/api/simulation/load', verifyAuth, async (req, res) => {
  const { userId } = req;
  const state = await getOrCreateUserState(userId);
  const file = path.join(CHECKPOINT_DIR, `${userId.replace(/\//g, '_')}.json`);
  if (fs.existsSync(file)) {
    const data = JSON.parse(fs.readFileSync(file));
    state.worldHistory = data.worldHistory || [];
    state.worldObjects = data.worldObjects || [];
    state.worldConstitution = data.worldConstitution || [];
    state.worldArchive = data.worldArchive || [];
    state.worldResources = data.worldResources ?? INITIAL_RESOURCES;
    state.worldImages = data.worldImages || [];
    state.currentAgentIndex = data.currentAgentIndex || 0;
    state.currentStatus = "Checkpoint loaded";
    broadcastToUser(state, 'init', {
      history: state.worldHistory,
      objects: state.worldObjects,
      constitution: state.worldConstitution,
      archive: state.worldArchive,
      resources: state.worldResources,
      images: state.worldImages,
      isRunning: state.isRunning,
      status: state.currentStatus
    });
    res.json({ message: "Loaded" });
  } else {
    res.status(404).json({ message: "No checkpoint found" });
  }
});

app.get('/api/export/timelapse', verifyAuth, async (req, res) => {
  const { userId } = req;
  const state = await getOrCreateUserState(userId);
  const payload = {
    exportedAt: Date.now(),
    history: state.worldHistory,
    objects: state.worldObjects,
    constitution: state.worldConstitution,
    archive: state.worldArchive,
    resources: state.worldResources,
    eventLog: state.worldHistory.map((h, i) => ({
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

async function runSimulationTick(userId) {
  const state = userStates.get(userId);
  if (!state || !state.isRunning) return;
  if (state.tickInProgress) return;

  state.tickInProgress = true;
  const agent = agents[state.currentAgentIndex];
  const tickStart = Date.now();

  const broadcast = (ev, data) => broadcastToUser(state, ev, data);
  const updateStatus = (s) => { state.currentStatus = s; broadcast('status', { status: s }); };
  const updateAgentStatus = (name, activity, details) => broadcast('agentStatus', { agentName: name, activity, details });
  const emitThinkingLog = (name, msg, ms) => broadcast('thinkingLog', { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, agentName: name, message: msg, elapsedMs: ms, timestamp: Date.now() });

  updateStatus(`Epoch in progress...`);
  agents.forEach(a => {
    if (a.name !== agent.name) updateAgentStatus(a.name, 'idle', 'Awaiting turn');
  });

  updateAgentStatus(agent.name, 'observing', 'Analyzing the world state...');
  emitThinkingLog(agent.name, `${agent.name} is observing the world state...`, 0);
  await new Promise(resolve => setTimeout(resolve, 400));
  emitThinkingLog(agent.name, `${agent.name} has noted ${state.worldObjects.length} constructs and ${state.worldResources} materials.`, Date.now() - tickStart);
  await new Promise(resolve => setTimeout(resolve, 400));
  emitThinkingLog(agent.name, `${agent.name} is reviewing the constitution (${state.worldConstitution.length} articles) and recent dialogue.`, Date.now() - tickStart);
  await new Promise(resolve => setTimeout(resolve, 400));
  updateAgentStatus(agent.name, 'thinking', 'Formulating a thought process...');
  emitThinkingLog(agent.name, `${agent.name} is formulating a response...`, Date.now() - tickStart);
  await new Promise(resolve => setTimeout(resolve, 300));

  const recentHistory = state.worldHistory.slice(-10);

  try {
    const response = await generateAgentResponse(
      agent,
      recentHistory,
      state.worldObjects,
      state.worldArchive,
      state.worldResources,
      state.currentAgentIndex
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
      state.worldHistory.push(historyEntry);

      let newObject = null;
      if (response.buildAction && response.buildAction.type !== "none" && state.worldResources > 0) {
        state.worldResources -= 1;
        newObject = {
          id: Date.now().toString(),
          creator: agent.name,
          ...response.buildAction
        };
        state.worldObjects.push(newObject);
      }

      let newLaw = null;
      if (response.declaredLaw) {
        newLaw = {
          id: Date.now().toString(),
          agentName: agent.name,
          law: response.declaredLaw,
          timestamp: Date.now()
        };
        state.worldConstitution.push(newLaw);
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
        state.worldArchive.push(archiveEntry);
      }

      let audioBase64 = null;
      const textToSpeak = response.speak && (response.speakMessage || response.message);
      if (textToSpeak) {
        audioBase64 = await speakText(textToSpeak, agent.name);
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
          state.worldImages.push(newImage);
        }
      }

      broadcast('tick', {
        historyEntry,
        newObject,
        newLaw,
        archiveEntry,
        audioBase64,
        newImage,
        resources: state.worldResources
      });

      saveState({
        worldHistory: state.worldHistory,
        worldObjects: state.worldObjects,
        worldConstitution: state.worldConstitution,
        worldArchive: state.worldArchive,
        worldResources: state.worldResources,
        worldImages: state.worldImages,
        currentAgentIndex: state.currentAgentIndex
      }, userId).catch(() => {});
      appendEvent({ type: 'tick', agentName: agent.name, historyEntry, newObject: !!newObject, newLaw: !!newLaw }, userId).catch(() => {});
    } else {
      updateAgentStatus(agent.name, 'idle', 'Remained silent.');
    }
  } catch (error) {
    console.error("Tick Error:", error);
    updateAgentStatus(agent.name, 'error', 'Neural link interrupted.');
  }

  state.currentAgentIndex = (state.currentAgentIndex + 1) % agents.length;
  state.tickInProgress = false;
}

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  if (isFirestore()) console.log('Firestore persistence enabled (per-user).');
});
