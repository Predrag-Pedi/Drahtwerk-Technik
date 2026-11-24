import {can,serverMode,listRecords} from './client.mjs';
import {customerSnapshot} from './customers-model.mjs';
let serial=0;
export function attachCustomerPicker({customer,contact,apply}){
 if(!serverMode||!can('customers')||!customer||customer.disabled||customer.closest('fieldset[disabled]'))return;
 if(!document.querySelector('[data-customer-style]')){const css=document.createElement('link');css.rel='stylesheet';css.href='/platform/customers.css';css.dataset.customerStyle='';document.head.append(css);}
 let records=[],selected=null;
 function suggest(input,options,onPick){
  if(!input)return;if(!input.hasAttribute('aria-label'))input.setAttribute('aria-label',input.closest('label')?.textContent.trim()||'Kundenauswahl');input.autocomplete='off';input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-expanded','false');const id='customer-options-'+(++serial);input.setAttribute('aria-controls',id);
  const list=document.createElement('div');list.id=id;list.className='customer-suggestions';list.setAttribute('role','listbox');list.hidden=true;input.insertAdjacentElement('afterend',list);let index=-1,matches=[];
  const close=()=>{list.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');};
  const paint=()=>{index=-1;matches=options(input.value.toLocaleLowerCase('de-CH'));list.replaceChildren();for(const [i,o]of matches.entries()){const b=document.createElement('button');b.type='button';b.id=id+'-'+i;b.setAttribute('role','option');b.textContent=o.label;b.onmousedown=e=>e.preventDefault();b.onclick=()=>{onPick(o.value);close();};list.append(b);}if(!matches.length){const p=document.createElement('span');p.textContent='Kein Treffer. Du kannst die Angaben auch von Hand erfassen.';list.append(p);}list.hidden=false;input.setAttribute('aria-expanded','true');};
  input.addEventListener('input',()=>{if(input===customer)selected=null;paint();});
  input.addEventListener('focus',async()=>{try{records=await listRecords('customers');if(selected)selected=records.find(r=>r.id===selected.id&&!r.value.archived&&r.value.name===customer.value)||null;if(!input.isConnected||document.activeElement!==input)return;if(input===contact&&!selected){const exact=records.filter(r=>!r.value.archived&&r.value.name===customer.value);if(exact.length===1)selected=exact[0];}paint();}catch(e){list.textContent='Kundenstamm konnte nicht geladen werden: '+e.message;list.hidden=false;}});
  input.addEventListener('keydown',e=>{if(e.key==='Escape'){close();return;}if(list.hidden)return;if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();index=Math.max(0,Math.min(matches.length-1,index+(e.key==='ArrowDown'?1:-1)));for(const [i,b]of [...list.children].entries())b.setAttribute('aria-selected',String(i===index));if(matches[index])input.setAttribute('aria-activedescendant',id+'-'+index);}if(e.key==='Enter'&&matches[index]){e.preventDefault();onPick(matches[index].value);close();}});
  input.addEventListener('blur',()=>setTimeout(close,180));
 }
 const choose=(record,person)=>{apply(customerSnapshot(record.value,person));selected=record;};
 suggest(customer,q=>records.filter(r=>!r.value.archived&&[r.value.name,r.value.number,r.value.city,r.value.street].join(' ').toLocaleLowerCase('de-CH').includes(q)).slice(0,12).map(r=>({value:r,label:[r.value.name,r.value.number,r.value.city].filter(Boolean).join(' · ')})),r=>choose(r));
 suggest(contact,q=>(selected?.value.contacts||[]).filter(p=>[p.name,p.email,p.role].join(' ').toLocaleLowerCase('de-CH').includes(q)).slice(0,12).map(p=>({value:p,label:[p.name,p.role,p.email].filter(Boolean).join(' · ')})),p=>selected&&choose(selected,p));
}
export function fillCustomerFields(root,mapping,snapshot){for(const [key,selector]of Object.entries(mapping)){const input=root.querySelector(selector);if(input&&!input.disabled){input.value=snapshot[key]||'';input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}}}
