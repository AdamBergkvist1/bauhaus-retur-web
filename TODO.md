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
- Kodbas uppdelad: index.html (struktur) / style.css (all styling) /
  app.js (all logik) — tidigare allt-i-ett i index.html
- **Status:** Live på Vercel preview-URL, testad av Adam under verklig
  arbetsdag. Inte mergad till main ännu — väntar på mer testning.

### Bokmärkesfixar (2026-06-30)
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

---

## 📋 Backlog (Prioriteringsordning)

### Fas 1: Slutföra Design V2
- [ ] Testa Design V2 under flera fulla arbetsdagar med varierande ärendetyper
      (enkla returer, DE-retur, flerregion, manuell inmatning, fraktsedel)
- [ ] Merga `Design-V2` → `main` när stabil
- [ ] Uppdatera bokmärkena permanent till produktions-URL efter merge
      (just nu pekar de mot en Design-V2 preview-URL)

### Fas 2: Testverktyg / kvalitetssäkring (NY — hög prioritet)
Motivering: ändringar tar allt längre tid att få rätt, och regressioner i
en del av appen upptäcks ofta sent när en annan del testas. Behöver bättre
sätt att fånga detta tidigt, både för Adam och för Claude/Gemini som
analyserar/skriver kod.
- [ ] **Definiera vad som ska testas automatiskt vs manuellt.**
      Automatiskt lämpar sig bäst för: parseAllArticles(), detectRiskKeywords(),
      extractPostcode(), updateShippingContents()-beräkningar (kollislag,
      max-mått, volymbaserat). Svårare att automatisera: bokmärkenas DOM-
      beroende logik (Magento/Puzzel-sidstruktur kan ändras utan förvarning).
- [ ] **Återetablera en körbar testsvit för app.js.**
      Det fanns tidigare en Jest-svit (63 testfall) för Chrome-tillägget,
      men den matchar inte längre dagens app.js-struktur. Behöver:
      1) flytta ren logik (parsing, riskord, postnummer, dimensionsberäkning)
         till funktioner utan DOM-beroende, så de kan testas isolerat
      2) skriva om testfallen mot den nya strukturen
      3) köra `npm test` som checklista innan varje större ändring
- [ ] **Regressionscheck-lista för manuell test efter UI/JS-ändringar.**
      En kort markdown-checklista (typ denna TODO men för testning) med
      konkreta steg: klistra in exempel-mejl → analysera → välj frakt →
      kopiera → verifiera output-text exakt. Körs manuellt av Adam efter
      varje ändring tills automatiska tester finns på plats.
- [ ] **Bokmärkes-specifik testning.**
      Eftersom bokmärkena är DOM-beroende och Magento/Puzzel kan ändra sin
      HTML-struktur utan förvarning, behöver vi en snabb "hälsokontroll":
      en liten konsol-snutt (liknande felsökningen vi gjorde för
      go_to_archive) som Adam kan köra för att verifiera att alla
      selektorer bokmärkena beror på fortfarande matchar något på sidan.

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
