export function workspace({onClose=()=>{}}={}){
 const ids=['offerDrawer','plantDrawer','partDrawer','catalogDrawer','articleDrawer'];
 const dialogs=ids.map(id=>document.getElementById(id));
 function closeFrom(index){for(let i=dialogs.length-1;i>=index;i--)if(dialogs[i].open)dialogs[i].close();onClose();}
 function open(id,trail=''){const index=ids.indexOf(id),d=dialogs[index];closeFrom(index+1);document.getElementById(id+'Trail').textContent=trail;if(!d.open)d.showModal();}
 for(let i=0;i<dialogs.length;i++){const d=dialogs[i];d.querySelector('.close-drawer').onclick=()=>closeFrom(i);d.addEventListener('cancel',e=>{e.preventDefault();closeFrom(i);});const status=document.createElement('p');status.className='drawer-notice';status.setAttribute('role','status');d.querySelector('.drawer-head').after(status);}
 function tab(id){for(const b of document.querySelectorAll('[data-tab]')){b.classList.toggle('selected',b.dataset.tab===id);b.setAttribute('aria-pressed',String(b.dataset.tab===id));document.getElementById(b.dataset.tab).hidden=b.dataset.tab!==id;}}
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>tab(b.dataset.tab));
 function notify(text){const top=[...dialogs].reverse().find(d=>d.open);for(const d of dialogs)d.querySelector('.drawer-notice').textContent=d===top?text:'';document.getElementById('notice').textContent=top?'':text;}
 return {open,close:id=>closeFrom(ids.indexOf(id)),tab,notify,isOpen:id=>document.getElementById(id).open};
}
