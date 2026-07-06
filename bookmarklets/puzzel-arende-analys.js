// Bokmärke: "Puzzle Ärende Analys"
// Syfte: Läser all mejl/anteckningstext från öppna iframes i ett Puzzel-ärende,
// rensar signaturrader och Return-Path-headers, extraherar ordernummer, och
// öppnar bauhaus-retur-web med texten som ?puzzel=-parameter.
// Källa: klistrad från Adams webbläsarbokmärke 2026-07-06.
 
javascript:(()=>{const frames=[...document.querySelectorAll('iframe[id^="email-"], iframe[id^="note-"]')];let order='';let allText='';for(const f of frames){const raw=f.contentDocument?.body?.innerText||'';if(!raw.trim())continue;if(/^Return-Path:|^X-Original-To:|^DKIM-Signature:/m.test(raw))continue;const html=f.contentDocument?.body?.innerHTML||'';const tmp=document.createElement('div');tmp.innerHTML=html.replace(/<br\s*\/?>/gi,' ').replace(/<\/p>/gi,' ').replace(/<\/div>/gi,' ').replace(/<[^>]+>/g,'');const cleaned=tmp.textContent.replace(/[Ää]rende\s*\[?\d{7}\]?/gi,'').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();if(!cleaned)continue;allText+=cleaned+'\n---\n';if(!order){const o=cleaned.match(/ordernr[:\s]+#?(\d{9})/i)||cleaned.match(/ordernummer[:\s]+#?(\d{9})/i)||cleaned.match(/order\s+(\d{9})/i)||cleaned.match(/\b(1\d{8})\b/);if(o)order=o[1];}}if(!allText.trim())return alert('Hittade ingen mejltext');const url='https://bauhaus-retur-web.vercel.app/?order='+encodeURIComponent(order)+'&puzzel='+encodeURIComponent(allText);window.open(url);})();
 
