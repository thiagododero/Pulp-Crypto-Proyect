"""Supplemental read-only captures: no agreement acceptance, financial action or auth bypass."""
import asyncio,contextlib,functools,http.server,json,threading,shutil
from pathlib import Path
from datetime import datetime,timezone
from playwright.async_api import async_playwright
OUT=Path('.benchmark-captures');OUT.mkdir(exist_ok=True)
(OUT/'images').mkdir(exist_ok=True);(OUT/'documentation').mkdir(exist_ok=True)
shutil.copytree('_site',OUT/'pulp-build',dirs_exist_ok=True)
shutil.copytree('public',OUT/'pulp-source',dirs_exist_ok=True)
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
s=http.server.ThreadingHTTPServer(('127.0.0.1',8791),functools.partial(Handler,directory=str(Path('_site').resolve())))
threading.Thread(target=s.serve_forever,daemon=True).start()
TARGETS=[('pulp-'+r,'http://127.0.0.1:8791/#/'+r,'pulp') for r in ['home','trade','liquidity','launchpad','launchlab','launch-planner','intelligence','wallet-inspector','portfolio','activity','token','governance','alerts','strategies','billing','account-security','operations','settings','status','help','ui-kit','visuals']]+[
('raydium-launchpad','https://raydium.io/launchpad','live'),('raydium-create','https://raydium.io/launchpad/create','live'),('meteora-pools','https://app.meteora.ag/','live'),('realms-governance','https://app.realms.today/realms','live'),
('nansen-doc-portfolio','https://academy.nansen.ai/articles/8816201-nansen-portfolio-101','documentation'),('meteora-doc-terminal','https://docs.meteora.ag/user-guides/how-to-use-dlmm/dynamic-terminal','documentation'),('zerion-doc-solana','https://zerion.io/solana-wallet','documentation'),('zerion-doc-defi','https://zerion.io/defi-wallet/','documentation')]
records=[]
async def capture(browser,t,mobile=False):
 ident,url,kind=t;device='mobile' if mobile else 'desktop';vp={'width':390,'height':844} if mobile else {'width':1440,'height':1000}
 c=await browser.new_context(viewport=vp,device_scale_factor=1,is_mobile=mobile,has_touch=mobile,color_scheme='light',locale='en-US');p=await c.new_page()
 r={'id':ident,'url':url,'kind':kind,'device':device,'viewport':vp,'capturedAt':datetime.now(timezone.utc).isoformat(),'actions':[]}
 try:
  res=await p.goto(url,wait_until='domcontentloaded',timeout=45000);r['status']=res.status if res else None
  if kind=='pulp':await p.locator('.b-main').wait_for(timeout=18000);await p.wait_for_timeout(1600)
  else:
   await p.wait_for_timeout(8500)
   # Close only by standard escape or an explicit close/reject control. Do not accept agreements.
   await p.keyboard.press('Escape');r['actions'].append('Escape');await p.wait_for_timeout(500)
   for sel in ['button[aria-label="Close"]','button[aria-label="Close dialog"]','button[aria-label="Close modal"]','button[data-state="open"][aria-label="Dismiss"]']:
    loc=p.locator(sel)
    if await loc.count()==1:
     with contextlib.suppress(Exception):await loc.click(timeout=1200);r['actions'].append(sel)
  r['finalUrl']=p.url;r['title']=await p.title();r['text']=(await p.locator('body').inner_text())[:25000]
  r['buttons']=await p.locator('button').evaluate_all('(els)=>els.slice(0,120).map(e=>({text:e.innerText,aria:e.getAttribute("aria-label"),title:e.title}))')
  r['bannerCount']=await p.locator('.pv-banner').count() if kind=='pulp' else None
  r['sampleContext']=await p.locator('.pv-beta-context').inner_text() if kind=='pulp' and await p.locator('.pv-beta-context').count() else None
  name=f'images/{ident}-{device}.png';await p.screenshot(path=str(OUT/name),full_page=False);r['screenshot']=name
  if kind=='pulp':
   name=f'images/{ident}-{device}-full.png';await p.screenshot(path=str(OUT/name),full_page=True);r['fullScreenshot']=name
  if kind=='documentation':
   for f in [.2,.4,.6,.8,1,0]:await p.evaluate('(f)=>window.scrollTo(0,document.body.scrollHeight*f)',f);await p.wait_for_timeout(400)
   imgs=await p.locator('img').evaluate_all('(els)=>els.map(e=>({url:e.currentSrc||e.src,alt:e.alt,w:e.naturalWidth,h:e.naturalHeight})).filter(e=>e.w>=300&&e.h>=250)')
   r['documentationImages']=[];seen=set()
   for i,im in enumerate(imgs[:30]):
    if im['url'] in seen or not im['url'].startswith('https://'):continue
    seen.add(im['url'])
    try:
     resp=await p.request.get(im['url'],timeout=18000);mime=resp.headers.get('content-type','');data=await resp.body()
     if not mime.startswith('image/') or len(data)>18000000:continue
     ext='.png' if 'png' in mime else '.jpg' if 'jpeg' in mime else '.webp' if 'webp' in mime else '.img'
     fn=f'documentation/{ident}-{i:02}{ext}';(OUT/fn).write_bytes(data);r['documentationImages'].append({**im,'mime':mime,'file':fn})
    except Exception as e:r.setdefault('imageErrors',[]).append(str(e)[:150])
 except Exception as e:r['error']=str(e)[:600]
 finally:
  records.append(r);(OUT/'manifest.json').write_text(json.dumps({'captures':records},ensure_ascii=False,indent=2));print(ident,device,r.get('title'),r.get('error'),flush=True);await c.close()
async def main():
 async with async_playwright() as pw:
  b=await pw.chromium.launch();sem=asyncio.Semaphore(3)
  async def run(t,m=False):
   async with sem:await capture(b,t,m)
  tasks=[run(t) for t in TARGETS]+[run(t,True) for t in TARGETS if t[0] in ['pulp-home','pulp-trade','pulp-intelligence','pulp-launchpad','pulp-portfolio','pulp-activity']]
  await asyncio.gather(*tasks);await b.close()
 s.shutdown()
asyncio.run(main())
