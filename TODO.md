# Projektlogg: Bauhaus Retur-tillägg
# Senast uppdaterad: 2026-06-24

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
- Magento-bokmärke: fixat postnummer-fel vid flerlinjiga adresser (letar efter rad med 5 siffror)
- Magento-bokmärke: läser leveranspartner från "Information om frakt" och skickar med till webbappen
- DHL-bokmärke: väljer mall och fyller i kunduppgifter automatiskt
- Bauhaus Logistics-bokmärke: navigerar till Deliveries/Returns → Skapa Manuellt Uppdrag → fyller i formulär
  - Orderid, kundnamn, telefon, postnummer, adress
  - Leveranspartner mappas automatiskt från partnernamn → partner_id (BAUHAUS Skåne Ost → 39 osv)
  - Leveranstyp sätts till Retur/Internare
  - Status sätts till Finns på DE
  - Notis till förare fylls i med EAN-koder och antal (format: 2x 4024506352209)
  - Leveransvikt fylls i automatiskt
- Parser: EAN-koder på samma rad som artikelnummer (format "2x 1474110 / EAN") räknas inte dubbelt längre

---

## 📋 Backlog (Prioriteringsordning)

### Fas 1: Logistics-bokning (pågående)
- [ ] **Leveransdatum-parser:**
      Kunder skriver datum på många sätt: "måndag", "29/6", "måndag 30 juni", "nästa vecka".
      Behöver robust parser som hanterar alla varianter och omvandlar till YYYY-MM-DD.
- [ ] **Tidsfönster-parser:**
      Kunder skriver t.ex. "förmiddagen", "09-12", "kl. 9-15".
      Omvandla till HH:MM-format som formuläret kräver.
- [ ] **Kundadress-format:**
      Formuläret kräver "Gata, Stad, Postnummer, Land" – idag fylls bara gata + stad i.
      Lägg till postnummer och "Sverige" automatiskt.
- [ ] **Reducera antal klick:**
      Idag krävs 3 bokmärkesklick + prompt för Logistics-flödet.
      Utforska om det går att kombinera steg.

### Fas 2: Puzzel-integration
- [ ] **Kartlägg Puzzel-gränssnittet:**
      Notera URL, CSS-selektor för mejlcontainer och svarstextfält.
- [ ] **Content Script för Puzzel:**
      Läs kundmejl automatiskt, skriv svar direkt i Puzzel.
- [ ] **Makro-integration:**
      Uppdatera macros.js med aktuella makron och fyll i fraktkostnad automatiskt.

### Fas 3: Kvalitetssäkring
- [ ] **Utöka testbanken:**
      Lägg till fler mejl i testEmails.js – särskilt Logistics-ärenden.
- [ ] **Synka parse.js med index.html:**
      parseAllArticles i index.html och parse.js har divergerat – synka dem.

### Fas 4: Framtida förbättringar
- [ ] **Migrera till TypeScript**
- [ ] **Fraktberäkning v3 – helautomatisk cart-session**

---

## 📝 Anteckningar

**Logistics-flöde (dagens lösning):**
1. Klistra in intern kommentar (DE SKÅNE OST, 169 kr / 2x artikelnr / EAN / Totalvikt) + kundens svar → Analysera
2. Öppna i Magento → bokmärke hämtar kunddata → webbappen fylls i
3. Öppna i Logistics → data kopieras automatiskt till clipboard
4. Bokmärke klick 1 → Deliveries/Returns
5. Bokmärke klick 2 → Skapa Manuellt Uppdrag
6. Bokmärke klick 3 → prompt → klistra in → formulär fylls i

**Logistics-formulärfält (delivery[name]):**
- delivery[order_ref] – orderid
- delivery[partner_id] – leveranspartner (SELECT, värden: 2=BAUHAUS Sthlm, 39=BAUHAUS Skåne Ost osv)
- delivery[type] – 1=Leverans, 2=Retur/Internare
- delivery[status] – 7=Skickas från weblager, 8=Finns på DE
- delivery[customer_name], delivery[customer_phone], delivery[customer_postcode], delivery[customer_address]
- delivery[weight], delivery[notice], delivery[delivery_date]
- delivery[delivery_time_from], delivery[delivery_time_to] – format HH:MM

**Kända begränsningar i parsern:**
- Datum/tid från kund parsas inte tillförlitligt (för fri text)
- Kvantitet kan "smitta" mellan artiklar om de sitter nära med specialtecken

**API-struktur (Bauhaus):**
- Algolia: nordic_production_sv_products (SKU = sku-fältet, ej objectID)
- REST: /rest/sv/V1/guest-carts/{token}/totals → shipping_groups
- Frakt: /shipmentpartners/service/get → options med priser
- Tidsbestämd leverans: title innehåller "Tidsbestämd", code = "default_95"
