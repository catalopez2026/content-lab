/**
 * /api/generate — solo genera el carrusel con Gemini
 * Recibe: { transcript: "..." }
 * Variables: GEMINI_API_KEY
 */

export const config = {
  api: { bodyParser: false, responseLimit: false },
  maxDuration: 60,
};

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk.toString(); });
    req.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    req.on('error', reject);
  });
}

const PROMPT = `Eres un experto en copywriting viral para Instagram. Fórmula: CURIOSIDAD + PROMESA + URGENCIA.

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

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) return res.status(500).json({ error: 'Falta GEMINI_API_KEY' });

  try {
    const { transcript } = await readBody(req);
    if (!transcript) return res.status(400).json({ error: 'Falta transcript' });

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${PROMPT}\n\nTranscript:\n\n${transcript}\n\nGenerá el carrusel.` }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 2000 },
        }),
      }
    );

    if (!geminiRes.ok) throw new Error(`Gemini error: ${await geminiRes.text()}`);
    const data = await geminiRes.json();
    let raw = data.candidates[0].content.parts[0].text.trim();
    if (raw.startsWith('```')) raw = raw.replace(/```json\n?|```\n?/g, '').trim();

    const carousel = JSON.parse(raw);
    return res.status(200).json({ success: true, carousel });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
