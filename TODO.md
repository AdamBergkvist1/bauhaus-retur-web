# TODO - Bauhaus Returhantering Webbapp
# Senast uppdaterad: 2026-06-18

## 🎯 På jobbet måndag - kolla upp detta

### Fraktsedel & DHL
- [ ] Dubbelkolla gränsvärdena med lagret:
      LIMIT_HD_WEIGHT = 20 kg (över detta → Hemleverans)
      LIMIT_HD_LENGTH = 120 cm (över detta → Hemleverans)
      LIMIT_PALL_WEIGHT = 30 kg (över detta → Pall)
      LIMIT_PALL_LENGTH = 150 cm (över detta → Pall)
- [ ] Kolla om pall-höjden stämmer (15 cm pallbädd + maxhöjd på varan)
- [ ] Kolla PN Hemleverans-priset (lägg till i fallback-fraktlistan)
- [ ] Finns det fler retursätt vi missat?

### Puzzel-integration
- [ ] Högerklicka på mejltexten i Puzzel → Inspektera → notera class/id
- [ ] URL-mönster: https://bauhaus.cm.puzzel.com/tickets/XXXXXX ✅

### Makron
- [ ] Gå igenom alla makronamn i Puzzel och jämför med macros.js
- [ ] Notera nya rutiner kring kommentarerna

### Övrigt
- [ ] Kolla standardkartonger på lagret
- [ ] Testa bokmärket "Bauhaus Magento" - funkar postnummer-hämtningen?
- [ ] Testa hela flödet med ett riktigt ärende

## ✅ Klart (senaste sessionen 2026-06-18)

- Webbapp live på https://bauhaus-retur-web.vercel.app
- Artikeluppslag via Algolia (EAN + vikt + mått + kortnamn)
- Fraktsedel-innehåll med produktnamn per artikel
- Pall/HD/Paket-logik med exakta DHL-termer
- Kollislag-dropdown med alla DHL-alternativ
- Volymberäkning (max-mått + volymbaserat) med hover-förklaringar
- Pall-mått med utstick-hantering
- Dropdown uppdaterar mått automatiskt
- Magento-bokmärke för postnummer-hämtning
- Mejl sparas i localStorage
- Makrotexterna uppdaterade med riktiga Puzzel-texter
- Postnummer-fix (filtrerar bort telefonnummer)
- Felmeddelande vid saknad vikt

## 📋
