import asyncio,sys,json,urllib.request,urllib.error,http.cookiejar
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
from browser_assets import inline_css,install_assets
jar=http.cookiejar.CookieJar();opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar));BASE='http://127.0.0.1:4183'
async def bridge(url,options=None):
 options=options or {};h=dict(options.get('headers') or {});h['Origin']=BASE;b=options.get('body');req=urllib.request.Request(BASE+'/'+url.lstrip('/'),data=b.encode() if b else None,headers=h,method=options.get('method','GET'))
 def fetch():
  try:
   with opener.open(req,timeout=30) as r:return {'status':r.status,'body':r.read().decode(),'headers':dict(r.headers)}
  except urllib.error.HTTPError as r:return {'status':r.code,'body':r.read().decode(),'headers':dict(r.headers)}
 return await asyncio.to_thread(fetch)
async def boot(page):
 await page.expose_function('__testHTTP',bridge)
 await page.set_content('<html lang="es" data-theme="dark"><head><style>'+inline_css(ROOT)+'</style></head><body><div id="app"></div><div id="dialog-root"></div><div id="toast-root" role="status" aria-live="polite"></div></body></html>')
 await page.evaluate('''()=>{window.fetch=async(url,o={})=>{const r=await window.__testHTTP(String(url),o);return new Response(r.body,{status:r.status,headers:r.headers});};if(!crypto.randomUUID)crypto.randomUUID=()=> 'ui-'+Math.random().toString(16).slice(2);window.__localStorage={};try{void localStorage;}catch{Object.defineProperty(window,'localStorage',{value:{getItem:k=>window.__localStorage[k],setItem:(k,v)=>window.__localStorage[k]=String(v)}});}}''')
 await install_assets(page,ROOT)
 await page.add_script_tag(content=(ROOT/'tests/.generated/components.js').read_text())
 await page.add_script_tag(content=(ROOT/'tests/.generated/bundle.js').read_text())
 await page.wait_for_selector('main');await page.wait_for_timeout(500)
