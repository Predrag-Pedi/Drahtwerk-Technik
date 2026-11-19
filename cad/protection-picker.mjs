import {protectionFields} from './protection-fields.mjs?v=20261119-7';
import {articleById,compatibleArticles,matchingArticles,preferredArticle,articleSummary,articleSource,manufacturers,protectionArticles} from './protection-catalog.mjs?v=20261119-7';
import {selectMacroArticle} from './macro-config.mjs?v=20261119-7';
const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
const labels={current:'Bemessungsstrom',curve:'Charakteristik',residual:'Fehlerstrom',rcdType:'Fehlerstrom-Typ',icn:'Icn',icu:'Icu',selective:'Selektiv',manufacturer:'Hersteller'};
const display=(key,value)=>key==='manufacturer'?manufacturers[value]:key==='current'?value+'A':key==='residual'?value+'mA':['icn','icu'].includes(key)?value+' kA':key==='selective'?value?'Ja · S':'Nein':value;
// Video filters describe a whole device category, not legal cross-products.
export const videoVariants={ls:{curve:['B','C','D','K','Z','E']},fils:{current:[4,6,10,13,16,20,25,32,40],curve:['B','C','D'],residual:[10,30,100,300],rcdType:['A','F']},fi:{rcdType:['A','B','F','A-SI','B+','B-SI','B-EV','A HI']}};
export function protectionPicker(root,t,draft,changed,onlyKey){
 const profiles=protectionFields(t).filter(p=>!onlyKey||p.key===onlyKey);root.replaceChildren();
 for(const profile of profiles){
  const box=node('section',undefined,'macro-article'),all=compatibleArticles(profile),selected=articleById(draft.articles?.[profile.key])||preferredArticle(matchingArticles(t,profile,draft.values)),bound=draft.manufacturerBound?.[profile.key]===true;root.append(box);
  box.append(node('strong',`${{ls:'LS',fils:'FI/LS',fi:'FI'}[profile.kind]} · ${profile.poles}${profiles.length>1?' · '+profile.key:''}`));
  const more=node('details',undefined,'macro-article-details');
  const rebuild=()=>{const open=more.open;protectionPicker(root,t,draft,changed,onlyKey);const reopened=[...root.querySelectorAll('.macro-article')][profiles.indexOf(profile)]?.querySelector('details');if(reopened)reopened.open=open;};
  const select=(a,bind=bound)=>{if(!a)return;const before=selected;selectMacroArticle(t,draft,profile.key,a.id,{bind});rebuild();const changedValues=before?['current','curve','residual','rcdType','icn','icu','selective'].filter(k=>before[k]!==a[k]&&a[k]!==undefined).map(k=>`${labels[k]} ${display(k,a[k])}`).join(' · '):'';changed(changedValues?`Gerätewerte übernommen: ${changedValues}`:'Gerätewerte übernommen.');};
  const toggle=node('label',undefined,'macro-manufacturer-toggle'),checkbox=node('input');checkbox.type='checkbox';checkbox.checked=bound;checkbox.setAttribute('aria-label','Hersteller festlegen');toggle.append(checkbox,node('span','Hersteller festlegen'));box.append(toggle);
  checkbox.onchange=()=>{draft.manufacturerBound??={};draft.manufacturerBound[profile.key]=checkbox.checked;const a=selected||preferredArticle(all);if(a)select(a,checkbox.checked);else rebuild();};
  const choices=(key,pool,parent,includeCategory=false)=>{
   const offered=includeCategory?[...protectionArticles.filter(a=>a.kind===profile.kind).map(a=>a[key]),...(videoVariants[profile.kind]?.[key]||[]).filter(v=>v!=='B+'||!pool.some(a=>a.rcdType?.startsWith('B+')))]:pool.map(a=>a[key]);
   const values=[...new Set(offered.filter(v=>v!==undefined))].sort((a,b)=>typeof a==='number'?a-b:String(a).localeCompare(String(b),'de'));
   if(!values.length)return;
   const group=node('fieldset',undefined,'macro-choices');group.append(node('legend',labels[key]));const row=node('div',undefined,'macro-choice-row');group.append(row);
   for(const value of values){const b=node('button',display(key,value)),candidates=pool.filter(a=>a[key]===value);b.type='button';b.setAttribute('aria-label',`${labels[key]}: ${display(key,value)}`);b.setAttribute('aria-pressed',String(selected?.[key]===value));b.disabled=!candidates.length;if(b.disabled)b.title=`Für ${profile.poles} ist diese Ausführung noch nicht mit einem passenden Artikel belegt.`;b.onclick=()=>{const previous={...selected};if(!bound){delete previous.manufacturer;delete previous.series;}select(preferredArticle(candidates,previous));};row.append(b);}
   parent.append(group);
  };
  if(!all.length){box.append(node('p','Für diese Polausführung ist noch kein Artikel hinterlegt. Eine passende Gerätevorlage wählen.','macro-error'));continue;}
  if(bound)choices('manufacturer',all,box);
  const family=bound&&selected?all.filter(a=>a.manufacturer===selected.manufacturer&&a.series===selected.series):all;
  const common=node('div',undefined,'macro-article-values');box.append(common);choices('current',family,common,!bound);
  if(profile.kind!=='fi')choices('curve',family,common,!bound);
  if(profile.kind!=='ls'){choices('residual',family,common,!bound);choices('rcdType',family,common,!bound);}
  more.append(node('summary',bound?(selected?`${selected.article} · Weitere Artikelwerte`:'Katalogartikel wählen'):'Weitere Gerätewerte'));box.append(more);
  if(bound){
   const seriesLabel=node('label',undefined,'macro-field'),series=node('select');series.setAttribute('aria-label','Baureihe');
   for(const value of [...new Set(all.filter(a=>!selected||a.manufacturer===selected.manufacturer).map(a=>a.series))]){const option=node('option',value);option.value=value;series.append(option);}if(selected)series.value=selected.series;
   series.onchange=()=>select(preferredArticle(all.filter(a=>(!selected||a.manufacturer===selected.manufacturer)&&a.series===series.value),selected||{}));seriesLabel.append(node('span','Baureihe'),series);more.append(seriesLabel);
  }
  for(const key of ['icn','icu','selective'])choices(key,family,more);
  if(bound){
   const articleLabel=node('label',undefined,'macro-field'),articles=node('select');articles.setAttribute('aria-label','Katalogartikel');
   if(!selected){const option=node('option','Bitte Artikel wählen');option.value='';articles.append(option);}
   for(const a of family){const option=node('option',articleSummary(a));option.value=a.id;articles.append(option);}articles.value=selected?.id||'';articles.onchange=()=>select(articleById(articles.value));articleLabel.append(node('span','Artikel'),articles);more.append(articleLabel);
   if(selected){more.append(node('p',articleSummary(selected),'hint'));const link=node('a','Herstellerdaten ansehen');link.href=articleSource(selected);link.target='_blank';link.rel='noopener noreferrer';more.append(link);const facts=[['Typ',selected.model],['ELDAS',selected.eldas],['Verzögerung',selected.delay],['Schaltvermögen',selected.switchingCapacity?selected.switchingCapacity+' kA':''],['Anschluss',selected.connection],['Abgesicherte Pole',selected.protectedPoles],['Verlustleistung',selected.loss===undefined?'':selected.loss+' W'],...(selected.ratings||[]).map(([name,value])=>[name,value+' kA'])].filter(([,value])=>value!==undefined&&value!=='');if(facts.length){const list=node('dl',undefined,'macro-ratings');for(const [name,value]of facts)list.append(node('dt',name),node('dd',value));more.append(list);}}
  }
  if(selected?.series==='SLS')box.append(node('small','Diese Ausführung ist ein selektiver Hauptleitungsschutzschalter (SLS).'));
  box.append(node('small',bound?'Zusammengehörige Artikelwerte werden gemeinsam übernommen.':'Herstellerübergreifend. Ein Klick wählt eine belegte Kombination; weitere Werte können sich dabei ändern. Graue Werte sind für diese Polzahl noch nicht belegt.'));
 }
 return profiles;
}
