import {canTool,account} from './client.mjs';
import {pageTool} from './model.mjs';
const search=document.getElementById('toolSearch');
function filter(){let total=0;for(const group of document.querySelectorAll('.suite-index .tiles')){let count=0;for(const tile of group.querySelectorAll('.tile')){const url=new URL(tile.href);tile.hidden=!canTool(pageTool(url.pathname.slice(1),url.hash))||!tile.dataset.search.includes(search.value.toLocaleLowerCase().trim());if(!tile.hidden)count++;}group.hidden=!count;const heading=group.previousElementSibling;heading.hidden=!count;heading.querySelector(':scope > span').textContent=`${count} ${count===1?'Werkzeug':'Werkzeuge'}`;total+=count;}document.getElementById('toolSearchEmpty').hidden=!!total||!search.value;}
search.oninput=filter;filter();
if(account?.company){const p=document.querySelector('.dashboard-copy .suite-kicker');p.textContent=account.company.name+' / DEIN ARBEITSPLATZ';}
