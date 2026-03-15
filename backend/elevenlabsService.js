/**
 * ElevenLabs Text-to-Speech service.
 * Agents may choose to speak their messages. We provide the capability; they decide when to use it.
 * Set ELEVENLABS_API_KEY in .env to enable. Gracefully no-ops if not configured.
 */

async function speakText(text, voiceId = '21m00Tcm4TlvDq8ikWAM') {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return null;

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
          text: text.slice(0, 500), // Limit length
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
