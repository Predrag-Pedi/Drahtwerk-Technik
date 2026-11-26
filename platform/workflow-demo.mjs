// Fictional public examples; no sessions, company records or API calls.
export const workflowExample = Object.freeze({initial:24,required:6,remaining:18,barLength:6000,cutLength:1500,count:4,kerf:3,rests:[1491,4497]});
const badge=(text,tone='ok')=>`<span class="flow-badge ${tone}">${text}</span>`;
const row=(name,detail,value)=>`<div class="flow-row"><div><strong>${name}</strong><small>${detail}</small></div><b>${value}</b></div>`;
const top=(label,title,status)=>`<div class="flow-head"><div><p>${label}</p><h4>${title}</h4></div>${status||''}</div>`;
const note=(text,tone='')=>`<div class="flow-note ${tone}">${text}</div>`;
const bar=(cuts,rest)=>`<div class="flow-bar" aria-label="${cuts} Stück à 1500 mm, Rest ${rest} mm">${Array.from({length:cuts},()=>'<span style="flex:1500">1500</span><i style="flex:3" title="3 mm Schnitt"></i>').join('')}<b style="flex:${rest}">${rest} mm</b></div>`;
export function workflowScene(name){
 const e=workflowExample;
 const scenes={
  quote:()=>top('OFFERTE AN-00104 · MUSTER AG','UV Werkstatt',badge('Genehmigt'))+row('Leitungsschutzschalter','6 Stück · CHF 29.00 / Stück','CHF 174.00')+row('DIN-Schienen · SBR dynamisch','4 Stück à 1500 mm · CHF 5.00 / m','CHF 30.00')+row('Montage','2 Stunden · CHF 95.00 / h','CHF 190.00')+`<div class="flow-total"><span>Beispielbetrag · exkl. MwSt.</span><strong>CHF 394.00</strong></div><div class="flow-bottom"><span class="flow-action">Auftrag erstellen</span><small>Bestand noch unverändert</small></div>`,
  order:()=>top('AUFTRAG AU-00028','Auftrag erstellt.',badge('Gespeichert'))+`<div class="flow-document"><div><span class="flow-doc-icon">AB</span><strong>Auftragsbestätigung<small>Muster AG · UV Werkstatt</small></strong></div><span>PDF</span></div>`+row('Offerte AN-00104','Original bleibt gespeichert','CHF 394.00')+row('Lagerbuchung','6 Leitungsschutzschalter automatisch abgebucht','24 → 18')+note('Angeliefertes Material ausstehend · 0 von 2 Geräten','pending'),
  booking:()=>top('LAGER / ABGEBUCHTE AUFTRÄGE','AU-00028',badge('Gebucht'))+`<div class="flow-counter"><div><span>Vorher</span><strong>24</strong></div><div class="flow-deduction"><span>Auftrag</span><strong>−6</strong></div><div><span>Jetzt im Lager</span><strong>${e.remaining}<small> Stück</small></strong></div></div>`+row('Leitungsschutzschalter','Artikel LS-3P · UV Werkstatt','6 Stk.')+row('DIN-Schiene','4 × 1500 mm · Zuschnitt mit 3 mm Schnittbreite','6 m')+note('Material, Mengen und Zuschnitt bleiben am Auftrag nachvollziehbar.'),
  supplied:()=>top('AUFTRAG / ANGELIEFERTES MATERIAL','Noch nicht vollständig.',badge('Ausstehend','pending'))+row('Leistungsschalter vom Kunden','Erwartet: 2 Stück','1 / 2')+`<div class="flow-receipts"><span class="received">✓ 1 Stück erhalten</span><span>1 Stück ausstehend</span></div>`+note('Teilmenge erfassen und speichern. Die offene Menge bleibt am Auftrag rot sichtbar.','pending'),
  received:()=>top('AUFTRAG / ANGELIEFERTES MATERIAL','Alles angekommen.',badge('Vollständig'))+row('Leistungsschalter vom Kunden','Erwartet: 2 Stück','2 / 2')+`<div class="flow-receipts"><span class="received">✓ 2 Stück erhalten</span></div><div class="flow-complete"><span>✓</span><div><strong>Angeliefertes Material vollständig</strong><p>Alle vorgesehenen Kundenpositionen sind eingetroffen.</p></div></div>`,
  inventory:()=>top('LAGER / ARTIKELBESTAND','Alles an seinem Platz.',badge('Firmenbestand','neutral'))+row('Leitungsschutzschalter','LS-3P · Stückartikel',badge('24 Stk.'))+row('DIN-Schiene','DIN-35 · 2 Stangen à 6000 mm',badge('12 m'))+row('Installationsschütz','IS-25 · Bedarf in Offerte: 2 Stück',badge('2 fehlen','pending'))+note('Artikel aus eurem Katalog oder manuell erfassen. Lagerplätze lassen sich optional einschalten.'),
  cuts:()=>top('SBR & AUFBAU DYNAMISCH','Stückzahlen schon erfasst.',badge('Zuschnitt','neutral'))+`<div class="flow-cut-order"><strong>4 <small>Stück</small> × 1500 <small>mm</small></strong><p>Schienen aus der Offerte direkt übernehmen.</p></div>`+row('Stangenlänge','2 ganze Stangen im Lager','6000 mm')+row('Schnittbreite','Im Lagerartikel einstellbar','3 mm')+note('Vier Stück passen wegen der Schnittbreite nicht auf eine 6-m-Stange.'),
  remnants:()=>top('LAGER / ZUSCHNITT ZUM AUFTRAG','Jeder Schnitt zählt.',badge('2 Stangen'))+`<div class="flow-cut-plan"><p>Stange 1 · drei Zuschnitte</p>${bar(3,1491)}<p>Stange 2 · ein Zuschnitt</p>${bar(1,4497)}</div><div class="flow-legend"><span>Blau: Zuschnitte</span><span>Grün: Reststücke</span></div>`+row('6 m Zuschnitte · 12 mm Schnittverlust','Reststücke: 1491 mm + 4497 mm','5,988 m Rest')+note('Die berechneten Reste bleiben im Bestand und werden bei weiteren Zuschnitten berücksichtigt.'),
  hero:()=>top('OFFERTE · AUFTRAG · LAGER','Ein Auftrag. Alles verbunden.',badge('AU-00028'))+`<div class="flow-hero-order"><span class="flow-doc-icon">AB</span><div><strong>UV Werkstatt</strong><small>Muster AG · aus Offerte AN-00104</small></div><b>✓</b></div><div class="flow-hero-stock"><span>Leitungsschutzschalter</span><div><s>24</s><strong>18 <small>Stück</small></strong><b>−6</b></div><p>Beim Erstellen des Auftrags automatisch abgebucht.</p></div>`+note('Auftragsbestätigung und Lagerauszug bereit.')
 };
 return `<div class="flow-scene">${scenes[name]()}</div>`;
}
export const workflowClips={
 orders:{title:'Von der Offerte zum Auftrag',description:'Die genehmigte Offerte wird zum Auftrag mit eigener Nummer und Auftragsbestätigung. Gleichzeitig wird vorhandenes, zugeordnetes Material aus eurem Lager abgebucht.',steps:[
 ['quote','Genehmigte Offerte übernehmen','Kunde, Positionen und Preise sind bereits erfasst.'],
 ['order','Auftrag erstellen','Auftragsbestätigung und Lagerbuchung entstehen zusammen.'],
 ['booking','Lagerbuchung nachvollziehen','24 Stück vorhanden, 6 verwendet, 18 verbleiben.'],
 ['supplied','Kundenmaterial verfolgen','Teillieferungen erfassen; fehlendes Material bleibt sichtbar.'],
 ['received','Lieferung vervollständigen','Sind alle Kundenpositionen da, wird der Status grün.']]},
 inventory:{title:'Material und Zuschnitt im Lager',description:'Geräte, Platten und Schienen aus eurem Artikelstamm oder manuell erfassen. Schon in der Offerte seht ihr verfügbare Mengen und Fehlmengen. Gebucht wird beim Erstellen des Auftrags.',steps:[
 ['inventory','Bestand und Fehlmengen sehen','Der Lagerbestand gehört eurer Firma. Lagerplätze sind optional.'],
 ['cuts','Längen aus der Offerte nutzen','SBR und Aufbau dynamisch liefern Stückzahlen und Schnittlängen.'],
 ['remnants','Schnittbreite berücksichtigen','4 × 1500 mm benötigen bei 3 mm Schnittbreite zwei 6-m-Stangen.'],
 ['booking','Auszug zum Auftrag öffnen','Unter «Abgebuchte Aufträge» bleibt die Materialverwendung sichtbar.']]}
};
