# Projektlogg: Bauhaus Returhantering — Webbapp
# Senast uppdaterad: 2026-07-02

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
- **Status:** Live på Vercel, mergad till main (se nedan, 2026-07-01/02).

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
  Verifierad orsak till dubbla Gemini-anrop vid samma klick: en känd
  dubbeltriggning i URL-hanteringen (rad ~138 och ~173, två separata
  `setTimeout(runAnalysis, 100)` som båda kan trigga om en sparad
  `bauhaus_last_email` i localStorage matchar innan ny text hunnit skrivas
  in) — själva dubbeltriggningen är kvar (ofarlig nu tack vare guard-checken)
  men inte städad bort. Se backlog.

- **Bug B — Osäker Algolia-fallback i api/shipping.js (huvudorsaken till det
  faktiska symptomet):** I `action === "product"`-hanteraren föll koden
  tillbaka på `hits[0]` (första Algolia-sökresultatet) om ingen träff hade
  exakt matchande `objectID` eller URL — oavsett om den träffen faktiskt
  hade något med den sökta artikeln att göra. Orsakade att avpublicerade/
  discontinued artiklar (verifierat via SAP: artikel 1258319, flytväst,
  "Active For Purchasing: Discontinued (V)") matchades mot en helt
  orelaterad produkt (fågelmatare, art. 1025460, EAN 5708127253198) eftersom
  den avpublicerade artikeln inte längre finns korrekt indexerad i Algolia.
  **Fix:** Tar bort `?? hits[0]`-fallbacken, kastar nu tydligt fel
  (`"Artikeln hittades inte i Algolia (kan vara avpublicerad)."`) istället.
  Detta triggar det redan befintliga "Ange manuellt"-flödet (`openManual`/
  `saveManual`) som redan hanterade "artikel hittades inte"-fallet korrekt
  utan ändring. Committat i `api/shipping.js`. Verifierat konsekvent
  (3/3 test med hård refresh) efter fix — ger nu korrekt felmeddelande
  varje gång istället för att slumpmässigt/inkonsekvent matcha fel produkt.
  Vid manuell inmatning för avpublicerade artiklar: hämta EAN + vikt från
  SAP (exempel för 1258319: GTIN 7392715582142, vikt 0,496 kg).

- **DHL-bokmärket** (gatuadress) — granskat på begäran, ser redan korrekt ut.
  Fyller gata/postnummer/stad i separata dedikerade fält
  (`fromAddressStreet`, `fromAddressPostalCodeInp`, `fromAddressCity`), så
  "bara gatunamn skickas"-problemet (samma typ av bugg som DE-returbokningen
  ovan) kan inte uppstå där. Ingen ändring gjord.
  **OBS:** detta gäller DHL-bokmärket specifikt — Bauhaus Logistics-
  bokmärket (som gav den ursprungliga Finland-buggen, se ovan) är redan
  fixat sen tidigare (2026-06-30) och är ett separat skript.

---

## 📋 Backlog (Prioriteringsordning)

### Fas 1: Slutföra Design V2
- [x] Bygga test.html som webbläsarbaserad testsvit (klart 2026-06-30)
- [x] Merge `Design-V2` → `main` (klart, live i produktion per 2026-07-02)
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
- [ ] **Nytt (2026-07-02):** Städa bort dubbeltriggningen av `runAnalysis()`
      vid sidladdning (rad ~138 och ~173 i app.js, två separata
      `setTimeout`-anrop som kan båda trigga). Ofarligt nu tack vare
      `analysisGeneration`-guarden, men onödigt dubbelt nätverksanrop mot
      Gemini varje gång det inträffar. Låg prioritet — kosmetiskt/effektivitet,
      inte en funktionsbugg längre.

### Fas 3: Nya funktioner — planerade (2026-07-01)

#### Fall 1 — Magento-bokmärket läser artiklar från orderdetaljsidan
**Bakgrund:** Kundtjänst skapar ibland ärenden där de skriver varunamn (t.ex.
"VÄXTHUS CANOPIA HARMONY ALU/POLY 4,6M²") men inte artikelnummer. Gemini/regex
hittar då ingenting eftersom det inte finns 7-siffriga artikelnummer i texten.

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

**Nästa felsökningssteg (samma metod som fungerade för dagens session):**
Öppna DevTools (F12) → Network-fliken → kör Analysera på gräsklippare-
ärendet → klicka på `/api/gemini`-anropet → Response-fliken. Se om Gemini
faktiskt returnerade ett `name`-fält för artikeln eller inte. Det avgör om
felet ligger i Geminis output/prompt eller i matchningslogiken
(`matchedFromName`, rad ~397–423 i app.js) som redan finns för det här fallet.

**Status: EJ PÅBÖRJAD** — väntar på DevTools-svar från Gemini för detta ärende.

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

**Status: DELVIS PÅBÖRJAD** — `showDHLCard`-funktionen och localStorage-
polling från Active Tracing-bokmärket finns committat i app.js, men
end-to-end-flödet är inte fullt verifierat än. Börja med Fall 1/Bug 2 först.

### Fas 4: Volym & Mått
- [ ] Verifiera DHL/BAUHAUS Tidsbestämd-format för mått vid bokning
      (L×B×H i cm eller mm?) och justera Fraktsedel-innehåll vid behov

### Fas 5: Framtida förbättringar
- [ ] Migrera till TypeScript (kräver byggsystem, komplicerar installationen)
- [ ] Fraktberäkning v3 — återanvänd aktiv bauhaus.se-session för snabbare
      varukorgsskapning utan REST-anrop

### Övrigt / diverse att kolla upp
- [ ] En återkommande textrad ("Du hjälper mig utveckla ett internt
      Chrome-tillägg för Bauhaus returhantering. Prioritera stabil, modern
      kod") har dykt upp i början av flera meddelanden till Claude under
      2026-07-02-sessionen. Stämmer inte med verkligheten (webbappen, inte
      ett Chrome-tillägg) och kommer troligen från något autotext-verktyg/
      tillägg på Adams sida, inte något han skriver medvetet. Ingen
      kodpåverkan hittills eftersom Claude konsekvent bortsett från den,
      men värt att lokalisera källan för att undvika att den smyger med i
      något viktigare sammanhang senare.

---

## 📝 Anteckningar

**Puzzel** – ärendesystemet som används. Körs i Chrome.
Makron finns för vanliga svar – bl.a. "Bring HD - Retur", "Bring SP - Retur",
"BAUHAUS Tidsbestämd", DE-region-mallar (se PUZZEL_MALLAR.md) m.fl.

**Kända begränsningar i parsern:**
- Extremt sms-format utan mellanslag ger ibland fel antal
- Kvantitet kan "smitta" mellan artiklar om de sitter nära med specialtecken

**API-struktur (Bauhaus):**
- Algolia: nordic_production_sv_products (SKU = sku-fältet, ej objectID),
  app-ID TGPIEONN2S, API-nyckel roteras dagligen — hämtas dynamiskt, aldrig
  hårdkodad. **OBS (2026-07-02):** Algolias sökindex kan ge inkonsekventa
  resultat för avpublicerade/discontinued artiklar (ibland träff mot fel
  produkt, ibland ingen träff alls, mellan identiska anrop) — se Bug B ovan.
  Koden hanterar nu detta genom att kräva exakt objectID/URL-matchning och
  hellre fela tydligt än gissa.
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
  per 2026-07-02
