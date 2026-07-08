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
---

## Filstruktur

- `index.html` — UI-struktur
- `app.js` — all klientlogik (analys, matchning, DHL-kort, makron)
- `macros.js` — Puzzel-makrotexter
- `analyzeCase.js` — regex-baserad fallback-analys (körs om Gemini failar)
- `api/gemini.js` — serverless proxy mot Gemini API (döljer API-nyckeln)
- `api/shipping.js` — serverless proxy mot Algolia + bauhaus.se
- `test.html` — enhetstester för ren logik (matchning, parsing)
- `bookmarklets/` — versionerade kopior av bookmarklet-koden (se nedan)
- `TODO.md` — pågående och planerat arbete
- `ATGARDSPLAN.md` — historisk kodgranskning
- `DATAFLOW.md` — vilken data skickas vart, för intern GDPR-/IT-förankring

---

## Bokmärken

Bookmarklets körs i handläggarens redan inloggade webbläsarsession —
de **läser bara** data som redan visas på skärmen, gör inga skrivningar
mot Puzzel/Magento/DHL. Aktuell kod: `bookmarklets/`-mappen i repot.

### Bauhaus Magento (`bauhaus-magento-webb-shortcut.js`)
Körs på en Magento-ordersida. Hämtar postnummer och produktlista
(namn + artikelnummer + antal) och öppnar/uppdaterar appen i en
namngiven flik med datan i URL-parametrar.

### Puzzel (`puzzel-arende-analys.js`)
Hämtar ärendetext från Puzzel och skickar den till appen för analys.

### DHL-bokning (`DHL-bokning.js`)
Läser DHL Active Tracing-sidan, avgör sändningsstatus
(holding / levererat / osäkert) och skickar resultatet till appen.

### Bauhaus Returbokning (`bauhaus-returbokning.js`)
Stöd för intern DE-upphämtningsbokning (Bauhaus Logistics).

**Installation:** öppna respektive fil, kopiera den fullständiga
`javascript:`-raden, skapa ett nytt bokmärke i webbläsaren med den
raden som URL.

**Viktigt:** bokmärket i webbläsaren synkar INTE automatiskt när
koden i `bookmarklets/`-filerna ändras i repot. Efter varje commit
som ändrar en bookmarklet måste bokmärket uppdateras manuellt
(kopiera ny kod → redigera bokmärke → klistra in).

---

## Miljövariabler (Vercel)

Sätts under projektets Environment Variables i Vercel, aldrig i
klientkod:

- `GEMINI_API_KEY` — Google Gemini API-nyckel (AQ.-format),
  används i `api/gemini.js` via header `x-goog-api-key`

---

## Utveckling

Ingen lokal Node/npm-miljö krävs. Kod redigeras direkt via GitHub:s
webbeditor eller Claude Code, testas mot den skarpa Vercel-deployen
(auto-deploy på push till `main`). Rena logik-funktioner (parsing,
matchning) har testfall i `test.html`.
