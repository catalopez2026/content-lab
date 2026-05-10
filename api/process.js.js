/**
 * /api/process
 * 1. Recibe el video en chunks desde el frontend
 * 2. Lo sube a Cloudinary para obtener URL pública
 * 3. Pasa la URL a AssemblyAI para transcribir
 * 4. Llama a Gemini para generar el carrusel
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
      try {
        const buf = Buffer.concat(chunks);
        resolve(JSON.parse(buf.toString()));
      } catch(e) { reject(e); }
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
  const CLOUD_NAME     = process.env.CLOUDINARY_CLOUD_NAME;
  const CLOUD_KEY      = process.env.CLOUDINARY_API_KEY;
  const CLOUD_SECRET   = process.env.CLOUDINARY_API_SECRET;

  if (!ASSEMBLYAI_KEY || !GEMINI_KEY || !CLOUD_NAME || !CLOUD_KEY || !CLOUD_SECRET) {
    return res.status(500).json({ error: 'Faltan variables de entorno' });
  }

  try {
    const body = await readBody(req);
    const { fileBase64, fileName, fileType } = body;
    if (!fileBase64) return res.status(400).json({ error: 'No se recibió archivo' });

    const fileBuffer = Buffer.from(fileBase64, 'base64');

    // ── 1. Subir a Cloudinary ────────────────────────────────────────────────
    // Firma para upload autenticado
    const timestamp = Math.floor(Date.now() / 1000);
    const crypto = await import('crypto');
    const signStr = `folder=content-lab&timestamp=${timestamp}&upload_preset=ml_default`;
    
    // Upload via multipart a Cloudinary
    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
    
    // Calcular firma SHA1
    const signature = crypto.default
      .createHash('sha1')
      .update(`folder=content-lab&timestamp=${timestamp}${CLOUD_SECRET}`)
      .digest('hex');

    // Construir multipart body manualmente
    const parts = [
      `--${boundary}\r\nContent-Disposition: form-data; name="file"\r\nContent-Type: ${fileType || 'video/mp4'}\r\n\r\n`,
      fileBuffer,
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="api_key"\r\n\r\n${CLOUD_KEY}`,
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="timestamp"\r\n\r\n${timestamp}`,
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="signature"\r\n\r\n${signature}`,
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="folder"\r\n\r\ncontent-lab`,
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="resource_type"\r\n\r\nvideo`,
      `\r\n--${boundary}--\r\n`,
    ];

    const bodyParts = parts.map(p => typeof p === 'string' ? Buffer.from(p) : p);
    const multipartBody = Buffer.concat(bodyParts);

    const cloudRes = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
      {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': multipartBody.length,
        },
        body: multipartBody,
      }
    );

    if (!cloudRes.ok) {
      const errText = await cloudRes.text();
      throw new Error(`Cloudinary error: ${errText}`);
    }

    const cloudData = await cloudRes.json();
    const videoUrl = cloudData.secure_url;

    // ── 2. Transcribir con AssemblyAI usando URL ─────────────────────────────
    const transcriptRes = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'authorization': ASSEMBLYAI_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ audio_url: videoUrl, language_detection: true }),
    });

    if (!transcriptRes.ok) throw new Error(`AssemblyAI error: ${await transcriptRes.text()}`);
    const { id: transcriptId } = await transcriptRes.json();

    // ── 3. Polling ───────────────────────────────────────────────────────────
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

    if (!transcript) throw new Error('Tiempo de espera agotado en transcripción.');

    // ── 4. Gemini ────────────────────────────────────────────────────────────
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
