/**
 * dimensions.js  v1.0
 * Extraherar förpackningsmått ur Bauhaus produktsidas HTML.
 *
 * Används av:
 *   - background.js (Chrome Service Worker) – vid produktuppslag
 *   - tests/dimensions.test.js – Jest-tester
 *
 * Exporterar: extractDimensions(html) → { length, width, height } i mm | null
 */

"use strict";

/**
 * extractDimensions  v2.1
 * Extraherar mått (längd, bredd, höjd) i mm ur HTML.
 *
 * Söker i fyra lager, i prioritetsordning:
 *   1. <td class="dimensions"> – L×B×H med enhet (mm eller cm)
 *   2. Fritext i mm – "Längd: 1281 mm", "Bredd: 307 mm", "Höjd: 350 mm"
 *   3. Fritext i cm – "Bredd: 29,5 cm", "Djup: 57 cm", "Höjd: 82 cm"
 *   4. Diameter som fallback – "Diameter: 38,5 cm" → length = width = diameter
 *
 * Returnerar { length, width, height } i mm, eller null om ingenting hittades.
 */
function extractDimensions(html) {
  // Avkoda HTML-entiteter – Bauhaus bäddar in måtten som &#xA0; etc.
  const decoded = html
    .replace(/&#xA0;|&nbsp;/gi, " ")
    .replace(/&#x3A;|&colon;/gi, ":")
    .replace(/&#x20;/gi, " ")
    .replace(/&auml;/gi,  "ä")
    .replace(/&ouml;/gi,  "ö")
    .replace(/&aring;/gi, "å")
    .replace(/&#xF6;/gi,  "ö")
    .replace(/&#xE4;/gi,  "ä")
    .replace(/&#xE5;/gi,  "å");

  const dims  = { length: null, width: null, height: null };
  const toMm  = (val, unit) => unit.toLowerCase().includes("cm") ? val * 10 : val;
  const p     = s => parseFloat(s.replace(",", "."));
  const extr  = (re) => { const m = decoded.match(re); return m ? { val: p(m[1]), unit: m[2] } : null; };

  // ── 1. <td class="dimensions"> ───────────────────────────────────
  const dimCell = decoded.match(/<td[^>]*class=["'][^"']*\bdimensions\b[^"']*["'][^>]*>([^<]+)<\/td>/i);
  if (dimCell) {
    const raw = dimCell[1].replace(/&nbsp;/g, " ").trim();

    // "1281 x 307 x 350 mm" eller "20 x 12 x 70 cm ( L x B x H )"
    const lbh = raw.match(/(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(mm|cm)?/i);
    if (lbh) {
      const unit = (lbh[4] || "mm").toLowerCase();
      dims.length = toMm(p(lbh[1]), unit);
      dims.width  = toMm(p(lbh[2]), unit);
      dims.height = toMm(p(lbh[3]), unit);
      return dims;
    }

    // "350 mm ( H )" – enskilt mått med axelbeteckning
    const single = raw.match(/(\d+(?:[.,]\d+)?)\s*(mm|cm)[^(]*\(\s*([LBHlbh])\s*\)/);
    if (single) {
      const val = toMm(p(single[1]), single[2]), axis = single[3].toUpperCase();
      if (axis === "L") dims.length = val;
      else if (axis === "B") dims.width  = val;
      else if (axis === "H") dims.height = val;
    }
  }

  // ── 2 & 3. Fritext – mm och cm ───────────────────────────────────
  const lM = extr(/[Ll]\u00e4ngd\s*:?\s*([\d.,]+)\s*(mm|cm)/);
  const bM = extr(/[Bb]redd\s*:?\s*([\d.,]+)\s*(mm|cm)/);
  const hM = extr(/[Hh]\u00f6jd\s*:?\s*([\d.,]+)\s*(mm|cm)/);
  const dM = extr(/[Dd]jup\s*:?\s*([\d.,]+)\s*(mm|cm)/);

  if (dims.length === null && lM) dims.length = toMm(lM.val, lM.unit);
  if (dims.length === null && dM) dims.length = toMm(dM.val, dM.unit); // Djup → längd
  if (dims.width  === null && bM) dims.width  = toMm(bM.val, bM.unit);
  if (dims.height === null && hM) dims.height = toMm(hM.val, hM.unit);

  // ── 4. Diameter som fallback ─────────────────────────────────────
  if (dims.length === null && dims.width === null) {
    const diam = extr(/[Dd]iameter\s*:?\s*([\d.,]+)\s*(mm|cm)/);
    if (diam) {
      dims.length = toMm(diam.val, diam.unit);
      dims.width  = toMm(diam.val, diam.unit);
    }
  }

  if (dims.length === null && dims.width === null && dims.height === null) return null;
  return dims;
}

// Stöder både Chrome Service Worker (global) och Node.js (module.exports)
if (typeof module !== "undefined") module.exports = { extractDimensions };