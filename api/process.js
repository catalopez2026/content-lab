/**
 * Vercel Serverless Function: /api/process
 * Recibe el video, lo transcribe con Whisper API (OpenAI),
 * y genera el carrusel con Claude (Anthropic).
 *
 * Variables de entorno necesarias en Vercel:
 *   OPENAI_API_KEY     → tu key de OpenAI
 *   ANTHROPIC_API_KEY  → tu key de Anthropic
 */

export const config = {
  api: {
    bodyParser: false,   // necesario para recibir multipart/form-data
    responseLimit: false,
  },
  maxDuration: 300,      // 5 min máximo (plan Hobby de Vercel)
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse multipart/form-data manualmente (sin dependencias externas).
 * Vercel no permite instalar paquetes en runtime sin bundling,
 * así que enviamos el video como base64 desde el frontend.
 */
async function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk.toString(); });
    req.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch (e) { reject(new Error('Body inválido')); }
    });
    req.on('error', reject);
  });
}

const CLAUDE_PROMPT = `Eres un experto en copywriting viral para Instagram. Fórmula: CURIOSIDAD + PROMESA + URGENCIA.

Dado el transcript de un video, creá un carrusel de exactamente 7 slides.

ESTRUCTURA:
- Slide 1 | HOOK: Para el scroll. Máx 8 palabras. Número, pregunta o afirmación contraintuitiva.
- Slide 2 | PROBLEMA: Agitá el dolor. 2-3 puntos concretos con bullet (•).
- Slide 3 | PROMESA: La transformación concreta y medible.
- Slide 4 | REVELACIÓN 1: Primer insight clave. El "aha moment" #1.
- Slide 5 | REVELACIÓN 2: Más profundo que el anterior.
- Slide 6 | REVELACIÓN 3: El más valioso, el que nadie más dice.
- Slide 7 | CTA: Guardar + Compartir + Seguir. Con emoji de flecha →

REGLAS:
• Cada slide: máximo 25 palabras en body
• Bullets con • para listas
• Lenguaje directo, audaz, sin relleno
• Incluir subtítulo corto en cada slide

Respondé SOLO con JSON válido, sin markdown, sin texto extra:
{
  "topic": "tema en 3-5 palabras",
  "slides": [
    {
      "number": 1,
      "type": "HOOK",
      "emoji": "🎯",
      "title": "texto del título",
      "subtitle": "subtítulo corto",
      "body": "• punto uno\n• punto dos"
    }
  ]
}`;

// ── Handler principal ─────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const OPENAI_KEY    = process.env.OPENAI_API_KEY;
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

  if (!OPENAI_KEY || !ANTHROPIC_KEY) {
    return res.status(500).json({
      error: 'Faltan variables de entorno: OPENAI_API_KEY y/o ANTHROPIC_API_KEY'
    });
  }

  try {
    // ── 1. Leer body (el frontend manda { fileName, fileType, fileBase64 }) ──
    const body = await readBody(req);
    const { fileName, fileType, fileBase64 } = body;

    if (!fileBase64) {
      return res.status(400).json({ error: 'No se recibió el archivo.' });
    }

    // ── 2. Convertir base64 a Buffer ─────────────────────────────────────────
    const fileBuffer = Buffer.from(fileBase64, 'base64');

    // ── 3. Transcribir con Whisper API (OpenAI) ──────────────────────────────
    // Armamos un FormData nativo para enviar a OpenAI
    const { Readable } = await import('stream');
    const FormData = (await import('formdata-node')).FormData;
    const { fileFromPath } = await import('formdata-node/file-from-path');
    const { File } = await import('formdata-node');

    const formData = new FormData();
    const audioFile = new File([fileBuffer], fileName || 'audio.mp4', { type: fileType || 'video/mp4' });
    formData.set('file', audioFile);
    formData.set('model', 'whisper-1');
    formData.set('response_format', 'text');

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        ...formData.headers,
      },
      body: formData,
    });

    if (!whisperRes.ok) {
      const err = await whisperRes.text();
      throw new Error(`Whisper API error: ${err}`);
    }

    const transcript = await whisperRes.text();

    if (!transcript || transcript.trim().length < 10) {
      return res.status(422).json({
        error: 'No se detectó voz en el video. Asegurate de que tenga audio claro.'
      });
    }

    // ── 4. Generar carrusel con Claude ───────────────────────────────────────
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2000,
        system: CLAUDE_PROMPT,
        messages: [{
          role: 'user',
          content: `Transcript del video:\n\n---\n${transcript}\n---\n\nGenerá el carrusel viral.`
        }]
      }),
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.text();
      throw new Error(`Claude API error: ${err}`);
    }

    const claudeData = await claudeRes.json();
    let rawText = claudeData.content[0].text.trim();

    // Limpiar posibles markdown fences
    if (rawText.startsWith('```')) {
      rawText = rawText.replace(/```json\n?|```\n?/g, '').trim();
    }

    const carousel = JSON.parse(rawText);

    // ── 5. Responder ─────────────────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      transcript,
      carousel,
    });

  } catch (err) {
    console.error('Error en /api/process:', err);
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
}
