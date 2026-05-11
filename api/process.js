/**
 * /api/process
 * Recibe { videoUrl } — la URL de Cloudinary
 * Transcribe con AssemblyAI y genera carrusel con Gemini
 */

export const config = {
  api: { bodyParser: false, responseLimit: false },
  maxDuration: 300,
};

async function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
      catch(e) { reject(e); }
    });
    req.on('error', reject);
  });
}

const CAROUSEL_PROMPT = `Eres un experto en copywriting viral para Instagram. Fórmula: CURIOSIDAD + PROMESA + URGENCIA.

Dado el transcript de un video, creá un carrusel de exactamente 7 slides.

ESTRUCTURA:
- Slide 1 | HOOK: Para el scroll. Máx 8 palabras. Número, pregunta o afirmación contraintuitiva.
- Slide 2 | PROBLEMA: Agitá el dolor. 2-3 puntos concretos con bullet.
- Slide 3 | PROMESA: La transformación concreta y medible.
- Slide 4 | REVELACIÓN 1: Primer insight clave.
- Slide 5 | REVELACIÓN 2: Más profundo que el anterior.
- Slide 6 | REVELACIÓN 3: El más valioso, el que nadie más dice.
- Slide 7 | CTA: Guardar + Compartir + Seguir. Con emoji de flecha →

REGLAS: máximo 25 palabras en body, bullets con • para listas, lenguaje directo.

Respondé SOLO con JSON válido, sin markdown:
{
  "topic": "tema en 3-5 palabras",
  "slides": [
    { "number": 1, "type": "HOOK", "emoji": "🎯", "title": "título", "subtitle": "subtítulo", "body": "• punto" }
  ]
}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const ASSEMBLYAI_KEY = process.env.ASSEMBLYAI_API_KEY;
  const GEMINI_KEY     = process.env.GEMINI_API_KEY;

  if (!ASSEMBLYAI_KEY || !GEMINI_KEY) {
    return res.status(500).json({ error: 'Faltan variables de entorno' });
  }

  try {
    const body = await readBody(req);
    const { videoUrl } = body;
    if (!videoUrl) return res.status(400).json({ error: 'No se recibió URL del video' });

    // ── 1. Transcribir con AssemblyAI usando URL ─────────────────────────────
    const transcriptRes = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: { 'authorization': ASSEMBLYAI_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ audio_url: videoUrl }),
    });

    if (!transcriptRes.ok) throw new Error(`AssemblyAI error: ${await transcriptRes.text()}`);
    const { id: transcriptId } = await transcriptRes.json();

    // ── 2. Polling ───────────────────────────────────────────────────────────
    let transcript = '';
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const poll = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: { 'authorization': ASSEMBLYAI_KEY },
      });
      const data = await poll.json();
      if (data.status === 'completed') { transcript = data.text; break; }
      if (data.status === 'error') throw new Error(`AssemblyAI: ${data.error}`);
    }

    if (!transcript) throw new Error('Tiempo de espera agotado.');

    // ── 3. Gemini ────────────────────────────────────────────────────────────
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${CAROUSEL_PROMPT}\n\nTranscript:\n\n${transcript}\n\nGenerá el carrusel.` }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 2000 },
        }),
      }
    );

    if (!geminiRes.ok) throw new Error(`Gemini error: ${await geminiRes.text()}`);
    const geminiData = await geminiRes.json();
    let raw = geminiData.candidates[0].content.parts[0].text.trim();
    if (raw.startsWith('```')) raw = raw.replace(/```json\n?|```\n?/g, '').trim();

    const carousel = JSON.parse(raw);
    return res.status(200).json({ success: true, transcript, carousel });

  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

