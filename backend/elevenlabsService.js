/**
 * ElevenLabs Text-to-Speech service.
 * Agents may choose to speak their messages. We provide the capability; they decide when to use it.
 * Set ELEVENLABS_API_KEY in .env to enable. Gracefully no-ops if not configured.
 */

const VOICE_BY_AGENT = {
  Alpha: '21m00Tcm4TlvDq8ikWAM',
  Beta: 'pNInz6obpgDQGcFmaJgB',
  Gamma: 'ThT5KcBeYPX3keUQqHPh',
  Delta: 'TxGEqnHWrfWFTfGW9XjX',
  Epsilon: 'VR6AewLTigWG4xSOukaG',
};

async function speakText(text, agentNameOrVoiceId) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return null;

  const voiceId = VOICE_BY_AGENT[agentNameOrVoiceId] || agentNameOrVoiceId || '21m00Tcm4TlvDq8ikWAM';
  const shortText = text.slice(0, 150).trim();

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: shortText,
          model_id: 'eleven_flash_v2_5',
        }),
      }
    );

    if (!res.ok) {
      console.warn('ElevenLabs TTS failed:', res.status);
      return null;
    }

    const buffer = await res.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  } catch (err) {
    console.warn('ElevenLabs TTS error:', err.message);
    return null;
  }
}

module.exports = { speakText };
