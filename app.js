"use strict";

// ── Konfig ───────────────────────────────────────────────────────────
const ALGOLIA_APP_ID   = "TGPIEONN2S";
const ALGOLIA_INDEX    = "nordic_production_sv_products";
const ALGOLIA_ENDPOINT = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/*/queries`;
const SHIPPING_API     = "https://bauhaus-retur-web.vercel.app";

// ── State ────────────────────────────────────────────────────────────
let resolvedArticles   = [];
let analysisGeneration = 0;
let selectedShipping   = null;
let hasRisk            = false;
let userName           = "Adam";
let manualTarget       = null;
let bauhausCookies     = "";
let magentoOrderNumber = null;
let shippingContents   = [];
let algoliaApiKey      = null;
const articleCache     = {};

// ── Stepper ──────────────────────────────────────────────────────────
function setStep(step) {
  const circles = [
    document.getElementById("step1Circle"),
    document.getElementById("step2Circle"),
    document.getElementById("step3Circle"),
  ];
  const labels = [
    document.getElementById("step1Label"),
    document.getElementById("step2Label"),
    document.getElementById("step3Label"),
  ];
  const lines = [
    document.getElementById("stepLine1"),
    document.getElementById("stepLine2"),
  ];
  circles.forEach((c, i) => {
    c.classList.remove("active", "done");
    labels[i].classList.remove("active", "done");
    if (i + 1 < step) {
      c.innerHTML = "✓";
      c.classList.add("done");
      labels[i].classList.add("done");
    } else if (i + 1 === step) {
      c.innerHTML = String(i + 1);
      c.classList.add("active");
      labels[i].classList.add("active");
    } else {
      c.innerHTML = String(i + 1);
    }
  });
  lines.forEach((l, i) => {
    l.classList.remove("done");
    if (i + 1 < step) l.classList.add("done");
  });
}

// ── Help modal ───────────────────────────────────────────────────────
document.getElementById("helpBtn").addEventListener("click", () => {
  document.getElementById("helpModal").classList.add("open");
});
document.getElementById("helpModalClose").addEventListener("click", () => {
  document.getElementById("helpModal").classList.remove("open");
});
document.getElementById("helpModal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("helpModal")) {
    document.getElementById("helpModal").classList.remove("open");
  }
});

// ── Meddelanden från bokmärken ───────────────────────────────────────
window.addEventListener("message", (event) => {
  if (event.origin !== "https://www.bauhaus.se" && event.origin !== "https://www-admin.bauhaus.se") return;
  if (event.data?.type === "BAUHAUS_COOKIES") {
    bauhausCookies = event.data.cookies;
    alert("✓ Cookies mottagna! Klicka nu Hämta frakt.");
    return;
  }
  if (event.data?.type === "BAUHAUS_SHIPPING") {
    const options = event.data.options;
    if (!Array.isArray(options) || options.length === 0) return;
    renderShippingOptions(options, true);
    document.getElementById("shippingError").classList.add("hidden");
    return;
  }
  if (event.data?.type === "MAGENTO_DATA") {
    const { postcode, shippingOptions } = event.data;
    if (postcode) document.getElementById("inputPostcode").value = postcode;
    if (Array.isArray(shippingOptions) && shippingOptions.length > 0) {
      renderShippingOptions(shippingOptions, true);
      document.getElementById("shippingError").classList.add("hidden");
    }
    return;
  }
});

// ── Init ─────────────────────────────────────────────────────────────
const inputName = document.getElementById("inputName");
const savedName = localStorage.getItem("bauhaus_username");
if (savedName) { userName = savedName; inputName.value = savedName; }
inputName.addEventListener("change", () => {
  const n = inputName.value.trim();
  if (n) { userName = n; localStorage.setItem("bauhaus_username", n); }
});

const urlParams   = new URLSearchParams(window.location.search);
const urlPostcode = urlParams.get("postcode");
const urlName     = urlParams.get("name");
const urlAddress  = urlParams.get("address");
const urlStreet   = urlParams.get("street");
const urlCity     = urlParams.get("city");
if (urlPostcode) document.getElementById("inputPostcode").value = urlPostcode;
if (urlName)    localStorage.setItem("bauhaus_customer_name",     urlName);
if (urlAddress) localStorage.setItem("bauhaus_customer_address",  urlAddress);
if (urlStreet)  localStorage.setItem("bauhaus_customer_street",   urlStreet);
if (urlCity)    localStorage.setItem("bauhaus_customer_city",     urlCity);
if (urlPostcode) localStorage.setItem("bauhaus_customer_postcode", urlPostcode);

const urlPhone  = urlParams.get("phone");
const urlOrder  = urlParams.get("order");
const urlEmail  = urlParams.get("email");
if (urlPhone) localStorage.setItem("bauhaus_customer_phone", urlPhone);
if (urlOrder) localStorage.setItem("bauhaus_customer_order", urlOrder);
if (urlOrder) document.getElementById("manualOrderInput").value = urlOrder;

// Magento alltid synlig och aktiv — men dimmed tills ordernummer finns
const magentoBtn = document.getElementById("magentoBtn");
magentoBtn.style.opacity = "0.4";

if (urlOrder && urlName) {
  magentoOrderNumber = urlOrder;
  magentoBtn.style.opacity = "1";
  magentoBtn.href = `https://www-admin.bauhaus.se/bauhausadmin/sales/order/index/?increment_id=${urlOrder}`;
  document.getElementById("dhlBtn").classList.remove("hidden");
  document.getElementById("logisticsBtn").classList.remove("hidden");
  setupLogisticsBtn();
}
if (urlEmail) localStorage.setItem("bauhaus_customer_email", urlEmail);

const urlPuzzel = urlParams.get("puzzel");
if (urlPuzzel) {
  localStorage.setItem("bauhaus_last_email", urlPuzzel);
  document.getElementById("emailInput").value = urlPuzzel;
  if (urlOrder) document.getElementById("manualOrderInput").value = urlOrder;
  setTimeout(runAnalysis, 100);
} else if (urlOrder && !urlName) {
  localStorage.removeItem("bauhaus_last_email");
  document.getElementById("emailInput").value = "";
  document.getElementById("manualOrderInput").value = urlOrder;
  magentoOrderNumber = urlOrder;
  magentoBtn.style.opacity = "1";
  magentoBtn.href = `https://www-admin.bauhaus.se/bauhausadmin/sales/order/index/?increment_id=${urlOrder}`;
}

const urlPartner  = urlParams.get("partner");
if (urlPartner) localStorage.setItem("bauhaus_customer_partner", urlPartner);

const urlTracking = urlParams.get("tracking");
if (urlTracking) localStorage.setItem("bauhaus_tracking_number", urlTracking);

// Artiklar från Magento-bokmärket (Fall 1) — används som fallback om
// Gemini/regex inte hittar artiklar i mejltexten
const urlProducts = urlParams.get("products");
let magentoProducts = [];
if (urlProducts) {
  try {
    magentoProducts = JSON.parse(urlProducts);
  } catch (e) {
    console.log("Kunde inte parsa products-param:", e);
  }
}

const savedEmail = localStorage.getItem("bauhaus_last_email");
if (savedEmail) document.getElementById("emailInput").value = savedEmail;
if (urlPostcode && savedEmail) setTimeout(runAnalysis, 100);

setStep(1);

// ── localStorage: lyssnar på DHL-spårningsdata från Magento-bokmärket ──
let dhlTrackingData = null;

function checkDHLTracking() {
  try {
    const raw = localStorage.getItem('bauhaus_dhl_tracking');
    if (!raw) return;
    const data = JSON.parse(raw);
    // Ignorera gammal data (äldre än 10 minuter)
    if (Date.now() - data.timestamp > 600000) {
      localStorage.removeItem('bauhaus_dhl_tracking');
      return;
    }
    if (dhlTrackingData?.timestamp === data.timestamp) return; // redan visat
    dhlTrackingData = data;
    localStorage.removeItem('bauhaus_dhl_tracking');
    showDHLCard();
  } catch (e) {}
}

// Kolla var 2:a sekund om ny spårningsdata finns
setInterval(checkDHLTracking, 2000);
// Kolla direkt vid sidladdning
checkDHLTracking();

// ── URL-parametrar: DHL-spårningsdata skickad direkt från bokmärket (Fas 3.6) ──
function checkDHLUrlParams() {
  const p = new URLSearchParams(location.search);
  const shipmentNumber = p.get('dhl_shipment');
  if (!shipmentNumber) return;
  dhlTrackingData = {
    shipmentNumber,
    latestStatus: p.get('dhl_status') || '',
    latestDate: p.get('dhl_date') || '',
    isDHLHolding: p.get('dhl_holding') === '1',
    isDHLDelivered: p.get('dhl_delivered') === '1',
    timestamp: Date.now()
  };
  showDHLCard();
}
checkDHLUrlParams();

function checkUrlRefresh() {
  const p = new URLSearchParams(location.search);
  if (!p.get('postcode') && !p.get('products')) return;
  // Visa en kort flash-indikering att appen uppdaterats med ny data
  const banner = document.createElement('div');
  banner.textContent = '✓ Uppdaterad med Magento-data';
  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#1B7A43;color:#fff;text-align:center;padding:10px;font-weight:600;z-index:9999;font-size:14px;';
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), 3000);
}
checkUrlRefresh();

function forceDHLEmailCard() {
  // Handläggaren har manuellt kontrollerat och vill ändå öppna returmejlet, trots osäker status.
  if (!dhlTrackingData) return;
  dhlTrackingData = { ...dhlTrackingData, isDHLHolding: true };
  showDHLCard();
}

function showDHLCard() {
  if (!dhlTrackingData) return;
  const { shipmentNumber, latestStatus, latestDate, isDHLHolding, isDHLDelivered } = dhlTrackingData;

  // Ta bort eventuellt befintligt DHL-kort
  document.getElementById('dhlReturnCard')?.remove();

  const card = document.createElement('div');
  card.id = 'dhlReturnCard';
  card.style.cssText = 'margin-top:20px;padding-top:20px;border-top:1px solid var(--grey-200);';

  if (isDHLDelivered && !isDHLHolding) {
    // Sändningen är BEKRÄFTAT levererad ("Sändning levererad till mottagare") — kort grön notis.
    card.innerHTML = `
      <div style="background:var(--green-bg);border:1px solid var(--green-border);border-radius:6px;padding:10px 13px;font-size:13px;color:var(--green);font-weight:600;">
        ✓ Sändningen är levererad till mottagaren. Kontakta inte DHL för retur.
      </div>`;
  } else if (!isDHLHolding && !isDHLDelivered) {
    // Status varken holding eller bekräftat levererad (t.ex. "Ankommit till terminal") — osäkert, kontrollera manuellt.
    card.innerHTML = `
      <div style="background:var(--warn-bg);border:1px solid var(--warn-border);border-radius:6px;padding:10px 13px;font-size:13px;color:var(--warn-text);font-weight:600;">
        ℹ️ Status: "${latestStatus || 'okänd'}" — ej bekräftat levererad. Kontrollera manuellt om DHL bör kontaktas.
      </div>
      <div style="margin-top:10px;">
        <button class="btn btn-primary" onclick="forceDHLEmailCard()">✉️ Öppna returmejl ändå</button>
      </div>`;
  } else {
    // Bygg artikelrader för mejlet
    const articleLines = resolvedArticles
      .filter(a => a.ean)
      .map(a => `${a.quantity}x ${a.ean} (${a.articleNumber})`)
      .join('\n');

    const productLinks = resolvedArticles
      .filter(a => a.articleNumber)
      .map(a => `https://www.bauhaus.se/search?q=${a.articleNumber}`)
      .join('\n');

    const dhlEmail = `Hej,\n\nKund på sändning ${shipmentNumber} vill inte ta emot sin order och önskar returnera.\n\nSändningen innehåller:\n${articleLines}\n\nFör mer info om produkterna, se:\n${productLinks}\n\nTroligtvis har emballaget Bauhaus tejp/logga.\n\nHa en fortsatt trevlig dag!\n\nMed vänliga hälsningar,\n${userName}\nBAUHAUS Webshop\nwww.bauhaus.se\n010 - 180 18 00`;

    card.innerHTML = `
      <div class="section-title"><span>📧 DHL Retur-mejl</span></div>
      <div style="background:var(--warn-bg);border-radius:6px;padding:10px 13px;margin-bottom:14px;font-size:13px;color:var(--warn-text);font-weight:600;">
        ⚠️ DHL har troligtvis kvar sändningen — överväg att kontakta DHL för retur.
      </div>
      <div style="font-size:12px;color:var(--grey-500);margin-bottom:14px;">
        Senaste status: <b style="color:var(--grey-900);">${esc(latestStatus)}</b> (${esc(latestDate)})
      </div>
      <div class="form-group" style="margin-bottom:12px;">
        <label>Till</label>
        <input type="text" id="dhlEmailTo" value="dhlfreightkad.dom.se@dhl.com" style="font-size:11px;">
      </div>
      <div class="form-group" style="margin-bottom:12px;">
        <label>Ämne</label>
        <input type="text" id="dhlEmailSubject" value="Retur av sändning ${esc(shipmentNumber)} - BAUHAUS">
      </div>
      <div class="form-group" style="margin-bottom:12px;">
        <label>Sändningsnummer (redigerbart)</label>
        <input type="text" id="dhlShipmentNumber" value="${esc(shipmentNumber)}" style="font-family:monospace;">
      </div>
      <div class="output-box" id="dhlEmailBody" contenteditable="true" style="min-height:160px;white-space:pre-wrap;font-size:12px;">${dhlEmail}</div>
      <div style="margin-top:10px;display:flex;gap:10px;align-items:center;">
        <button class="btn btn-primary" onclick="copyDHLEmail()">📋 Kopiera mejl</button>
        <span id="dhlCopyFeedback" class="copy-feedback"></span>
      </div>`;
  }

  // Lägg till kortet i höger sidopanel, under Ärende-assistent — döljer aldrig ärendeinfo i huvudkolumnen.
  document.querySelector('.assistant-body').appendChild(card);
}

function copyDHLEmail() {
  const to      = document.getElementById('dhlEmailTo')?.value || '';
  const subject = document.getElementById('dhlEmailSubject')?.value || '';
  const body    = document.getElementById('dhlEmailBody')?.innerText || '';
  const full    = `Till: ${to}\nÄmne: ${subject}\n\n${body}`;
  navigator.clipboard.writeText(full).then(() => {
    const fb = document.getElementById('dhlCopyFeedback');
    fb.textContent = '✓ Kopierat!';
    fb.classList.add('show');
    setTimeout(() => { fb.textContent = ''; fb.classList.remove('show'); }, 2000);
  }).catch(() => {
    const fb = document.getElementById('dhlCopyFeedback');
    fb.textContent = '⚠️ Kunde inte kopiera';
    fb.classList.add('show');
    setTimeout(() => { fb.textContent = ''; fb.classList.remove('show'); }, 2000);
  });
}

// ── Logistics knapp ───────────────────────────────────────────────────
function setupLogisticsBtn() {
  const logisticsBtn = document.getElementById("logisticsBtn");
  logisticsBtn.onclick = (e) => {
    e.preventDefault();
    const viktMatch3 = document.getElementById("outputBox")?.textContent?.match(/Totalvikt: ([\d,.]+)/);
    const blData = [
      viktMatch3 ? viktMatch3[1].replace(",", ".") : "",
      resolvedArticles.filter(a => a.ean).map(a => `${a.quantity}x ${a.ean}`).join(", ") || "",
      localStorage.getItem("bauhaus_delivery_date") || "",
      localStorage.getItem("bauhaus_time_from") || "",
      localStorage.getItem("bauhaus_time_to") || ""
    ].join("|");
    navigator.clipboard.writeText(blData).catch(() => {
      logisticsBtn.textContent = "⚠️ Kunde inte kopiera";
    });
    logisticsBtn.textContent = "✅ Kopierat!";
    setTimeout(() => {
      logisticsBtn.textContent = "🏭 Öppna i Logistics";
      window.open(`https://www-admin.bauhaus.se/bauhausadmin/sales/order/index/?increment_id=${magentoOrderNumber}`);
    }, 800);
  };
  logisticsBtn.href = "#";
}

// ── Knappar ──────────────────────────────────────────────────────────
document.getElementById("analyzeBtn").addEventListener("click", runAnalysis);
document.getElementById("clearBtn").addEventListener("click", () => {
  document.getElementById("emailInput").value = "";
  document.getElementById("resultCard").classList.add("hidden");
  document.getElementById("manualCard").classList.add("hidden");
  document.getElementById("caseContent").classList.add("hidden");
  document.getElementById("casePlaceholder").classList.remove("hidden");
  resolvedArticles  = [];
  selectedShipping  = null;
  shippingContents  = [];
  hasRisk           = false;
  document.getElementById("dhlReturnCard")?.remove();
  document.getElementById("shippingSelected").classList.add("hidden");
  document.getElementById("shippingOptions").classList.add("hidden");
  document.getElementById("shippingContentsBox").textContent = "";
  document.getElementById("riskWarn").classList.add("hidden");
  setStatus("", false);
  setStep(1);
  magentoBtn.style.opacity = "0.4";
});
document.getElementById("emailInput").addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") runAnalysis();
});
document.getElementById("fetchShippingBtn").addEventListener("click", doFetchShipping);
document.getElementById("inputPostcode").addEventListener("keydown", (e) => {
  if (e.key === "Enter") doFetchShipping();
});
document.getElementById("shippingClearBtn").addEventListener("click", () => {
  selectedShipping = null;
  document.getElementById("shippingSelected").classList.add("hidden");
  document.getElementById("shippingOptions").classList.remove("hidden");
  updateOutput();
});
document.getElementById("copyBtn").addEventListener("click", () => {
  const text = document.getElementById("outputBox").textContent;
  navigator.clipboard.writeText(text).then(() => {
    const fb = document.getElementById("copyFeedback");
    fb.classList.add("show");
    setTimeout(() => fb.classList.remove("show"), 2000);
    setStep(3);
  }).catch(() => {
    const fb = document.getElementById("copyFeedback");
    fb.textContent = "⚠️ Kunde inte kopiera";
    fb.classList.add("show");
    setTimeout(() => { fb.textContent = ""; fb.classList.remove("show"); }, 2000);
  });
});
document.getElementById("saveManualBtn").addEventListener("click", saveManual);
document.getElementById("copyShippingContentsBtn").addEventListener("click", () => {
  const text = document.getElementById("shippingContentsBox").textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById("copyShippingContentsBtn");
    const orig = btn.textContent;
    btn.textContent = "✓ Kopierat!";
    setTimeout(() => { btn.textContent = orig; }, 2000);
  }).catch(() => {
    const btn = document.getElementById("copyShippingContentsBtn");
    btn.textContent = "⚠️ Kunde inte kopiera";
    setTimeout(() => { btn.textContent = "📋 Kopiera fraktsedel"; }, 2000);
  });
});

// Matcha name-only artiklar (Gemini gav name men inget artikelnummer) mot
// Magento-produkter från bokmärkets products=-parameter.
function matchArticlesByName(nameOnly, magentoProducts) {
  const matchedFromName = [];
  for (const a of nameOnly) {
    const searchName = a.name.toLowerCase();
    const matches = magentoProducts.filter(p =>
      p.name.toLowerCase().includes(searchName) ||
      searchName.includes(p.name.toLowerCase().split(' ')[0]) // första ordet matchar
    );
    if (matches.length === 1) {
      // Exakt en träff — använd den direkt
      matchedFromName.push({
        articleNumber: matches[0].articleNumber,
        quantity: a.quantity,
      });
    } else if (matches.length > 1) {
      // Flera träffar — försök mer exakt matchning
      const exactMatch = matches.find(p =>
        p.name.toLowerCase().includes(searchName.toLowerCase())
      );
      if (exactMatch) {
        matchedFromName.push({
          articleNumber: exactMatch.articleNumber,
          quantity: a.quantity,
        });
      }
      // Om fortfarande oklart — hoppa över (visas inte, faller till Magento-fallback nedan)
    }
  }
  return matchedFromName;
}

// ── HUVUDFLÖDE ────────────────────────────────────────────────────────
async function runAnalysis() {
  const myGeneration = ++analysisGeneration;
  const text = document.getElementById("emailInput").value.trim();
  if (!text) return;
  localStorage.setItem("bauhaus_last_email", text);
  hasRisk = detectRiskKeywords(text);

  let geminiResult = null;
  try {
    const geminiRes = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (geminiRes.ok) geminiResult = await geminiRes.json();
  } catch (e) {
    console.log('Gemini ej tillgänglig, använder regex-parser');
  }

  if (geminiResult?.requested_time) localStorage.setItem("bauhaus_requested_time", geminiResult.requested_time);
  if (geminiResult?.delivery_date)  localStorage.setItem("bauhaus_delivery_date",  geminiResult.delivery_date);
  if (geminiResult?.time_from)      localStorage.setItem("bauhaus_time_from",      geminiResult.time_from);
  if (geminiResult?.time_to)        localStorage.setItem("bauhaus_time_to",        geminiResult.time_to);
  if (geminiResult?.case_type)      localStorage.setItem("bauhaus_case_type",      geminiResult.case_type);
  if (geminiResult?.summary)        localStorage.setItem("bauhaus_summary",        geminiResult.summary);
  if (geminiResult?.risk_reason)    localStorage.setItem("bauhaus_risk_reason",    geminiResult.risk_reason);
  if (geminiResult?.macro_suggestion) localStorage.setItem("bauhaus_macro_suggestion", geminiResult.macro_suggestion);
  if (geminiResult?.order)          localStorage.setItem("bauhaus_customer_order", geminiResult.order);
  if (geminiResult?.order) {
    const manualInput = document.getElementById("manualOrderInput");
    if (!manualInput.value.trim()) manualInput.value = geminiResult.order;
  }

  // Artikellista: Gemini är primär källa (förstår kontext, citerade trådar,
  // riktigt antal) eftersom den redan instrueras att returnera den i sin
  // JSON. Regex-parsern (parseAllArticles) är fallback om Gemini-anropet
  // misslyckades helt. Om Gemini lyckades men gav en tom lista litar vi på
  // det (artiklarna finns sannolikt verkligen inte) istället för att falla
  // tillbaka till regex.
  let articles;
  let usedGeminiArticles = false;
  if (geminiResult && !geminiResult.error && Array.isArray(geminiResult.articles)) {
    const normalized = geminiResult.articles
      .map(a => ({
        articleNumber: (d => d.length === 7 ? d : "")(String(a.articleNumber ?? "").replace(/\D/g, "")),
        name: a.name || null,
        quantity: Number.isFinite(a.quantity) && a.quantity > 0 ? a.quantity : 1,
      }));

    // Separera artiklar med och utan artikelnummer
    const withNumber   = normalized.filter(a => /^\d{7}$/.test(a.articleNumber));
    const nameOnly     = normalized.filter(a => !/^\d{7}$/.test(a.articleNumber) && a.name);

    // För name-only artiklar: försök matcha mot Magento-produkter
    const matchedFromName = matchArticlesByName(nameOnly, magentoProducts);

    const allArticles = [...withNumber, ...matchedFromName];

    // Deduplicera på artikelnummer, ta högsta kvantitet
    const byArticle = new Map();
    for (const a of allArticles) {
      const existing = byArticle.get(a.articleNumber);
      if (!existing || a.quantity > existing.quantity) byArticle.set(a.articleNumber, a);
    }
    articles = [...byArticle.values()];
    usedGeminiArticles = true;
  } else {
    articles = parseAllArticles(text);
  }
  const postcode    = extractPostcode(text);
  if (postcode) document.getElementById("inputPostcode").value = postcode;

  const manualOrder = document.getElementById("manualOrderInput").value.trim();
  const orderMatch  = text.match(/#?(?<!\d)(1\d{8})(?!\d)/) || (manualOrder.match(/\b1\d{8}\b/) ? [manualOrder] : null);
  if (orderMatch) {
    magentoOrderNumber = orderMatch[1] || orderMatch[0];
    magentoBtn.style.opacity = "1";
    magentoBtn.href = `https://www-admin.bauhaus.se/bauhausadmin/sales/order/index/?increment_id=${magentoOrderNumber}`;
    const dhlBtn = document.getElementById("dhlBtn");
    dhlBtn.classList.remove("hidden");
    document.getElementById("logisticsBtn").classList.remove("hidden");
    setupLogisticsBtn();
    const kollislag  = document.getElementById("kollislagSelect")?.value || "Paket";
    const isHD       = kollislag.toLowerCase().includes("pall") ||
      document.getElementById("shippingKollislag")?.textContent?.includes("Hemleverans");
    const dhlTemplate = isHD ? "DHL HD Retursedel" : "DHL SP Retursedel";
    dhlBtn.href = `https://www.mydhlfreight.com/se-sv/portal-order/route?` +
      `template=${encodeURIComponent(dhlTemplate)}&` +
      `name=${encodeURIComponent(localStorage.getItem("bauhaus_customer_name") || "")}` +
      `&street=${encodeURIComponent(localStorage.getItem("bauhaus_customer_street") || "")}` +
      `&postcode=${encodeURIComponent(localStorage.getItem("bauhaus_customer_postcode") || "")}` +
      `&city=${encodeURIComponent(localStorage.getItem("bauhaus_customer_city") || "")}` +
      `&phone=${encodeURIComponent(localStorage.getItem("bauhaus_customer_phone") || "")}` +
      `&email=${encodeURIComponent(localStorage.getItem("bauhaus_customer_email") || "")}` +
      `&order=${encodeURIComponent(localStorage.getItem("bauhaus_customer_order") || "")}` +
      `&weight=${encodeURIComponent(document.getElementById("outputBox").textContent.match(/Totalvikt: ([\d,]+)/)?.[1] || "")}`;
  }

  if (articles.length === 0) {
    // Fallback: använd artiklar från Magento-bokmärket om sådana finns
    if (magentoProducts.length > 0) {
      articles = magentoProducts.map(p => ({
        articleNumber: (d => d.length === 7 ? d : "")(String(p.articleNumber ?? "").replace(/\D/g, "")),
        quantity: Number.isFinite(p.quantity) && p.quantity > 0 ? p.quantity : 1,
      })).filter(a => /^\d{7}$/.test(a.articleNumber));
      if (articles.length > 0) {
        setStatus("⚠️ Inga artiklar i mejltexten — använder artiklar från Magento-ordern.", false);
      }
    }
    if (articles.length === 0) {
      setStatus("Inga artikelnummer hittades i texten.", false);
      return;
    }
  }
  document.getElementById("resultCard").classList.remove("hidden");
  setStatus(`Slår upp ${articles.length} artikel(ar)…`, true);
  setStep(2);

  resolvedArticles = articles.map(a => ({ ...a, sku: null, ean: null, weight: null, error: null }));
  const myArticles = resolvedArticles;
  await Promise.all(articles.map((art, i) => lookupOne(art, i, myArticles)));
  if (myGeneration !== analysisGeneration) return;
  consolidate();
  renderResults();
  updateOutput();
  if (!usedGeminiArticles) {
    setStatus("⚠️ Använde reservanalys (AI ej tillgänglig) — dubbelkolla artikelantal.", false);
  } else {
    setStatus("", false);
  }

  // DHL opacity — aktiv när artiklar hittades
  const dhlEl = document.getElementById("dhlBtn");
  dhlEl.style.opacity = resolvedArticles.some(a => a.ean) ? "1" : "0.4";
  const logEl = document.getElementById("logisticsBtn");
  logEl.style.opacity = resolvedArticles.some(a => a.ean) ? "1" : "0.4";

  const analysis = analyzeCase(text, {
    shippingLabel: selectedShipping?.label ?? "",
    totalWeight: resolvedArticles.reduce((s, a) => s + (a.weight ?? 0) * a.quantity, 0),
    hasRisk,
  });
  if (geminiResult && !geminiResult.error) {
    renderGeminiAnalysis(geminiResult);
  } else {
    renderCaseAnalysis(analysis);
  }
  updateShippingContents();
  if (postcode && resolvedArticles.some(a => a.sku && a.ean)) {
    await doFetchShipping(true);
  }
}

// ── Artikel-uppslag ───────────────────────────────────────────────────
async function lookupOne(article, idx, target) {
  const { articleNumber, quantity } = article;
  if (articleCache[articleNumber]) {
    target[idx] = { articleNumber, quantity, ...articleCache[articleNumber], error: null };
    return;
  }
  try {
    const data = await fetchProductFromAlgolia(articleNumber);
    articleCache[articleNumber] = data;
    target[idx] = { articleNumber, quantity, ...data, error: null };
  } catch (err) {
    target[idx] = { articleNumber, quantity, sku: null, ean: null, weight: null, error: err.message };
  }
}

async function fetchProductFromAlgolia(articleNumber) {
  const res  = await fetch(`${SHIPPING_API}/api/shipping?action=product`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ articleNumber }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

// ── Konsolidera dubbletter ────────────────────────────────────────────
function consolidate() {
  const merged   = new Map();
  const failures = [];
  for (const art of resolvedArticles) {
    if (art.error || !art.ean) { failures.push(art); continue; }
    if (merged.has(art.ean)) {
      merged.get(art.ean).quantity += art.quantity;
    } else {
      merged.set(art.ean, { ...art });
    }
  }
  const successNums = new Set([...merged.values()].flatMap(a => [a.articleNumber, a.ean, a.sku].filter(Boolean)));
  resolvedArticles  = [...merged.values(), ...failures.filter(f => !successNums.has(f.articleNumber))];
}

// ── Rendera resultatlista ─────────────────────────────────────────────
function renderResults() {
  const list = document.getElementById("resultList");
  list.innerHTML = "";
  document.getElementById("riskWarn").classList.toggle("hidden", !hasRisk);

  for (const art of resolvedArticles) {
    const row = document.createElement("div");
    row.className = "result-row" + (art.error ? " result-row--error" : "");

    if (art.ean) {
      const isSku       = s => s && /^\d{7,8}$/.test(s);
      const displaySku  = isSku(art.sku) ? art.sku : isSku(art.articleNumber) ? art.articleNumber : art.sku || "–";
      const renderLine  = (qty) => art.weight !== null
        ? `${qty}x ${displaySku} / ${art.ean}`
        : `${qty}x ${displaySku} / ${art.ean} ⚠️ vikt saknas`;

      row.innerHTML = `
        <span class="result-line">${esc(renderLine(art.quantity))}</span>
        <div class="qty-controls">
          <button class="qty-btn">−</button>
          <span class="qty-val">${art.quantity}</span>
          <button class="qty-btn">+</button>
        </div>`;

      const [minus, plus] = row.querySelectorAll(".qty-btn");
      const qtySpan       = row.querySelector(".qty-val");
      const lineSpan      = row.querySelector(".result-line");
      const upd = delta => {
        art.quantity = Math.max(0, art.quantity + delta);
        if (art.quantity === 0) {
          resolvedArticles = resolvedArticles.filter(a => a !== art);
          row.remove();
          updateOutput();
          updateShippingContents();
          return;
        }
        qtySpan.textContent  = art.quantity;
        lineSpan.textContent = renderLine(art.quantity);
        updateOutput();
        updateShippingContents();
      };
      minus.addEventListener("click", () => upd(-1));
      plus.addEventListener("click",  () => upd(+1));
    } else {
      row.innerHTML = `
        <span class="result-line result-line--error">✗ ${esc(art.articleNumber)} – hittades inte</span>
        <button class="btn btn-secondary btn-sm" data-art="${esc(art.articleNumber)}">Ange manuellt</button>`;
      row.querySelector("button").addEventListener("click", () => openManual(art.articleNumber));
    }
    list.appendChild(row);
  }
}

// ── Output ────────────────────────────────────────────────────────────
function updateOutput() {
  const lines      = [];
  let totalWeight  = 0;
  const isSku      = s => s && /^\d{7,8}$/.test(s);
  for (const art of resolvedArticles.filter(a => a.ean)) {
    const displaySku = isSku(art.sku) ? art.sku : isSku(art.articleNumber) ? art.articleNumber : art.sku || "–";
    if (art.weight !== null) {
      totalWeight += art.quantity * art.weight;
      lines.push(`${art.quantity}x ${displaySku} / ${art.ean}`);
    } else {
      lines.push(`${art.quantity}x ${displaySku} / ${art.ean} (vikt saknas – ange manuellt)`);
    }
  }
  if (lines.length > 0) {
    lines.push("");
    lines.push(`Totalvikt: ${fmtW(totalWeight)} kg`);
  }
  if (hasRisk) {
    lines.push("");
    lines.push("⚠️ OBS: Texten indikerar öppnad/använd produkt.");
  }
  document.getElementById("outputBox").textContent = lines.join("\n");
}

// ── Fraktsedel-innehåll ───────────────────────────────────────────────
function updateShippingContents() {
  const LIMIT_HD_WEIGHT   = 20;
  const LIMIT_HD_LENGTH   = 120;
  const LIMIT_PALL_WEIGHT = 30;
  const LIMIT_PALL_LENGTH = 150;

  const lines = resolvedArticles
    .filter(a => a.ean)
    .map(a => `${a.quantity}x ${a.shortName || a.articleNumber}`)
    .join("\n");
  document.getElementById("shippingContentsBox").textContent = lines;

  let totalWeight = 0, totalVolume = 0;
  let maxL = 0, maxB = 0, maxH = 0;
  let hasDimensions = false, totalItems = 0;
  const artLines = [];

  for (const art of resolvedArticles.filter(a => a.ean)) {
    totalWeight += (art.weight ?? 0) * art.quantity;
    totalItems  += art.quantity;
    if (art.dimensions) {
      hasDimensions = true;
      const l = (art.dimensions.length ?? 0) / 10;
      const b = (art.dimensions.width  ?? 0) / 10;
      const h = (art.dimensions.height ?? 0) / 10;
      const sorted = [l, b, h].sort((x, y) => y - x);
      maxL = Math.max(maxL, sorted[0]);
      maxB = Math.max(maxB, sorted[1]);
      maxH = Math.max(maxH, sorted[2]);
      totalVolume += (l * b * h) * art.quantity;
      if (l > 0 && b > 0 && h > 0) {
        const uncertain = art.dimensionsConfidence === "partial" ||
          (art.dimensions && art.dimensions.width === art.dimensions.height) ||
          (art.dimensions && art.dimensions.height < 200) ? " ⚠️" : "";
        artLines.push(`${art.quantity}x ${art.shortName || art.articleNumber} – ${Math.round(l)}×${Math.round(b)}×${Math.round(h)} cm${uncertain}`);
      } else {
        artLines.push(`${art.quantity}x ${art.shortName || art.articleNumber} – mått saknas`);
      }
    } else {
      artLines.push(`${art.quantity}x ${art.shortName || art.articleNumber} – mått saknas`);
    }
  }

  let isPallet = false, isHeavyPackage = false;
  if      (totalWeight >= LIMIT_PALL_WEIGHT || maxL >= LIMIT_PALL_LENGTH) isPallet = true;
  else if (totalWeight >= LIMIT_HD_WEIGHT   || maxL >= LIMIT_HD_LENGTH)   isHeavyPackage = true;

  let kollislag = "Paket";
  let extraInfo = "";
  if (isPallet) {
    kollislag = totalWeight > 500 ? "Pall (övriga mått)" : "EUR helpall (120x80)";
  } else if (isHeavyPackage) {
    extraInfo = " <span style='color:var(--warn-text);font-size:11px;font-weight:500;margin-left:6px;'>(Kräver Hemleverans/HD)</span>";
  }

  let buttonsHtml = "", warningHtml = "";
  if (isPallet) {
    const palletH  = Math.round(15 + maxH);
    const finalPalletL = Math.max(120, Math.round(maxL));
    const finalPalletB = Math.max(80, Math.round(maxB));
    buttonsHtml = `<div style="font-size:12px;color:var(--grey-700);margin-top:4px;"><div>🏗️ <b>Pall-mått:</b> ${finalPalletL}×${finalPalletB}×${palletH} cm <span style="color:var(--grey-500);font-size:11px;">– EUR-pall + 15cm pallbädd + maxhöjd</span></div></div>`;
  } else {
    const margin      = 1.20;
    const finalMaxL   = Math.round(maxL * margin);
    const finalMaxB   = Math.round(maxB * margin);
    const finalMaxH   = Math.round(maxH * margin);
    const maxDims     = hasDimensions ? `${finalMaxL}x${finalMaxB}x${finalMaxH}` : "–";
    const cbrtSide    = hasDimensions ? Math.round(Math.cbrt(totalVolume) * margin) : null;
    const volDims     = cbrtSide ? `${cbrtSide}x${cbrtSide}x${cbrtSide}` : "–";
    const girthMax    = finalMaxL + 2 * (finalMaxB + finalMaxH);
    const girthVol    = cbrtSide ? cbrtSide + 2 * (cbrtSide + cbrtSide) : 0;
    if (girthMax > 300 || girthVol > 300) {
      warningHtml = `<div class="warn-box" style="margin-top:6px;font-size:11px;">⚠️ <b>DHL Maxmått:</b> Uträknad paketvolym överstiger maxgränsen (Längd + Omkrets > 300 cm). Överväg att ändra till pall eller granska manuellt.</div>`;
    }
    buttonsHtml = `
      <div style="font-size:12px;color:var(--grey-700);margin-top:4px;">
        <div style="margin-bottom:4px;" title="Passar när allt ryms i en kartong.">📦 <b>Max-mått:</b> ${maxDims.replace(/x/g,"×")} cm <span style="color:var(--grey-500);font-size:11px;">– Tar max från största artikeln +20%</span></div>
        <div title="Passar när många små produkter packas ihop.">📊 <b>Volymbaserat:</b> ${volDims.replace(/x/g,"×")} cm <span style="color:var(--grey-500);font-size:11px;">– Total volym → kubikrot +20%</span></div>
      </div>`;
  }

  const kollislagElement = document.getElementById("shippingKollislag");
  kollislagElement.innerHTML = `
    <label style="font-size:12px;font-weight:600;color:var(--grey-700);">Kollislag:</label>
    <select id="kollislagSelect" style="margin-left:6px;padding:4px 8px;font-size:12px;border:1px solid var(--grey-200);border-radius:4px;font-family:var(--font);">
      <option value="Paket" ${kollislag==="Paket"?"selected":""}>Paket</option>
      <option value="EUR halvpall (60x80)" ${kollislag==="EUR halvpall (60x80)"?"selected":""}>EUR halvpall (60x80)</option>
      <option value="EUR helpall (120x80)" ${kollislag==="EUR helpall (120x80)"?"selected":""}>EUR helpall (120x80)</option>
      <option value="Pall (övriga mått)" ${kollislag==="Pall (övriga mått)"?"selected":""}>Pall (övriga mått)</option>
      <option value="Ospecificerat" ${kollislag==="Ospecificerat"?"selected":""}>Ospecificerat</option>
    </select>
    ${extraInfo}
    <span style="margin-left:12px;font-weight:normal;color:var(--grey-500);">| Totalvikt: <b>${totalWeight.toFixed(2)} kg</b></span>`;

  const artText = artLines.length > 0 ? artLines.join("\n") : "Mått ej tillgängliga";
  document.getElementById("shippingDimensions").innerHTML = `
    <div style="margin-bottom:8px;font-family:monospace;font-size:11px;color:var(--grey-700);">${artText.replace(/\n/g,"<br>")}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">${buttonsHtml}</div>
    ${warningHtml}`;

  const select = document.getElementById("kollislagSelect");
  if (select) {
    select.addEventListener("change", () => {
      const val    = select.value;
      const isPall = val.toLowerCase().includes("pall");
      const dimsDiv = document.getElementById("shippingDimensions").querySelector("div:last-child");
      if (isPall) {
        const pH = Math.round(15 + maxH);
        const pL = Math.max(120, Math.round(maxL)), pB = Math.max(80, Math.round(maxB));
        dimsDiv.innerHTML = `<div style="font-size:12px;color:var(--grey-700);margin-top:4px;"><div>🏗️ <b>Pall-mått:</b> ${pL}×${pB}×${pH} cm</div></div>`;
      } else {
        const margin = 1.20;
        const fL = Math.round(maxL*margin), fB = Math.round(maxB*margin), fH = Math.round(maxH*margin);
        const cbrt = hasDimensions ? Math.round(Math.cbrt(totalVolume)*margin) : null;
        dimsDiv.innerHTML = `<div style="font-size:12px;color:var(--grey-700);margin-top:4px;"><div style="margin-bottom:4px;">📦 <b>Max-mått:</b> ${fL}×${fB}×${fH} cm</div><div>📊 <b>Volymbaserat:</b> ${cbrt?`${cbrt}×${cbrt}×${cbrt}`:"–"} cm</div></div>`;
      }
    });
  }

  const missingDims = resolvedArticles.filter(a => a.ean && !a.dimensions).map(a => a.articleNumber).join(", ");
  const missingEl   = document.getElementById("shippingMissingDims");
  if (missingDims.length > 0) {
    missingEl.textContent = `⚠️ Mått saknas för artiklar: ${missingDims}`;
    missingEl.classList.remove("hidden");
  } else {
    missingEl.classList.add("hidden");
  }
}

// ── Frakt ─────────────────────────────────────────────────────────────
async function doFetchShipping(autoSelect = false) {
  const postcode = document.getElementById("inputPostcode").value.trim().replace(/\s/g, "");
  if (!/^\d{5}$/.test(postcode)) {
    showShippingError("Ange ett giltigt 5-siffrigt postnummer.");
    return;
  }
  const articles = resolvedArticles
    .filter(a => a.sku && a.ean && a.weight !== null)
    .map(a => ({ sku: a.sku, quantity: a.quantity }));
  if (articles.length === 0) {
    showShippingError("Inga giltiga artiklar för fraktberäkning.");
    return;
  }
  // Fallback-prislista (frakt-API kräver Vercel-deploy med cookies)
  if (true) {
    const totalWeight = resolvedArticles.reduce((s, a) => s + (a.weight ?? 0) * a.quantity, 0);
    renderShippingOptions(getFallbackShipping(totalWeight), autoSelect);
    return;
  }
  document.getElementById("shippingStatus").classList.remove("hidden");
  document.getElementById("shippingError").classList.add("hidden");
  document.getElementById("shippingOptions").classList.add("hidden");
  document.getElementById("fetchShippingBtn").disabled = true;
  try {
    const res  = await fetch(`${SHIPPING_API}/api/shipping?action=shipping`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postcode, articles, cookies: bauhausCookies }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    renderShippingOptions(data.options, autoSelect);
  } catch (err) {
    showShippingError(`Kunde inte hämta frakt: ${err.message}`);
  } finally {
    document.getElementById("shippingStatus").classList.add("hidden");
    document.getElementById("fetchShippingBtn").disabled = false;
  }
}

function getFallbackShipping(totalWeight) {
  return [
    { label: "PostNord Postombud", price: 69 },
    { label: "DHL Servicepoint",   price: 69 },
    { label: "Airmee Servicepoint", price: 69 },
    { label: "DHL Hemleverans",    price: 0  },
  ];
}

function renderShippingOptions(options, autoSelect) {
  const container = document.getElementById("shippingOptions");
  container.innerHTML = "";
  options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className = "shipping-opt" + (i === 0 ? " shipping-opt--cheapest" : "");
    btn.innerHTML = `
      <span>${esc(opt.label)}</span>
      <span class="shipping-opt-price">${opt.price === 0 ? "Varierar" : opt.price + " kr"}</span>`;
    btn.addEventListener("click", () => selectShipping(opt));
    container.appendChild(btn);
  });
  if (autoSelect && options.length > 0) {
    selectShipping(options[0]);
    container.classList.add("hidden");
  } else {
    container.classList.remove("hidden");
  }
}

function selectShipping(opt) {
  selectedShipping = opt;
  document.getElementById("shippingSelectedText").textContent = `✓ ${opt.label} – ${opt.price} kr`;
  document.getElementById("shippingSelected").classList.remove("hidden");
  document.getElementById("shippingOptions").classList.add("hidden");
  updateOutput();
  setStep(2);
}

function showShippingError(msg) {
  const el = document.getElementById("shippingError");
  el.textContent = msg;
  el.classList.remove("hidden");
}

// ── Manuell inmatning ─────────────────────────────────────────────────
function openManual(articleNumber) {
  manualTarget = articleNumber;
  document.getElementById("manualArticleNum").textContent = articleNumber;
  document.getElementById("inputEan").value    = "";
  document.getElementById("inputWeight").value = "";
  document.getElementById("manualCard").classList.remove("hidden");
  document.getElementById("manualCard").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function saveManual() {
  const ean     = document.getElementById("inputEan").value.trim();
  const weight  = parseFloat(document.getElementById("inputWeight").value.replace(",", "."));
  const eanEl   = document.getElementById("inputEan");
  const weightEl = document.getElementById("inputWeight");
  const eanOk   = /^\d{8,14}$/.test(ean);
  const weightOk = !isNaN(weight) && weight > 0;
  eanEl.classList.toggle("invalid", !eanOk);
  weightEl.classList.toggle("invalid", !weightOk);
  if (!eanOk || !weightOk) return;
  const idx = resolvedArticles.findIndex(a => a.articleNumber === manualTarget);
  if (idx !== -1) {
    const sku = /^\d{7,8}$/.test(manualTarget) ? manualTarget : (resolvedArticles[idx].sku || "");
    resolvedArticles[idx] = { ...resolvedArticles[idx], sku, ean, weight, error: null };
    articleCache[manualTarget] = { sku, ean, weight };
  }
  document.getElementById("manualCard").classList.add("hidden");
  consolidate();
  renderResults();
  updateOutput();
}

// ── Ärendeanalys ──────────────────────────────────────────────────────
function renderCaseAnalysis(analysis) {
  document.getElementById("casePlaceholder").classList.add("hidden");
  document.getElementById("caseContent").classList.remove("hidden");
  const badge = document.getElementById("caseTypeBadge");
  if (analysis.caseType) {
    badge.textContent = `Ärendetyp: ${analysis.caseType}`;
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
  const warningsEl = document.getElementById("caseWarnings");
  warningsEl.innerHTML = analysis.warnings.map(w => `<div class="case-warn-item">${esc(w)}</div>`).join("");
  const macroListEl = document.getElementById("macroList");
  macroListEl.innerHTML = "";
  if (analysis.macroSuggestions.length === 0) {
    macroListEl.innerHTML = `<p style="font-size:12px;color:var(--grey-500);">Inga makroförslag för denna text.</p>`;
    return;
  }
  analysis.macroSuggestions.forEach(({ macro }) => {
    const btn = document.createElement("button");
    btn.className = "macro-btn";
    btn.innerHTML = `
      <span class="macro-title">${esc(macro.title)}</span>
      <span class="macro-desc">${esc(macro.description)}</span>`;
    btn.addEventListener("click", () => {
      const text = macro.text
        .replace(/XXX kr/g, selectedShipping ? `${selectedShipping.price} kr` : "XXX kr")
        .replace(/\bAdam\b/g, userName);
      navigator.clipboard.writeText(text).then(() => {
        btn.classList.add("macro-btn--copied");
        btn.querySelector(".macro-title").textContent = "✓ Kopierad!";
        setTimeout(() => {
          btn.classList.remove("macro-btn--copied");
          btn.querySelector(".macro-title").textContent = macro.title;
        }, 2000);
      }).catch(() => {
        btn.querySelector(".macro-title").textContent = "⚠️ Kunde inte kopiera";
        setTimeout(() => { btn.querySelector(".macro-title").textContent = macro.title; }, 2000);
      });
    });
    macroListEl.appendChild(btn);
  });
}

function renderGeminiAnalysis(g) {
  document.getElementById("macroList").innerHTML = "";
  const badge = document.getElementById("caseTypeBadge");
  if (g.case_type) {
    badge.textContent = `Ärendetyp: ${g.case_type}`;
    badge.classList.remove("hidden");
  }
  if (g.summary) {
    const existing = document.getElementById("geminiSummary");
    const el = existing || document.createElement("div");
    el.id = "geminiSummary";
    el.style.cssText = "font-size:12px;color:var(--grey-700);margin-bottom:8px;padding:8px 10px;background:var(--grey-50);border-radius:4px;border:1px solid var(--grey-200);";
    el.textContent = `📝 ${g.summary}`;
    if (!existing) badge.insertAdjacentElement("afterend", el);
  }
  if (g.risk && g.risk_reason) {
    const warningsEl = document.getElementById("caseWarnings");
    const div = document.createElement("div");
    div.className = "case-warn-item";
    div.textContent = `⚠️ ${g.risk_reason}`;
    warningsEl.appendChild(div);
    warningsEl.classList.remove("hidden");
  }
  if (g.macro_suggestion) {
    const isDE = g.macro_suggestion === "DE-retur";
    const suggestions = isDE ? [
      "SE Webshop OF - DE STHLM - Retur",
      "SE Webshop OF - DE STHLM Sydost / Sydväst - Retur",
      "SE Webshop OF - DE GBG - Retur",
      "SE Webshop OF - DE GBG Syd / Norr - Retur",
      "SE Webshop OF - DE Knivsta - Retur",
      "SE Webshop OF - DE NKPG - Retur",
      "SE Webshop OF - DE Skåne - Retur",
      "SE Webshop OF - DE Skåne Ost - Retur",
      "SE Webshop OF - DE Växjö - Retur",
      "SE Webshop OF - DE Växsjö Norr - Retur",
      "SE Webshop OF - DE Bokad Retur"
    ] : [g.macro_suggestion];
    const macroListEl = document.getElementById("macroList");
    macroListEl.innerHTML = "";
    const tip = document.createElement("div");
    tip.style.cssText = "font-size:12px;color:var(--grey-700);margin-bottom:8px;padding:6px 10px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:4px;";
    tip.innerHTML = `💡 <b>Gemini föreslår${isDE ? " (välj region):" : ":"}</b>`;
    macroListEl.appendChild(tip);
    suggestions.forEach(name => {
      const btn = document.createElement("button");
      btn.className = "macro-btn";
      btn.innerHTML = `<span class="macro-title">${esc(name)}</span>`;
      btn.addEventListener("click", () => {
        navigator.clipboard.writeText(name).then(() => {
          btn.classList.add("macro-btn--copied");
          btn.querySelector(".macro-title").textContent = "✓ Kopierat!";
          setTimeout(() => {
            btn.classList.remove("macro-btn--copied");
            btn.querySelector(".macro-title").textContent = name;
          }, 2000);
        }).catch(() => {
          btn.querySelector(".macro-title").textContent = "⚠️ Kunde inte kopiera";
          setTimeout(() => { btn.querySelector(".macro-title").textContent = name; }, 2000);
        });
      });
      macroListEl.appendChild(btn);
    });
    document.getElementById("caseContent").classList.remove("hidden");
    document.getElementById("casePlaceholder").classList.add("hidden");
  }
}

// ── Parsning ──────────────────────────────────────────────────────────
function parseAllArticles(text) {
  text = text.replace(/(\d+)\s*x\s*\d{7}\s*\/\s*(\d{13})/gi, (match, qty, ean) => match.replace(ean, ""));
  const articlePositions = [];
  const NUMBER_RE = /(?<![\d])(?!\()(\d{13}|\d{7})(?![\d])/g;
  let m;
  while ((m = NUMBER_RE.exec(text)) !== null) {
    articlePositions.push({ number: m[1], pos: m.index, end: m.index + m[1].length });
  }
  if (articlePositions.length === 0) return [];
  const QTY_RE = /(?:\bx(\d{1,3})\b|\b(\d{1,3})\s*(?:st\.?|x|pcs?)|\b[Aa]ntal[:\s]+(\d{1,3}))/gi;
  const quantities = [];
  while ((m = QTY_RE.exec(text)) !== null) {
    const qty = parseInt(m[1] ?? m[2] ?? m[3], 10);
    quantities.push({ qty, pos: m.index, end: m.index + m[0].length });
  }
  const assigned = new Map();
  for (const art of articlePositions) assigned.set(art.number + ":" + art.pos, []);
  for (const q of quantities) {
    let bestScore = Infinity, bestKey = null;
    for (const art of articlePositions) {
      const gapAfterQty = art.pos - q.end;
      const gapAfterArt = q.pos - art.end;
      let dist;
      if      (gapAfterQty >= 0 && gapAfterQty <= 80) dist = gapAfterQty * 0.9;
      else if (gapAfterArt >= 0 && gapAfterArt <= 80) dist = gapAfterArt * 1.1;
      else continue;
      if (dist < bestScore) { bestScore = dist; bestKey = art.number + ":" + art.pos; }
    }
    if (bestKey) assigned.get(bestKey).push(q.qty);
  }
  const seen = new Map();
  for (const art of articlePositions) {
    const qtys = assigned.get(art.number + ":" + art.pos);
    const qty  = qtys.length > 0 ? qtys.reduce((a, b) => a + b, 0) : 1;
    if (seen.has(art.number)) seen.set(art.number, seen.get(art.number) + qty);
    else seen.set(art.number, qty);
  }
  return [...seen.entries()].map(([articleNumber, quantity]) => ({ articleNumber, quantity }));
}

function detectRiskKeywords(text) {
  const RISK_KEYWORDS = ["öppnat","öppnad","använd","använts","trasig","trasigt","monterad","monterat","skadad","defekt","brutet","bruten","sönder"];
  const NEGATION_PATTERNS = [
    /o[öo]ppna[dt]/g, /oo?ppna[dt]/g, /oanvänd[ts]?/g, /oanvänt/g,
    /omonterad[t]?/g, /otrasig[t]?/g, /oskadad[t]?/g, /odefekt/g,
    /obruten/g, /obrutet/g,
    /(?:ej|inte|aldrig|utan att|ej heller)\s+(?:\w+\s+){0,2}(?:öppna[dt]|använd[ts]?|monterad[t]?|trasig[t]?|skadad[t]?|defekt|bruten|brutet|sönder)/g,
    /har\s+(?:inte|aldrig|ej)\s+(?:öppna[dt]|använd[ts]?|monterat?)/g,
    /i\s+original(?:förpackning|emballage|skick|förpack)/g,
    /fortfarande\s+(?:förseglad|plomberad|oöppnad|oanvänd)/g,
    /i\s+o(?:brutet|skadat|öppnat)\s+skick/g,
  ];
  let cleaned = text.toLowerCase();
  for (const p of NEGATION_PATTERNS) cleaned = cleaned.replace(p, " ");
  return RISK_KEYWORDS.some(kw => cleaned.includes(kw));
}

function extractPostcode(text) {
  const cleaned = text.replace(/\d[\d\s-]{6,}\d/g, " ");
  const re = /(?<![\d])(?:(\d{3})\s(\d{2})|(\d{5}))(?![\d])/g;
  let m;
  while ((m = re.exec(cleaned)) !== null) {
    const raw = m[0].replace(/\s/g, "");
    if (raw >= "10000" && raw <= "99999") return raw;
  }
  return null;
}

// ── Hjälpfunktioner ───────────────────────────────────────────────────
function fmtW(n) { return parseFloat(n.toFixed(3)).toString().replace(".", ","); }
function esc(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function setStatus(msg, loading) {
  const el    = document.getElementById("statusText");
  const msgEl = document.getElementById("statusMsg");
  const spinnerEl = el.querySelector(".spinner");
  if (msg) {
    msgEl.textContent = msg;
    el.classList.remove("hidden");
    if (spinnerEl) spinnerEl.style.display = loading ? "" : "none";
  } else {
    el.classList.add("hidden");
  }
}
