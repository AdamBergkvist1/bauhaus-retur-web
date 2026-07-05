---
name: retur-verifiering
description: Obligatoriskt verifieringsflöde efter VARJE kodändring i bauhaus-retur-web. Använd denna skill varje gång en fil i repot har redigerats, skapats eller tagits bort — innan ändringen committas och innan nästa uppgift påbörjas. Gäller ändringar i app.js, api/gemini.js, api/shipping.js, macros.js, analyzeCase.js, index.html och test.html.
---

# Retur-verifiering — körs efter varje kodändring

Detta flöde är obligatoriskt. Hoppa aldrig över steg. Rapportera resultatet av
varje steg till Adam innan commit föreslås.

## Steg 1 — Syntaxkontroll

Kör `node --check <fil>` på varje ändrad `.js`-fil. För `api/`-filer och
`app.js` är detta ett hårt krav — en syntaxtrasig fil i `api/` tar ner
live-endpointen vid nästa deploy (Vercel deployar automatiskt vid push).

## Steg 2 — Testsynk (endast vid parserändringar)

Om någon av dessa funktioner i `app.js` ändrats:
- `parseAllArticles`
- `detectRiskKeywords`
- `extractPostcode`

...då MÅSTE samma ändring kopieras manuellt till `test.html` (funktionerna där
är kopior, inte importer). Verifiera synken genom att extrahera funktionskroppen
ur båda filerna och jämföra att de är identiska (normalisera whitespace).
En osynkad test.html gör testsviten tyst lögnaktig — grön på gammal kod.

Påminn Adam om att öppna `test.html` i webbläsaren och köra sviten (17+ fall)
efter push.

## Steg 3 — Rätt fil-kontroll

Bekräfta att ändringen ligger i EXAKT den avsedda filen:
- Frontend-logik = `app.js` i REPO-ROTEN
- Serverless = ENDAST `api/gemini.js` eller `api/shipping.js`
- Skapa ALDRIG nya filer i roten med samma namn som api/-filer eller tvärtom.
  Historik: två allvarliga incidenter från dubblettfiler (api/app.js,
  root-gemini.js).

Kör `git status` och `git diff --stat` och bekräfta att ENDAST avsedda filer
är ändrade. Oväntade filer i diffen = stoppa och fråga Adam.

## Steg 4 — En sak i taget

En logisk ändring = en commit. Om diffen innehåller mer än uppgiften krävde:
dela upp eller backa det extra. Föreslå commit-meddelande på engelska,
beskrivande, i imperativ ("Fix...", "Add...", "Remove...").

## Steg 5 — Regressionspåminnelse

Efter push, påminn Adam att köra baslinjeärendet i live-appen:

```
Hej,

Jag vill returnera 1x 1229844 från order 113328701. Varan är oöppnad och
ligger kvar i originalförpackningen.

Mvh
```

Förväntat resultat: `1x 1229844 / 5704065006292`, Totalvikt 3,5 kg,
INGEN riskflagga, Magento/DHL-länkar med order 113328701.
Avvikelse = stoppa, diagnostisera innan nästa steg (se CLAUDE.md arbetsregel 1:
diagnos före fix, gissa aldrig).

## Steg 6 — Push-läget

Push från Claude Code-miljön kan misslyckas (ingen credential helper).
Om push misslyckas: be Adam köra `git push` i Terminal (hans token finns där).
Verifiera efter push att committen syns på origin/main (`git fetch && git status`).
