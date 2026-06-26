// api/gemini.js – Vercel serverless function
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Missing text' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const model  = 'gemini-3.1-flash-lite';   // tillgänglig på free tier
  const url    = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const prompt = `
Du är en assistent för Bauhaus kundtjänst i Sverige.
Extrahera följande fält från kundmejlet nedan. Svara BARA med ett JSON-objekt, inga förklaringar.

Fält:
- order: ordernummer (siffror, t.ex. "113137825") eller null
- requested_time: exakt vad kunden skriver om önskat datum/tid för upphämtning, fritext, eller null
- articles: array med { articleNumber, quantity } – artikelnummer är 7 siffror

Kundmejl:
"""
${text}
"""
`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 512 },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Gemini error:', response.status, errBody);
      return res.status(502).json({ error: `Gemini ${response.status}`, detail: errBody });
    }

    const data = await response.json();
    const raw  = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // Strippa eventuella ```json ... ``` wrappers
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      return res.status(200).json({ raw, error: 'JSON parse failed' });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('Fetch error:', err);
    return res.status(500).json({ error: err.message });
  }
}
