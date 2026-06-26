export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'No text provided' });

  const apiKey = process.env.GEMINI_API_KEY;
  const today = new Date().toISOString().split('T')[0];

  const prompt = `Du är en assistent som extraherar information från svenska kundtjänstmejl för BAUHAUS.

Dagens datum: ${today}

Extrahera följande från texten och returnera ENDAST giltig JSON, inget annat:
{
  "order": "ordernummer (9 siffror, utan #)",
  "articles": [{"sku": "artikelnummer 7 siffror", "qty": antal}],
  "delivery_date": "YYYY-MM-DD eller null",
  "time_from": "HH:MM eller null",
  "time_to": "HH:MM eller null"
}

Om kunden skriver "förmiddagen" sätt time_from: "09:00", time_to: "12:00".
Om kunden skriver "eftermiddagen" sätt time_from: "12:00", time_to: "18:00".
Om kunden skriver "måndag" beräkna närmaste kommande måndag från dagens datum.

Text:
${text}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );
    const data = await response.json();
    console.log('Gemini data:', JSON.stringify(data).slice(0, 500));
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    console.log('Gemini raw:', raw);
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
