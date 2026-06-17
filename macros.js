"use strict";

const MACROS = [
  {
    id: "psc_qr_retur",
    title: "Retur PSC QR - Retur",
    description: "QR-kod skickas, kunden lämnar på ombud.",
    triggers: ["retur", "returnera", "returnering", "skicka tillbaka", "ångrar", "ångerrätt", "öppet köp", "ombud", "servicepoint", "postnord", "dhl", "airmee"],
    conditions: [],
    warnings: [],
    text: `Hej,
 
Självklart kan vi hjälpa dig att returnera din beställning till oss!

Bifogat i detta mejl finner du QR-koden som du även fått i ett separat mejl.  
På ombudet visar upp QR-koden för ombudet som hjälper dig att skriva ut en retursedel och posta paketet.
Vi rekommenderar att alltid be om ett inlämningskvitto så att du har underlag på att du lämnat över returen till fraktbolaget.
Mer gällande våra villkor kring returer kan du läsa om via länken nedan:
http://www.bauhaus.se/angerratt-och-garanti

Skulle originalförpackningen behöva tejpas kan transparent tejp användas i så liten utsträckning som möjligt.

Vi vill också informera om att du kommer att stå för kostnaden för returfrakten på 69 kr. Väljer du däremot att genomföra returen i ett av våra varuhus debiteras ingen returfrakt.

Så snart returen inkommit till oss kommer vi påbörja återbetalningsprocessen. En bekräftelse på returen (returkvitto) kommer skickas till samma mejl som du nyttjade vid beställningstillfället

Har du några frågor eller funderingar är du mer än välkommen att återkomma till oss.

Önskar dig en fin dag!

Med vänliga hälsningar,
Adam B

BAUHAUS Webshop - När det måste bli bra. 
www.bauhaus.se 
E-post: kundtjanst@bauhaus.se 
Telefon: 010 180 18 00`,
  },

  {
    id: "bring_hd_retur",
    title: "Bring HD - Retur",
    description: "Hemleverans med Bring, retursedel bifogas.",
    triggers: ["hemleverans", "bring hd", "upphämtning", "hämta hem", "retur", "returnera", "skicka tillbaka", "ångrar", "ångerrätt", "öppet köp"],
    conditions: [
      (a) => a.shippingLabel && (a.shippingLabel.toLowerCase().includes("hemleverans") || a.shippingLabel.toLowerCase().includes("hd")),
    ],
    warnings: [],
    text: `Hej,
 
Självklart kan vi hjälpa dig att returnera din beställning till oss!
 
Bifogat i detta mejl finner du retursedeln. 
Med hjälp av den kan du boka en upphämtning så att fraktbolaget kommer när det passar bra för dig. För att boka din retur eller andra frågor om upphämtningen är du varmt välkommen att ringa till Bring på T: 0770 113 300, öppettider mån-fre: 08-17.

Vi vill dessutom informera dig om att varorna skall sändas tillbaka i oförändrat skick samt i originalförpackning.
Viktigt att notera är att du är ansvarig för godset tills dess att det är åter på vårt lager. 
Mer gällande våra villkor kring returer kan du läsa om via länken nedan:
http://www.bauhaus.se/angerratt-och-garanti
 
Vi vill också informera om att du kommer att få stå för kostnaden för returfrakten på XXX kr. Väljer du däremot att genomföra returen i ett av våra BAUHAUS-varuhus debiteras ingen returfrakt.
 
Du är varmt välkommen att återkomma när returen är upphämtad om du önskar, annars hör vi av oss så snart returen inkommit till oss och återbetalningsprocessen påbörjas.
 
Ärendet kommer att handläggas som löst/vilande så länge men öppnas igen om du svarar i denna mejltråd.
Har du några frågor eller funderingar är du mer än välkommen att återkomma till oss.
 
Önskar dig en trevlig dag!
 
Med vänliga hälsningar,
Adam B
 
BAUHAUS Webshop - När det måste bli bra.
www.bauhaus.se
E-post: kundtjanst@bauhaus.se
Telefon: 010 180 18 00`,
  },

  {
    id: "bring_sp_retur",
    title: "Bring SP - Retur",
    description: "Bring servicepoint/ombud, retursedel bifogas.",
    triggers: ["bring sp", "bring ombud", "retur", "returnera", "skicka tillbaka", "ångrar", "ångerrätt", "öppet köp"],
    conditions: [],
    warnings: [],
    text: `Hej,
 
Självklart kan vi hjälpa dig att returnera din beställning till oss!
 
Bifogat i detta mejl finner du retursedeln. 
Du fäster retursedeln på kartongen och sedan lämnar du returen på ditt närmsta Bring ombud. En bekräftelse av returen kommer att skickas till din mejl.
 
Vi rekommenderar att alltid be om ett inlämningskvitto så att du har underlag på att du lämnat över returen till fraktbolaget. Skulle originalförpackningen behöva tejpas kan transparent tejp användas och i så liten utsträckning som möjligt.
Mer gällande våra villkor kring returer kan du läsa om via länken nedan:
http://www.bauhaus.se/angerratt-och-garanti
 
Vi vill också informera om att du kommer att stå för kostnaden för returfrakten på 59 kr. Väljer du däremot att genomföra returen i ett av våra varuhus debiteras ingen returfrakt.
 
Ärendet kommer att handläggas som vilande/löst så länge men öppnas igen om du svarar i denna mejltråd.
Du är varmt välkommen att återkomma när returen är inlämnad om du önskar, annars hör vi av oss så snart returen inkommit till oss och återbetalningsprocessen påbörjas.
 
Har du några frågor eller funderingar är du mer än välkommen att återkomma till oss.
 
Önskar dig en fin dag!
 
Med vänliga hälsningar,
Adam B
 
BAUHAUS Webshop - När det måste bli bra.
www.bauhaus.se
E-post: kundtjanst@bauhaus.se
Telefon: 010 180 18 00`,
  },

  {
    id: "vh_oss_sts",
    title: "VH/OSS STS - Retur",
    description: "Kund kan välja varuhus eller returfraktalternativ.",
    triggers: ["varuhus", "butik", "alternativ", "lämna", "öppet köp", "ångrar", "retur", "returnera"],
    conditions: [],
    warnings: [],
    text: `Hej,
 
Tack för att du hör av dig! Självklart hjälper vi dig med ett ångerköp.

Det finns två alternativ när du vill returnera varor på din webshopsorder.
Alternativ ett är att du lämnar tillbaka varan i valfritt varuhus. 
Du behöver antingen ta med ditt ordernummer eller kvitto dit. 
Produkten måste vara i säljbart skick och i sin originalförpackning.

Alternativ två är att vi hjälper dig med en retur till vårt lager.
Kostnaden för returfrakten är XXX kr.

Du är varmt välkommen att återkomma till oss med hur du önskar gå vidare med din retur.

Ser fram emot din återkoppling och önskar dig en fin dag!
 
Med vänliga hälsningar,
Adam B​
 
BAUHAUS Webshop - När det måste bli bra.
www.bauhaus.se
E-post: kundtjanst@bauhaus.se
Telefon: 010 180 18 00`,
  },

  {
    id: "kund_ska_returnera_vh",
    title: "Kund ska returnera i VH - Retur",
    description: "Kunden vill lämna returen i ett varuhus.",
    triggers: ["lämna i varuhus", "lämna i butik", "varuhus", "butik", "komma in"],
    conditions: [],
    warnings: [],
    text: `Hej,
Stort tack för din återkoppling!
 
Självklart går det bra att returnera i våra varuhus.
Uppge då ditt ordernummer, eller medtag en kopia av ditt kvitto så hjälper personalen dig på plats.
 
Jag bifogar ditt kvitto på nytt i mejlet ifall du saknar det.
 
Önskar du returnera till oss på BAUHAUS Webbshop är du varmt välkommen att återkomma till oss så hjälper vi dig vidare från vårt håll. Ditt ärende handläggs som löst, men du kan när som helst öppna ärendet igen genom att svara på det här mejlet.
 
Önskar dig en fortsatt trevlig dag!
 
Med vänliga hälsningar,
Adam B
 
BAUHAUS Webshop - När det måste bli bra.
www.bauhaus.se
E-post: kundtjanst@bauhaus.se
Telefon: 010 180 18 00`,
  },

  {
    id: "kund_har_returnerat_vh",
    title: "Kund HAR returnerat i VH",
    description: "Kunden bekräftar att de returnerat i varuhus.",
    triggers: ["har lämnat", "har returnerat", "lämnade i butik", "lämnade i varuhus", "var i varuhuset", "genomfört retur"],
    conditions: [],
    warnings: [],
    text: `Hej,

Stort tack för din återkoppling!

Vad skönt att höra! Hoppas du fick den hjälp du önskat på plats i varuhuset.

Du är varmt välkommen att återkomma till mig om du har några frågor eller funderingar. 
Ditt ärende handläggs som löst, men du kan när som helst öppna ärendet igen genom att svara på det här mejlet.

Önskar dig en fortsatt fin dag och varmt välkommen åter!

Med vänliga hälsningar,
Adam B

BAUHAUS Webshop - När det måste bli bra.
www.bauhaus.se
E-post: kundtjanst@bauhaus.se
Telefon: 010 180 18 00`,
  },

  {
    id: "kund_nekat_leverans",
    title: "Kund nekat leverans - inv retur",
    description: "Kunden vägrade ta emot leveransen.",
    triggers: ["nekat", "nekade", "vägrade", "tog inte emot", "ville inte ha", "avvisade"],
    conditions: [],
    warnings: ["Kunden debiteras både fraktkostnad och returfrakt."],
    text: `Hej,

Hoppas att allt är fint med dig!

Jag ser att du nekat leveransen på din order.
Fraktbolaget kommer inom kort att skicka den i retur till vårt webblager. 

När din retur har inkommit till oss påbörjar vi hanteringen av din återbetalning. När återbetalningen är genomförd skickas en bekräftelse tillsammans med ett returkvitto till din e-postadress.

Tack för ditt tålamod. Jag önskar dig en fortsatt trevlig dag och varmt välkommen åter!

Med vänliga hälsningar,
Adam B

BAUHAUS Webshop - När det måste bli bra.
www.bauhaus.se
E-post: kundtjanst@bauhaus.se
Telefon: 010 180 18 00`,
  },

  {
    id: "order_skickats_ej_uthämtad",
    title: "Order skickats ej uthämtad",
    description: "Order för långt gången för att stoppas.",
    triggers: ["glömt hämta", "glömde hämta", "hann inte hämta", "låg kvar", "ej hämtat", "inte hämtat"],
    conditions: [],
    warnings: ["Kunden debiteras fraktkostnad + returkostnad för ej uthämtat paket."],
    text: `Hej,

Tack för att du har kontaktat oss!

Tyvärr har din order hunnit gå för långt för att stoppas.
Om du väljer att inte hämta upp ordern kommer den automatiskt att gå i retur.

Så fort den åter är i retur kommer återbetalningen att påbörjas.
Jag även informera om att returfraktkostnaden ligger på 69 kronor.

Ha en fortsatt trevlig dag!

Med vänliga hälsningar,
Adam B

BAUHAUS Webshop
www.bauhaus.se
010 - 180 18 00`,
  },

  {
    id: "bomkord_retur",
    title: "Bomkörd returupphämtning - kolla med kund",
    description: "Tidsbestämd upphämtning misslyckades.",
    triggers: ["bomkörning", "missad upphämtning", "inte hemma", "ej hemma", "misslyckad", "tidsbestämd"],
    conditions: [],
    warnings: ["Kontrollera tillgängliga tidslottar med distributionen innan du svarar."],
    text: `Hej,

Hoppas att allt är väl med dig!

Jag har nåtts av informationen att returupphämtningen ej var lyckad. Detta då vår distribution ej har fått tag på dig vid upphämtningen, att du ej var på plats eller liknande.

Du är varmt välkommen att återkomma om det är något annat problem du har uppfattat gällande detta. Annars är du välkommen att boka in en ny returupphämtning inom samma villkor som tidigare.

Returen sker med vårt egna transportbolag. De erbjuder upphämtning under specifika tidslottar och jag önskar därför få höra vilket datum och under vilket tidsspann som passar bäst.

Vi vill även informera om att de endast kör ut vardagar.
De tidsintervaller som erbjuds är:

TIDSSLOTTARNA

Önskas upphämtning behöver vi återkoppling om önskad dag och tidslott senast kl 10:00 två arbetsdagar innan.

Med vänliga hälsningar,
Adam B

BAUHAUS Webshop - När det måste bli bra.
www.bauhaus.se
E-post: kundtjanst@bauhaus.se
Telefon: 010 180 18 00`,
  },

  {
    id: "ber_de_ta_i_retur",
    title: "Ber DE ta i retur - Retur",
    description: "Kontaktar distribution för att avbryta leverans.",
    triggers: ["stoppa", "avbryt", "innan leverans", "inte fått", "stoppas", "hinner"],
    conditions: [],
    warnings: [],
    text: `Hej,
 
Självklart kan vi hjälpa dig att returnera din beställning till oss!
 
Jag har nu kontaktat vår distribution och ber dom avbryta leveransen och ta din order i retur. Om det skulle vara så att dom hinner leverera innan dom ser min returförfrågan kan du neka leveransen på plats så tar dom din order direkt i retur.
 
Vi vill också informera om att du kommer att få stå för kostnaden för returfrakten på XXX kr.
Mer gällande våra villkor kring returer kan du läsa om via länken nedan:
http://www.bauhaus.se/angerratt-och-garanti
 
Så snart returen har inkommit till oss kommer vi påbörja återbetalningsprocessen, och en bekräftelse (returkvitto) på återbetalningen kommer skickas till samma mejl som du nyttjade vid beställningstillfället.
 
Har du några frågor eller funderingar är du mer än välkommen att återkomma till oss.
 
Önskar dig en trevlig dag!
 
Med vänliga hälsningar,
Adam B

BAUHAUS Webshop - När det måste bli bra.
www.bauhaus.se
E-post: kundtjanst@bauhaus.se
Telefon: 010 180 18 00`,
  },

  {
    id: "hygienartikel_bilder",
    title: "Hygienartikel - Be om bilder",
    description: "Be om bilder för att godkänna retur av hygienartikel.",
    triggers: ["hygien", "toalett", "wc", "innerplast", "plombering", "förseglad"],
    conditions: [],
    warnings: ["Kontrollera att innerplast och plombering är obruten."],
    text: `Hej,
 
Hoppas att allt är bra med dig!
 
För att kunna godkänna returer av hygienartiklar måste vi kunna säkerställa att eventuell innerplast och plombering är obruten. Detta enligt våra villkor som du godkänner vid köp hos oss. Därför ber jag att du skickar tillbaka bilder på varan så hjälper vi dig sedan vidare med din retur.
 
Mer om våra villkor kan du läsa här: https://www.bauhaus.se/angerratt-och-garanti
 
Ser fram emot din återkoppling och önskar dig en fortsatt fin dag!
 
Med vänliga hälsningar,
Adam B​
 
BAUHAUS Webshop - När det måste bli bra.
www.bauhaus.se
E-post: kundtjanst@bauhaus.se
Telefon: 010 180 18 00`,
  },

  {
    id: "adr_mammotion",
    title: "ADR Mammotion - Retur",
    description: "Farligt gods, kan ej hanteras via vanlig frakt.",
    triggers: ["mammotion", "gräsklippare", "batteri", "adr", "farligt gods", "lithium"],
    conditions: [],
    warnings: ["Farligt gods – kan ej returneras via vanlig frakt!"],
    text: `Hej,

Tack för att du kontaktar oss!

På grund av att dessa produkter klassas som farligt gods har vi tyvärr inte möjlighet att hantera returen via vanlig frakt.

Om du önskar returnera din gräsklippare är du istället varmt välkommen att lämna in den i ditt närmaste BAUHAUS-varuhus, där vår personal gärna hjälper dig vidare med returhanteringen.

Har du några frågor eller behöver hjälp med att hitta ditt närmaste varuhus är du självklart välkommen att kontakta oss igen.

Önskar dig en fortsatt fin dag!

Med vänliga hälsningar,
Adam B

BAUHAUS Webshop
www.bauhaus.se
010 - 180 18 00`,
  },

  {
    id: "lagerlagg_rma",
    title: "Lagret - ta emot RMA vid korrekt retur",
    description: "Intern lagerhantering.",
    triggers: ["rma", "lagerlägg", "rma-nummer"],
    conditions: [],
    warnings: [],
    text: `Hej 429, vid retur som kommer in korrekt vänligen lagerlägg med RMA XXX.
Mvh,
Adam B`,
  },
];

if (typeof module !== "undefined") module.exports = { MACROS };
