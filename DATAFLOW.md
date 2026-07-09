# Dataflöde — vad skickas vart

Det här dokumentet beskriver, ärligt och konkret, vilken data som
lämnar webbläsaren och vart den går. Syftet är att ge underlag för
ett samtal med Bauhaus IT/DPO om appens status — det är IT/DPO som
avgör om flödet är godkänt enligt GDPR och intern policy, inte det
här dokumentet.

Senast verifierad mot faktisk kod: 2026-07-08.

---

## Sammanfattning

| Data | Stannar i webbläsaren | Skickas externt |
|---|---|---|
| Kundmejlets fulltext (namn, adress, telefon, ordernummer om angivet) | — | ✅ till Vercel → Google Gemini API |
| Artikelnummer (produkt-SKU) | — | ✅ till Vercel → Algolia, och direkt webbläsare → Algolia |
| Postnummer, produktnamn, antal (från Magento-sidan) | ✅ (i URL/minne under sessionen) | Nej, förblir i webbläsaren |
| DHL-sändningsstatus | ✅ | Nej |
| Handläggarens namn (för makrotexter) | ✅ (localStorage) | Nej |
| Färdig DHL-mejltext / Puzzel-kommentar | ✅ (urklipp) | Nej — klistras in manuellt av handläggaren i Puzzel/mejlklient |

---

## 1. Vad som ALDRIG lämnar webbläsaren

- Bookmarklets läser data direkt från sidor handläggaren redan är
  inloggad på (Puzzel, Magento, DHL Active Tracing) — inga skrivningar
  görs mot dessa system.
- Artikel-matchning (`matchArticlesByName`), volymberäkning,
  kollislags-förslag: ren klientlogik, ingen nätverksanrop.
- DHL-kortets statuslogik (holding/levererat/osäkert): körs helt
  lokalt på data som redan hämtats.
- Handläggarens namn för makrotexter: `localStorage`, lämnar aldrig
  webbläsaren.
- Färdig mejltext/kommentar: hamnar i urklipp (`navigator.clipboard`),
  klistras in manuellt av handläggaren — går aldrig via appens egna
  servrar.

## 2. Vad som skickas till Vercel → Google Gemini API

**Fil:** `api/gemini.js`

Hela den inklistrade kundmejltexten skickas oformaterad (`req.body.text`)
i en prompt till Google Generative Language API
(`generativelanguage.googleapis.com`), via en Vercel serverless-funktion
som lägger till API-nyckeln (`GEMINI_API_KEY`, aldrig exponerad i
klientkod).

**Det betyder:** sedan 2026-07-09 maskeras kundens namn, adress, e-post
och telefonnummer lokalt i webbläsaren INNAN texten skickas (`anonymizeText()`
i `app.js`) — riktiga värden ersätts med platshållare som `[KUNDNAMN]`,
`[EPOST]`, `[TELEFON]`, `[ADRESS]`, och återinjiceras i UI:t efter svaret.

**Ordernumret maskeras medvetet INTE** — Gemini-prompten (`api/gemini.js`)
ber uttryckligen om att extrahera ett 9-siffrigt ordernummer ur texten för
att auto-fylla ärendet; att maskera det skulle bryta den funktionen. Namn
maskeras endast om det matchar exakt mot redan känd kunddata (satt av
Magento-bokmärket) — ingen generell regex-gissning på fritext, för att
undvika att av misstag maskera produktnamn eller annan text.

Kvarstående extern datapunkt: ordernummer (om det finns i mejlet) skickas
fortfarande i klartext till Gemini.

**Loggning:** `api/gemini.js` loggar endast HTTP-statuskoder och
felmeddelanden (`console.error`/`console.log`) — själva prompten
(kundtexten) skrivs aldrig till loggen i vår egen kod. Vercels
plattform kan dock logga anropsmetadata (tidpunkt, IP, statuskod)
som del av normal drift, oavsett vad vår kod gör — det är standard
för alla hostade tjänster och utanför appens kontroll.

## 3. Vad som skickas till Algolia / bauhaus.se

**Filer:** `api/shipping.js`, samt direktanrop i `app.js`
(`fetchProductFromAlgolia`).

Endast **artikelnummer** (produkt-SKU) skickas som sökfråga, för att
slå upp EAN/vikt/mått. Ingen kunddata (namn, adress, ordernummer)
ingår i dessa anrop. `api/shipping.js` används även för att hämta
Algolias publika API-nyckel via en generisk sökning på bauhaus.se
(sökordet är hårdkodat, t.ex. "hammer" — inte kopplat till något
ärende).

## 4. Vad som INTE är byggt än (backlog)

- **Lokal maskering (`anonymizeText()`):** skulle ersätta namn,
  e-post, telefon och ordernummer med placeholders innan text
  skickas till Gemini, och återinjicera originalvärdena i UI:t efter
  svaret. Minskar mängden PII som lämnar webbläsaren — men ändrar
  inte att en nätverksförfrågan fortfarande går till Vercel/Gemini.
  Se `TODO.md`.

## 5. Öppna frågor för Bauhaus IT/DPO

- Är dagens flöde (omaskerad mejltext → Vercel → Gemini) godkänt,
  eller krävs maskering (punkt 4) innan verktyget kan användas i
  ordinarie drift?
- Krävs formellt personuppgiftsbiträdesavtal med Vercel/Google för
  den här typen av användning?
- Finns policy för att läsa interna system (Puzzel/Magento/DHL) via
  egna bookmarklets, givet att det endast är läsrättigheter och
  ingen skrivning sker?

Det här dokumentet ersätter inget juridiskt beslut — det är
underlaget för att fråga rätt personer rätt frågor.
