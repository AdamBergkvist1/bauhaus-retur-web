# Projektlogg: Bauhaus Returhantering — Webbapp
# Senast uppdaterad: 2026-06-30

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
- **Status:** Live på Vercel preview, testad av Adam under två arbetsdagar
  (2026-06-30 och en till planerad). Inte mergad till main ännu.

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

### Bokmärkenas URL — viktigt att komma ihåg under Design-V2-testperioden
- Vercel skapar en NY preview-URL för varje deployment till Design-V2-branchen.
  Puzzel- och Magento-bokmärkena måste uppdateras med den senaste URL:en
  efter varje uppladdning, annars testar man av misstag mot en gammal version
  utan att märka det. Detta löser sig automatiskt vid merge till main (då blir
  produktions-URL:en stabil och bokmärkena behöver bara pekas dit en gång).

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

---

## 📋 Backlog (Prioriteringsordning)

### Fas 1: Slutföra Design V2
- [x] Bygga test.html som webbläsarbaserad testsvit (klart 2026-06-30)
- [ ] Testa Design V2 under en andra hel arbetsdag (planerad 2026-07-01),
      särskilt: DHL-knappens URL-byggande, manuell inmatning-flödet,
      fraktsedel-mått med riktig Algolia-data (inte sample)
- [ ] Beslut om merge `Design-V2` → `main` efter andra testdagen
- [ ] Uppdatera bokmärkena permanent till produktions-URL efter merge
      (just nu måste Puzzel/Magento-bokmärkena uppdateras med ny preview-URL
      varje gång en ny fil laddas upp till Design-V2 — löser sig vid merge)

### Fas 2: Testverktyg / kvalitetssäkring — PÅBÖRJAD
test.html finns och täcker parseAllArticles, detectRiskKeywords,
extractPostcode (17 testfall, alla gröna per 2026-06-30). Kvarstående:
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

### Fas 3: Puzzel-integration
- [ ] Verifiera att Puzzel-bokmärket fortfarande matchar aktuell DOM-struktur
      (samma typ av risk som Magento-arkivbuggen — bör ingå i Fas 2:s
      hälsokontroll)
- [ ] Undersök om makro-text kan fyllas i automatiskt i Puzzels svarsfält
      (kräver att vi ser hur Puzzels textfält är uppbyggt)

### Fas 4: Volym & Mått
- [ ] Verifiera DHL/BAUHAUS Tidsbestämd-format för mått vid bokning
      (L×B×H i cm eller mm?) och justera Fraktsedel-innehåll vid behov

### Fas 5: Framtida förbättringar
- [ ] Migrera till TypeScript (kräver byggsystem, komplicerar installationen)
- [ ] Fraktberäkning v3 — återanvänd aktiv bauhaus.se-session för snabbare
      varukorgsskapning utan REST-anrop

      Egen anteckning: Tänker också som slutmål lite. Till bauhaus webb appen för att eeventuellt kunna sälja in den. bygg statostol verktyg för att se på nått vis hur många ärenden som hanteras korrekt, vad success rate är på alla olika delar av webbens delar. Föratt visa vad som faktiskt sparas. Något sånt

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
  hårdkodad
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
