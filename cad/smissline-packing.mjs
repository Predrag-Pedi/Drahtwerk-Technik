// Drahtwerk workshop rules, supplied 2026-11-16. Components are arranged in
// their normal left-to-right order, then the whole original graphic is turned
// clockwise for a vertical plug-in bus: HK before body, N after body.
export function smisslinePoles(d){const s=(d.name||'')+' '+(d.schemaTemplateName||'');return d.poles||Number(s.match(/(?:\b|_)([1-4])\s*(?:L|P|pol)/i)?.[1])||(d.width>=54?3:d.width>=36&&d.kind==='ls'?2:1);}
export function smisslineTemplate(d){
 if(d.kind==='spd')return 'tl-0735';
 if(d.kind==='switch')return 'tl-0543'; // User-approved 4-pole graphical envelope, switch semantics retained.
 const n=smisslinePoles(d),body=d.kind==='fils'?(n<=2?2:4):n;
 return {1:'tl-0530',2:'tl-0534',3:'tl-0541',4:'tl-0543'}[body];
}
const hasN=d=>d.kind==='ls'&&(d.smisslineNeutral??d.neutral??false);
const hasHK=d=>d.smisslineHK??/\bHK\b|Hilfskontakt/i.test((d.name||'')+' '+(d.schemaTemplateName||''));
// Atomic blocks prevent a shared 9+9 junction being split between rails.
export function smisslineBlocks(devices){
 const remaining=[...devices],ordered=[];
 while(remaining.length){const d=remaining.shift();ordered.push(d);if(hasN(d)&&remaining.length&&!hasHK(remaining[0])){const i=remaining.findIndex(hasHK);if(i>=0)ordered.push(...remaining.splice(i,1));}}
 const blocks=[];let block={pieces:[],length:0},shared=false;
 const append=(d,role,length,id,rotate=true)=>{block.pieces.push({device:d,role,offset:block.length,length,id,rotate});block.length+=length;};
 for(let i=0;i<ordered.length;i++){
  const d=ordered[i],next=ordered[i+1];
  if(hasHK(d)){if(!shared)append(d,'Füllstück',9,'tl-0524');append(d,'HK',9,'tl-0524');}
  shared=false;
  append(d,'body',d.height,d.dispoTemplateId,d.kind!=='smissline-feed');
  if(hasN(d)){shared=!!next&&hasHK(next);append(d,'N',shared?9:18,'tl-0524');}
  // Non-modular graphics (e.g. SPD drawing envelope) reserve complete PE.
  if(!shared){const extra=(18-block.length%18)%18;if(extra)append(d,'Füllstück',extra,'tl-0524');blocks.push(block);block={pieces:[],length:0};}
 }
 return blocks;
}
export function smisslineFeed(d){
 const amps=d.feedCurrent||0;if(!(amps>0))throw Error(`${d.tag||'Smissline'}: Bemessungsstrom der Einspeisung fehlt. Bei der Smissline-Einspeisung im Schema angeben.`);
 const large=amps>160,phases=large?['L1','L2','L3','N']:['L1/L2/L3/N'];
 return phases.map(phase=>({kind:'smissline-feed',tag:`Einspeisung ${d.feedFrom||''}`,circuitName:d.circuitName,source:d.feedSource||d.source,dispoTemplateId:large?'tl-0630':'tl-0632',width:90,height:large?36:72,depth:80,phase:large?phase:'',frameStyle:'smissline-feed',mountZ:-70}));
}
