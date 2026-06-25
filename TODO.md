# Projektlogg: Bauhaus Retur-tillägg
# Senast uppdaterad: 2026-06-25

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
- Magento-bokmärke: söker order, klickar Visa, öppnar webbappen med kunddata
- Magento-bokmärke: fixat postnummer-fel vid flerlinjiga adresser
- Magento-bokmärke: läser leveranspartner från "Information om frakt"
- DHL-bokmärke: väljer mall och fyller i kunduppgifter automatiskt
- Bauhaus Logistics-bokmärke: navigerar och fyller i formulär automatiskt
  - Orderid, kundnamn, telefon, postnummer, adress (Gata, Stad, Postnummer, Sverige)
  - Leveranspartner mappas automatiskt (BAUHAUS Skåne Ost → partner_id 39 osv)
  - Leveranstyp = Retur/Internare, Status = Finns på DE
  - Notis till förare = EAN-koder med antal
  - Leveransvikt fylls i automatiskt
- Parser: EAN på samma rad som artikelnummer räknas inte dubbelt
- **Puzzel-bokmärke**: läser artikelnummer + ordernummer direkt från Puzzel
  - Fungerar för returformulär-ärenden (Artikelnummer X, Antal: Y)
  - Fungerar för konversationsärenden (ordernr: XXXXXXXXX i fritext)
  - Webbappen öppnas automatiskt med artiklar analyserade + ordernummer ifyllt
  - För ärenden utan artiklar (t.ex. annullering) visas bara Magento-knappen

---

## 📋 Backlog (Prioriteringsordning)

### Fas 1: Logistics-bokning (pågående)
- [ ] **Leveransdatum/tid-parser**
      Kunder skriver datum på många sätt – svårt utan AI.
      Alternativ: enkla datum/tid-inputfält i webbappen för manuell inmatning.
- [ ] **Reducera klick i Logistics-flödet**
      Just nu: Puzzel-bokmärke → Magento-bokmärke → 3x Logistics-bokmärke + prompt.
      Mål: färre steg.

### Fas 2: Puzzel-integration
- [ ] **Puzzel-bokmärke: hantera kollapsade meddelanden**
      Kollapsade iframes laddas redan i DOM men innehåller rätt data.
      Bokmärket söker redan igenom alla iframes – fungerar för de flesta fall.
- [ ] **Puzzel mallval**
      Tekniskt möjligt men kräver cross-domain data eller extra prompt-steg.
      Inte värt komplexiteten just nu – återkom senare.

### Fas 3: Kvalitetssäkring
- [ ] **Utöka testbanken**
      Lägg till fler mejl i testEmails.js – särskilt Logistics-ärenden.
- [ ] **Synka parse.js med index.html**
      parseAllArticles i index.html och parse.js har divergerat.

### Fas 4: Framtida förbättringar
- [ ] **Migrera till TypeScript**
- [ ] **Fraktberäkning v3 – helautomatisk cart-session**

### 💡 Idéer att utvärdera
- [ ] **Gemini API (gratis tier: 1500 req/dag)**
      Kan ersätta/komplettera regex-parsern för fri svenska text:
      datum/tid-extraktion, artikelnummer i ovanliga format, ärendeklassificering.
      Utvärdera när parser-kantfall blir ett verkligt problem.

---

## 📝 Anteckningar

**Dagens flöden:**

Returformulär-ärende (snabbaste):
1. Puzzel-bokmärket → webbappen med artiklar + ordernummer klart
2. Öppna i Magento → kunddata hämtas
3. Hämta frakt → Öppna i DHL

Logistics/DE-ärende:
1. Puzzel-bokmärket → webbappen
2. Öppna i Logistics → Magento orderlista
3. 3x Logistics-bokmärke → formulär fyllt i + prompt för vikt/EAN

**Puzzel-mallar (86 st, Array[3] i modal select):**
Relevanta: DHL HD, DHL SP, DE Skåne Ost, DE STHLM, DE GBG, DE Knivsta, DE NKPG, DE Växjö osv.
Mallval kräver cross-domain data – inte implementerat.

**Partnermappning (leverans → Logistics partner_id):**
BAUHAUS Skåne Ost=39, Sthlm=2, GBG=3, Knivsta=12, Norrköping=14, Växjö=33 osv.
PostNord hemleverans → DHL HD retur.
Alla PostNord/gamla PN-returer → DHL SP.

**Logistics-formulärfält:**
delivery[order_ref], delivery[partner_id], delivery[type] (2=Retur),
delivery[status] (8=Finns på DE), delivery[customer_name/phone/postcode/address],
delivery[weight], delivery[notice], delivery[delivery_date],
delivery[delivery_time_from/to] HH:MM

**Kända begränsningar:**
- Datum/tid från kund parsas inte (fri text)
- Postnummer ej tillgängligt i Puzzel – kräver Magento-besök
- Cross-domain blockerar direkt data-transfer mellan Vercel och Magento/Puzzel
