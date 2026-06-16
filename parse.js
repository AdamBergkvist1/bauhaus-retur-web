/**
 * parse.js  v2.0
 * Exporterar de rena logikfunktionerna från popup.js för testning.
 * Denna fil är inte en del av Chrome-tillägget – används bara av Jest.
 *
 * v2.0: parseAllArticles proximity-logik + detectRiskKeywords utökad negationshantering.
 */

"use strict";

/**
 * parseAllArticles  v2.0
 * Proximity-baserad tilldelning: varje kvantitet tilldelas det
 * artikelnummer den sitter närmast i texten.
 * Qty-format: "3 st", "3x", "3 pcs", "x3"
 */
function parseAllArticles(text) {
    // Pass 1: hitta alla artikelnummer med position
    const articlePositions = [];
    const NUMBER_RE = /(?<![\d])(\d{13}|\d{7})(?![\d])/g;
    let m;
    while ((m = NUMBER_RE.exec(text)) !== null) {
        articlePositions.push({ number: m[1], pos: m.index, end: m.index + m[1].length });
    }
    if (articlePositions.length === 0) return [];

    // Pass 2: hitta alla kvantiteter med position
    const QTY_RE = /(?:\bx(\d{1,3})\b|\b(\d{1,3})\s*(?:st\.?|x|pcs?)\b)/gi;
    const quantities = [];
    while ((m = QTY_RE.exec(text)) !== null) {
        const qty = parseInt(m[1] ?? m[2], 10);
        quantities.push({ qty, pos: m.index, end: m.index + m[0].length });
    }

    // Pass 3: tilldela varje kvantitet till närmaste artikelnummer
    // Qty FÖRE artikel → avstånd * 0.9 (lätt förtur)
    // Qty EFTER artikel → avstånd * 1.1
    const assigned = new Map();
    for (const art of articlePositions) assigned.set(art.number + ":" + art.pos, []);

    for (const q of quantities) {
        let bestScore = Infinity;
        let bestKey   = null;
        for (const art of articlePositions) {
            const gapAfterQty = art.pos - q.end;
            const gapAfterArt = q.pos  - art.end;
            let dist;
            if (gapAfterQty >= 0 && gapAfterQty <= 80)      dist = gapAfterQty * 0.9;
            else if (gapAfterArt >= 0 && gapAfterArt <= 80) dist = gapAfterArt * 1.1;
            else continue;
            if (dist < bestScore) { bestScore = dist; bestKey = art.number + ":" + art.pos; }
        }
        if (bestKey) assigned.get(bestKey).push(q.qty);
    }

    // Pass 4: summera och slå ihop dubbletter
    const seen = new Map();
    for (const art of articlePositions) {
        const qtys = assigned.get(art.number + ":" + art.pos);
        const qty  = qtys.length > 0 ? qtys.reduce((a, b) => a + b, 0) : 1;
        if (seen.has(art.number)) seen.set(art.number, seen.get(art.number) + qty);
        else seen.set(art.number, qty);
    }

    return [...seen.entries()].map(([articleNumber, quantity]) => ({ articleNumber, quantity }));
}

/**
 * detectRiskKeywords  v2.0
 * Rensar negerade former innan sökning efter riskord.
 */
function detectRiskKeywords(text) {
    const RISK_KEYWORDS = [
        "öppnat", "öppnad",
        "använd", "använts",
        "trasig", "trasigt",
        "monterad", "monterat",
        "skadad",
        "defekt",
        "brutet", "bruten",
        "sönder",
    ];

    const NEGATION_PATTERNS = [
        /o[öo]ppna[dt]/g,
        /oo?ppna[dt]/g,
        /oanvänd[ts]?/g,
        /oanvänt/g,
        /omonterad[t]?/g,
        /otrasig[t]?/g,
        /oskadad[t]?/g,
        /odefekt/g,
        /obruten/g,
        /obrutet/g,
        /(?:ej|inte|aldrig|utan att|ej heller)\s+(?:\w+\s+){0,2}(?:öppna[dt]|använd[ts]?|monterad[t]?|trasig[t]?|skadad[t]?|defekt|bruten|brutet|sönder)/g,
        /har\s+(?:inte|aldrig|ej)\s+(?:öppna[dt]|använd[ts]?|monterat?)/g,
        /i\s+original(?:förpackning|emballage|skick|förpack)/g,
        /fortfarande\s+(?:förseglad|plomberad|oöppnad|oanvänd)/g,
        /i\s+o(?:brutet|skadat|öppnat)\s+skick/g,
        /aldrig\s+(?:monterade?|använd[ts]?|öppna[dt])/g,
    ];

    let cleaned = text.toLowerCase();
    for (const pattern of NEGATION_PATTERNS) {
        cleaned = cleaned.replace(pattern, " ");
    }

    return RISK_KEYWORDS.some(kw => cleaned.includes(kw));
}

/**
 * extractPostcode
 * Extraherar svenska postnummer (5 siffror) från fritext.
 */
function extractPostcode(text) {
    const matches = [];
    const re = /(?<![\d])(?:(\d{3})\s(\d{2})|(\d{5}))(?![\d])/g;
    let m;
    while ((m = re.exec(text)) !== null) {
        const raw = m[0].replace(/\s/g, "");
        if (raw >= "10000" && raw <= "99999") {
            matches.push(raw);
        }
    }
    return matches.length > 0 ? matches[0] : null;
}

module.exports = { parseAllArticles, detectRiskKeywords, extractPostcode };
