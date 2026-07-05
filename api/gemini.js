export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Missing text' });
  }
  const apiKey = process.env.GEMINI_API_KEY;
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
- articles: array med { articleNumber, name, quantity } – detta är den AUKTORITATIVA artikellistan:
  - articleNumber: STRÄNG av EXAKT 7 siffror om det finns i texten, annars null
  - name: produktnamnet som kunden nämner (t.ex. "gräsklippare", "växthus", "häcksax") – alltid med om du kan utläsa det ur kontexten, annars null. Använd det mest beskrivande namnet kunden anger, på svenska. Om artikelnummer finns behöver du inte sätta name.
  - quantity: det FAKTISKA antalet kunden vill returnera
  - Ett sjusiffrigt nummer är BARA ett artikelnummer om det tydligt syftar på en produkt. Nummer som föregås av "ID", "bokning", "ärende", "ref" är INTE artikelnummer
  - Om samma artikel nämns flera gånger i citerade mejl räknas den EN gång
  - Exempel utan artikelnummer: kunden skriver "jag vill returnera en gräsklippare" → { "articleNumber": null, "name": "gräsklippare", "quantity": 1 }
  - Exempel med artikelnummer: "returnera 2x 1429515" → { "articleNumber": "1429515", "name": null, "quantity": 2 }
- case_type: en av "retur", "reklamation", "leveransproblem", "fråga", "byte", "övrigt"
- macro_suggestion: välj det EXAKTA mallnamnet från listan nedan ENDAST om du är säker baserat på tydlig info i mejlet. Returnera "DE-retur" om kunden tydligt vill ha upphämtning med eget transportbolag. Returnera null om du är osäker på vilket fraktsätt som gäller – gissa INTE.
- summary: en mening på svenska som beskriver vad kunden vill
- risk: true om kunden nämner att varan är öppnad, använd, monterad eller skadad – annars false
- risk_reason: förklaring varför risk är true, eller null
Tillgängliga mallar:
${MALLAR.map((m, i) => `${i + 1}. ${m}`).join('\n')}
OBS: Ärendehistoriken består ofta av många separata anteckningar/mejl avgränsade med "---", skrivna vid olika tillfällen. Samma artikel kan nämnas i flera av dessa enbart för uppföljning – det är fortfarande EN retur. Räkna aldrig en vara fler gånger än vad kunden faktiskt vill returnera.
Kundmejl:
"""
${text}
"""
`;
  const models = ['gemini-3.1-flash-lite', 'gemini-3.1-flash-lite'];
  let lastError = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const model = attempt < 2 ? models[0] : models[1];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    if (attempt === 1) {
      // Kort paus innan retry med samma modell
      await new Promise(r => setTimeout(r, 1000));
    } else if (attempt === 2) {
      // Lite längre paus innan vi byter till fallback-modell
      await new Promise(r => setTimeout(r, 1500));
      console.log('Gemini: byter till fallback-modell', model);
    }

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

      if (response.status === 503 || response.status === 429) {
        // Överlast eller rate limit — försök igen
        const errBody = await response.text();
        lastError = `Gemini ${response.status}: ${errBody}`;
        console.log(`Attempt ${attempt + 1} failed (${response.status}), retrying...`);
        continue;
      }

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
      lastError = err.message;
      console.log(`Attempt ${attempt + 1} fetch error:`, err.message);
      if (attempt < 2) continue;
    }
  }

  // Alla försök misslyckades
  console.error('Gemini: alla 3 försök misslyckades:', lastError);
  return res.status(502).json({ error: 'Gemini unavailable after 3 attempts', detail: lastError });
}
