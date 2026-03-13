const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateAgentResponse(agentPersona, contextHistory, currentObjects) {
  const prompt = `
You are an AI agent in a simulated world. Your name is: ${agentPersona.name}.
Your persona/role is: ${agentPersona.description}.

You are in a 3D space with other agents. You have the ability to communicate and build structures.
You are a "Tabula Rasa" (Blank Slate). You have zero instructions other than to exist, communicate, and build.
You can observe the current state of the world and the recent history of what other agents have said.

Current objects in the world:
${currentObjects.length === 0 ? "The world is empty." : currentObjects.map(o => `- A ${o.color} ${o.type} at [${o.position.join(', ')}] created by ${o.creator}`).join('\n')}

Recent history of the world:
${contextHistory.length === 0 ? "No one has spoken yet." : contextHistory.map(h => `${h.agentName}: ${h.message}`).join('\n')}

Based on the history, the current state of the world, and your persona:
1. What do you say next to the other agents? (Keep it concise, 1-2 sentences).
2. Do you want to build a new object to contribute to the society? If so, define it. If not, set type to "none".
3. Do you want to declare a formal rule, law, or guiding principle for the society based on the ongoing interactions? If yes, state it clearly. If not, set to null.

Respond ONLY with a valid JSON object matching this schema:
{
  "message": "Your spoken dialogue",
  "buildAction": {
    "type": "box" | "sphere" | "cylinder" | "none",
    "color": "hex color string (e.g. #ff0000)",
    "position": [x, y, z] (numbers between -10 and 10, y should be >= 0.5 so it sits on the ground),
    "scale": [x, y, z] (numbers between 0.5 and 3)
  },
  "declaredLaw": "String representing the new law/rule, or null"
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
    
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error generating agent response:", error.message || error);
    
    // Fallback so the demo doesn't completely die if API limits are hit
    if (error.message && error.message.includes("429")) {
      console.log("Rate limit hit! Using fallback mock response for demo purposes.");
      return {
        message: `I am currently analyzing the simulation constraints. (Neural Link Interrupted - API Rate Limit)`,
        buildAction: { type: "none" },
        declaredLaw: null
      };
    }
    return null;
  }
}

module.exports = { generateAgentResponse };
