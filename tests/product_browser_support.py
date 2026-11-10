"""Test-only offline rendering. Browser navigation is disallowed in this environment.
Uses the real compiled app modules and original styles; embeds local assets.
No changes to enterprise browser policy, real wallets, accounts or external requests.
"""
from pathlib import Path
import base64,re
ROOT=Path(__file__).resolve().parents[1]
SITE=ROOT/'_site'
MIME={'.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'}
def url(p):return 'data:'+MIME[p.suffix]+';base64,'+base64.b64encode(p.read_bytes()).decode()
def boot(page):
    css='\n'.join((SITE/'css'/f).read_text() for f in ['tokens.css','components.css','app.css','v4.css','responsive.css','product.css'])
    def replace(m):
        p=SITE/m.group(1).removeprefix('../')
        return 'url("'+url(p)+'")' if p.is_file() else m.group(0)
    css=re.sub(r'url\([\'"]?(\.\./assets/[^\)\'\"]+)[\'"]?\)',replace,css)
    page.set_content('<!doctype html><html lang="es" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#fff"><style>'+css+'</style></head><body><a href="#main" class="b-skip" data-skip>Ir al contenido</a><div id="app"></div><div id="dialog-root"></div><div id="toast-root" role="status" aria-live="polite"></div></body></html>')
    page.evaluate('''()=>{const store={};Object.defineProperty(window,'localStorage',{value:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>delete store[k],clear:()=>{for(const k of Object.keys(store))delete store[k]},key:i=>Object.keys(store)[i],get length(){return Object.keys(store).length}}});if(!crypto.randomUUID)crypto.randomUUID=()=> 'test-'+Math.random().toString(16).slice(2);window.fetch=()=>Promise.reject(Error('Network disabled by offline test'));window.PULP_PRESENTATION=true;}''')
    assets={str(p.relative_to(SITE)):url(p) for p in (SITE/'assets').rglob('*') if p.is_file() and p.suffix in MIME}
    page.evaluate('''a=>{window.__testAssets=a;const fix=()=>{for(const img of document.querySelectorAll('img[src]')){const src=img.getAttribute('src');if(a[src]){img.removeAttribute('srcset');img.loading='eager';img.src=a[src];}}};new MutationObserver(fix).observe(document.body,{childList:true,subtree:true});fix();}''',assets)
    for f in ['ui.js','presentation-guard.js','layout.js']:
        text=(SITE/'js'/f).read_text()
        # Dynamic import in guard kept identical except test module-loader entry.
        text=text.replace("import('./presentation-api.mjs')","Promise.resolve(window.__testLoad('/js/presentation-api.mjs'))")
        page.add_script_tag(content=text)
    page.add_script_tag(content=(ROOT/'tests/.generated/product-bundle.js').read_text())
    page.wait_for_selector('main',timeout=5000)
    page.wait_for_timeout(300)

def go(page,route):
    page.evaluate('r=>location.hash="#/"+r',route)
    page.wait_for_timeout(180)
