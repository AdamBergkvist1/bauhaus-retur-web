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

## 6. Leverantörsvillkor — research 2026-07-14

Undersökning av vad Vercel och Google faktiskt förbinder sig till, som
underlag för Legals bedömning. **Detta är inte en juridisk bedömning** —
det är en sammanställning av leverantörernas publicerade villkor.

### 6.1 Vercel — PUB-avtal finns redan förskrivet

Vercel har ett publicerat Data Processing Addendum (DPA) — motsvarigheten
till svenskt PUB-avtal — på https://vercel.com/legal/dpa

- Avtalet är förskrivet och anses undertecknat när man ingår avtal med
  Vercel. Det inkluderar EU:s standardavtalsklausuler (SCC) för
  dataöverföring till USA.
- Vercel agerar personuppgiftsbiträde (processor); kunden är
  personuppgiftsansvarig (controller).
- Vercels infrastruktur körs på AWS, Azure och Google Cloud.
- Vid uppsägning kan data hämtas eller raderas inom 90 dagar.

**Fråga för Legal:** räcker det förskrivna DPA:t, eller krävs formell
signering/granskning från Bauhaus sida innan personuppgifter behandlas
på plattformen?

### 6.2 Gemini API — VIKTIGT: gratistiern har andra villkor än betald

Appen använder Gemini Developer API (`generativelanguage.googleapis.com`,
modell `gemini-3.1-flash-lite`) på **gratistiern**. Googles villkor
(https://ai.google.dev/gemini-api/terms) skiljer skarpt mellan tiers:

**Gratistier ("Unpaid Services") — generella villkor:**
- Google använder inskickat innehåll och genererade svar för att
  utveckla Googles produkter och maskininlärningsteknik.
- Mänskliga granskare kan läsa och annotera API-input och output.
- Loggar sparas upp till 55 dagar.

**Betald tier ("Paid Services"):**
- Google använder INTE prompts eller svar för att förbättra sina produkter.
- Prompts loggas endast för missbruksövervakning, begränsad tid.

**EU-undantaget (gäller Bauhaus):**
Googles villkor anger att för den som befinner sig inom EES, Schweiz
eller Storbritannien gäller villkoren under "Paid Services" för ALLA
tjänster — inklusive gratiskvoten — även om de erbjuds kostnadsfritt.

**Tolkning:** eftersom Bauhaus är i Sverige (EES) gäller sannolikt de
betalda villkoren automatiskt för vår data, vilket skulle innebära att
**ingen modellträning sker på kunddata** trots gratistiern.

**MEN — en klausul pekar åt andra hållet:**
Samma villkor anger att man endast får använda Paid Services när man
gör API-klienter tillgängliga för användare inom EES/Schweiz/UK.
Appen kör idag på gratistiern.

**Konkret rekommendation (teknisk, inte juridisk):**
Aktivera fakturering (billing) på Gemini-projektet. Då gäller de betalda
villkoren entydigt, användarvillkoren följs, och tolkningsfrågan
försvinner. Med appens volym (några hundra ärenden/månad, Flash-Lite)
blir kostnaden försumbar — sannolikt några kronor per månad.

**Fråga för Legal:** hur ska dessa två klausuler tolkas tillsammans, och
är övergång till betald tier tillräckligt för att flödet ska vara
regelrätt?

## 7. Öppna frågor för Bauhaus IT/DPO

- Räcker Vercels förskrivna DPA (se 6.1), eller krävs formell signering
  från Bauhaus innan personuppgifter behandlas på plattformen?
- Hur ska Googles två klausuler tolkas tillsammans (se 6.2), och är
  övergång till betald Gemini-tier tillräckligt för att flödet ska vara
  regelrätt?
- Ordernumret skickas i klartext till Gemini (medvetet — se punkt 4).
  Är det acceptabelt, eller måste även det maskeras?
- Kunddata nådde Vercels infrastruktur via URL-parametrar fram till
  2026-07-14 (åtgärdat, se punkt 5). Behöver det rapporteras eller
  utredas separat?
- Finns policy för att läsa interna system (Puzzel/Magento/DHL) via egna
  bookmarklets, givet att det endast är läsrättigheter och ingen
  skrivning sker?
- Verktyget kan åtkomstskyddas, men det kräver Vercel Pro (~$20/mån) —
  eller att Bauhaus hostar det internt. Vilket är rätt väg?

Det här dokumentet ersätter inget juridiskt beslut — det är underlaget
för att fråga rätt personer rätt frågor.
