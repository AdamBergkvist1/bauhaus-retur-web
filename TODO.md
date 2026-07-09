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

### Prioriterad lista (tillagd 2026-07-07)

**PRIO A (risk för fel data):**
- [x] Diagnostisera `app.js` rad 544: `String(p.articleNumber).replace(/\D/g,"").slice(0,7)`
      — DIAGNOS KLAR 2026-07-08, ej bugg: `magentoProducts` fylls endast från
      `bauhaus-magento-webb-shortcut.js` (URL-param `products`), och den
      bookmarkleten extraherar redan `articleNumber` via strikt regex
      `skuText.match(/\d{7}/)?.[0]` — produkten skippas helt om ingen exakt
      7-siffrig match finns. Datan är alltså redan garanterat 7 siffror innan
      den når app.js; ingen EAN eller längre nummer kan nå raden. Kodrad
      städad till samma säkra mönster som rad 486 (kräver exakt 7 siffror,
      annars tom sträng) för robusthet mot framtida ändringar — ej en bugfix.
- [x] Skärp `matchArticlesByName`: ordgräns-match, val vid flera träffar.

**PRIO B (robusthet):**
- [x] Verifiera DHL-kort live (holding=0/1, Rensa, baslinjeärende) — Adam på jobbet.
- [x] Kontrollera UI-indikation vid Gemini-fel/fallback.
- [x] Testfall postnummer-extraktion i test.html.

**PRIO C (finish):**
- [ ] Läs vikt (weight/row_weight/freightcat) från `checkoutConfig.quoteItemData`
      i varukorgsflödet → Fas 5.6 utan SAP.
- [ ] DHL-returmejl med ifylld kunddata (format finns i chatthistorik/minne).
- [ ] Testfall för `checkDHLUrlParams` i test.html.
- [x] README.md: vad appen gör, flödesskiss, bookmarklet-installation.
- [x] DATAFLOW.md: ärlig karta över vilken data som går till Vercel/Gemini
      och vad som stannar lokalt — underlag för intern förankring.
- [x] Enhetlig felmeddelande-stil i UI.

**PRIO D (maskering — högst prioritet innan intern förankring):**
- [x] Bygg `anonymizeText()`: maskera namn/e-post/telefon/adress innan text
      skickas till Gemini, spara original lokalt, återinjicera i UI efter svar.
      KLAR 2026-07-09, live-verifierad. Ordernummer maskeras medvetet inte
      (Gemini behöver det för `order`-fältet). Namn/adress maskeras endast
      via exakt strängmatchning mot redan känd kunddata, ingen regex-gissning.

**PRIO E (arkitekturfix — kunddata i URL, upptäckt 2026-07-09):**
- [ ] Byt bort URL-query-parametrar för PII (namn/adress/telefon/e-post/
      företag) mellan Magento-bokmärket och appen, till en säkrare
      handoff-mekanism.

      **Problem:** `bookmarklets/bauhaus-magento-webb-shortcut.js` bygger
      idag `openAppUrl` med `?name=...&address=...&street=...&company=...
      &city=...&phone=...&email=...` (två näst identiska ställen i filen,
      båda måste åtgärdas). Detta sker på VARJE ärende där bokmärket körs,
      oavsett om mejltexten innehåller PII eller ej. URL:er (inkl.
      query-strängar) loggas normalt av hosting-plattformar (Vercel) som
      standarddrift, och sparas i webbläsarhistorik — helt separat från och
      allvarligare än Gemini-textmaskeringen (PRIO D, redan löst).

      **Varför det inte är en enkel fix:** Magento (bookmarklet-origin) och
      Vercel-appen (bauhaus-retur-web.vercel.app) är OLIKA origins — de delar
      INTE `localStorage`. Det postMessage-lyssnarmönster som redan finns i
      app.js (`bauhausCookies`, rad ~76) användes för ett ANNAT syfte
      (guest-cart-cookies) och skickas aldrig av någon bookmarklet i
      praktiken — det är alltså inte ett fungerande mönster att kopiera rakt
      av. Även DHL-flödets `localStorage.setItem('bauhaus_dhl_tracking',...)`
      sker på DHL:s egen origin och är sannolikt dött/overksamt för
      cross-origin-överföring; DHL-data når faktiskt appen via URL-parametrar
      (dhl_status/dhl_holding/dhl_delivered), samma mönster som ska bytas ut.

      **Föreslagen lösning — postMessage-handskakning:**
      1. Bokmärket öppnar fliken som idag: `const newWin = window.open(appUrl, 'bauhaus_retur')`,
         men `appUrl` innehåller EJ längre PII — bara icke-känsliga fält
         (postnummer, ordernummer om det anses okej, tracking-referens).
      2. Appen (`app.js`) signalerar vid sidladdning till `window.opener`
         (om det finns) att den är redo: `window.opener?.postMessage('BAUHAUS_APP_READY', TARGET_ORIGIN)`.
      3. Bokmärket lyssnar på det svaret och postar då PII-fälten
         (namn/adress/gata/företag/stad/telefon/e-post) via
         `newWin.postMessage({...}, TARGET_ORIGIN)`.
      4. `app.js` tar emot och validerar `event.origin` strikt (Magentos
         faktiska domän, inte `*`) innan datan används — annars kan vilken
         sida som helst posta falsk kunddata in i appen.

      **Kända komplikationer att testa noga, inte anta:**
      - Bokmärket återanvänder samma namngivna flik (`'bauhaus_retur'`)
        mellan ärenden — vid omnavigering till en redan öppen flik måste
        "redo"-signalen fortfarande trigga korrekt vid varje sidladdning,
        inte bara första gången.
      - Popup-blockering: om `window.open` returnerar `null` (blockerad)
        finns inget fönster att posta till — behöver tydlig hantering, inte
        tyst datatapp.
      - Timing-risk: appen måste hinna sätta upp sin `message`-lyssnare
        innan bokmärket postar — annars tappas datan. Kräver
        handskaknings-mönstret ovan (inte bara ett enkelrikta postMessage
        direkt vid `window.open`).
      - TVÅ näst identiska kodblock i bookmarkleten bygger `openAppUrl`
        (ett för `bauhaus_auto_collect`-flödet, ett för direktflödet) —
        båda måste uppdateras identiskt, annars fixas bara hälften av
        fallen.
      - Verifiera samtliga fyra bookmarklets efteråt, inte bara Magento-filen
        (kolla ingen annan skickar liknande data på samma sätt).

      **Rekommendation:** kör denna med en kapabel modell (Fable 5) pga.
      cross-origin async-komplexiteten och risken för svårfelsökta
      timing-buggar — diagnostisera/verifiera varje steg live innan nästa,
      exakt som med fraktlösningen tidigare. Använder sannolikt mycket
      usage; unviket att göra i en kort session.

---

### 🗓️ Plan: intern förankring innan Adam slutar (2026-08-14)

**Bakgrund:** Adam slutar på Bauhaus 2026-08-14. Målet är INTE nödvändigtvis
att hinna få formellt godkännande (PUB-avtal etc. tar sannolikt veckor–
månader, och Bauhaus har IT-frysperiod 26/6–3/8) — målet är att ha
**disclosat, dokumenterat och överlämnat** projektet så tidigt som möjligt,
så chansen att verktyget lever vidare efter Adam maximeras. Att vänta till
sista veckan med att informera någon är en sämre strategi rent praktiskt
(mindre tid för feedback/beslut), inte bara en efterlevnadsfråga.

**Begränsning:** Adams chef är på semester till 2026-08-10 — första kontakt
kan tidigast ske då.

**Ordning:**
1. Bygg klart PRIO C + PRIO D (maskering) — visa ett moget, avslutat projekt.
2. Skriv en kort, icke-teknisk 1-sidig sammanfattning för chef/Legal: vad
   appen gör, tidsvinst, vilka system/data den berör, vad som redan är byggt
   för säkerhet (maskering, ingen loggning, etc.).
3. Kontaktordning (viktigt att hålla ordningen):
   a. Adams chef, först (från 2026-08-10) — innan Legal/dataskydd hör av sig
      om ett projekt chefen inte kände till.
   b. Legal (generella legala bedömningar + PUB-avtal, se Intranet-SE-Juridik)
      — skicka `DATAFLOW.md`, fråga specifikt om Vercel/Gemini-flödet är
      görbart eller kräver avtal.
   c. dataskyddet@bauhaus.se (Internrevision) — parallellt eller efter Legal.
   d. Henrik Engqvist, SAP Business Expert – Sales (separat, lägre prio) —
      om SAP-idén (dimensioner/vikt/PO-nummer) specifikt. Kontaktväg för
      SAP-idéer generellt: respektive Business Process Owner, se
      "IT - Ownership by Process Area"-tabellen på intranätet (senast
      uppdaterad 2026-02-24, kontakt för korrigeringar: Britt Frimand,
      bfr@bauhaus.dk). Ingen SAP-integration är byggd i nuläget.
4. Justera efter ev. feedback.
5. Sista veckan: överlämning — allt dokumenterat i repot, kontakter redan
   tagna, tydligt vem som kan ta över (README.md + DATAFLOW.md fungerar
   som underlag för detta).

**Viktigt:** Adam är inte jurist och detta är inte juridisk rådgivning.
Frågan om ev. konsekvenser av att fortsätta utveckla innan formellt
godkännande är en fråga för chef/HR/facket, inte något som kan avgöras här.

**PARKERAT:** SAP (väntar intern bekräftelse), AI-chattruta (beror på SAP),
fraktpris >4000kr (estimate-shipping-methods otestad), PII-maskering
(byggs om IT kräver det).

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
      
### Fas 6: Framtida Backend / Databas (Supabase idéer)
- [ ] **Loggning av saknad artikeldata:** Spara manuellt inmatade EAN och mått i databasen. Kan användas för att bygga en "fellista" till e-com och låta appen minnas värdena nästa gång samma artikel dyker upp.
- [ ] **Analys och tidsbesparing:** Spara anonymiserad metadata (datum, ärendetyp, fraktsätt) per analys för att mäta appens nytta (t.ex. "sparade 150 timmar denna månad") och se frekventa returartiklar.
- [ ] **Bildhantering och skickbedömning:** Låt handläggare dra in bilder i appen (via Storage) och koppla till ordernumret för att underlätta samarbete och bevisbörda vid värdeminskningsavdrag.
- [ ] **Centraliserade svarsmallar:** Flytta `macros.js` och `PUZZEL_MALLAR_INNEHALL.json` till databasen. Bygg ett litet admingränssnitt så koordinatorer kan uppdatera fraktpriser och texter utan kod-commits.
- [ ] **Inloggning & Behörighet:** Koppla på Auth så att appen låses och endast användare med `@bauhaus.se`-mejladress kan logga in.
- [ ] **Gemensam ärendehistorik:** Spara gjorda analyser kopplade till handläggarens namn. Gör det sökbart så kollegor kan se tidigare bedömningar på en order.
- [ ] **AI Feedback-loop (Träna Gemini):** Lägg till en "Tummen ner"-knapp vid felaktig AI-analys. Spara misslyckandet + originalmejlet i databasen för att senare kunna analysera och finjustera prompten.

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

## 🧠 Tekniska Insikter & Analyser

### 🚚 Returfrakt — LÖST OCH LIVE 2026-07-08 (uppdaterar felaktig slutsats från 07/07/2026)
**Tidigare (föråldrad) slutsats:** vi trodde att fri-frakt-regeln (>4000 kr) nollställde
priset *överallt*, och att spåret att hämta riktig frakt därmed var stängt utan egen
databas/frakttabell. **Den slutsatsen visade sig vara fel** — den byggde på tester i
den vanliga inloggade kundvagns-sessionen i webbläsaren, inte via en fristående gäst-
varukorg (guest cart) skapad direkt via Magentos REST-API.

**Vad vi upptäckte 2026-07-08:** `api/shipping.js` innehöll redan en fullt fungerande
guest-cart-implementation (`action=shipping`: skapar varukorg → lägger artiklar →
`estimate-shipping-methods` → läser `totals`), byggd tidigare men aldrig aktiverad —
`app.js` hade en hårdkodad `if (true)`-genväg som alltid tvingade fram en fast,
vikt-baserad prislista istället, med kommentaren "frakt-API kräver Vercel-deploy
med cookies". Live-testning (direkt `fetch()` mot `/api/shipping?action=shipping`
från DevTools-konsolen, utan några cookies alls) visade att antagandet var felaktigt:
Magentos guest-cart-API fungerar helt anonymt, ingen inloggad session krävs.

**Bekräftat via fyra separata live-anrop (postnr 13249):**
- Grensax (sku 1619255, under 4000 kr) → riktiga priser: DHL Servicepoint 69 kr,
  PostNord Postombud 69 kr, PostNord Hemleverans 129 kr.
- Gräsklippare (sku 1429515) normalt antal → 199 kr (fungerar även för skrymmande gods).
- Gräsklippare × 20 och Klinker × 20 (båda garanterat över 4000 kr) → `success:true`
  men pris **0 kr** — bekräftar att fri-frakt-regeln ger en *mjuk* nollning
  (giltigt svar, bara pris 0), INTE ett hårt fel.
- Gasolgrill (sku 1616880) → hårt fel "Inga fraktalternativ", oberoende av pris —
  visade sig vara en produktspecifik begränsning (troligen egen fraktkategori/
  pall-gods som guest-cart-flödet inte hanterar), INTE relaterat till 4000-kr-gränsen.

**Lösning, implementerad och live-verifierad:** tre lägen i `doFetchShipping()`
(`app.js`):
1. Riktigt pris (>0 kr) → används direkt.
2. Alla alternativ ger 0 kr → gul varning "Fraktpris kunde inte fastställas
   automatiskt (troligen fri fraktkampanj över 4000 kr). Ange manuellt." — ingen
   siffra visas som om den vore pålitlig.
3. Anropet felar (t.ex. produkt utan guest-cart-stöd) → faller tillbaka till den
   gamla vikt-baserade uppskattningen, tydligt märkt "ej live-verifierat".

Även `selectShipping()` uppdaterad för att aldrig visa "0 kr" som ett bekräftat
pris (visar "Varierar" istället, konsekvent med `renderShippingOptions`).
`index.html`: den yttre `display:none` som dolde hela "Frakt & kostnad"-sektionen
är borttagen (den byggde på det felaktiga cookie-antagandet). Postnummerraden
(manuellt fält + knapp) förblir medvetet dold — postnumret fylls fortfarande
automatiskt via Magento-bokmärket och uppslagningen triggas automatiskt.

Alla tre lägen verifierade live i produktionsappen 2026-07-08 (skärmdumpar,
korrekta priser/varningar i samtliga fall). **Ingen egen frakttabell/databas
behövs längre för detta.**

### 🛡️ Säkerhet & GDPR (Högsta prioritet)
* **Problem:** Appen hanterar idag råa kundmejl. Om användare klistrar in PII (Personally Identifiable Information som namn, adress, e-post, telefon) skickas detta till Vercel och Gemini API, vilket är en GDPR- och IT-policy-risk.
* **Lösning (Tvättfilter):** Bygg en JavaScript-funktion (`anonymizeText`) som körs *lokalt* i webbläsaren. Filtret ska använda Regex för att identifiera och byta ut känslig data mot placeholders (t.ex. `[KUND_EMAIL]`, `[TELEFONNUMMER]`) **innan** texten skickas iväg till backend.
* **Mål:** Minskar mängden PII som lämnar webbläsaren; slutlig bedömning av GDPR/IT-policy görs av Bauhaus IT/DPO.

* **Viktig insikt för Arbetsflödet (Extraction & Re-injection):** För att appen inte ska förlora sitt syfte (automatisk ifyllnad av DHL-kort och makron) får vi inte bara radera datan. Vi måste bygga en logik som:
  1. Extraherar och sparar PII (namn, ordernummer, adress) i lokala JavaScript-variabler i webbläsaren.
  2. Ersätter PII med placeholders i texten som skickas till Gemini.
  3. Tar emot AI:ns svar och injicerar tillbaka de sparade lokala variablerna in i gränssnittet (t.ex. DHL-kortet). 
  Minskar mängden PII som lämnar webbläsaren; slutlig bedömning av GDPR/IT-policy görs av Bauhaus IT/DPO.

* **Transparens (Säkerhetsdokumentation):** * Bygg in ett "Debug-läge" i UI:t (eller tydliga `console.log`-utskrifter i klienten) som visuellt visar exakt vilken sträng som skickas iväg till Vercel/Gemini. 
  * Syftet är att IT-avdelningen eller chefer med egna ögon ska kunna trycka på en knapp, inspektera nätverksanropet (Payload), och se att strängen som lämnar webbläsaren faktiskt är maskerad (t.ex. "Kunden [KUNDNAMN] vill returnera..."). 
  * Minskar mängden PII som lämnar webbläsaren; slutlig bedömning av GDPR/IT-policy görs av Bauhaus IT/DPO.

* **Verifiera att `api/gemini.js` inte loggar payload-innehåll till Vercel-loggar** (t.ex. `console.log` av request body eller Gemini-svar med kundtext) — kontrollera Vercel-loggarna för ett testanrop och ta bort eventuell loggning av rådata.

 * **Alternativ till Tvättfilter (För framtida IT-förhandling):**
  Om företaget i framtiden vill undvika ett lokalt tvättfilter (för att kunna skicka omaskerad data till AI:n), finns det bl.a. två tekniska alternativ:
  1. **Enterprise-avtal (DPA):** Bauhaus tecknar officiella Personuppgiftsbiträdesavtal med Vercel och Google Cloud. Detta kräver Enterprise-licenser och juridiskt arbete.
  2. **In-house Hosting (On-Premise):** Appen flyttas från Vercel till Bauhaus egna interna servrar, och vi byter ut Gemini mot en lokal AI-modell (t.ex. Llama 3) som körs helt utan internetuppkoppling. 
  Minskar mängden PII som lämnar webbläsaren; slutlig bedömning av GDPR/IT-policy görs av Bauhaus IT/DPO.
