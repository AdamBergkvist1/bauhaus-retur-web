/**
 * api/shipping.js  – Vercel Serverless Function
 * Proxar Bauhaus checkout-API för fraktberäkning.
 * Körs server-side så CORS-begränsningar kringgås.
 *
 * POST /api/shipping
 * Body: { postcode: "75234", articles: [{ sku: "1234567", quantity: 2 }] }
 */

const BAUHAUS_BASE = "https://www.bauhaus.se";
const BAUHAUS_REST = `${BAUHAUS_BASE}/rest/sv/V1`;

export default async function handler(req, res) {
  // CORS-headers så frontend kan anropa från vilken origin som helst
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { postcode, articles } = req.body ?? {};

  if (!postcode || !/^\d{5}$/.test(postcode.replace(/\s/g, ""))) {
    res.status(400).json({ error: "Ogiltigt postnummer. Ange 5 siffror." });
    return;
  }
  if (!Array.isArray(articles) || articles.length === 0) {
    res.status(400).json({ error: "Inga artiklar att beräkna frakt för." });
    return;
  }

  const cleanPostcode = postcode.replace(/\s/g, "");

  try {
    // Steg 1: Skapa gäst-varukorg
    const cartRes = await bauhausFetch("POST", "/guest-carts", null);
    const cartToken = cartRes;
    if (typeof cartToken !== "string" || cartToken.length < 5) {
      throw new Error("Kunde inte skapa gäst-varukorg.");
    }

    // Steg 2: Lägg till artiklar
    for (const article of articles) {
      try {
        await bauhausFetch("POST", `/guest-carts/${cartToken}/items`, {
          cartItem: {
            quote_id: cartToken,
            sku: String(article.sku),
            qty: article.quantity,
          },
        });
      } catch (err) {
        console.warn(`SKU ${article.sku} misslyckades: ${err.message}`);
      }
    }

    // Steg 3: estimate-shipping-methods med postnummer
    try {
      await bauhausFetch("POST", `/guest-carts/${cartToken}/estimate-shipping-methods`, {
        address: {
          region_code: "SE",
          country_id: "SE",
          postcode: cleanPostcode,
        },
      });
    } catch (err) {
      console.warn("estimate-shipping-methods:", err.message);
    }

    await sleep(400);

    // Steg 4: Hämta fraktalternativ
    const totals = await bauhausFetch("GET", `/guest-carts/${cartToken}/totals`, null);
    const shippingGroups = totals?.extension_attributes?.shipping_groups;

    if (!Array.isArray(shippingGroups) || shippingGroups.length === 0) {
      throw new Error("Inga fraktalternativ returnerades.");
    }

    const cleanLabel = (raw) =>
      String(raw ?? "")
        .replace(/\s*\d+-\d+\s*arbetsdagar?/gi, "")
        .replace(/\s{2,}/g, " ")
        .trim();

    const allOptions = [];
    for (const group of shippingGroups) {
      if (group.title && group.price != null) {
        allOptions.push({
          label: cleanLabel(group.title),
          price: group.price,
          partnerCode: group.code ?? "",
          sortOrder: 99,
        });
      }
      const rawExtra = group.additional_info?.[2];
      if (rawExtra && typeof rawExtra === "string" && rawExtra !== "[]") {
        try {
          const extras = JSON.parse(rawExtra);
          for (const e of extras) {
            const price = parseFloat(String(e.price).replace(",", "."));
            if (!isNaN(price)) {
              allOptions.push({
                label: cleanLabel(e.delivery_type),
                price,
                partnerCode: String(e.partner_name ?? "").toLowerCase().replace(/\s+/g, "_"),
                sortOrder: parseInt(e.sort_order ?? 99, 10) || 99,
              });
            }
          }
        } catch {}
      }
    }

    const seen = new Set();
    const options = [];
    for (const opt of allOptions) {
      const key = `${opt.label}|${opt.price}`;
      if (!seen.has(key) && opt.label) {
        seen.add(key);
        options.push(opt);
      }
    }

    if (options.length === 0) throw new Error("Inga fraktalternativ hittades.");

    options.sort((a, b) => a.price - b.price || a.sortOrder - b.sortOrder);

    res.status(200).json({ success: true, options });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function bauhausFetch(method, path, body) {
  const url = `${BAUHAUS_REST}${path}`;
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
    "User-Agent": "Mozilla/5.0 (compatible; BauhausReturWeb/1.0)",
  };
  const opts = { method, headers };
  if (body !== null) opts.body = JSON.stringify(body);

  const response = await fetch(url, opts);
  const text = await response.text();

  if (!response.ok) {
    let detail = text;
    try { detail = JSON.parse(text)?.message ?? text; } catch {}
    throw new Error(`Bauhaus ${method} ${path} → HTTP ${response.status}: ${detail}`);
  }

  try { return JSON.parse(text); }
  catch { return text; }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
