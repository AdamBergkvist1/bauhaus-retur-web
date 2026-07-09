const BAUHAUS_BASE = "https://www.bauhaus.se";
const BAUHAUS_REST = `${BAUHAUS_BASE}/rest/sv/V1`;
const ALGOLIA_APP_ID = "TGPIEONN2S";
const ALGOLIA_INDEX = "nordic_production_sv_products";
const ALGOLIA_ENDPOINT = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/*/queries`;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  const action = req.query.action;

  if (action === "algolia-key") {
    try {
      const r = await fetch(`${BAUHAUS_BASE}/catalogsearch/result/?q=hammer`, {
        headers: { Accept: "text/html", "Accept-Language": "sv-SE,sv;q=0.9" },
      });
      const html = await r.text();
      const m = html.match(/"apiKey"\s*:\s*"([A-Za-z0-9+/=]{40,})"/);
      if (!m) throw new Error("Nyckel hittades inte");
      res.status(200).json({ success: true, key: m[1] });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
    return;
  }

  if (action === "product") {
    const { articleNumber } = req.body ?? {};
    try {
      const keyRes = await fetch(`${BAUHAUS_BASE}/catalogsearch/result/?q=hammer`, {
        headers: { Accept: "text/html", "Accept-Language": "sv-SE,sv;q=0.9" },
      });
      const html = await keyRes.text();
      const m = html.match(/"apiKey"\s*:\s*"([A-Za-z0-9+/=]{40,})"/);
      if (!m) throw new Error("Kunde inte hämta Algolia-nyckel");
      const apiKey = m[1];

      const algoliaRes = await fetch(ALGOLIA_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-algolia-application-id": ALGOLIA_APP_ID,
          "x-algolia-api-key": apiKey,
        },
        body: JSON.stringify({
          requests: [{
            indexName: ALGOLIA_INDEX,
            query: articleNumber,
            params: "hitsPerPage=15&attributesToRetrieve=url,objectID,ean,name,sku",
          }],
        }),
      });

      const json = await algoliaRes.json();
      const hits = json?.results?.[0]?.hits;
      if (!Array.isArray(hits) || hits.length === 0) throw new Error("Artikeln hittades inte.");

      const best = hits.find(h => String(h.sku) === articleNumber)
        ?? hits.find(h => String(h.objectID) === articleNumber)
        ?? hits.find(h => h.url?.includes(articleNumber));
      if (!best) throw new Error("Artikeln hittades inte i Algolia (kan vara avpublicerad).");

      const rawSku = String(best.sku ?? "");
      const rawObjId = String(best.objectID ?? "");
      const sku = /^\d{7,8}$/.test(rawSku) ? rawSku : /^\d{7,8}$/.test(rawObjId) ? rawObjId : null;
      const rawEan = String(best.ean ?? "").replace(/\s/g, "");
      const ean = /^\d{8,14}$/.test(rawEan) ? rawEan : null;
      if (!ean) throw new Error("EAN saknas.");

      const productUrl = best.url?.startsWith("http") ? best.url : `${BAUHAUS_BASE}${best.url}`;
      const pageRes = await fetch(productUrl, { headers: { Accept: "text/html", "Accept-Language": "sv-SE,sv;q=0.9" } });
      const pageHtml = await pageRes.text();

      // Vikt
      const wm = pageHtml.match(/<td[^>]*class=["'][^"']*(?:\bweight\b|\bnet_weight\b)[^"']*["'][^>]*>([\d.,]+)<\/td>/i)
        || pageHtml.match(/"(?:weight|net_weight)"\s*:\s*"?([\d.,]+)"?/i);
      const weight = wm ? parseFloat(wm[1].replace(",", ".")) : null;

      // Produktnamn
      const productName = String(best.name ?? "").toUpperCase();
      const shortName = productName.split(" ").slice(0, 2).join(" ");

      // Mått
      const toMm = (val, unit) => {
        const u = unit.toLowerCase();
        if (u === "cm") return val * 10;
        if (u === "m") return val * 1000;
        return val; // mm är default
      };
      const p = s => parseFloat(s.replace(",", "."));
      let dimensions = null;

      // Försök 1: L×B×H format
      const lbhMatch = pageHtml.match(/(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|m)/i);
      if (lbhMatch) {
        const unit = lbhMatch[4] || "mm";
        dimensions = {
          length: toMm(p(lbhMatch[1]), unit),
          width: toMm(p(lbhMatch[2]), unit),
          height: toMm(p(lbhMatch[3]), unit),
        };
      }

      // Försök 2: Längd/Bredd/Höjd/Djup fritext
      if (!dimensions) {
        const lM = pageHtml.match(/[Ll]ängd[:\s]*([\d.,]+)\s*(mm|cm|m)/);
        const bM = pageHtml.match(/[Bb]redd[:\s]*([\d.,]+)\s*(mm|cm|m)/);
        const hM = pageHtml.match(/[Hh]öjd[:\s]*([\d.,]+)\s*(mm|cm|m)/)
          || pageHtml.match(/[Dd]jup[:\s]*([\d.,]+)\s*(mm|cm|m)/);
        if (lM && bM && hM) {
          dimensions = {
            length: toMm(p(lM[1]), lM[2]),
            width: toMm(p(bM[1]), bM[2]),
            height: toMm(p(hM[1]), hM[2]),
          };
        }
      }

      // Försök 3: A/B/E-mått (t.ex. stolpfot)
      if (!dimensions) {
        const aM = pageHtml.match(/\bA:\s*([\d.,]+)\s*(mm|cm|m)/);
        const bM = pageHtml.match(/\bB:\s*([\d.,]+)\s*(mm|cm|m)/);
        const eM = pageHtml.match(/\bE:\s*([\d.,]+)\s*(mm|cm|m)/);
        if (aM && bM) {
          dimensions = {
            length: toMm(p(aM[1]), aM[2]),
            width: toMm(p(bM[1]), bM[2]),
            height: eM ? toMm(p(eM[1]), eM[2]) : toMm(p(bM[1]), bM[2]),
          };
        }
      }

      // Försök 4: Diameter som fallback
      if (!dimensions) {
        const diam = pageHtml.match(/[Dd]iameter[:\s]*([\d.,]+)\s*(mm|cm|m)/);
        if (diam) {
          const d = toMm(p(diam[1]), diam[2]);
          dimensions = { length: d, width: d, height: d };
        }
      }

// Försök 5: Bredd/Djup/Höjd utan kolon
      if (!dimensions) {
        const bM = pageHtml.match(/Bredd[:\s]+([\d.,]+)\s*(mm|cm)/);
        const dM = pageHtml.match(/Djup[:\s]+([\d.,]+)\s*(mm|cm)/);
        const hM = pageHtml.match(/Höjd[:\s]+([\d.,]+)\s*(mm|cm)/);
        if (bM && hM) {
          dimensions = {
            length: dM ? toMm(p(dM[1]), dM[2]) : toMm(p(bM[1]), bM[2]),
            width: toMm(p(bM[1]), bM[2]),
            height: toMm(p(hM[1]), hM[2]),
          };
        }
      }

      // Försök 6: Bredd (mm)/Höjd (mm) format
      if (!dimensions) {
        const bM = pageHtml.match(/Bredd\s*\(mm\)[:\s]+([\d.,]+)/);
        const hM = pageHtml.match(/Höjd\s*\(mm\)[:\s]+([\d.,]+)/);
        const dM = pageHtml.match(/Djup\s*\(mm\)[:\s]+([\d.,]+)/);
        if (bM && hM) {
          dimensions = {
            length: dM ? p(dM[1]) : p(bM[1]),
            width: p(bM[1]),
            height: p(hM[1]),
          };
        }
      }

      // Försök 7: Bredd/Längd i cm
      if (!dimensions) {
        const bM = pageHtml.match(/Bredd[:\s]+([\d.,]+)\s*cm/);
        const lM = pageHtml.match(/Längd[:\s]+([\d.,]+)\s*cm/);
        const hM = pageHtml.match(/Höjd[:\s]+([\d.,]+)\s*cm/);
        if (bM && lM) {
          dimensions = {
            length: toMm(p(lM[1]), "cm"),
            width: toMm(p(bM[1]), "cm"),
            height: hM ? toMm(p(hM[1]), "cm") : toMm(p(bM[1]), "cm"),
          };
        }
      }

      // Försök 8: Mått i produktrubrik h1
      if (!dimensions) {
        const titleM = pageHtml.match(/<h1[^>]*>.*?(\d+(?:[.,]\d+)?)\s*[xX×]\s*(\d+(?:[.,]\d+)?)\s*(cm|mm).*?<\/h1>/i);
        if (titleM) {
          const unit = titleM[3] || "cm";
          dimensions = {
            length: toMm(p(titleM[1]), unit),
            width: toMm(p(titleM[2]), unit),
            height: toMm(p(titleM[2]), unit),
          };
        }
      }

      const dimensionsConfidence = 
        !dimensions ? "none" :
        (dimensions.length && dimensions.width && dimensions.height) ? "full" : "partial";

      res.status(200).json({ success: true, data: { sku, ean, weight, shortName, dimensions, dimensionsConfidence } });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
    return;
  }
  
  if (action === "shipping") {
    const { postcode, articles, cookies } = req.body ?? {};
    try {
      const cartRes = await bauhausFetch("POST", "/guest-carts", null, cookies);
      const cartToken = cartRes;
      if (typeof cartToken !== "string" || cartToken.length < 5) throw new Error("Kunde inte skapa varukorg.");
      for (const article of articles) {
        try {
          await bauhausFetch("POST", `/guest-carts/${cartToken}/items`, {
            cartItem: { quote_id: cartToken, sku: String(article.sku), qty: article.quantity },
          }, cookies);
        } catch {}
      }
      try {
        await bauhausFetch("POST", `/guest-carts/${cartToken}/estimate-shipping-methods`, {
          address: { region_code: "SE", country_id: "SE", postcode },
        }, cookies);
      } catch {}
      await new Promise(r => setTimeout(r, 400));
      const totals = await bauhausFetch("GET", `/guest-carts/${cartToken}/totals`, null, cookies);
      const groups = totals?.extension_attributes?.shipping_groups;
      if (!Array.isArray(groups) || groups.length === 0) throw new Error("Inga fraktalternativ.");
      const clean = s => String(s ?? "").replace(/\s*\d+-\d+\s*arbetsdagar?/gi, "").replace(/\s{2,}/g, " ").trim();
      const all = [];
      for (const g of groups) {
        if (g.title && g.price != null) all.push({ label: clean(g.title), price: g.price, sortOrder: 99 });
        const raw = g.additional_info?.[2];
        if (raw && typeof raw === "string" && raw !== "[]") {
          try {
            for (const e of JSON.parse(raw)) {
              const price = parseFloat(String(e.price).replace(",", "."));
              if (!isNaN(price)) all.push({ label: clean(e.delivery_type), price, sortOrder: parseInt(e.sort_order ?? 99) || 99 });
            }
          } catch {}
        }
      }
      const seen = new Set();
      const options = [];
      for (const o of all) {
        const k = `${o.label}|${o.price}`;
        if (!seen.has(k) && o.label) { seen.add(k); options.push(o); }
      }
      options.sort((a, b) => a.price - b.price || a.sortOrder - b.sortOrder);
      // additional_info[1] = verifierad totalvikt (kg) för hela fraktgruppen,
      // bekräftad 2026-07-09 (skalar korrekt med antal, t.ex. 3x1,3kg → 3,9).
      const verifiedWeight = groups.reduce((sum, g) => sum + (Number(g.additional_info?.[1]) || 0), 0);
      res.status(200).json({ success: true, options, verifiedWeight: verifiedWeight || null });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
    return;
  }

  res.status(400).json({ error: "Okänd action" });
}

async function bauhausFetch(method, path, body, cookies = "") {
  const url = `${BAUHAUS_REST}${path}`;
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  };
  if (cookies) headers["Cookie"] = cookies;
  const opts = { method, headers };
  if (body !== null) opts.body = JSON.stringify(body);
  const r = await fetch(url, opts);
  const text = await r.text();
  if (!r.ok) { let d = text; try { d = JSON.parse(text)?.message ?? text; } catch {} throw new Error(`HTTP ${r.status}: ${d}`); }
  try { return JSON.parse(text); } catch { return text; }
}
