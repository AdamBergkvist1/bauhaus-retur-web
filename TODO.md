# TODO - Bauhaus Returhantering Webbapp
# Senast uppdaterad: 2026-06-23

## ✅ Klart

### Webbapp (bauhaus-retur-web.vercel.app)
- Artikeluppslag via Algolia (EAN + vikt + mått + kortnamn)
- Fraktsedel-innehåll med produktnamn per artikel
- Pall/HD/Paket-logik med exakta DHL-termer
- Kollislag-dropdown med alla DHL-alternativ
- Volymberäkning (max-mått + volymbaserat) med hover-förklaringar
- Pall-mått med utstick-hantering
- Dropdown uppdaterar mått automatiskt
- Makrotexterna uppdaterade med riktiga Puzzel-texter
- Postnummer-fix (filtrerar bort telefonnummer)
- Mejl sparas i localStorage
- ⚠️ flagga för osäkra mått (höjd < 20cm)

### Bokmärken
- **Bauhaus Magento** – hämtar namn, adress, telefon, epost, ordernummer från order-sidan
- **Bauhaus DHL** – öppnar rätt mall (SP/HD), fyller i alla kunduppgifter automatiskt inkl. referensnummer

### DHL-flöde (automatiserat)
1. Analysera mejl → artiklar, vikt, mått
2. Öppna i Magento → bokmärket hämtar kunddata
3. Öppna i DHL → bokmärket väljer mall + fyller i formuläret

---

## 📋 Backlog

### Hög prioritet
- [ ] Puzzel content script – auto-läs mejl direkt från Puzzel
- [ ] Bauhaus Logistics-bokmärke – fyller i internt Magento-formulär för egna transporter
- [ ] Dubbelkolla DHL-gränsvärden med lagret:
      LIMIT_HD_WEIGHT = 20 kg
      LIMIT_HD_LENGTH = 120 cm
      LIMIT_PALL_WEIGHT = 30 kg
      LIMIT_PALL_LENGTH = 150 cm

### Medium
- [ ] Magento-bokmärke: hämta artiklar direkt från order-sidan
      (för ärenden från kundtjänst utan artikelnummer i mejlet)
- [ ] PN Hemleverans-pris (kolla upp och lägg till i fallback-listan)
- [ ] Uppdatera felmeddelande "hittades inte" → "Ej på hemsidan – ange manuellt"

### Lägre prioritet
- [ ] Standardkartonger från lagret → automatiskt kartongval
- [ ] TypeScript-migrering
