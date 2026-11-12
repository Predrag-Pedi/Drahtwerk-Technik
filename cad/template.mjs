const safePath=/^[MmLlHhVvCcSsQqTtAaZz0-9eE+.,\s-]+$/;
export function validateTemplate(raw){
 const fail=()=>{throw Error('Ungültige Vorlage');};
 const number=(v,max=1e8)=>typeof v==='number'&&Number.isFinite(v)&&v>0&&v<=max?v:fail();
 const str=v=>typeof v==='string'&&v.length<2000?v:fail();
 if(!raw||!Array.isArray(raw.paths)||!raw.paths.length||raw.paths.length>15000)fail();
 let chars=0;
 return {id:str(raw.id),name:str(raw.name),category:raw.category==='Dispo'?'Dispo':'Schema',group:str(raw.group),source:str(raw.source),width:number(raw.width,10000),height:number(raw.height,10000),viewWidth:number(raw.viewWidth),viewHeight:number(raw.viewHeight),paths:raw.paths.map(p=>{if(typeof p.d!=='string'||!p.d.length||p.d.length>500000||!safePath.test(p.d)||(chars+=p.d.length)>5000000)fail();if(!['none','#000000','#ffffff'].includes(p.fill)||!['none','#000000','#ffffff'].includes(p.stroke)||!Number.isFinite(p.sw)||p.sw<0||p.sw>1e6)fail();return {d:p.d,fill:p.fill,stroke:p.stroke,sw:p.sw};})};
}
export function templateMarkup(t,w,h){return `<svg width="${w}" height="${h}" viewBox="0 0 ${t.viewWidth} ${t.viewHeight}" overflow="visible" preserveAspectRatio="none"><g stroke-linecap="round" stroke-linejoin="round" fill-rule="evenodd">${t.paths.map(p=>`<path d="${p.d}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="${Math.max(p.sw,.75/Math.min(w/t.viewWidth,h/t.viewHeight))}"/>`).join('')}</g></svg>`;}
export function templateSize(e,page){const factor=1200/420/(e.template.category==='Dispo'?page.scale:1);return [e.width*factor,e.height*factor];}
