export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'No text provided' });

  const apiKey = process.env.GEMINI_API_KEY;
  const today = new Date().toISOString().split('T')[0];

  const prompt = `Du är en assistent som extraherar information från svenska kundtjänstmejl för BAUHAUS. Dagens datum: ${today}. Extrahera följande och returnera ENDAST giltig JSON utan markdown: {"order": "ordernummer 9 siffror utan #", "articles": [{"sku": "7 siffror", "qty": antal}], "delivery_date": "YYYY-MM-DD eller null", "time_from": "HH:MM eller null", "time_to": "HH:MM eller null"}. Text: ${text}`;

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/interactions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          model: 'gemini-3.5-flash',
          input: prompt
        })
      }
    );
    const data = await response.json();
    console.log('Gemini data:', JSON.stringify(data).slice(0, 500));
    const raw = data.steps?.find(s => s.type === 'model_output')?.content?.[0]?.text || '{}';
    console.log('Gemini raw:', raw);
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    res.status(200).json(parsed);
  } catch (e) {
    console.error('Error:', e.message);
    res.status(500).json({ error: e.message });
  }
}
