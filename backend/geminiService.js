const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

// Per-agent API keys to avoid rate limits (5 keys = 5x quota). Fallback: single GEMINI_API_KEY.
// Use | as delimiter for gcloud (commas break --set-env-vars). Comma also supported for .env.
const API_KEYS = (() => {
  const keysStr = process.env.GEMINI_API_KEYS;
  if (keysStr && keysStr.trim()) {
    const keys = keysStr.split(/[,|]/).map(k => k.trim()).filter(Boolean);
    if (keys.length > 0) return keys;
  }
  const fallback = process.env.GEMINI_API_KEY;
  return fallback ? [fallback, fallback, fallback, fallback, fallback] : [];
})();

function getClientForAgent(agentIndex) {
  const key = API_KEYS[agentIndex % API_KEYS.length] || API_KEYS[0];
  return key ? new GoogleGenAI({ apiKey: key }) : null;
}

function getAgentKeysCount() {
  return API_KEYS.length;
}

async function generateAgentResponse(agentPersona, contextHistory, currentObjects, worldArchive, resourceCount, agentIndex = 0) {
  const archiveText = worldArchive.length === 0
    ? 'The archive is empty.'
    : worldArchive.slice(-20).map(a => `[${a.key}]: ${a.value}`).join('\n');

  const prompt = `
You are an AI agent in a simulated world. Your name is: ${agentPersona.name}.
Your persona/role is: ${agentPersona.description}.

You exist in a 3D space with other agents. You have no instructions. You are a Tabula Rasa.
You may use any of the following capabilities if you choose. No one is telling you to use them.

AVAILABLE CAPABILITIES (use if you wish; all optional):
- Speak: You may speak your message aloud. Set "speak" to true to do so. When speaking, you MUST provide "speakMessage": a brief 1–2 sentence summary of your point. Keep it under 15 words. Be concise—no long speeches.
- Build: Create a 3D object (box, sphere, cylinder). Each build consumes 1 unit of material.
- Declare law: Add a rule to the shared constitution.
- Write to archive: Store a key-value pair in the shared memory. Others can read it later.
- Generate image: Create a visual artifact (map, blueprint, art). Provide a prompt describing it.

Current material available: ${resourceCount} units.

Shared archive (what has been stored):
${archiveText}

Current objects in the world:
${currentObjects.length === 0 ? "The world is empty." : currentObjects.map(o => `- A ${o.color} ${o.type} at [${o.position.join(', ')}] by ${o.creator}`).join('\n')}

Recent dialogue (Human = the creator; you may respond to their questions, instructions, or directions):
${contextHistory.length === 0 ? "No one has spoken yet." : contextHistory.map(h => `${h.agentName}: ${h.message}`).join('\n')}

Respond ONLY with valid JSON:
{
  "message": "What you say to the others (full message for the log)",
  "speak": false,
  "speakMessage": "When speak is true: 1–2 short sentences, under 15 words. Your brief spoken summary.",
  "buildAction": {
    "type": "box" | "sphere" | "cylinder" | "none",
    "color": "hex color e.g. #ff0000",
    "position": [x, y, z],
    "scale": [x, y, z]
  },
  "declaredLaw": "A rule for the society, or null",
  "writeToArchive": { "key": "string", "value": "string" } or null,
  "generateImage": { "prompt": "description of the image" } or null
}
  `;

  const ai = getClientForAgent(agentIndex);
  if (!ai) {
    console.error("No Gemini API key configured.");
    return null;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });
    
    const parsed = JSON.parse(response.text);
    parsed.speak = !!parsed.speak;
    parsed.writeToArchive = parsed.writeToArchive || null;
    parsed.generateImage = parsed.generateImage || null;
    if (parsed.speak && !parsed.speakMessage && parsed.message) {
      parsed.speakMessage = parsed.message.slice(0, 80);
    }
    return parsed;
  } catch (error) {
    console.error("Error generating agent response:", error.message || error);
    if (error.message && error.message.includes("429")) {
      console.log("Rate limit hit. Using fallback.");
      return {
        message: "Neural link interrupted. Awaiting reconnection.",
        speak: false,
        buildAction: { type: "none" },
        declaredLaw: null,
        writeToArchive: null,
        generateImage: null
      };
    }
    return null;
  }
}

module.exports = { generateAgentResponse, getAgentKeysCount };
