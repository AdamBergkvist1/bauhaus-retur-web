/**
 * macros.js
 * Databas över Bauhaus-makron med tillhörande triggers och regler.
 *
 * STRUKTUR PER MAKRO:
 *   id          – unikt ID
 *   title       – makronamnet (som det heter i Puzzel)
 *   description – kort förklaring när det används
 *   triggers    – nyckelord/fraser som indikerar detta makro
 *   conditions  – extra logiska villkor (funktioner som tar analysResult)
 *   warnings    – varningar att visa tillsammans med förslaget
 *   text        – makrotexten (XXX = platshållare att fylla i)
 *
 * LÄGG TILL NYA MAKRON:
 *   Kopiera ett befintligt block, ändra id/title/triggers/text.
 *   Lägg till i MACROS-arrayen.
 */

"use strict";

const MACROS = [

  // ── RETURER ────────────────────────────────────────────────────────

  {
    id: "bring_hd_retur",
    title: "Bring HD - Retur",
    description: "Hemleverans med Bring, retursedel bifogas. Kunden bokar upphämtning.",
    triggers: [
      "hemleverans", "bring hd", "bring home", "bring hemleverans",
      "upphämtning", "hämta hem", "hämtning",
    ],
    conditions: [
      // Föreslås om fraktsättet är hemleverans (inte postombud)
      (a) => a.shippingLabel && (
        a.shippingLabel.toLowerCase().includes("hemleverans") ||
        a.shippingLabel.toLowerCase().includes("hd")
      ),
    ],
    warnings: [],
    text: `Hej,

Självklart kan vi hjälpa dig att returnera din beställning till oss!

Bifogat i detta mejl finner du retursedeln.
Med hjälp av den kan du boka en upphämtning så att fraktbolaget kommer när det passar bra för dig. För att boka din retur eller andra frågor om upphämtningen är du varmt välkommen att ringa till Bring på T: 0770 113 300, öppettider mån-fre: 08-17.

Vi vill dessutom informera dig om att varorna skall sändas tillbaka i oförändrat skick samt i originalförpackning.
Viktigt att notera är att du är ansvarig för godset tills dess att det är åter på vårt lager.

Vi vill också informera om att du kommer att få stå för kostnaden för returfrakten på XXX kr. Väljer du däremot att genomföra returen i ett av våra BAUHAUS-varuhus debiteras ingen returfrakt.

Önskar dig en trevlig dag!

Med vänliga hälsningar,
Adam

BAUHAUS Webshop - När det måste bli bra.`,
  },

  {
    id: "bring_sp_retur",
    title: "Bring SP - Retur",
    description: "Servicepoint/ombud med Bring. Kunden lämnar paketet på ombud.",
    triggers: [
      "servicepoint", "postombud", "ombud", "bring sp",
      "postnord", "dhl servicepoint", "lämna in", "inlämning",
    ],
    conditions: [
      (a) => a.shippingLabel && (
        a.shippingLabel.toLowerCase().includes("ombud") ||
        a.shippingLabel.toLowerCase().includes("servicepoint") ||
        a.shippingLabel.toLowerCase().includes("postnord")
      ),
    ],
    warnings: [],
    text: `Hej,

Självklart kan vi hjälpa dig att returnera din beställning till oss!

Bifogat i detta mejl finner du retursedeln.
Du fäster retursedeln på kartongen och sedan lämnar du returen på ditt närmaste Bring ombud. En bekräftelse av returen kommer att skickas till din mejl.

Vi vill också informera om att du kommer att stå för kostnaden för returfrakten på 49 kr. Väljer du däremot att genomföra returen i ett av våra varuhus debiteras ingen returfrakt.

Önskar dig en fin dag!
Med vänliga hälsningar,
Adam

BAUHAUS Webshop - När det måste bli bra.`,
  },

  {
    id: "bauhaus_tidsbestamd_retur",
    title: "Bomkörd returupphämtning - kolla med kund",
    description: "När Bauhaus tidsbestämd upphämtning misslyckats.",
    triggers: [
      "bomkörning", "missad upphämtning", "inte hemma", "ej hemma",
      "inte på plats", "misslyckad", "tidsbestämd",
    ],
    conditions: [
      (a) => a.shippingLabel && a.shippingLabel.toLowerCase().includes("tidsbestämd"),
    ],
    warnings: ["Kontrollera tillgängliga tidslottar med distributionen innan du svarar."],
    text: `Hej,

Hoppas att allt är väl med dig!

Jag har nåtts av informationen att returupphämtningen ej var lyckad.

Du är varmt välkommen att återkomma om det är något annat problem du har uppfattat gällande detta. Annars är du välkommen att boka in en ny returupphämtning inom samma villkor som tidigare.

Returen sker med vårt egna transportbolag. De erbjuder upphämtning under specifika tidslottar och jag önskar därför få höra vilket datum och under vilket tidsspann som passar bäst.

Vi vill även informera om att de endast kör ut vardagar.

Önskas upphämtning behöver vi återkoppling om önskad dag och tidslott senast kl 10:00 två arbetsdagar innan.

Med vänliga hälsningar,
Adam`,
  },

  // ── VARUHUSRETUR ───────────────────────────────────────────────────

  {
    id: "kund_ska_returnera_vh",
    title: "Kund SKA returnera i VH",
    description: "Kunden vill lämna returen i ett varuhus.",
    triggers: [
      "varuhus", "butik", "lämna i butik", "lämna i varuhus",
      "hämta i varuhus", "lämna själv", "komma in",
    ],
    conditions: [],
    warnings: [],
    text: `Hej,

Stort tack för din återkoppling!

Självklart går det bra att returnera i våra varuhus.
Uppge då ditt ordernummer, eller medtag en kopia av ditt kvitto så hjälper personalen dig på plats.

Önskar du returnera till oss på BAUHAUS Webbshop är du varmt välkommen att återkomma till oss så hjälper vi dig vidare från vårt håll.

Jag önskar dig en fortsatt trevlig dag!

Med vänliga hälsningar,
Adam

BAUHAUS Webshop - När det måste bli bra.`,
  },

  {
    id: "kund_har_returnerat_vh",
    title: "Kund HAR returnerat i VH",
    description: "Kunden bekräftar att de returnerat i varuhus.",
    triggers: [
      "har lämnat", "har returnerat", "lämnade i butik", "lämnade i varuhus",
      "var i varuhuset", "genomfört retur", "returnerat i varuhus",
    ],
    conditions: [],
    warnings: [],
    text: `Hej,

Stort tack för din återkoppling!

Vad skönt att höra! Hoppas du fick den hjälp du önskat på plats i varuhuset.

Du är varmt välkommen att återkomma till mig om du har några frågor eller funderingar.

Önskar dig en fortsatt fin dag och varmt välkommen åter!

Med vänliga hälsningar,
Adam`,
  },

  // ── LEVERANSPROBLEM ────────────────────────────────────────────────

  {
    id: "kund_nekat_leverans",
    title: "Kund nekat leverans",
    description: "Kunden vägrade ta emot leveransen, retur pågår.",
    triggers: [
      "nekat", "nekade", "vägrade", "tog inte emot", "ville inte ha",
      "avvisade", "not delivered", "refused",
    ],
    conditions: [],
    warnings: ["Kunden debiteras både fraktkostnad och returfrakt."],
    text: `Hej,

Hoppas att allt är fint med dig!

Jag har fått information om att du nekat leveransen på din order.
Fraktbolaget kommer inom kort att skicka den i retur till vårt webblager.

När vi har fått din order i retur kommer vi att påbörja återbetalningsprocessen med avdrag för returfrakten på XXX kr.

Du är varmt välkommen att återkomma om du har ytterligare frågor.

Med vänliga hälsningar,
Adam`,
  },

  {
    id: "kund_glomt_hamta",
    title: "Kund glömt hämta order från ombud",
    description: "Kunden vill ha ordern skickad på nytt.",
    triggers: [
      "glömt hämta", "glömde hämta", "hann inte hämta", "låg kvar",
      "skicka igen", "skicka på nytt", "ny leverans", "ombudets öppettider",
    ],
    conditions: [],
    warnings: ["Kunden debiteras fraktkostnad + returkostnad för ej uthämtat paket."],
    text: `Hej,

Stort tack för att du hörde av dig!

Vi kan självklart hjälpa dig att skicka ut ordern på nytt.

Så fort vi har fått ordern i retur ber vi vårt lager att skicka ut den på nytt vilket givetvis sker utan extra fraktkostnad.
Jag ber om att få återkomma när jag har ett nytt sändningsnummer samt en länk där du kan spåra din nya leverans.

Med vänliga hälsningar,
Adam`,
  },

  // ── INTERNT ────────────────────────────────────────────────────────

  {
    id: "giab",
    title: "Giab",
    description: "Skicka retur till Giab.",
    triggers: ["giab", "giab retur"],
    conditions: [],
    warnings: [],
    text: `Hej,

Vänligen skicka returen till Giab.

Tack på förhand!
Mvh,
Adam`,
  },

  {
    id: "lagerlagg_rma",
    title: "Lagerlägg mot RMA",
    description: "Intern lagerhantering.",
    triggers: ["rma", "lagerlägg", "rma-nummer"],
    conditions: [],
    warnings: [],
    text: `Hej,

Vänligen lagerlägg mot RMA XXX

Mvh,
Adam`,
  },

];

// Exportera för Node.js/Jest-testning
if (typeof module !== "undefined") module.exports = { MACROS };
