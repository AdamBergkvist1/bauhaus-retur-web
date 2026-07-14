/**
 * analyzeCase.js
 * Analyserar ett kundmejl och returnerar:
 *   - Makroförslag (sorterade efter relevans)
 *   - Varningar om regler som påverkar hanteringen
 *   - Ärendetyp (retur, reklamation, fråga, etc.)
 *
 * Används av popup.js för att visa makroförslag.
 * Exporteras även för Jest-testning.
 */

"use strict";

// ── Reglerdatabas ────────────────────────────────────────────────────

const CASE_RULES = [

  // Ångerrätt / öppet köp
  {
    id: "bestellningssortiment",
    message: "⚠️ Beställningssortiment – öppet köp gäller EJ.",
    test: (text) => /beställningssortiment|special(?:beställ|tillverkad)/i.test(text),
  },
  {
    id: "oppet_kop_utgangen",
    message: "⚠️ Kontrollera om 60 dagars öppet köp har löpt ut.",
    // Triggar om kunden nämner datum eller "månader sedan" / "länge sedan"
    test: (text) => /för\s+\d+\s+månader\s+sedan|länge\s+sedan|månader\s+tillbaka|\d+\s+månader/i.test(text),
  },
  {
    id: "foretag",
    message: "ℹ️ Företagskund – köplagen gäller, 30 dagars öppet köp.",
    test: (text) => {
      // Bolagsform (AB/KB/HB) kräver ett versalt företagsnamn FÖRE — annars
      // matchade "\bab\b" vanliga ord ("ab och till") och namn ("Ab-dullah"),
      // vilket felaktigt klassade privatpersoner som företag och halverade
      // deras öppet köp från 60 till 30 dagar.
      const bolagsform = /[A-ZÅÄÖ][\wåäöÅÄÖ&-]*\s+(?:AB|KB|HB)\b/.test(text);
      const ovrigt = /\baktiebolag\b|\bhandelsbolag\b|org\.?\s*nr|momsreg|\bföretag(?:et|skund)?\b/i.test(text);
      return bolagsform || ovrigt;
    },
  },
  {
    id: "premium",
    message: "ℹ️ Premiumkund – 90 dagars öppet köp.",
    test: (text) => /premium(?:kund)?|premiummedlem/i.test(text),
  },
  {
    id: "obruten_forpackning",
    message: "✓ Kunden uppger obruten förpackning – öppet köp troligen möjligt.",
    test: (text) => /obruten|oöppnad|originalförpackning|intakt\s+förpackning/i.test(text),
  },
  {
    id: "oppnad_vara",
    message: "⚠️ Öppnad/använd vara – öppet köp kan nekas, värdeminskningsavdrag möjligt.",
    test: (text) => {
      const cleaned = text.toLowerCase()
        // Prefix-negationer: "oöppnad", "oanvänd", "oanvänt"
        .replace(/oöppna[dt]/g, "").replace(/oanvän[dt][ats]?/g, "")
        // Fristående negationer: "inte öppnat", "ej använd", "aldrig monterad".
        // Negationen måste stå nära verbet (max 2 ord emellan) för att inte
        // råka avfärda äkta risk längre fram i meningen.
        .replace(/\b(inte|ej|aldrig)\s+(?:\w+\s+){0,2}?(öppna[dt]?|använ[dt][ats]?|monterad?[t]?)\b/g, "");
      // OBS: "använ[dt]" (inte "använd") — annars missas "använt", vilket är
      // det vanligaste sättet kunder uttrycker det på.
      return /öppna[dt]|använ[dt][ats]?|monterad[t]?|trasig[t]?/.test(cleaned);
    },
  },

  // Transportskada
  {
    id: "transportskada",
    message: "⚠️ Möjlig transportskada – påminn kunden om 5-dagarsgräns och att spara emballaget.",
    test: (text) => /transport(?:skad|skad)|emballage(?:skad|skad)|skad(?:at|ad)\s+(?:vid|under)\s+(?:leverans|transport)|krossad|böjd|trasig.*leverans/i.test(text),
  },

  // Leveransproblem
  {
    id: "ej_uthämtat",
    message: "ℹ️ Ej uthämtat paket – kunden debiteras fraktkostnad + returkostnad.",
    test: (text) => /glömt\s+hämta|ej\s+hämtat|inte\s+hämtat|hann\s+inte|låg\s+kvar|returnerad.*ombud/i.test(text),
  },
  {
    id: "nekat_leverans",
    message: "ℹ️ Nekat leverans – kunden debiteras fraktkostnad + returkostnad.",
    test: (text) => /nekat|nekade|vägrade|avslog\s+leverans|tog\s+inte\s+emot/i.test(text),
  },

  // Reklamation
  {
    id: "reklamation",
    message: "ℹ️ Möjlig reklamation – 3 års reklamationsrätt. Be om ordernummer + bilder.",
    test: (text) => /reklamation|reklamera|garanti|fabrikationsfel|ursprungsfel|defekt|trasig.*(?:vid\s+mottagning|direkt|fabrik)/i.test(text),
  },
  {
    id: "elverktyg_garanti",
    message: "ℹ️ Elverktyg/maskin – 5 års garanti mot fabrikations- och ursprungsfel.",
    test: (text) => /elverktyg|maskin|borr(?:maskin)?|sticksåg|cirkelsåg|slipmaskin|kompressor/i.test(text),
  },
];

// ── Ärendetyper ──────────────────────────────────────────────────────

const CASE_TYPES = [
  { id: "reklamation",  label: "Reklamation",  test: (t) => /reklamation|reklamera|garanti|defekt|trasig/i.test(t) },
  { id: "retur",        label: "Retur",        test: (t) => /retur|returnera|skicka\s+tillbaka|ångrar/i.test(t) },
  { id: "leverans",     label: "Leveransproblem", test: (t) => /leverans|inte\s+kommit|försenad|saknas|spåra/i.test(t) },
  { id: "faktura",      label: "Faktura/betalning", test: (t) => /faktura|återbetalning|betala|betalning|kredit/i.test(t) },
  { id: "varuhus",      label: "Varuhusretur", test: (t) => /varuhus|butik|lämna\s+(?:i|på)\s+(?:butik|varuhus)/i.test(t) },
];

// ── Huvudfunktion ────────────────────────────────────────────────────

/**
 * Analyserar ett mejl och returnerar ärendeanalys.
 *
 * @param {string} text           – mejltexten
 * @param {object} context        – { shippingLabel, totalWeight, hasRisk }
 * @returns {{
 *   caseType:      string|null,
 *   warnings:      string[],
 *   macroSuggestions: Array<{ macro, score, warnings }>
 * }}
 */
function analyzeCase(text, context = {}) {
  const lower = text.toLowerCase();
  const { shippingLabel = "", totalWeight = 0, hasRisk = false } = context;

  // ── Ärendetyp ──────────────────────────────────────────────────
  const caseType = CASE_TYPES.find(ct => ct.test(lower))?.label ?? null;

  // ── Regelvarningar ─────────────────────────────────────────────
  const warnings = CASE_RULES
    .filter(rule => rule.test(lower))
    .map(rule => rule.message);

  // ── Makropoäng ─────────────────────────────────────────────────
  // Ladda MACROS – fungerar både i Chrome (global) och Node (require)
  const macros = (typeof MACROS !== "undefined") ? MACROS
    : require("./macros").MACROS;

  const analysisContext = { shippingLabel, totalWeight, hasRisk, text: lower };

  const scored = macros.map(macro => {
    let score = 0;

    // Poäng för trigger-ord i texten
    for (const trigger of macro.triggers) {
      if (lower.includes(trigger.toLowerCase())) score += 2;
    }

    // Poäng för logiska conditions
    for (const condition of macro.conditions) {
      try { if (condition(analysisContext)) score += 3; }
      catch {}
    }

    // Extra poäng om fraktsättet matchar makrot
    if (shippingLabel) {
      const sl = shippingLabel.toLowerCase();
      if (macro.id === "bring_hd_retur" && (sl.includes("hemleverans") || sl.includes("hd"))) score += 4;
      if (macro.id === "bring_sp_retur" && (sl.includes("ombud") || sl.includes("servicepoint") || sl.includes("postnord"))) score += 4;
      if (macro.id === "bauhaus_tidsbestamd_retur" && sl.includes("tidsbestämd")) score += 4;
    }

    // Kombinerade varningar (från makro + regelmotor)
    const allWarnings = [...macro.warnings];

    return { macro, score, warnings: allWarnings };
  });

  // Filtrera bort makron med 0 poäng och sortera
  const macroSuggestions = scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3); // max 3 förslag

  return { caseType, warnings, macroSuggestions };
}

// Exportera för Node.js/Jest
if (typeof module !== "undefined") module.exports = { analyzeCase, CASE_RULES, CASE_TYPES };
