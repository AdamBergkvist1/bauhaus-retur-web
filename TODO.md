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
- **Puzzel-bokmärke uppdaterat (2026-06-26):**
  - Läser råa mejltext från iframes med id^="email-"
  - Skippar email-headers (Return-Path, DKIM osv)
  - Städar HTML via innerHTML → textContent
  - Skickar hela mejltexten som puzzel=-parameter till webbappen
  - Webbappen kör Gemini + regex automatiskt vid load

---

## 📋 Backlog (Prioriteringsordning)

### Fas 1: Utöka Gemini till full potential (NÄSTA STEG)
- [ ] **Utöka Gemini-prompten** så den returnerar komplett analys:
      Nuvarande prompt extraherar bara order + requested_time.
      Ny prompt ska returnera:
      {
        order, requested_time, articles, case_type,
        macro_suggestion, summary, risk, risk_reason
      }
      - case_type: "retur"|"reklamation"|"leveransproblem"|"fråga"|"byte"|"övrigt"
      - macro_suggestion: ID som matchar macros.js (bring_hd_retur, bring_sp_retur osv)
      - summary: en mening som beskriver vad kunden vill
      - risk: true/false – kunden nämner öppnad/använd/skadad vara
      - risk_reason: vad som triggade risk (fritext)
      - articles: [{articleNumber, quantity}] – komplement till regex-parsern

- [ ] **Använd Gemini-artiklar som backup:**
      Om regex-parsern hittar 0 artiklar, använd geminiResult.articles.
      Om regex hittar färre än Gemini – merga listorna.

- [ ] **Visa Gemini-analys i UI:**
      I höger kolumn (ärendeanalys), visa:
      - "⏰ Kunden önskar: förmiddagen på måndag" (requested_time)
      - "📝 Sammanfattning: Kunden vill returnera en felvänt Yale dörrlås"
      - Gemini-makroförslag som komplement till regex-baserade

- [ ] **Skicka requested_time i logistics-knappen:**
      Lägg till bauhaus_requested_time i pipe-separerad clipboard-sträng.

### Fas 2: Testfiler för regressionstestning
- [ ] **Skapa testfiler för Gemini-integration:**
      tests/gemini_test.js – testa att Gemini returnerar rätt JSON-struktur
      för olika mejltyper (retur, reklamation, leveransproblem, utan artiklar).
      Kör mot riktig API eller mocka svaret.
- [ ] **Skapa integrationstester för hela flödet:**
      tests/integration_test.js – simulera hela runAnalysis()-flödet:
      mejltext in → artiklar ut → rätt ärendetyp → rätt makroförslag.
      Säkerställer att ändringar inte fuckar det som redan fungerar.
- [ ] **Utöka befintlig testbank:**
      Lägg till fler mejl i tests/testEmails.js från jobbet (anonymiserade).
      Täck: strukturerade retursvar (Artikelnummer X, Antal: Y),
      mejl utan artikelnummer, mejl på engelska, mejl med risk-ord.

### Fas 3: Puzzel-integration (djupare)
- [ ] **Kartlägg Puzzel-gränssnittet:**
      När du börjar jobba – notera URL:en (puzzel.com/...?), 
      högerklicka i svarstextfältet och inspektera elementet.
      Vi behöver: CSS-selektor för svarstextfältet + hur makron väljs.
- [ ] **Content Script för Puzzel:**
      Injicera tillägget direkt i Puzzel så det kan läsa inkommande
      kundmejl automatiskt och skriva in svar i textfältet.
      Flöde: kundmejl visas → tillägg läser text automatiskt →
      du väljer makro → fraktkostnad + artikelkommentar fylls in direkt.
- [ ] **Makro-integration:**
      Koppla ihop tilläggets utdata med Bauhaus-makrona i Puzzel.
      T.ex. "Bring HD - Retur" → fyll i fraktkostnad (XXX kr) automatiskt.

### Fas 4: Volym & Mått
- [ ] **Måttformat för DHL/tidsbestämd:**
      På jobbet – kolla exakt vilket format DHL Hemleverans och
      BAUHAUS Tidsbestämd kräver vid bokning (L×B×H i cm eller mm?).
- [ ] **Volymkalkylator:**
      Räkna ut total emballagevolym (L×B×H × kvantitet) när mått finns.

### Fas 5: Framtida förbättringar
- [ ] **Migrera till TypeScript:**
      Stabilare datahantering, bättre felmeddelanden.
- [ ] **Fraktberäkning v3 – helautomatisk cart-session:**
      Utforska återanvändning av aktiv bauhaus.se-session.

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

**Makron i macros.js (ID → när det används):**
- bring_hd_retur: hemleverans med Bring, kunden bokar upphämtning
- bring_sp_retur: servicepoint/ombud, kunden lämnar paket
- bauhaus_tidsbestamd_retur: bomkörd upphämtning med eget transportbolag
- kund_ska_returnera_vh: kunden vill lämna i varuhus
- kund_har_returnerat_vh: kunden bekräftar varuhusretur
- kund_nekat_leverans: kunden vägrade ta emot
- kund_glomt_hamta: kunden glömde hämta från ombud
- giab: skicka retur till Giab
- lagerlagg_rma: intern lagerhantering mot RMA

**API-struktur (Bauhaus):**
- Algolia: nordic_production_sv_products (SKU = sku-fältet, ej objectID)
- REST: /rest/sv/V1/guest-carts/{token}/totals → shipping_groups
- Frakt: /shipmentpartners/service/get → options med priser
- Tidsbestämd leverans: title innehåller "Tidsbestämd", code = "default_95"
