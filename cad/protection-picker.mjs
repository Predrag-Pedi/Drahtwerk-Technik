import {protectionFields} from './protection-fields.mjs?v=20261119-6';
import {articleById,compatibleArticles,preferredArticle,articleSummary,articleSource,manufacturers} from './protection-catalog.mjs?v=20261119-6';
import {selectMacroArticle} from './macro-config.mjs?v=20261119-6';
const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
const labels={current:'Bemessungsstrom',curve:'Charakteristik',residual:'Fehlerstrom',rcdType:'Fehlerstrom-Typ',icn:'Icn',icu:'Icu',selective:'Selektiv',manufacturer:'Hersteller'};
const display=(key,value)=>key==='manufacturer'?manufacturers[value]:key==='current'?value+'A':key==='residual'?value+'mA':['icn','icu'].includes(key)?value+' kA':key==='selective'?value?'Ja · S':'Nein':value;
export function protectionPicker(root,t,draft,changed,onlyKey){
 const profiles=protectionFields(t).filter(p=>!onlyKey||p.key===onlyKey);root.replaceChildren();
 for(const profile of profiles){
  const box=node('section',undefined,'macro-article'),all=compatibleArticles(profile),selected=articleById(draft.articles?.[profile.key]);root.append(box);
  box.append(node('strong',`${{ls:'LS',fils:'FI/LS',fi:'FI'}[profile.kind]} · ${profile.poles}${profiles.length>1?' · '+profile.key:''}`));
  const select=a=>{const before=selected,open=more.open;selectMacroArticle(t,draft,profile.key,a.id);protectionPicker(root,t,draft,changed,onlyKey);const reopened=[...root.querySelectorAll('.macro-article')][profiles.indexOf(profile)]?.querySelector('details');if(reopened)reopened.open=open;const changedValues=before?['current','curve','residual','rcdType','icn','icu','selective'].filter(k=>before[k]!==a[k]&&a[k]!==undefined).map(k=>`${labels[k]} ${display(k,a[k])}`).join(' · '):'';changed(changedValues?`Artikel übernommen: ${changedValues}`:'Artikelwerte übernommen.');};
  const choices=(key,pool,parent)=>{
   const values=[...new Set(pool.map(a=>a[key]).filter(v=>v!==undefined))].sort((a,b)=>typeof a==='number'?a-b:String(a).localeCompare(String(b),'de'));
   if(!values.length)return;
   const group=node('fieldset',undefined,'macro-choices');group.append(node('legend',labels[key]));const row=node('div',undefined,'macro-choice-row');group.append(row);
   for(const value of values){const b=node('button',display(key,value));b.type='button';b.setAttribute('aria-label',`${labels[key]}: ${display(key,value)}`);b.setAttribute('aria-pressed',String(selected?.[key]===value));b.onclick=()=>select(preferredArticle(pool.filter(a=>a[key]===value),selected||{}));row.append(b);}
   parent.append(group);
  };
  if(!all.length){box.append(node('p','Für diese Polausführung ist noch kein Artikel hinterlegt. Eine passende Gerätevorlage wählen.','macro-error'));continue;}
  choices('manufacturer',all,box);
  const family=selected?all.filter(a=>a.manufacturer===selected.manufacturer&&a.series===selected.series):all;
  const common=node('div',undefined,'macro-article-values');box.append(common);choices('current',family,common);
  if(profile.kind!=='fi')choices('curve',family,common);
  if(profile.kind!=='ls'){choices('residual',family,common);choices('rcdType',family,common);}
  const more=node('details',undefined,'macro-article-details');more.append(node('summary',selected?`${selected.article} · Weitere Artikelwerte`:'Katalogartikel wählen'));box.append(more);if(!selected)more.open=true;
  const seriesLabel=node('label',undefined,'macro-field'),series=node('select');series.setAttribute('aria-label','Baureihe');
  for(const value of [...new Set(all.filter(a=>!selected||a.manufacturer===selected.manufacturer).map(a=>a.series))]){const option=node('option',value);option.value=value;series.append(option);}if(selected)series.value=selected.series;
  series.onchange=()=>select(preferredArticle(all.filter(a=>(!selected||a.manufacturer===selected.manufacturer)&&a.series===series.value),selected||{}));seriesLabel.append(node('span','Baureihe'),series);more.append(seriesLabel);
  for(const key of ['icn','icu','selective'])choices(key,family,more);
  const articleLabel=node('label',undefined,'macro-field'),articles=node('select');articles.setAttribute('aria-label','Katalogartikel');
  if(!selected){const option=node('option','Bitte Artikel wählen');option.value='';articles.append(option);}
  for(const a of family){const option=node('option',articleSummary(a));option.value=a.id;articles.append(option);}articles.value=selected?.id||'';articles.onchange=()=>{const a=articleById(articles.value);if(a)select(a);};articleLabel.append(node('span','Artikel'),articles);more.append(articleLabel);
  if(selected){const info=node('p',articleSummary(selected),'hint');more.append(info);const link=node('a','Herstellerdaten ansehen');link.href=articleSource(selected);link.target='_blank';link.rel='noopener noreferrer';more.append(link);const facts=[['ELDAS',selected.eldas],['Anschluss',selected.connection],['Abgesicherte Pole',selected.protectedPoles],['Verlustleistung',selected.loss===undefined?'':selected.loss+' W'],...(selected.ratings||[]).map(([name,value])=>[name,value+' kA'])].filter(([,value])=>value!==undefined&&value!=='');if(facts.length){const list=node('dl',undefined,'macro-ratings');for(const [name,value]of facts)list.append(node('dt',name),node('dd',value));more.append(list);}}
  const note=node('small',selected?'Zusammengehörige Artikelwerte werden gemeinsam übernommen.':'Vorlagenwerte noch keinem Artikel zugeordnet.');box.append(note);
 }
 return profiles;
}
