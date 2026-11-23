for(const menu of document.querySelectorAll('.products-menu')){
 document.addEventListener('click',event=>{if(!menu.contains(event.target))menu.open=false;});
 menu.addEventListener('keydown',event=>{if(event.key==='Escape'){menu.open=false;menu.querySelector('summary').focus();}});
}
