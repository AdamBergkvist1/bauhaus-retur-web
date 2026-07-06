# Projektlogg: Bauhaus Returhantering — Webbapp
# Senast uppdaterad: 2026-07-06

## 🎯 Målsättning
Automatisera och kvalitetssäkra returhanteringen genom att snabbt extrahera data
(vikt, antal, frakt) och eliminera manuellt arbete i Puzzel-ärendesystemet.
Webbappen (bauhaus-retur-web.vercel.app) ersatte det tidigare Chrome-tillägget
efter att IT blockerade extensions.

---

## ✅ Klart

### Kärnfunktionalitet
- Artikeluppslag via Algolia (EAN + vikt + SKU)
- Fraktalternativ hämtas automatiskt baserat på artiklar + postnummer
- Postnummer extraheras automatiskt från markerad text
- Billigaste frakt väljs automatiskt, kan bytas manuellt
- Returkommentar byggs i rätt ordning (frakt → artiklar → totalvikt)
- Riskords-detektion (öppnad/använd/trasig) med negationshantering
- Dubbelnoterings-detektion (samma vara som SKU + EAN)
- Manuell inmatning som fallback om artikel ej hittas
- Gemini AI-integration (gemini-2.5-flash-lite) för ärendeanalys, med
  regex-baserad analyzeCase.js som fallback
- Fraktsedel-innehåll: kollislag, mått (max-mått + volymbaserat), kopiera-knapp

### Design V2 (2026-06-29 — 2026-06-30)
- Fullständig visuell + UX-redesign byggd via Claude Design, mergad manuellt
  till `index.html` / `style.css` / `app.js` på branchen `Design-V2`
- Numrerad stepper-indikator (Klistra in mejl → Granska & välj frakt → Kopiera)
- Neutral "Ärende-assistent"-panel (höger kolumn), röd accentkant på
  sektionsrubriker, mer whitespace, Inter-typsnitt
- Magento/DHL/Logistics-knappar flyttade till egen rad, större, med
  aktiveringslogik (Magento alltid aktiv, DHL/Logistics dimmade tills
  artiklar/EAN hittats) och hover-tooltips som förklarar vad varje knapp gör
- Hjälpmodal (?-knapp i header) med 7-stegs guide + knappförklaringar + tips
- Postnummerfält dolt i UI (kvar i DOM för bookmarklet-kompatibilitet) —
  fältet fylls alltid automatiskt via Magento-bokmärket, skrivs aldrig manuellt
- "Frakt & kostnad"-sektionen (fraktalternativ+pris) helt dold i UI (display:none,
  koden kvar i DOM/app.js orörd). Anledning: krävde en aktiv inloggad
  bauhaus.se-session för att simulera varukorg, vilket bara fungerade i den
  gamla Chrome-extension-arkitekturen — går inte att replikera i en fristående
  Vercel-app. Returkostnad hanteras istället via DHL-knappen + makroförslagen.
- Sektionsordning omstrukturerad: Returkommentar → Klar kommentar (Steg 3) →
  Fraktsedel-innehåll (tidigare låg Fraktsedel-innehåll mitt i flödet, före
  Klar kommentar, vilket inte matchade verkligt arbetsflöde)
- Kodbas uppdelad: index.html (struktur) / style.css (all styling) /
  app.js (all logik) — tidigare allt-i-ett i index.html
- **Status:** Live på Vercel, mergad till main, i produktion.

### Gemini-driven artikellista (2026-06-30)
- **Bug:** regex-parsern (`parseAllArticles`) dubbelräknade artiklar i långa
  ärendehistoriker där samma artikel+EAN nämns flera gånger i separata
  interna anteckningar/citerade mejl (t.ex. en bandlastar-retur som
  nämndes 3 gånger i tråden gav felaktigt "3x" istället för "1x").
- **Fix:** Gemini (`api/gemini.js`) är nu primär källa för artikellista +
  kvantitet — den läser hela sammanhanget och förstår att upprepade
  nämnanden i en ärendehistorik är samma retur. Regex-parsern är kvar som
  fallback bara om Gemini-anropet misslyckas helt. Dubbelt skydd:
  1) Gemini-prompten har explicita regler (artikelnummer alltid 7-siffrig
     sträng, bokningsnummer/ID är ALDRIG artikelnummer, upprepade nämnanden
     i `---`-avgränsad ärendehistorik räknas en gång)
  2) `app.js` deduplicerar ändå alltid på articleNumber och tar HÖGSTA
     angivna kvantitet (inte summan) som extra säkerhetsnät, oavsett vad
     Gemini råkar svara
- Diskret varningstext i statusraden ("⚠️ Använde reservanalys...") visas
  om Gemini misslyckas och regex-fallback används, så man vet att extra
  koll på artikelantal kan behövas
- Verifierat fungerande på bandlastar-ärendet (Anders/Knivsta, artikel
  1524645) — gav korrekt 1x efter fixen

### Adressformat-bugg i DE-returbokning (2026-06-30)
- **Allvarlig bug:** Bauhaus Logistics-formuläret kräver att kundadressen
  fylls i som "Gata, Stad, Postnummer, Land" — annars geokodar Magento
  adressen felaktigt (ett verkligt fall skickade en retur till en halvö
  utanför Helsingfors istället för Sverige). Bauhaus Returbokning-bokmärket
  fyllde bara i gatan, inte hela formatet.
- **Fix:** Adressextraktionen i Returbokning-bokmärket bygger nu en komplett
  "Gata, Stad, Postnummer, Land"-sträng. Extraktionen sker mönsterbaserat
  relativt postnummer-radens position (inte hårdkodade radnummer), eftersom
  adressblockets antal rader kan variera (5 eller 6 rader). Verifierat med
  flera olika adresser.

### Bokmärkesfixar — arkiv-hantering (2026-06-30)
- **Bug:** Magento- och Bauhaus Returbokning-bokmärkena kunde inte hitta
  ordrar som flyttats till Magentos arkiv ("Vi kunde inte hitta...").
  Roten: "Go to Archive" är en `<button id="go_to_archive">`, inte en
  `<a>`-länk — textmatchning på `<a>` missade den helt.
- **Fix:** Båda bokmärkena uppdaterade till att använda
  `document.getElementById('go_to_archive')`, öppna Filter-panelen om den
  är stängd innan sökfältet fylls i, och spara sökordernumret i
  sessionStorage (`magento_pending_search` / `bl_pending_search`) eftersom
  Magento gör en full sidnavigering till arkivet — JS-kontexten nollställs
  och kan inte själv fortsätta efter klicket. Lösning: bokmärket körs en
  gång till manuellt (med tydlig alert-instruktion) på arkivsidan, då
  läses sessionStorage och resten av flödet (sök → Apply Filters → Visa)
  sker automatiskt.
- Verifierat fungerande för både vanliga ordrar och arkivordrar, i båda
  bokmärkena.

### Övriga Design V2-fixar (2026-06-30)
- Fraktsedel-innehåll (kvantitet, totalvikt, mått, kollislag) uppdaterades
  inte när man ändrade artikelantal via +/- knapparna efter analys — bara
  "Klar kommentar" hängde med. Fixat: `updateShippingContents()` anropas nu
  även från qty-knapparnas click-handler.

### Testverktyg (2026-06-30)
- Adam kan inte installera mjukvara (Node/npm) på jobbdatorn — all testning
  måste kunna köras direkt i webbläsaren utan installation.
- Byggde `test.html`: en fristående sida (ingen build-process, inga externa
  libs) som kör 17 testfall direkt i webbläsaren mot kopior av de "rena"
  funktionerna (parseAllArticles, detectRiskKeywords, extractPostcode).
  Visar grön/röd sammanfattning + exakt förväntat vs faktiskt värde vid fel.
  Nås via [preview-url]/test.html.
- Testfallen inkluderar permanenta regressionstester för redan hittade buggar
  (bandlastar-dubbelräkningen, bokningsnummer-som-artikelnummer), medvetet
  formulerade som "känd regex-begränsning, skyddet ligger i Gemini-prompten
  + app.js-dedupe" snarare än att kräva att regex-parsern själv fixas.
- **VIKTIGT att komma ihåg:** funktionerna i test.html är KOPIOR av de i
  app.js, inte samma kod som körs live. Om parseAllArticles, detectRiskKeywords
  eller extractPostcode ändras i app.js måste motsvarande funktion i test.html
  uppdateras manuellt, annars testar testsidan fel/gammal kod.

### Session 2026-07-02 — Fel artikelnummer vid returhantering (flytväst-ärendet, order 113274661)

- **Bug A — Race condition i app.js:** Överlappande `runAnalysis()`-körningar
  kunde skriva över varandras artikelresultat. Roten: `resolvedArticles` var
  en delad global array som skrevs in av `lookupOne(article, idx)` via index,
  asynkront, utan någon spärr mot att en NYARE analys hunnit starta innan en
  ÄLDRE, långsammare körning hann skriva klart. En sen/långsam körning kunde
  då skriva sitt (gamla, irrelevanta) resultat rakt in i en redan färdig, ny
  analys' array.
  **Fix:** `analysisGeneration`-räknare (`let analysisGeneration = 0;` i
  State-sektionen) + `myGeneration = ++analysisGeneration` vid start av
  `runAnalysis`. `lookupOne(article, idx, target)` tar nu emot en pinnad
  array-referens (`myArticles`) istället för att skriva mot den globala
  variabeln, och ett guard-check (`if (myGeneration !== analysisGeneration) return;`)
  kastar resultatet om en nyare körning hunnit starta under tiden.
  Committat i `app.js` (tre ställen: State-deklaration, `runAnalysis`, `lookupOne`).
  Känd, kvarstående dubbeltriggning av `runAnalysis()` vid sidladdning
  (två separata `setTimeout`-anrop, rad ~138/~173) gör nu ingen skada tack
  vare guard-checken, men är inte städad bort — se backlog.

- **Bug B — Osäker Algolia-fallback i api/shipping.js:** I
  `action === "product"`-hanteraren föll koden tillbaka på `hits[0]` (första
  Algolia-sökresultatet) om ingen träff hade exakt matchande `objectID`
  eller URL — oavsett relevans. Orsakade att avpublicerade/discontinued
  artiklar (verifierat via SAP: artikel 1258319, flytväst, "Active For
  Purchasing: Discontinued (V)") matchades mot en helt orelaterad produkt
  (fågelmatare, art. 1025460).
  **Fix:** Tar bort `?? hits[0]`-fallbacken, kastar nu tydligt fel
  (`"Artikeln hittades inte i Algolia (kan vara avpublicerad)."`) istället.
  Triggar det redan befintliga "Ange manuellt"-flödet (`openManual`/
  `saveManual`). Committat i `api/shipping.js`. Verifierat konsekvent
  (3/3 test) efter fix.
  Vid manuell inmatning för avpublicerade artiklar: hämta EAN + vikt från
  SAP (exempel för 1258319: GTIN 7392715582142, vikt 0,496 kg).

- **DHL-bokmärket** (gatuadress) — granskat, sett korrekt ut vid första
  anblick (fyller gata/postnummer/stad i separata fält). Visade sig senare
  (se Session 2026-07-03, Bug D) att den underliggande orsaken låg i
  `app.js`, inte i själva DHL-bokmärket.

### Session 2026-07-03 — Fel artikel (SKU-matchning) och gatuadress till DHL

- **Bug C — Algolia-matchning kollade fel fält (order 113328701, artikel
  1229844, "SKORSTENSSTÖD ADURO TELESKOP"):** Efter gårdagens fix (Bug B)
  gav vissa AKTIVA, publicerade artiklar ändå "hittades inte", trots att de
  fanns i Algolia. Roten: matchningen i `api/shipping.js` kollade bara
  `objectID` och Algolias URL-slug mot det sökta artikelnumret — men
  Algolias `objectID` är ett internt Magento-produkt-ID (t.ex. `409403`),
  inte artikelnumret, och produkt-URL:er är SEO-slugs utan siffror
  (`/skorstensstod-aduro-teleskop`). Det korrekta fältet, `sku`, lästes ut
  men användes aldrig för själva matchningen. Bekräftat med tillfällig
  `debugHits`-diagnostik i API-svaret (borttagen igen efter felsökning).
  **Fix:** `best`-matchningen kollar nu `sku` FÖRST, innan `objectID`/`url`
  som sekundära fallbacks. Committat i `api/shipping.js`. Verifierat
  fungerande (1229844 gav korrekt `1x 1229844 / 5704065006292`).

- **Bug D — Gatuadress till DHL innehöll hela adressen istället för bara
  gatan (Maria Lovisa Sundberg-ärendet, "Nästakvarn 1, Källby"):** DHL-
  formulärets Gatuadress-fält fylldes med
  `"Nästakvarn 1, Källby, 53173, Sverige"` istället för bara
  `"Nästakvarn 1"`. Felsökningen var ovanligt lång (se lärdomar nedan) —
  misstänkte först Magento-bokmärkets `getAddr()`-radextraktion
  (verifierad korrekt via tillfällig `console.log("DEBUG adressrader:",
  lines)` i bokmärket, sen borttagen), men den faktiska roten var att
  `app.js` aldrig läste in `street`-URL-parametern alls — bara `address`
  (den fulla, hopsatta strängen). DHL-bokmärkets egen fallback
  (`p.get("street")||p.get("address")`) föll därför alltid tillbaka på
  den fulla strängen, eftersom `street` aldrig fanns i webbappens URL
  till DHL-portalen.
  **Fix:** `app.js` läser nu in `urlStreet` (`urlParams.get("street")`),
  sparar den i `localStorage["bauhaus_customer_street"]`, och `dhlBtn.href`
  skickar `&street=...` (istället för `&address=...`) vidare till DHL-
  portalen. Committat i `app.js`.

- **Extra städning — `api/app.js`-dubblett borttagen:** Under Bug D-
  felsökningen upptäcktes en gammal, oanvänd kopia av `app.js` som av
  misstag legat kvar i `api/`-mappen (helt annan, äldre version — saknade
  bland annat `analysisGeneration`). Detta orsakade en stor del av
  förvirringen: en av gatuadress-fixens ändringar råkade committas till
  fel fil (`api/app.js` istället för roten `app.js`), vilket fick det att
  se ut som ett Vercel cache/deploy-problem i timmar innan filförväxlingen
  upptäcktes. Bekräftat via sökning att `api/app.js` inte refererades
  någonstans i övrig kod (ingen fetch, ingen import, ingen
  `export default function handler` som krävs för att fungera som
  Vercel serverless-funktion) — säker att ta bort. Borttagen.

- **Lärdom, tillagd som stående arbetsprincip:** gissa aldrig på en
  grundorsak eller föreslå en kodändring baserat på antagande. Be alltid
  användaren köra en specifik diagnos först (DevTools console/Network-flik,
  exakta kommandon, skärmdumpar av faktiskt resultat) och bekräfta fynd
  innan ändringar föreslås. Vid osäkerhet om vilken order/vilket
  ärende/vilken fil som avses — fråga explicit istället för att anta.
  (Sparad i Claudes minne, gäller genomgående för projektet.)

---

## 📋 Backlog (Prioriteringsordning)

### Fas 1: Slutföra Design V2
- [x] Bygga test.html som webbläsarbaserad testsvit (klart 2026-06-30)
- [x] Merge `Design-V2` → `main` (klart, live i produktion)
- [ ] Uppdatera bokmärkena permanent till produktions-URL om något
      fortfarande pekar mot en gammal preview-URL

### Fas 2: Testverktyg / kvalitetssäkring — PÅGÅENDE
test.html finns och täcker parseAllArticles, detectRiskKeywords,
extractPostcode (17 testfall). Kvarstående:
- [ ] Hålla test.html i synk manuellt när funktionerna i app.js ändras
      (funktionerna är kopierade, inte importerade — kräver disciplin)
- [ ] Överväg att lägga till testfall för adressformaterings-logiken i
      Returbokning-bokmärket (gata/stad/postnummer/land-extraktion), eftersom
      det är DOM-beroende men mönstret (extrahera ur radstruktur) skulle
      kunna testas isolerat med exempel-HTML-strängar
- [ ] Regressionscheck-lista för manuell test efter UI/JS-ändringar (separat
      från test.html, för saker som inte går att automatisera i webbläsaren)
- [ ] Bokmärkes-specifik hälsokontroll — snabb konsol-snutt för att verifiera
      att alla DOM-selektorer bokmärkena beror på fortfarande matchar något
- [x] Städa bort dubbeltriggningen av `runAnalysis()` vid sidladdning
      (rad ~138 och ~173 i app.js, två separata `setTimeout`-anrop som kan
      båda trigga). Ofarligt nu tack vare `analysisGeneration`-guarden, men
      onödigt dubbelt nätverksanrop mot Gemini varje gång det inträffar.
      **Diagnos 2026-07-06:** Puzzel-URL saknar `postcode=` → dubbeltrigg
      sker aldrig i praktiken. Stängd utan kodändring.

### Fas 3: Nya funktioner — planerade

#### Fall 1 — Magento-bokmärket läser artiklar från orderdetaljsidan
**Bakgrund:** Kundtjänst skapar ibland ärenden där de skriver varunamn (t.ex.
"VÄXTHUS CANOPIA HARMONY ALU/POLY 4,6M²") men inte artikelnummer, eller där
inget artikelnummer alls nämns men det tydligt framgår att HELA ordern
returneras (t.ex. hela paketet gick i retur/kunden nekade hela leveransen).
**Verkliga exempel att testa mot när funktionen byggs:** ärende #2130731 och
#2131316 (2026-07-03) — inget artikelnummer i ärendetexten, men tydligt att
hela ordern ska returneras. #2131316 fungerade redan delvis (hämtade
varorna) — bra jämförelsefall.

**Plan:**
- Utöka Magento-bokmärket att läsa "Beställda produkter"-tabellen på orderdetaljsidan
  och extrahera: artikelnummer (synligt som "Artikelnummer: XXXXXXX" under produktnamnet),
  produktnamn och antal
- Skicka dessa med till appen som ny URL-parameter `products=` (JSON-array)
- I appen: om Gemini/regex inte hittar några artiklar MEN Magento-artiklar finns
  i URL:en, visa dem direkt i Returkommentar-sektionen som om de vore analyserade
- **Status: DELVIS PÅBÖRJAD** — `magentoProducts`/`products=`-parametern och
  fallback-logiken (`if (articles.length === 0) { ... magentoProducts ... }`)
  finns redan i `app.js`. Namn-matchningsdelen (se Bug 2 nedan) är den bit
  som fortfarande har problem.

#### Bug 2 — Namn-matchning mot Magento misslyckas (gräsklippare-ärendet, order 113343937)
**Bakgrund:** När Gemini returnerar `name` utan `articleNumber` (t.ex.
"gräsklippare") ska `app.js` matcha mot `magentoProducts` (från Magento-
bokmärkets `products=`-URL-parameter) via `withNumber`/`nameOnly`-filtreringen
i `runAnalysis`. I gräsklippare-ärendet visades hela ordern (4 artiklar)
istället för bara gräsklipparen.

**Nästa felsökningssteg (samma metod som fungerade för Session 2026-07-02
och 2026-07-03):** Öppna DevTools (F12) → Network-fliken → kör Analysera på
gräsklippare-ärendet → klicka på `/api/gemini`-anropet → Response-fliken.
Se om Gemini faktiskt returnerade ett `name`-fält för artikeln eller inte.
Det avgör om felet ligger i Geminis output/prompt eller i matchningslogiken
(`matchedFromName`, i app.js) som redan finns för det här fallet.

**Status: STÄNGD (verifierat på jobbet 2026-07-06)** — name-matchning gav
korrekt enskild artikel 1429515 på order 113343937 (visade EN artikel, inte
fyra). EAN-avvikelsen mot ärendetråden var INTE en bugg: artikeln har två
giltiga GTIN i SAP (4046664217572 + 4046664222217) och appen visade webbens
korrekta. Matchningslogiken (`matchedFromName`) fungerar — Fas 5.5 behövs inte.

#### Fall 2 — Fel artiklar plockas upp av Puzzel-bokmärket (Dmitry-ärendet)
**Bakgrund:** I Dmitry-ärendet plockar Puzzel-bokmärket upp artikelnumret
`1068602` (VINKELFÄSTE) trots att det inte syns i mejltexten. Trolig orsak:
bokmärket läser från en iframe som inte är synlig på skärmen (relaterat ärende,
signaturblock eller metadata i Puzzel-gränssnittet).

**Plan:**
- Felsök vilken iframe som innehåller `1068602` — lägg till console.log i
  bokmärket som loggar innehållet i varje iframe innan det filtreras
- Om problemet kan isoleras: lägg till ett filter som exkluderar den iframe-typen

**Status: EJ PÅBÖRJAD — låg prioritet, kräver felsökning vid nästa tillfälle
detta inträffar**

#### Fall 3 — DHL-retur-mejl genereras automatiskt
**Bakgrund:** 5-10 ärenden per dag där kund nekar leverans eller DHL kör tillbaka
sändningen. Kräver ett specifikt formaterat mejl till DHL:s kontor
(dhlfreightkad.dom.se@dhl.com) med sändningsnummer, artiklar med EAN+antal,
produktlänkar och beskrivning av emballage. Idag skrivs detta manuellt.

**Förutsättningar för att mejlet ska kunna genereras:**
- Sändningsnumret (det långa, t.ex. `37332538642990565`) finns i Magento-bokmärkets
  `href`-attribut på "Spåra denna leverans"-länken — kan extraheras automatiskt
- Artiklar med EAN kommer från Algolia-uppslaget som redan sker
- Produktlänkar byggs som `https://www.bauhaus.se/search?q=[artikelnummer]`
  (enkel men fungerande länk som DHL-personal kan klicka för produktinfo)
- Standardtext om bauhaus-emballage/tejp är densamma för alla ärenden
- **Active Tracing-kontrollen görs manuellt av handläggaren** — man måste
  besöka Active Tracing-sidan och bekräfta att sändningen faktiskt inte är
  mottagen av kund (status "nekad" / "returneras till avsändaren") innan mejlet
  skickas. Detta kan inte automatiseras säkert i nuläget.

**Plan — fas 3a (bygg nu, låg risk):**
1. Magento-bokmärket extraherar sändningsnumret från href-attributet och skickar
   det med till appen som URL-parameter `tracking=`
2. Gemini-prompten utökas med ärendetyp "dhl_retur" för ärenden där kund nekar
   leverans / DHL kört tillbaka sändningen
3. Om Gemini identifierar ärendet som "dhl_retur" visar appen ett extra kort i
   Ärende-assistent-panelen med:
   - Sändningsnummer (förifyllt från URL-parametern, redigerbart)
   - Komplett mejlutkast färdigt att kopiera, med korrekt format:
     * Rubrik: "Retur av sändning [nummer] - BAUHAUS"
     * Till: dhlfreightkad.dom.se@dhl.com
     * Från: reklamation@bauhaus.se
     * Artikelrader med EAN och antal
     * Produktlänkar
     * Standardtext om emballage
   - Knapp "📋 Kopiera DHL-mejl"
4. Du skapar child ticket i Puzzel manuellt och klistrar in utkastet

**Plan — fas 3b (framtida, efter fas 3a verifierats):**
- Bokmärke som öppnar Active Tracing-sidan OCH läser av status automatiskt,
  sparar sändningsnumret till sessionStorage — eliminerar manuellt steg
- Puzzel-integration: bokmärke som skapar child ticket automatiskt med
  mejlutkastet förifyllt (kräver noggrann testning av Puzzel API/DOM)

**Status: GRUNDORSAK BEKRÄFTAD 2026-07-06 — kortet har ALDRIG fungerat i
webbversionen.** Konsoltest visade att `localStorage.getItem` returnerar
`null`: localStorage delas inte mellan `activetracing.dhl.com` och appens
origin (en kvarleva från extension-arkitekturen). `showDHLCard` +
polling-koden är intakta men får aldrig någon data. **Fix:** DHL-grenen i
`bookmarklets/bauhaus-magento-webb-shortcut.js` ska skicka data via
URL-parametrar istället, och `app.js` läser dem vid load. **Designfråga:**
en ny flik saknar analyserade artiklar (kopplas till Fas 3.2 i ATGARDSPLAN —
DHL-kort ska vägra tom artikellista). Se Fas 3.6 i ATGARDSPLAN.md.

### Fas 4: Volym & Mått
- [ ] Verifiera DHL/BAUHAUS Tidsbestämd-format för mått vid bokning
      (L×B×H i cm eller mm?) och justera Fraktsedel-innehåll vid behov
- [ ] Måttextraktion (`api/shipping.js`, se ATGARDSPLAN Fas 5.6).
      **Diagnos 2026-07-06:** måtten ligger i `td.dimensions` `title`-attribut
      i tabellen med scope `pc-variants-attributes-table`. Vissa produkter
      saknar raden legitimt. Fix: läs cellen istället för regex över hela
      sidan. SAP har ofta mått när webben saknar.

### Fas 5: Framtida förbättringar
- [ ] Migrera till TypeScript (kräver byggsystem, komplicerar installationen)
- [ ] Fraktberäkning v3 — återanvänd aktiv bauhaus.se-session för snabbare
      varukorgsskapning utan REST-anrop.
      **Beslut 2026-07-06 (F2, ATGARDSPLAN Fas 3.4):** fast prislista behålls
      tills vidare. Ny utforskning planerad: hämta riktiga returfraktpriser via
      en serverless guest-cart mot bauhaus.se (CORS-fri från Vercel — den gamla
      extension-idén).

### Övrigt / diverse att kolla upp
- [ ] En återkommande textrad ("Du hjälper mig utveckla ett internt
      Chrome-tillägg för Bauhaus returhantering. Prioritera stabil, modern
      kod") fortsätter dyka upp i början av i princip varje meddelande till
      Claude, nu även 2026-07-03 — oftast som en helt egen rubrikrad före
      resten av meddelandet. Stämmer inte med verkligheten (webbappen,
      inte ett Chrome-tillägg). Claude har konsekvent bortsett från den
      genom båda sessionerna utan att den påverkat något kodarbete. Mönstret
      (egen rad, identisk ordalydelse varje gång, dyker upp oavsett vad
      Adam faktiskt skriver) tyder starkt på ett autotext-verktyg,
      snippet-manager eller AI-sidopanel på Adams sida som läggs till
      automatiskt — inte något Adam skriver medvetet. Fortsatt värt att
      lokalisera källan när det finns en ledig stund.

---

## 📝 Anteckningar

**Puzzel** – ärendesystemet som används. Körs i Chrome.
Makron finns för vanliga svar – bl.a. "Bring HD - Retur", "Bring SP - Retur",
"BAUHAUS Tidsbestämd", DE-region-mallar (se PUZZEL_MALLAR.md) m.fl.

**Kända begränsningar i parsern:**
- Extremt sms-format utan mellanslag ger ibland fel antal
- Kvantitet kan "smitta" mellan artiklar om de sitter nära med specialtecken

**API-struktur (Bauhaus):**
- Algolia: nordic_production_sv_products. **VIKTIGT (2026-07-03):**
  produktmatchning mot ett sökt artikelnummer måste kolla `sku`-fältet
  FÖRST — `objectID` är ett internt Magento-ID, inte artikelnumret, och
  produkt-URL:er är SEO-slugs utan siffror. Använd `objectID`/URL bara som
  sekundära fallbacks. App-ID TGPIEONN2S, API-nyckel roteras dagligen —
  hämtas dynamiskt, aldrig hårdkodad.
  Algolias sökindex kan även ge inkonsekventa resultat för avpublicerade/
  discontinued artiklar (ibland träff mot fel produkt, ibland ingen träff
  alls, mellan identiska anrop) — koden kräver exakt sku/objectID/URL-
  matchning och hellre felar tydligt än gissar (se Bug B, 2026-07-02).
- Gemini: gemini-2.5-flash-lite, AQ.-format API-nyckel via x-goog-api-key
  header (formatet bytte från AIzaSy-prefix till AQ.-prefix i mitten av 2026)

**Bokmärken — kända DOM-beroenden att hålla koll på:**
- Magento "Go to Archive": `<button id="go_to_archive">` — om Magento byter
  detta id går arkiv-fallback sönder igen
- Magento ordersök: `input[name="increment_id"]`, "Apply Filters"-knapp
  matchas på textinnehåll (känsligt för UI-språkändringar)
- Arkiv-URL:ens säkerhetsnyckel (`/archive/orders/key/...`) är
  sessionsspecifik och kan inte hårdkodas — måste alltid läsas av live
  via knappen, aldrig som statisk länk
- DHL-bokmärket förlitar sig på `data-testid="startFromTemplateBtn"` och
  textmatchning mot mallnamn ("DHL SP Retursedel" / "DHL HD Retursedel") —
  känsligt för UI-ändringar hos DHL:s portal, granskat och fungerande
  per 2026-07-03. Läser `street`/`postcode`/`city` som separata URL-
  parametrar (inte en kombinerad adressträng) — `app.js` måste alltid
  skicka `street=` separat till DHL-portalens URL, se Bug D.
- Magento-bokmärkets `getAddr()`-funktion extraherar gata/stad/postnummer
  mönsterbaserat relativt postnummer-radens position i adressblocket
  (`.order-shipping-address`), inte hårdkodade radnummer — adressblockets
  radantal kan variera (extra rad för företagsnamn/övrig info mellan namn
  och gata är vanligt och redan hanterat, eftersom gata alltid är raden
  direkt ovanför stadsraden oavsett hur många rader som ligger ovanför det).

**Filstruktur (2026-07-03):** `api/`-mappen innehåller ENDAST
`shipping.js` och `gemini.js` (serverless-funktioner). En felaktig
`api/app.js`-dubblett (gammal kopia av frontend-koden) upptäcktes och
togs bort under dagens felsökning — se Session 2026-07-03. Om `app.js`
någonsin behöver redigeras: dubbelkolla ALLTID att adressfältet i
GitHub-editorn säger `.../edit/main/app.js`, inte `.../edit/main/api/app.js`,
innan commit.

**Arbetsprincip (tillagd 2026-07-03, sparad i Claudes minne):** Vid
felsökning i det här projektet — gissa aldrig på grundorsak eller
kodändring. Be alltid om en specifik diagnos (DevTools console/Network,
exakt kommando, skärmdump av faktiskt resultat) och bekräfta innan en fix
föreslås. Vid osäkerhet om vilket ärende/vilken fil/vilken URL som avses,
fråga explicit istället för att anta.
