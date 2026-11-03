export const topics=[['zsk','Zählersteckklemmen'],['anschluss','Zähleranschlussklemmen'],['platten','Zählerplatten']];
export function classifyPage(text){
 const s=text.normalize('NFKC').toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/\u00ad/g,'').replace(/[-‐‑–\s]+/g,' ');
 const compact=s.replace(/ /g,'');
 return topics.filter(([id])=>id==='zsk'?/zaehlersteckklemm/.test(compact)||/\bzsk\b/.test(s):id==='anschluss'?/zaehleranschlussklemm/.test(compact):/zaehlerplatt|zaehlermontageplatt|zaehlertafel|apparatetafel|apparatentafel/.test(compact)).map(([id])=>id);
}
