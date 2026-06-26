# Projektlogg: Bauhaus Retur-tillägg
# Senast uppdaterad: 2026-06-26

## 🎯 Målsättning
Automatisera och kvalitetssäkra returhanteringen genom att snabbt extrahera data 
(vikt, antal, frakt) och eliminera manuellt arbete i Puzzel-ärendesystemet.

---

## ✅ Klart

- Artikeluppslag via Algolia (EAN + vikt + SKU)
- Automatisk varukorgsskapning via Bauhaus REST API
- Fraktalternativ hämtas automatiskt baserat på artiklar + postnummer
- Postnummer extraheras automatiskt från markerad text
- Billigaste frakt väljs automatiskt, kan bytas manuellt
- Returkommentar byggs i rätt ordning (frakt → artiklar → totalvikt)
- Riskords-detektion (öppnad/använd/trasig) med negationshantering
- Dubbelnoterings-detektion (samma vara som SKU + EAN)
- Manuell inmatning som fallback om artikel ej hittas
- Självläkande cache (rensar felaktiga Magento-ID:n automatiskt)
- Måttextraktion sparas i cache (redo att användas)
- Jest-testsvit med 63 testfall (npm test)
- Auto-läsning med fallback-knapp "Läs hela sidan" (v8.2)
- Konfigurerbart namn i makrotexter via header-input (sparas i localStorage)
- **Gemini API-integration (2026-06-26):**
  - Vercel serverless function: api/gemini.js
  - Modell: gemini-3.1-flash-lite (500 RPD på free tier)
  - AQ.-nyckelformat (nytt Google-format juni 2026) via x-goog-api-key header
  - Extraherar: ordernummer, requested_time (fritext), artiklar
  - requested_time är fritext – inte hårdkodat HH:MM – eftersom tidslottar
    varierar per region/distributör (Stockholm: 10-15/16-21, övriga: 07-12:30 etc.)
  - Sparas i localStorage: bauhaus_requested_time
  - Gemini-fel är tysta (fallback till regex-parser utan att krascha)

---

## 📋 Backlog (Prioriteringsordning)

### Fas 1: Gemini – visa i UI (NÄSTA STEG)
- [ ] **Visa requested_time i ärendeanalysen:**
      Lägg till en rad i höger kolumn som visar:
      "⏰ Kunden önskar: förmiddagen på måndag"
      Visas bara om localStorage("bauhaus_requested_time") är satt.
- [ ] **Skicka requested_time i logistics-knappen:**
      Lägg till bauhaus_requested_time i pipe-separerad clipboard-sträng
      som skickas till Logistics-formuläret.
- [ ] **Gemini extraherar artiklar som komplement:**
      Om regex-parsern missar artiklar, använd geminiResult.articles som backup.
      Kräver att vi jämför de två listorna och mergar.

### Fas 2: Puzzel-integration
- [ ] **Kartlägg Puzzel-gränssnittet:**
      När du börjar jobba – notera URL:en (puzzel.com/...?), 
      högerklicka i svarstextfältet och inspektera elementet.
      Vi behöver: CSS-selektor för textfältet + hur makron väljs.
- [ ] **Content Script för Puzzel:**
      Injicera tillägget direkt i Puzzel så det kan läsa inkommande
      kundmejl automatiskt och skriva in svar i textfältet.
      Flöde: kundmejl visas → tillägg läser text automatiskt →
      du väljer makro → fraktkostnad + artikelkommentar fylls in direkt.
- [ ] **Makro-integration:**
      Koppla ihop tilläggets utdata med Bauhaus-makrona i Puzzel.
      T.ex. "Bring HD - Retur" → fyll i fraktkostnad (XXX kr) automatiskt.
      Kräver att vi ser hur makrona är uppbyggda i nya Puzzel-versionen.
- [ ] **GDPR-kontroll:**
      Verifiera att kunddata (namn, adress) aldrig lämnar webbläsaren.
      Content scripts läser bara det som syns på skärmen – bör vara OK.

### Fas 3: Volym & Mått
- [ ] **Måttformat för DHL/tidsbestämd:**
      På jobbet – kolla exakt vilket format DHL Hemleverans och
      BAUHAUS Tidsbestämd kräver vid bokning (L×B×H i cm eller mm?).
- [ ] **Volymkalkylator:**
      Räkna ut total emballagevolym (L×B×H × kvantitet) när mått finns.

### Fas 4: Kvalitetssäkring
- [ ] **Utöka testbanken:**
      Lägg till fler mejl i tests/testEmails.js – både från Gemini
      och verkliga kundmejl från jobbet (anonymiserade).
      Kör: npm test
- [ ] **Postnummer-extraktion v2:**
      Hantera edge cases – t.ex. postnummer i e-postsignaturer,
      postnummer utan stad efteråt.

### Fas 5: Framtida förbättringar
- [ ] **Migrera till TypeScript:**
      Stabilare datahantering, bättre felmeddelanden.
      Kräver byggsystem (esbuild) – komplicerar installationen något.
- [ ] **Fraktberäkning v3 – helautomatisk cart-session:**
      Utforska återanvändning av aktiv bauhaus.se-session så att
      varukorgen skapas ännu snabbare utan REST-anrop.

---

## 📝 Anteckningar

**Gemini API-nyckel:**
- Nyckel slutar på ...T2Ag (Default Gemini API Key, projekt gen-lang-client-0560408923)
- Nyckel slutar på ...R7yw (Bauhaus WebbApp API, projekt gen-lang-client-0358389646) – reserv
- gemini-2.0-flash är AVSTÄNGD (limit 0/dag) – använd INTE
- gemini-3.1-flash-lite har 500 RPD – räcker för daglig användning
- AQ.-nycklar fungerar med x-goog-api-key header mot native endpoint
- AQ.-nycklar fungerar INTE mot OpenAI-kompatibla endpoints (ger 401)

**Puzzel** – ärendesystemet som används. Körs i Chrome (chrome-baserat).
Makron finns för vanliga svar – bl.a. "Bring HD - Retur", "Bring SP - Retur",
"BAUHAUS Tidsbestämd", "Bomkörd upphämtning" m.fl.
Fraktkostnad (XXX kr) i makrona är manuell idag → ska fyllas i automatiskt.
Tidslottar varierar per region/distributör – hårdkoda ALDRIG tidformat i Gemini-prompt.

**Kända begränsningar i parsern:**
- "ej öppnad" triggar risk-flagga (hanteras inte ännu)
- Kvantitet kan "smitta" mellan artiklar om de sitter nära med specialtecken
- Extremt sms-format utan mellanslag ger ibland fel antal

**API-struktur (Bauhaus):**
- Algolia: nordic_production_sv_products (SKU = sku-fältet, ej objectID)
- REST: /rest/sv/V1/guest-carts/{token}/totals → shipping_groups
- Frakt: /shipmentpartners/service/get → options med priser
- Tidsbestämd leverans: title innehåller "Tidsbestämd", code = "default_95"
