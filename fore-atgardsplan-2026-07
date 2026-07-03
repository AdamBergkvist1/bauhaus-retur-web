# ÅTGÄRDSPLAN — bauhaus-retur-web
**Baserad på fullständig kodgranskning 2026-07-03** (alla 16 filer, ~3 000 rader, verifierad mot committad kod på `main`)
**Syfte:** Denna fil är exekverbar av en AI-assistent steg för steg. Varje steg anger exakt fil, exakt ändring och exakt verifiering. Hoppa ALDRIG över verifieringssteg.

---

## ⛔ ARBETSREGLER (gäller varje steg, utan undantag)

1. **Rätt fil-regeln:** Innan varje commit i GitHub-editorn: kontrollera att adressfältet visar exakt den sökväg steget anger. `api/gemini.js` ≠ `gemini.js`. Historik: fel-fil-commits har redan kostat timmar två gånger (`api/app.js`-incidenten, root-`gemini.js`).
2. **Verifiera efter commit:** Hämta den råa filen från `https://raw.githubusercontent.com/AdamBergkvist1/bauhaus-retur-web/main/<sökväg>` och bekräfta att ändringen finns där. Lita aldrig på editorns visning.
3. **Diagnos före fix:** Gissa aldrig grundorsak. Om ett steg kräver bekräftelse från live-miljön (markerat 🔬), be Adam köra angiven diagnos (DevTools Network/Console) och invänta resultatet innan koden ändras.
4. **En sak i taget:** Ett steg = en commit = en verifiering. Blanda aldrig två fixar i samma commit.
5. **Rör inte fungerande logik:** Ändra bara det som steget uttryckligen anger. Ingen "passa på att städa"-refaktorering.
6. **Efter varje ändring i `parseAllArticles`/`detectRiskKeywords`/`extractPostcode`:** kopiera samma ändring till `test.html` (funktionerna är kopior, inte importer) och kör testsviten på `/test.html`.

---

## FAS 0 — Säkring (gör först, 10 min)

**Mål:** Möjlighet att alltid backa till känt fungerande läge.

- [ ] **0.1** Skapa en tag/release i GitHub på nuvarande `main` (namn: `fore-atgardsplan-2026-07`). GitHub web: Releases → Draft a new release → tag `fore-atgardsplan-2026-07` → Publish.
- [ ] **0.2** Committa denna fil (`ATGARDSPLAN.md`) till repo-roten.
- [ ] **0.3** Öppna appen live och kör ett känt fungerande ärende (t.ex. artikel 1229844) som baslinje. Notera att uppslag + kommentar fungerar. Detta är referensen för all regressionskontroll.

**Acceptans:** Tag syns under Releases; ATGARDSPLAN.md läsbar via raw-URL; baslinjeärendet fungerar.

---

## FAS 1 — Deploya rätt Gemini-fil (KRITISK — trolig rot till Bug 2)

**Fynd:** Root-filen `gemini.js` är en NYARE version än `api/gemini.js` (innehåller `name`-fält i prompten, retry-logik 3 försök, fallback-modell, bättre dublett-instruktioner). Vercel serverar ENDAST `api/`-mappen som funktioner → live-endpointen `/api/gemini` kör den GAMLA prompten utan `name`. Därför kan Gemini aldrig returnera `name` → `matchedFromName` i app.js får inget att matcha → tom artikellista → Magento-fallbacken visar ALLA orderartiklar (= gräsklippare-symptomen, order 113343937).

- [ ] **1.1** 🔬 **Verifiera fallback-modell-ID:** Root-filens retry använder `gemini-3.1-flash`. Detta ID är OVERIFIERAT (Googles docs anger `gemini-3-flash-preview` för Flash-nivån). Innan flytt: testa i terminal/Claude-miljö att `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash:generateContent` inte ger 404 (kräver Adams API-nyckel — alternativt: byt fallback till `gemini-3.1-flash-lite` (samma modell, retry utan modellbyte) vilket är riskfritt och rekommenderas om testet inte kan köras).
- [ ] **1.2** Öppna `gemini.js` (ROTEN) via raw-URL, kopiera HELA innehållet.
- [ ] **1.3** Öppna `https://github.com/AdamBergkvist1/bauhaus-retur-web/edit/main/api/gemini.js` — KONTROLLERA att URL:en innehåller `/edit/main/api/gemini.js`. Ersätt hela innehållet med det kopierade. Justera fallback-modellen enligt beslut i 1.1. Commit: "Deploy new Gemini prompt (name field + retry) to api/gemini.js".
- [ ] **1.4** Verifiera via raw-URL att `api/gemini.js` nu innehåller strängen `"name": "gräsklippare"` (exempelraden i prompten) och `for (let attempt = 0; attempt < 3; attempt++)`.
- [ ] **1.5** Ta bort root-filen `gemini.js` (GitHub: öppna filen → papperskorgsikonen → commit "Remove root gemini.js — deployed version lives in api/"). Den är nu en död dubblett av samma farliga typ som `api/app.js` var.
- [ ] **1.6** 🔬 **Verifiera mot verkligt ärende:** Adam kör gräsklippare-ärendet (order 113343937) live med DevTools → Network → `/api/gemini` → Response. Förväntat: `articles` innehåller `{"articleNumber": null, "name": "gräsklippare", ...}` och appen visar EN artikel, inte fyra. Om `name` returneras men matchningen ändå misslyckas → felet ligger i `matchedFromName` (app.js) → gå till Fas 5.5, annars är Bug 2 LÖST — uppdatera TODO.md.

**Risk om fel:** Prompt-ändring påverkar artikellistan i ALLA ärenden. Därför: kör baslinjeärendet (0.3) direkt efter 1.4 och bekräfta oförändrat resultat innan 1.5.

---

## FAS 2 — API-korrekthet (kan ge FEL DATA till kund/DHL)

- [ ] **2.1 Ta bort debug-fält ur produktionssvaret.** Fil: `api/shipping.js`. Hitta i `action === "product"`-svaret: `, _debugAllHits: hits, _debugMatchedVia: String(best.objectID) === articleNumber ? "objectID" : "url"` och ta bort båda fälten (behåll `dimensionsConfidence` och resten). Commit: "Remove leftover debug fields from product response". Verifiera via raw-URL att `_debug` inte förekommer i filen.
- [ ] **2.2 Fixa ordernummer-regexen (falsk träff inuti EAN).** Fil: `app.js` (ROTEN — kontrollera edit-URL!). Hitta: `const orderMatch  = text.match(/#?(1\d{8})/)` och ersätt regexen med `/#?(?<!\d)(1\d{8})(?!\d)/`. Motivering: EAN `7319740009246` innehåller delsträngen `197400092` som idag matchar och ger fel Magento/DHL-länk. Verifiering: konsoltest `"EAN 7319740009246".match(/#?(?<!\d)(1\d{8})(?!\d)/)` → `null`, och `"order 113343937".match(...)` → träff.
- [ ] **2.3 Validera istället för att trunkera Gemini-artikelnummer.** Fil: `app.js`. Hitta i normaliseringen: `String(a.articleNumber ?? "").replace(/\D/g, "").slice(0, 7)`. Ersätt med logik som INTE klipper: rensa icke-siffror, och behåll värdet endast om resultatet är exakt 7 siffror, annars sätt `""` (så att artikeln hamnar i `nameOnly`-spåret om `name` finns). Ett 13-siffrigt EAN får ALDRIG trunkeras till sina 7 första siffror — det blir ett annat, slumpmässigt artikelnummer.
- [ ] **2.4 (villkorad)** 🔬 Höj `hitsPerPage` från 5 till 15 i `api/shipping.js` (exaktmatchningen på `sku` filtrerar ändå). Lågrisk, men gör den EFTER 2.1 som separat commit.

**Regressionskontroll efter Fas 2:** Kör baslinjeärendet + ett EAN-baserat ärende (t.ex. testtext med `2x EAN 7319740009246`) och bekräfta korrekt artikel + att Magento-knappen INTE tänds av EAN:et.

---

## FAS 3 — Flöden som påverkar utgående data (DHL-mejl, priser)

- [ ] **3.1 DHL-kort: bind sändningsnummerfältet till mejltexten.** Fil: `app.js`, funktion `showDHLCard`/`copyDHLEmail`. Problem: fältet `#dhlShipmentNumber` är redigerbart men mejlkroppen uppdateras inte — kopiering skickar GAMLA numret. Enklaste säkra fix: i `copyDHLEmail`, ersätt alla förekomster av det ursprungliga `shipmentNumber` i body och subject med fältets aktuella värde innan kopiering. (Bevara `dhlTrackingData.shipmentNumber` som original-referens.)
- [ ] **3.2 DHL-kort: vägra tom artikellista.** Fil: `app.js`, `showDHLCard`. Om `resolvedArticles.filter(a => a.ean).length === 0`: rendera kortet med en tydlig varningsruta ("⚠️ Inga analyserade artiklar ännu — kör Analysera först, mejlet saknar artikelrader") och inaktivera Kopiera-knappen tills artiklar finns. Mejl utan innehållsrader får inte kunna kopieras obemärkt.
- [ ] **3.3 Pris 0 får aldrig bli "0 kr".** Fil: `app.js`. (a) I `selectShipping`: visa `Varierar` istället för `0 kr` när `opt.price === 0`. (b) I makro-ersättningen i `renderCaseAnalysis`: ersätt `XXX kr` med priset ENDAST om `selectedShipping.price > 0`, annars lämna `XXX kr` kvar så handläggaren ser att det måste fyllas i. Motivering: "0 kr" i ett kundsvar är ett faktiskt fel mot kund.
- [ ] **3.4** 🔬 **BESLUT KRÄVS (Adam):** `if (true)` i `doFetchShipping` gör att det riktiga frakt-API:t är död kod och en statisk prislista alltid används (auto-väljer PostNord 69 kr, ignorerar vikt). Fråga: är detta ett medvetet permanent läge (API:t kräver cookies/deploy) eller en kvarglömd felsökningsspärr? — **Om medvetet:** ta bort den döda API-koden och ersätt `if (true)` med en kommenterad konstant `USE_FALLBACK_PRICES = true`, och sortera fallback-listan avsiktligt. **Om inte:** separat felsökningssession krävs; rör inget nu.
- [ ] **3.5** 🔬 **BESLUT KRÄVS (Adam):** Frakten ingår inte längre i returkommentaren (`updateOutput` skriver bara artiklar + totalvikt + risk). Är det avsiktligt (frakten hanteras i makrot) eller en regression mot det gamla formatet "frakt → artiklar → totalvikt"? Ändra endast efter besked.

**Regressionskontroll:** Simulera DHL-flödet (Active Tracing-bokmärket kan inte köras utan inloggning — testa genom att i konsolen sätta `localStorage.setItem('bauhaus_dhl_tracking', JSON.stringify({shipmentNumber:'37332538642990565', latestStatus:'Test', latestDate:'2026-07-04', isDHLHolding:true, timestamp:Date.now()}))` och verifiera kortets beteende med och utan analyserade artiklar).

---

## FAS 4 — Städning av arbetsytan (nollställning + döda filer)

- [ ] **4.1 Rensa-knappen städar allt.** Fil: `app.js`, clear-hanteraren. Lägg till: ta bort `#dhlReturnCard` om det finns, dölj `#shippingSelected`, visa `#shippingOptions` tomt, nollställ `selectedShipping` (finns), töm `#outputBox`, `#shippingContentsBox`, dölj `#statusText`, nollställ `hasRisk = false` och dölj `#riskWarn`. Motivering: data från förra kundärendet får inte följa med in i nästa.
- [ ] **4.2 Ta bort döda Chrome-extension-filer:** `parse.js` och `dimensions.js` (refererar `popup.js`/`background.js`/Jest, laddas inte av `index.html`). En commit per fil. Verifiera EFTERÅT att appen laddar utan konsolfel (filerna ska inte refereras någonstans — sök i repot på `parse.js` och `dimensions.js` innan borttagning för säkerhets skull).
- [ ] **4.3 Städa dubbeltriggningen av `runAnalysis()`** vid sidladdning (två `setTimeout`, ~rad 138/173): behåll EN triggpunkt. Ofarlig men kostar ett extra Gemini-anrop per sidladdning. Lågprio — får skjutas.

---

## FAS 5 — Robusthet (småfixar, en commit per punkt)

- [ ] **5.1** `api/gemini.js`: `const { text } = req.body ?? {}` (idag kraschar 500 om body saknas).
- [ ] **5.2** `api/gemini.js`: höj `maxOutputTokens` till 2048 (långa ärenden trunkerar JSON → tyst regex-fallback).
- [ ] **5.3** `app.js`, `showDHLCard`: kör `esc()` på `shipmentNumber`, `latestStatus`, `latestDate` och `userName` innan de interpoleras i innerHTML/value-attribut.
- [ ] **5.4** `app.js`: lägg `.catch()` med synlig feedback på alla `navigator.clipboard.writeText`-anrop (minst: `copyShippingContentsBtn` som idag saknar all feedback).
- [ ] **5.5 (villkorad — endast om Fas 1.6 visade att matchningen brister trots `name`):** Skärp `matchedFromName`: (a) normalisera båda sidor (gemener, trimma), (b) ta bort `split(' ')[0]`-villkoret (kategoriord ger falska träffar), (c) vid flera träffar: kräv att HELA söknamnet finns i produktnamnet och att endast en träff uppfyller det — annars hoppa över och låt handläggaren välja manuellt. Skriv testfall i `test.html` FÖRST (gräsklipparfallet + ett tvetydigt fall), implementera sedan.
- [ ] **5.6** `api/shipping.js` mått-"Försök 1": begränsa L×B×H-regexen till spec-tabellens del av HTML:en istället för hela sidan (första steg: kräv att träffen ligger inom 500 tecken efter strängen "Mått" eller inom en `<table`-sektion). 🔬 Kräver verifiering mot 2–3 riktiga produktsidor innan commit.

---

## ÖPPNA FRÅGOR — Adam måste svara innan berörd fas startar

| # | Fråga | Blockerar |
|---|-------|-----------|
| F1 | Fallback-modell: testa `gemini-3.1-flash` eller ta säkra `gemini-3.1-flash-lite` som retry-modell? | Fas 1.1 |
| F2 | Är `if (true)`-fraktspärren medveten och permanent? | Fas 3.4 |
| F3 | Ska frakt tillbaka in i returkommentaren? | Fas 3.5 |
| F4 | DHL-kortets sändningsnummerfält: binda till mejltexten (3.1) eller ta bort fältet helt? | Fas 3.1 |
| F5 | Godkänns höjning av `hitsPerPage` 5→15? | Fas 2.4 |

## ⚠️ PROJEKTSÄNKARE (kan förstöra mer än de fixar om de görs fel)

1. **Fel fil-commits** — root vs `api/`. Redan hänt två gånger. Arbetsregel 1+2 är obligatoriska, inte valfria.
2. **Prompt-ändringen i Fas 1** påverkar artikellistan i VARJE ärende. Utan baslinjetest (0.3) efter deploy kan ett systematiskt fel (t.ex. Gemini börjar utelämna artiklar) gå oupptäckt in i skarpa kundärenden.
3. **Att "fixa" `if (true)` utan beslut F2** aktiverar en overifierad API-väg (cookies, guest-carts) mitt i produktionen → trasig fraktvisning för alla ärenden.
4. **DHL-mejl med fel/tomt innehåll** (Fas 3.1/3.2 ogjorda) skickar felaktig data till extern part — svårast att återkalla av alla fel i appen.
5. **Borttagning av filer utan referenssökning** (Fas 4.2) — sök alltid i hela repot innan delete.
6. **Ändringar i parser-funktioner utan test.html-synk** — testsviten blir tyst lögnaktig (grön på gammal kod).

## Ordning & tidsuppskattning
Fas 0 (10 min) → Fas 1 (30–45 min inkl. verifiering) → Fas 2 (30 min) → Fas 3 (45–60 min, kräver F2–F4) → Fas 4 (20 min) → Fas 5 (löpande, en punkt i taget). Allt kan pausas mellan faser — varje fas lämnar appen i fungerande skick.
