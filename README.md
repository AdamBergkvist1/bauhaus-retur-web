# Bauhaus Returhantering – Webbapp

En webbapp för returhantering på Bauhaus webshop-kundtjänst.
Live: https://bauhaus-retur-web.vercel.app
Repo: https://github.com/AdamBergkvist1/bauhaus-retur-web

---

## Funktioner

- Klistra in kundmejl → automatisk analys (Gemini API + regex-fallback)
- Hittar artikelnummer, antal, postnummer, riskord
- Slår upp EAN + vikt + mått via Bauhaus/Algolia
- Ärendeanalys + makroförslag med riktiga Puzzel-texter
- Fraktsedel-innehåll med produktnamn
- Kollislag-förslag (Paket/HD/Pall) baserat på vikt och mått
- Volymberäkning (max-mått + volymbaserat) med DHL-gränser
- DHL-spårningskort: tre lägen (holding / levererat / osäkert) med manuell override
- Magento-bokmärke för automatisk postnummer- och produkthämtning
- Namn i makrotexter sparas lokalt i webbläsaren

---

## Arkitektur

Vanilla JS/HTML/CSS, inga byggverktyg. Vercel serverless-funktioner för
allt som kräver hemliga nycklar. Se `DATAFLOW.md` för exakt vilken data
som skickas vart.
