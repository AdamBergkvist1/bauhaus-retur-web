# TODO - Bauhaus Returhantering Webbapp
# Senast uppdaterad: 2026-06-18

## 🎯 På jobbet måndag - kolla upp detta

### Fraktsedel & DHL
- [ ] Kolla om pall-höjden stämmer (15 cm pallbädd + maxhöjd på varan)
- [ ] Dubbelkolla gränsvärdena med lagret:
      LIMIT_HD_WEIGHT = 20 kg (över detta → Hemleverans)
      LIMIT_HD_LENGTH = 120 cm (över detta → Hemleverans)
      LIMIT_PALL_WEIGHT = 30 kg (över detta → Pall)
      LIMIT_PALL_LENGTH = 150 cm (över detta → Pall)
- [ ] Kolla PN Hemleverans-priset
- [ ] Finns det fler retursätt vi missat?

### Puzzel-integration
- [ ] Högerklicka på mejltexten i Puzzel → Inspektera → notera class/id
- [ ] Högerklicka på svarstextfältet → Inspektera → notera class/id
- [ ] URL-mönster: https://bauhaus.cm.puzzel.com/tickets/XXXXXX ✅

### Makron
- [ ] Gå igenom alla makronamn i Puzzel och jämför med macros.js
- [ ] Notera nya rutiner kring kommentarerna

### Övrigt
- [ ] Kolla standardkartonger på lagret
- [ ] Testa bokmärket "Bauhaus Magento" - funkar postnummer-hämtningen?

## 📋 Backlog

### Hög prioritet
- [ ] Puzzel content script - auto-läs mejl direkt från Puzzel
- [ ] Magento-bokmärke: hämta artiklar direkt från order-sidan

### Medium
- [ ] Uppdatera felmeddelande "hittades inte" → "Ej på hemsidan – ange manuellt"
- [ ] Kollislag-förslag som klickbar knapp

### Lägre prioritet
- [ ] Standardkartonger → automatiskt kartongval
- [ ] TypeScript-migrering
