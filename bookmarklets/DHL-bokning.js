// Bokmärke: "DHL Bokning"
// Syfte: Körs på mydhlfreight.com. Läser adress/kontaktdata från URL-parametrar
// (satta av Bauhaus Magento Webb Shortcut) och fyller i DHL:s bokningsformulär
// automatiskt: startar från mall (?template=), fyller avsändaradress, namn,
// e-post, referens och telefonnummer.
// Källa: klistrad från Adams webbläsarbokmärke 2026-07-06.
 
javascript:(async()=>{const p=new URLSearchParams(location.search);const n=p.get("name")||"";const a=p.get("street")||p.get("address")||"";const co=p.get("company")||"";const z=p.get("postcode")||"";const c=p.get("city")||"";const ph=p.get("phone")||"";const em=p.get("email")||"";const ord=p.get("order")||"";const t=p.get("template")||"DHL SP Retursedel";const w=ms=>new Promise(r=>setTimeout(r,ms));const f=(id,v)=>{const el=document.getElementById(id);if(!el)return;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(el,v);el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}));};document.querySelector('[data-testid="startFromTemplateBtn"]')?.click();await w(1200);[...document.querySelectorAll("h6,p,span")].find(el=>el.textContent.trim()===t)?.click();await w(1500);f("fromAddressCompanyName",n);f("fromAddressStreet",a);if(co)f("fromAddressAdditionalInfo",co);f("fromAddressPostalCodeInp",z);f("fromAddressCity",c);f("fromAddressContactName",n);f("fromAddressEmail",em);f("fromAddressReference",ord+" /");const phoneNum=document.getElementById("fromAddress-phone-number");if(phoneNum){Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(phoneNum,ph);phoneNum.dispatchEvent(new Event("input",{bubbles:true}));document.body.click();}})();
 
