# Dataflöde — vad skickas vart

Det här dokumentet beskriver, ärligt och konkret, vilken data som
lämnar webbläsaren och vart den går. Syftet är att ge underlag för
ett samtal med Bauhaus IT/DPO om appens status — det är IT/DPO som
avgör om flödet är godkänt enligt GDPR och intern policy, inte det
här dokumentet.

Senast verifierad mot faktisk kod: 2026-07-14.

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

## 4. Lokal maskering — KLAR 2026-07-09
`anonymizeText()` i `app.js` ersätter kundens namn, adress, e-post och
telefonnummer med platshållare (`[KUNDNAMN]`, `[ADRESS]`, `[EPOST]`,
`[TELEFON]`) innan mejltexten skickas till Gemini, och återinjicerar
originalvärdena i UI:t efter svaret. Namn/adress maskeras endast vid
exakt matchning mot redan känd kunddata (från Magento-bokmärket), ingen
regex-gissning på fritext. **Ordernumret maskeras medvetet inte** —
Gemini-prompten behöver det för att extrahera ärendets ordernummer
automatiskt; att maskera det skulle bryta den funktionen.

Detta minskar mängden PII i själva mejltextens nätverksanrop, men ändrar
inte att en förfrågan fortfarande går till Vercel/Gemini, och löser inte
punkt 5 nedan (ett separat, allvarligare läckage).

## 5. Kunddata i URL — ÅTGÄRDAT 2026-07-14

**Tidigare problem:** Magento-bokmärket skickade kundens namn, adress, gata,
stad, telefon och e-post som URL-query-parametrar (`?name=...&address=...`),
och Puzzel-bokmärket skickade hela kundmejlets text (`?puzzel=...`). Eftersom
query-strängar skickas till servern och normalt loggas av hosting-plattformar
som standarddrift, innebar detta att kunddata nådde Vercels infrastruktur på
varje ärende.

**Åtgärd:** båda bokmärkena skickar nu datan i URL:ens **fragment** (`#`)
istället för query (`?`). Allt efter `#` skickas per webbstandard **aldrig
till servern** — webbläsaren behåller det lokalt. Kunddata når därmed aldrig
Vercels loggar. Appen (`app.js`) läser från `location.hash` med query som
fallback (bakåtkompatibilitet), och rensar dessutom adressfältet direkt efter
inläsning (`history.replaceState`) så datan inte ligger kvar synlig eller i
webbläsarhistoriken.

**Verifierat live 2026-07-14** med både Magento- och Puzzel-bokmärket: URL:en
i adressfältet är ren (`bauhaus-retur-web.vercel.app/`), och all data kommer
ändå fram korrekt till appen.

**Kvarstående, medveten avvägning:** kunddata skickas fortfarande som
query-parametrar till **DHL:s eget bokningsverktyg** (`mydhlfreight.com`) när
handläggaren klickar "Öppna i DHL". Detta är avsiktligt — det är data som ska
till DHL för att utföra returen, DHL är Bauhaus etablerade fraktleverantör,
och åtgärden initieras manuellt av handläggaren. Det är en annan riskklass än
att skicka data till en tredjepart utan avtal.

## 6. Öppna frågor för Bauhaus IT/DPO
- Är dagens flöde (maskerad mejltext → Vercel → Gemini, se punkt 4) godkänt,
  eller krävs ytterligare åtgärder innan verktyget kan användas i
  ordinarie drift?
- URL-PII-läckaget (punkt 5) är åtgärdat 2026-07-14, men kunddata nådde
  Vercels infrastruktur under perioden dessförinnan. Är det något som
  behöver rapporteras eller utredas separat?
- Krävs formellt personuppgiftsbiträdesavtal med Vercel/Google för
  den här typen av användning?
- Finns policy för att läsa interna system (Puzzel/Magento/DHL) via
  egna bookmarklets, givet att det endast är läsrättigheter och
  ingen skrivning sker?

Det här dokumentet ersätter inget juridiskt beslut — det är
underlaget för att fråga rätt personer rätt frågor.
