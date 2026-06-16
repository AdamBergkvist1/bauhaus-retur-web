# Bauhaus Returhantering – Webbapp

En webbapp som ersätter Chrome-tillägget när extension-installation är blockerad av IT-policy.

## Funktioner

- Klistra in kundmejl → automatisk analys
- Hittar artikelnummer, antal, postnummer, riskord
- Slår upp EAN + vikt via Bauhaus/Algolia
- Ärendeanalys + makroförslag
- Frakt: antingen via Vercel-backend (live API) eller fallback-prislista
- Namn i makrotexter sparas lokalt i webbläsaren

---

## Deploy på Vercel (15 minuter, gratis)

### 1. Lägg upp på GitHub

```bash
git init
git add .
git commit -m "Bauhaus retur-webapp"
git remote add origin https://github.com/DITT_NAMN/bauhaus-retur.git
git push -u origin main
```

### 2. Deploya på Vercel

1. Gå till [vercel.com](https://vercel.com) och logga in med GitHub
2. Klicka **"Add New Project"**
3. Importera ditt `bauhaus-retur`-repo
4. Klicka **Deploy** – klart!

Vercel ger dig en URL, t.ex. `https://bauhaus-retur.vercel.app`

### 3. Uppdatera SHIPPING_API i index.html

Öppna `index.html`, hitta raden:
```javascript
const SHIPPING_API = "";
```
Ändra till din Vercel-URL:
```javascript
const SHIPPING_API = "https://bauhaus-retur.vercel.app";
```

Pusha ändringen – Vercel deployas automatiskt.

---

## Utan Vercel (bara statisk hosting)

Vill du inte sätta upp backend alls kan du öppna `index.html` direkt i Chrome.

**Det som fungerar utan backend:**
- All parsing (artiklar, antal, postnummer, riskord)
- Algolia-uppslag (EAN + vikt)
- Ärendeanalys + makroförslag
- Fallback-fraktpriser (99/395/795 kr baserat på vikt)

**Det som kräver Vercel-backend:**
- Exakta live-fraktpriser från Bauhaus API

---

## Filstruktur

```
bauhaus-retur/
├── api/
│   └── shipping.js      # Vercel serverless function
├── index.html           # Hela appen (HTML + CSS + JS)
├── macros.js            # Makrodatabas
├── analyzeCase.js       # Ärendeanalys
├── macros.js            # Makron
├── parse.js             # Parsning (används av tester)
├── dimensions.js        # Måttextraktion
├── vercel.json          # Vercel-konfiguration
└── README.md
```
