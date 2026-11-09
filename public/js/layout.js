/** Shared progressive enhancement: readable financial tables on small screens. */
(() => {
 let queued=false;
 function enhance(){
  for(const table of document.querySelectorAll('.b-table:not(.pv-mobile-table)')){
   const heads=[...table.querySelectorAll('thead th')].map(e=>e.textContent.trim());
   if(!heads.length)continue;
   table.classList.add('pv-mobile-table');table.setAttribute('role','table');
   for(const group of table.querySelectorAll('thead,tbody'))group.setAttribute('role','rowgroup');
   for(const row of table.querySelectorAll('tr'))row.setAttribute('role','row');
   for(const th of table.querySelectorAll('th'))th.setAttribute('role','columnheader');
   for(const row of table.querySelectorAll('tbody tr'))[...row.children].forEach((td,i)=>{td.dataset.label=heads[i]||'';td.setAttribute('role','cell');});
  }
 }
 new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance();});}).observe(document.getElementById('app'),{childList:true,subtree:true});
 enhance();
})();
