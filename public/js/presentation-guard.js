/* Presentation is an explicit build mode, never inferred from a failed server connection. */
(() => {
  if (!window.PULP_PRESENTATION) return;
  document.documentElement.classList.add('pulp-presentation');
  const aliases={swap:'trade',earn:'trade',kit:'ui-kit'};
  const old=location.hash.replace(/^#\/?/,'');
  if(aliases[old]) history.replaceState(null,'','#/'+aliases[old]);
  const allowed=new Set(['refresh','retry','theme','menu','search','close-modal','go','new-project','launch-tab','trade-tab','token-picker','choose-token','swap-reverse','swap-half','watch-open','watch-save','watch-remove','favorite','save-draft','edit-draft','delete-draft','confirm-delete-draft','metadata','copy','kit-tab','kit-modal','kit-toast','kit-scroll','export-tokens','export-history','export-proposal','proposal-form','export-account','export-diagnostics','profile','density','v4-analyze-wallet','v4-export-events','v4-export-account','v4-export-launch-plan','v4-inbox-read','v4-delete-rule','v4-delete-strategy','v4-pool-open','v4-pool-next','v4-pool-prev','tx-detail','token-detail','swap-token','dismiss-setup','start-guide','reset-presentation']);
  const forms=new Set(['watch','picker','search','kit','label','profile','proposal','v4-analyze','v4-open-pool','v4-launchlab-read','v4-alert','v4-strategy','v4-launch-plan','v4-metadata','v4-privacy']);
  const U=window.PulpUI, btn=U.btn, badge=U.badge;
  U.btn=(text,action,ic,variant,extra='')=>{
    if(action==='account'||action==='connect')text='Wallet deshabilitada';
    if(!allowed.has(action))extra+=' disabled title="No disponible en modo visual: no conecta ni firma"';
    return btn(text,action,ic,variant,extra);
  };
  U.badge=(text,tone,dot)=>badge(({'Cuenta verificada':'Perfil de muestra','Tu voto está firmado':'Vista de muestra','Configurado':'Solo visual','Disponible':'Maqueta','Activa':'Borrador local','Creación verificada':'Ejemplo visual'})[text]||text,tone,dot);
  const changed=new Map([['Activar regla','Guardar regla local'],['Consultar historial indexado','Ver ejemplo de análisis'],['Leer estado y vesting','Ver ejemplo de lanzamiento'],['Consultar cuentas','Ver ejemplo del pool']]);
  function decorate(){
    const app=document.getElementById('app'); if(!app?.querySelector('.b-main'))return;
    if(!app.querySelector('.pv-banner')){
      const b=document.createElement('div');b.className='pv-banner';b.setAttribute('role','note');
      b.innerHTML='<span class="pv-label">VISTA DEL PRODUCTO</span><span>Datos de ejemplo. Wallets, firmas y pagos deshabilitados.</span><button type="button" data-pv-reset>Reiniciar ejemplos</button>';
      app.querySelector('.b-topbar').after(b);
    }
    for(const el of document.querySelectorAll('#app [data-action],#dialog-root [data-action]')){
      if(el.dataset.pvChecked)continue;el.dataset.pvChecked='1';
      if(!allowed.has(el.dataset.action)){el.disabled=true;el.setAttribute('aria-disabled','true');el.title='Deshabilitado en esta presentación';}
    }
    for(const f of document.querySelectorAll('form[data-form]')){
      if(f.dataset.pvChecked)continue;f.dataset.pvChecked='1';
      if(!forms.has(f.dataset.form)) for(const b of f.querySelectorAll('button[type="submit"],button:not([type])')){b.disabled=true;b.title='Requiere servicios reales; deshabilitado en la presentación';}
      for(const b of f.querySelectorAll('button[type="submit"]'))if(changed.has(b.textContent.trim()))b.textContent=changed.get(b.textContent.trim());
      for(const input of f.querySelectorAll('input[type="password"],input[name*="Rpc"],input[name="telegramChat"]')){input.disabled=true;input.value='';input.placeholder='No ingreses credenciales en esta vista';}
    }
    for(const el of document.querySelectorAll('.b-pill-network')){if(el.dataset.pvChecked)continue;el.dataset.pvChecked='1';el.textContent='Modo visual';el.title='Sin conexión a una red';}
    for(const el of document.querySelectorAll('.b-footer>span:last-child')){if(el.dataset.pvChecked)continue;el.dataset.pvChecked='1';el.textContent='Una interfaz compartida · sin operaciones reales en esta vista.';}
    for(const el of document.querySelectorAll('a[href]')){
      if(el.dataset.pvChecked)continue;el.dataset.pvChecked='1';
      if(/^https:\/\/(explorer.solana.com|solscan.io|dexscreener.com)/.test(el.href)){
        el.removeAttribute('href');el.setAttribute('aria-disabled','true');el.classList.add('pv-disabled-link');el.title='Los datos de ejemplo no tienen comprobante on-chain';
      }
    }
    const drawer=app.querySelector('.b-nav');
    if(drawer&&!drawer.querySelector('a[href="#/wallet-inspector"]')){
      const a=document.createElement('a');a.href='#/wallet-inspector';a.innerHTML=U.icon('search')+'<span>Explorador de wallets</span>';drawer.querySelector('.w-dev-nav')?.before(a);
    }
    const hero=app.querySelector('.p-route[data-route="launchpad"]');
    if(hero){[...hero.querySelectorAll(':scope > .p-hero')].slice(1).forEach(el=>el.remove());}
    for(const el of document.querySelectorAll('.b-table-wrap')){el.tabIndex=0;el.setAttribute('aria-label','Tabla de datos, desplazable horizontalmente');}
    for(const d of document.querySelectorAll('.b-dialog-body')){if(d.querySelector('.pv-dialog-note'))continue;const n=document.createElement('p');n.className='small pv-dialog-note';n.textContent='Vista de ejemplo. No conecta wallets ni permite autorizar operaciones.';d.prepend(n);}
    for(const f of document.querySelectorAll('.b-source')){if(f.dataset.pvChecked)continue;f.dataset.pvChecked='1';f.textContent='Ejemplo de diseño · no son datos de mercado ni operaciones reales';}
  }
  let queued=false;
  const observer=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorate();});});
  observer.observe(document.getElementById('app'),{childList:true,subtree:true});
  observer.observe(document.getElementById('dialog-root'),{childList:true,subtree:true});
  document.addEventListener('click',e=>{
    const reset=e.target.closest('[data-pv-reset]');if(reset){e.preventDefault();import('./presentation-api.mjs').then(m=>{m.resetPresentation();location.reload();});return;}
    const b=e.target.closest('[data-action]');if(b&&!allowed.has(b.dataset.action)){e.preventDefault();e.stopImmediatePropagation();}
    if(e.target.closest('[aria-disabled="true"]')){e.preventDefault();e.stopImmediatePropagation();}
  },true);
  document.addEventListener('submit',e=>{const f=e.target.closest('[data-form]');if(f&&!forms.has(f.dataset.form)){e.preventDefault();e.stopImmediatePropagation();}},true);
  decorate();
})();
