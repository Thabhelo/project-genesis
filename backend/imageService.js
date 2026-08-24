/**
 * Image generation service.
 * Agents may choose to create visual artifacts (maps, art, blueprints).
 * Uses Google Imagen via Gemini when available. Gracefully no-ops if not configured.
 */

const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

// Falls back to the first per-agent key when only GEMINI_API_KEYS is set.
function resolveApiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  const keys = process.env.GEMINI_API_KEYS;
  if (keys && keys.trim()) {
    const first = keys.split(/[,|]/).map(k => k.trim()).filter(Boolean)[0];
    if (first) return first;
  }
  return null;
}

const apiKey = resolveApiKey();
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

async function generateImage(prompt) {
  if (!ai) return null;

  try {
    const result = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: prompt.slice(0, 1000),
      config: {
        numberOfImages: 1,
      },
    });

    const img = result?.generatedImages?.[0]?.image;
    if (img?.imageBytes) {
      const bytes = img.imageBytes;
      return typeof bytes === 'string' ? bytes : Buffer.from(bytes).toString('base64');
    }
    return null;
  } catch (err) {
    // Imagen may not be available on all plans; fallback gracefully
    console.warn('Image generation skipped:', err.message);
    return null;
  }
}

module.exports = { generateImage };
