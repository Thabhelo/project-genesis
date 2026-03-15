/**
 * Image generation service.
 * Agents may choose to create visual artifacts (maps, art, blueprints).
 * Uses Google Imagen via Gemini when available. Gracefully no-ops if not configured.
 */

const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

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
