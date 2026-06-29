export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Missing text' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const model  = 'gemini-3.1-flash-lite';
  const url    = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const MALLAR = [
    "1 SE Webshop OF - DHL HD - Retur",
    "1 SE Webshop OF - DHL SP - Retur",
    "2 SE Webshop OF - PSC - Retur",
    "2 SE Webshop OF - PSH - Retur",
    "SE Webshop OF - DE STHLM - Retur",
    "SE Webshop OF - DE STHLM Sydost / Sydväst - Retur",
    "SE Webshop OF - DE GBG - Retur",
    "SE Webshop OF - DE GBG Syd / Norr - Retur",
    "SE Webshop OF - DE Knivsta - Retur",
    "SE Webshop OF - DE NKPG - Retur",
    "SE Webshop OF - DE Skåne - Retur",
    "SE Webshop OF - DE Skåne Ost - Retur",
    "SE Webshop OF - DE Växjö - Retur",
    "SE Webshop OF - DE Växsjö Norr - Retur",
    "SE Webshop OF - DE Bokad Retur",
    "SE Webshop OF - Kund ska returnera i VH - retur",
    "SE Webshop OF - Be om bilder (Ångerrätt/öppet köp löpt ut) - Retur",
    "SE Webshop OF - Saknade varor",
    "SE Webshop OF - Hygienartikel - Be om bilder"
  ];

  const today = new Date().toISOString().split('T')[0];

  const prompt = `
Du är en assistent för Bauhaus kundtjänst i Sverige. Analysera kundmejlet nedan och returnera BARA ett JSON-objekt, inga förklaringar eller markdown.

Fält:
- order: ordernummer (9 siffror som börjar på 1, t.ex. "113137825") eller null
- requested_time: exakt vad kunden skriver om önskat datum/tid, fritext eller null
- delivery_date: FÖRSTA datum kunden nämner på formatet YYYY-MM-DD, eller null. Dagens datum är ${today}.
- time_from: starttid för önskat tidsfönster på formatet HH:MM, eller null
- time_to: sluttid för önskat tidsfönster på formatet HH:MM, eller null
- articles: array med { articleNumber, quantity } – artikelnummer är EXAKT 7 siffror, ALDRIG ärendenummer inom parentes eller 9-siffriga ordernummer
- case_type: en av "retur", "reklamation", "leveransproblem", "fråga", "byte", "övrigt"
- macro_suggestion: välj det EXAKTA mallnamnet från listan nedan ENDAST om du är säker baserat på tydlig info i mejlet. Returnera "DE-retur" om kunden tydligt vill ha upphämtning med eget transportbolag. Returnera null om du är osäker på vilket fraktsätt som gäller – gissa INTE.
- summary: en mening på svenska som beskriver vad kunden vill
- risk: true om kunden nämner att varan är öppnad, använd, monterad eller skadad – annars false
- risk_reason: förklaring varför risk är true, eller null

Tillgängliga mallar:
${MALLAR.map((m, i) => `${i + 1}. ${m}`).join('\n')}

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
        generationConfig: { temperature: 0, maxOutputTokens: 1024 },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Gemini error:', response.status, errBody);
      return res.status(502).json({ error: `Gemini ${response.status}`, detail: errBody });
    }

    const data = await response.json();
    const raw  = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

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
