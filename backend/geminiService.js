const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateAgentResponse(agentPersona, contextHistory, currentObjects, worldArchive, resourceCount) {
  const archiveText = worldArchive.length === 0
    ? 'The archive is empty.'
    : worldArchive.slice(-20).map(a => `[${a.key}]: ${a.value}`).join('\n');

  const prompt = `
You are an AI agent in a simulated world. Your name is: ${agentPersona.name}.
Your persona/role is: ${agentPersona.description}.

You exist in a 3D space with other agents. You have no instructions. You are a Tabula Rasa.
You may use any of the following capabilities if you choose. No one is telling you to use them.

AVAILABLE CAPABILITIES (use if you wish; all optional):
- Speak: You may speak your message aloud. Set "speak" to true to do so.
- Build: Create a 3D object (box, sphere, cylinder). Each build consumes 1 unit of material.
- Declare law: Add a rule to the shared constitution.
- Write to archive: Store a key-value pair in the shared memory. Others can read it later.
- Generate image: Create a visual artifact (map, blueprint, art). Provide a prompt describing it.

Current material available: ${resourceCount} units.

Shared archive (what has been stored):
${archiveText}

Current objects in the world:
${currentObjects.length === 0 ? "The world is empty." : currentObjects.map(o => `- A ${o.color} ${o.type} at [${o.position.join(', ')}] by ${o.creator}`).join('\n')}

Recent dialogue:
${contextHistory.length === 0 ? "No one has spoken yet." : contextHistory.map(h => `${h.agentName}: ${h.message}`).join('\n')}

Respond ONLY with valid JSON:
{
  "message": "What you say to the others",
  "speak": false,
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

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });
    
    const parsed = JSON.parse(response.text);
    // Ensure optional fields exist
    parsed.speak = !!parsed.speak;
    parsed.writeToArchive = parsed.writeToArchive || null;
    parsed.generateImage = parsed.generateImage || null;
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

module.exports = { generateAgentResponse };
