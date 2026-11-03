import {topics,classifyPage} from './topics.mjs?v=20261103-2';
export function createTopics({root,pdfLib,openDoc}){
 let generation=0,activeTask=null;const cache=new Map();
 const url=path=>path.split('/').map(encodeURIComponent).join('/');
 function cancel(){generation++;if(activeTask){activeTask.destroy().catch(()=>{});activeTask=null;}}
 async function show(folder,refresh=false){
  cancel();const token=generation;root.replaceChildren();
  const heading=document.createElement('h2');heading.textContent='Zähler: relevante Seiten';root.append(heading);
  const hint=document.createElement('p');hint.className='ew-note';hint.textContent='Automatische Stichwortsuche in allen PDFs dieses EWs. Treffer können auch Verweise oder Inhaltsverzeichnisse sein. Apparatetafeln werden bei Zählerplatten mitgeführt.';root.append(hint);
  const retry=document.createElement('button');retry.type='button';retry.className='secondary';retry.textContent='Seiten erneut durchsuchen';retry.onclick=()=>show(folder,true);root.append(retry);
  const status=document.createElement('p');status.setAttribute('role','status');root.append(status);
  const groups=new Map();for(const [id,label] of topics){const section=document.createElement('section'),title=document.createElement('h3'),list=document.createElement('div');title.textContent=label;section.append(title,list);root.append(section);groups.set(id,{title,list,label,count:0});}
  function add(path,hit){for(const id of hit.topics){const group=groups.get(id);group.count++;group.title.textContent=group.label+' ('+group.count+')';
   const card=document.createElement('details');card.className='ew-topic-hit';const summary=document.createElement('summary');summary.textContent=path.split('/').pop()+' · PDF-Seite '+hit.page;
   const open=document.createElement('button');open.type='button';open.textContent='Im vollständigen PDF öffnen';open.onclick=()=>openDoc(path,hit.page);
   const preview=document.createElement('div');preview.className='ew-topic-preview';card.append(summary,open,preview);group.list.append(card);
   let loading=false;card.addEventListener('toggle',async()=>{if(!card.open||loading||preview.querySelector('canvas'))return;loading=true;preview.textContent='Seitenvorschau wird geladen …';let task;
    try{task=pdfLib.getDocument({url:url(path),isEvalSupported:false});const doc=await task.promise,page=await doc.getPage(hit.page);if(token!==generation)return;const scale=Math.min(1.5,Math.max(.5,(root.clientWidth-40)/page.getViewport({scale:1}).width));const vp=page.getViewport({scale}),canvas=document.createElement('canvas');canvas.width=vp.width;canvas.height=vp.height;await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;if(token===generation)preview.replaceChildren(canvas);
    }catch{if(token===generation)preview.textContent='Vorschau nicht verfügbar. Bitte das vollständige PDF öffnen.';}finally{loading=false;if(task)await task.destroy().catch(()=>{});}
   });
  }}
  if(!pdfLib){status.textContent='PDF-Bibliothek nicht geladen. Bitte Internetverbindung prüfen und Seite neu laden.';return;}
  let failed=0,unreadable=0,errors=0;
  for(const path of folder.files){if(token!==generation)return;let result=refresh?null:cache.get(path);
   if(!result){result={hits:[],unreadable:0,errors:0};let task;
    try{task=pdfLib.getDocument({url:url(path),isEvalSupported:false});activeTask=task;const doc=await task.promise;
     for(let page=1;page<=doc.numPages;page++){if(token!==generation)return;status.textContent=path.split('/').pop()+' · Seite '+page+' / '+doc.numPages;
      try{const p=await doc.getPage(page),content=await p.getTextContent(),text=content.items.map(x=>x.str||'').join(' ');if(text.replace(/\s/g,'').length<30)result.unreadable++;const found=classifyPage(text);if(found.length)result.hits.push({page,topics:found});p.cleanup();}catch{result.errors++;}
     }
     if(!result.errors)cache.set(path,result);
    }catch{if(token!==generation)return;failed++;}finally{if(activeTask===task)activeTask=null;if(task)await task.destroy().catch(()=>{});}
   }
   if(token!==generation)return;unreadable+=result.unreadable;errors+=result.errors;for(const hit of result.hits)add(path,hit);
  }
  if(token!==generation)return;
  for(const g of groups.values())if(!g.count){const p=document.createElement('p');p.className='ew-note';p.textContent='Keine Texttreffer gefunden.';g.list.append(p);}
  status.textContent='Suche abgeschlossen.'+(unreadable?' '+unreadable+' Seite(n) mit wenig oder keinem lesbaren Text: Bildinhalte wurden nicht automatisch erkannt.':'')+(failed||errors?' '+failed+' PDF(s) und '+errors+' Seite(n) konnten nicht ausgewertet werden.':'');
 }
 return {show,cancel};
}
