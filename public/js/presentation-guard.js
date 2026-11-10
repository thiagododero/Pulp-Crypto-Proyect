/* Presentation is an explicit build mode. Quiet context; identical financial safeguards. */
(() => {
  if (!window.PULP_PRESENTATION) return;
  document.documentElement.classList.add('pulp-presentation');
  const aliases={swap:'trade',kit:'ui-kit'};
  const old=location.hash.replace(/^#\/?/,'');
  if(aliases[old]) history.replaceState(null,'','#/'+aliases[old]);
  const allowed=new Set(['refresh','retry','theme','menu','search','close-modal','go','new-project','launch-tab','trade-tab','token-picker','choose-token','swap-reverse','swap-half','watch-open','watch-save','watch-remove','favorite','save-draft','edit-draft','delete-draft','confirm-delete-draft','metadata','copy','kit-tab','kit-modal','kit-toast','kit-scroll','export-tokens','export-history','export-proposal','proposal-form','export-account','export-diagnostics','profile','density','v4-analyze-wallet','v4-gov-detail','v4-export-events','v4-export-account','v4-export-launch-plan','v4-inbox-read','v4-delete-rule','v4-delete-strategy','v4-pool-open','v4-pool-next','v4-pool-prev','tx-detail','token-detail','swap-token','dismiss-setup','start-guide','reset-presentation']);
  for(const action of ['ux-new-project','ux-tab', 'ux-favorite', 'ux-only-favorites', 'ux-profile', 'ux-detail', 'ux-method', 'ux-project-doc', 'ux-compare-add', 'ux-compare', 'ux-clear-compare', 'ux-save-view', 'ux-reset', 'ux-open-address', 'ux-new-alert', 'ux-new-strategy', 'ux-wizard-prev', 'ux-export-plan', 'ux-load-draft', 'ux-delete-draft', 'ux-delete-draft-confirm', 'ux-export-portfolio', 'ux-export-events'])allowed.add(action);
  const forms=new Set(['ux-launch','ux-address','watch','picker','search','kit','label','profile','proposal','v4-analyze','v4-open-pool','v4-launchlab-read','v4-alert','v4-strategy','v4-launch-plan','v4-metadata','v4-privacy']);
  const U=window.PulpUI, btn=U.btn, badge=U.badge;
  U.btn=(text,action,ic,variant,extra='')=>{
    if(action==='account'||action==='connect')text='Conectar wallet';
    if(!allowed.has(action))extra+=' disabled title="No disponible en esta beta"';
    return btn(text,action,ic,variant,extra);
  };
  U.badge=(text,tone,dot)=>badge(({'Cuenta verificada':'Perfil beta','Tu voto está firmado':'Borrador','Configurado':'Beta','Disponible':'Beta','Activa':'Borrador local','Creación verificada':'Beta'})[text]||text,tone,dot);
  const changed=new Map([['Activar regla','Guardar regla local'],['Consultar historial indexado','Ver análisis'],['Leer estado y vesting','Ver lanzamiento'],['Consultar cuentas','Ver pool']]);
  function decorate(){
    const app=document.getElementById('app'); if(!app?.querySelector('.b-main'))return;
    // Context lives once in the footer, not above every screen and dialog.
    for(const el of app.querySelectorAll('.pv-banner'))el.remove();
    for(const el of document.querySelectorAll('#app [data-action],#dialog-root [data-action]')){
      if(el.dataset.pvChecked)continue;el.dataset.pvChecked='1';
      if(!allowed.has(el.dataset.action)){el.disabled=true;el.setAttribute('aria-disabled','true');el.title='No disponible en esta beta';}
    }
    for(const f of document.querySelectorAll('form[data-form]')){
      if(f.dataset.pvChecked)continue;f.dataset.pvChecked='1';
      if(!forms.has(f.dataset.form))for(const b of f.querySelectorAll('button[type="submit"],button:not([type])')){b.disabled=true;b.title='No disponible en esta beta';}
      for(const b of f.querySelectorAll('button[type="submit"]'))if(changed.has(b.textContent.trim()))b.textContent=changed.get(b.textContent.trim());
      for(const input of f.querySelectorAll('input[type="password"],input[name*="Rpc"],input[name="telegramChat"]')){input.disabled=true;input.value='';input.placeholder='Configuración no disponible en esta beta';}
    }
    for(const el of document.querySelectorAll('.b-pill-network')){if(el.dataset.pvChecked)continue;el.dataset.pvChecked='1';el.hidden=true;}
    for(const el of document.querySelectorAll('.b-footer>span:last-child')){
      if(el.dataset.pvChecked)continue;el.dataset.pvChecked='1';
      el.innerHTML='<details class="pv-beta-context"><summary>Beta · datos de muestra</summary><p>Esta edición permite recorrer el producto con ejemplos locales. Los importes, wallets, proyectos y movimientos mostrados no son datos de mercado ni recomendaciones. Conexiones, firmas, pagos y operaciones financieras permanecen deshabilitados. Tus borradores solo se guardan en este navegador.</p><button class="btn btn-ghost" type="button" data-pv-reset>Reiniciar ejemplos</button></details>';
    }
    for(const el of document.querySelectorAll('a[href]')){
      if(el.dataset.pvChecked)continue;el.dataset.pvChecked='1';
      if(/^https:\/\/(explorer.solana.com|solscan.io|dexscreener.com)/.test(el.href)){
        el.removeAttribute('href');el.setAttribute('aria-disabled','true');el.classList.add('pv-disabled-link');el.title='Comprobante no disponible para datos de muestra';
      }
    }
    const titles=new Map([['Configuración leída on-chain','Configuración del lanzamiento'],['Pool verificado','Detalles del pool'],['Proyectos publicados','Proyectos'],['Proyectos publicados en Solana','Explorar proyectos'],['Membresía y facturas','Planes y comprobantes']]);
    for(const el of document.querySelectorAll('.b-panel-head h2,.b-heading h2')){for(const node of el.childNodes)if(node.nodeType===3&&titles.has(node.textContent.trim()))node.textContent=titles.get(node.textContent.trim());}
    for(const el of document.querySelectorAll('.b-notice>div,.b-empty>p')){
      if(el.dataset.pvCopy)continue;el.dataset.pvCopy='1';const text=el.textContent;
      if(text.includes('Los perfiles provienen de DEX Screener')||text.includes('Estas comisiones y derechos corresponden a la configuración real')){const box=el.closest('.b-notice');if(box)box.hidden=true;}
      else if(text.includes('Borradores privados guardados en este servidor'))el.textContent='Tus borradores se guardan en este navegador.';
      else if(text.includes('Los datos aparecen a partir de consultas reales.'))el.textContent='Todavía no hay información en este panel.';
    }
    const hero=app.querySelector('.p-route[data-route="launchpad"]');
    if(hero){[...hero.querySelectorAll(':scope > .p-hero')].slice(1).forEach(el=>el.remove());}
    for(const el of document.querySelectorAll('.b-table-wrap')){el.tabIndex=0;el.setAttribute('aria-label','Tabla de datos, desplazable horizontalmente');}
    for(const el of document.querySelectorAll('.pv-dialog-note'))el.remove();
    for(const f of document.querySelectorAll('.b-source')){if(f.dataset.pvChecked)continue;f.dataset.pvChecked='1';f.hidden=true;}
  }
  let queued=false;
  const observer=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorate();});});
  observer.observe(document.getElementById('app'),{childList:true,subtree:true});
  observer.observe(document.getElementById('dialog-root'),{childList:true,subtree:true});
  document.addEventListener('click',e=>{
    const reset=e.target.closest('[data-pv-reset]');if(reset){e.preventDefault();import('./presentation-api.mjs').then(m=>{m.resetPresentation();for(const k of Object.keys(localStorage))if(k.startsWith('pulp:product-ui:'))localStorage.removeItem(k);location.reload();});return;}
    const b=e.target.closest('[data-action]');if(b&&!allowed.has(b.dataset.action)){e.preventDefault();e.stopImmediatePropagation();}
    if(e.target.closest('[aria-disabled="true"]')){e.preventDefault();e.stopImmediatePropagation();}
  },true);
  document.addEventListener('submit',e=>{const f=e.target.closest('[data-form]');if(f&&!forms.has(f.dataset.form)){e.preventDefault();e.stopImmediatePropagation();}},true);
  decorate();
})();
