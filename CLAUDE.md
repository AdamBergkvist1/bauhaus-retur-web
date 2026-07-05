# CLAUDE.md — bauhaus-retur-web

Instruktioner för Claude (Code/Desktop) när den arbetar i detta repo.
Läs även `ATGARDSPLAN.md` (aktuell åtgärdsplan) och `TODO.md` (historik + backlog).

## Vad appen är

Webbapp för returhantering på BAUHAUS webshop-kundtjänst (Sverige).
Live: https://bauhaus-retur-web.vercel.app — deployas automatiskt vid push till `main`.
Flöde: klistra in kundmejl → analys (Gemini API + regex-fallback) → artikeluppslag
(Algolia) → returkommentar + fraktsedel + Puzzel-makron + DHL/Logistics-bokning.

## Arkitektur — viktigt att inte blanda ihop

- `app.js` (REPO-ROTEN) = frontend-logiken. Laddas av `index.html`.
- `api/` = Vercels serverless-funktioner. Innehåller ENDAST `shipping.js` och `gemini.js`.
- Filer i roten deployas ALDRIG som API-endpoints. Historik: två allvarliga
  incidenter har orsakats av redigering i fel fil (`api/app.js`-dubbletten,
  root-`gemini.js` som aldrig deployades). Skapa ALDRIG dubblettfiler.
- `test.html` = webbläsarbaserad testsvit. Funktionerna där är KOPIERADE från
  `app.js`, inte importerade. Varje ändring i `parseAllArticles`,
  `detectRiskKeywords` eller `extractPostcode` MÅSTE manuellt synkas till
  `test.html`, annars ljuger testsviten.
- `macros.js` = Puzzel-makrotexter. `analyzeCase.js` = regelbaserad ärendeanalys.

## Externa tjänster

- Gemini API: modell `gemini-3.1-flash-lite`, nyckel i Vercel env (`GEMINI_API_KEY`),
  auth via `x-goog-api-key`-header. Retry-logik finns i `api/gemini.js`.
- Algolia: app `TGPIEONN2S`, index `nordic_production_sv_products`.
  Matchning sker på `sku`-fältet — ALDRIG `objectID` (internt Magento-ID) eller URL-slug.
- Magento (orderbackend), Puzzel (ärendesystem), DHL MyFreight, Bauhaus Logistics —
  alla nås via bokmärken i webbläsaren på jobbet; kräver inloggning och kan INTE
  nås härifrån.

## Arbetsregler (obligatoriska)

1. **Diagnos före fix.** Gissa aldrig på grundorsak eller föreslå kodändring på
   antagande. Be om specifik diagnos först (DevTools Console/Network, exakt
   kommando, skärmdump av faktiskt resultat) och bekräfta innan fix föreslås.
   Vid osäkerhet om vilket ärende/fil/URL som avses — fråga explicit.
2. **En sak i taget.** Ett steg = en commit = en verifiering. Blanda aldrig fixar.
3. **Verifiera efter ändring.** Kontrollera att ändringen landade i rätt fil
   (git diff / läs filen igen) innan nästa steg.
4. **Rör inte fungerande logik.** Ändra bara det uppgiften anger. Ingen
   passa-på-refaktorering.
5. **Testsynk.** Parserändring → synka test.html → kör testsviten i webbläsaren.
6. **Regressionstest efter varje fas:** kör baslinjeärendet (order 113328701,
   artikel 1229844, förväntat: `1x 1229844 / 5704065006292`, risk=false).

## Kodkonventioner

- Vanilla JS, inga ramverk, inga byggverktyg. Svenska i UI-texter och kommentarer.
- `esc()` (finns i app.js) på ALL extern data som interpoleras i innerHTML.
- Artikelnummer = exakt 7 siffror; EAN = 13 siffror. Trunkera aldrig — validera.
- Ordernummer = 9 siffror som börjar på 1, matchas med sifferavgränsare
  `(?<!\d)(1\d{8})(?!\d)`.
- Clipboard-anrop ska alltid ha `.catch()` med synlig feedback.

## Aktuellt läge (uppdatera detta avsnitt vid större förändringar)

Se `ATGARDSPLAN.md` för fasstatus. Parkerat i väntan på tester på jobbet:
Bug 2-sluttest (namnmatchning mot riktiga Magento-artiklar), Fas 4.3-diagnos
(dubbeltrigg av runAnalysis), hela Fas 3 (kräver beslut F2/F3/F4).
