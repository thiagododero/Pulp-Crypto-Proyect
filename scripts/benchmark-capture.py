"""Read-only UX benchmark. No wallet, login, payment, bot bypass or financial action.
App screenshots are unaltered. Documentation images are labelled as such.
"""
import asyncio, contextlib, functools, http.server, json, os, re, shutil, threading
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
from playwright.async_api import async_playwright

OUT=Path('.benchmark-captures'); OUT.mkdir(exist_ok=True)
(OUT/'images').mkdir(exist_ok=True)
(OUT/'documentation').mkdir(exist_ok=True)
ROOT=Path('_site').resolve()
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
handler=functools.partial(QuietHandler,directory=str(ROOT))
server=http.server.ThreadingHTTPServer(('127.0.0.1',8791),handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
shutil.copytree(ROOT,OUT/'pulp-build',dirs_exist_ok=True)
shutil.copytree('public',OUT/'pulp-source',dirs_exist_ok=True)
for name in ['tests','scripts']:
    shutil.copytree(name,OUT/name,dirs_exist_ok=True)
shutil.copy2('package.json',OUT/'package.json')

PULP=['home','trade','liquidity','launchpad','launchlab','launch-planner','intelligence','wallet-inspector','portfolio','activity','token','governance','governance-onchain','alerts','strategies','billing','account-security','operations','settings','status','help','ui-kit','visuals']
TARGETS=[dict(id='pulp-'+r,url='http://127.0.0.1:8791/#/'+r,kind='pulp',mobile=r in ['home','trade','liquidity','launchpad','intelligence','portfolio','activity']) for r in PULP]
TARGETS.append(dict(id='pulp-earn',url='http://127.0.0.1:8791/#/trade',kind='pulp',tab='earn',mobile=True))
TARGETS += [
 dict(id='jupiter-home',url='https://jup.ag/',kind='live',mobile=True),
 dict(id='jupiter-swap',url='https://jup.ag/swap',kind='live',mobile=True),
 dict(id='jupiter-earn',url='https://jup.ag/lend/earn',kind='live',mobile=True),
 dict(id='jupiter-portfolio',url='https://jup.ag/portfolio',kind='live',mobile=True),
 dict(id='kamino-earn',url='https://kamino.com/lend',kind='live',mobile=True),
 dict(id='kamino-liquidity',url='https://kamino.com/liquidity',kind='live',mobile=False),
 dict(id='raydium-launchpad',url='https://raydium.io/launchpad',kind='live',mobile=True),
 dict(id='raydium-create',url='https://raydium.io/launchpad/create',kind='live',mobile=False),
 dict(id='raydium-pools',url='https://raydium.io/liquidity-pools/',kind='live',mobile=False),
 dict(id='meteora-pools',url='https://app.meteora.ag/',kind='live',mobile=True),
 dict(id='gmgn-radar',url='https://gmgn.ai/trade',kind='live',mobile=False),
 dict(id='nansen-smartmoney',url='https://app.nansen.ai/smart-money',kind='live',mobile=False),
 dict(id='zerion-wallets',url='https://app.zerion.io/wallets',kind='live',mobile=False),
 dict(id='solscan-activity',url='https://solscan.io/txs',kind='live',mobile=True),
 dict(id='realms-governance',url='https://app.realms.today/realms',kind='live',mobile=False),
 dict(id='jupiter-token',url='https://jup.ag/jup',kind='live',mobile=False),
 dict(id='nansen-doc-smartmoney',url='https://academy.nansen.ai/en/help/articles/2132837-smart-money-101',kind='documentation'),
 dict(id='nansen-doc-profiler',url='https://academy.nansen.ai/articles/0002013-nansen-profiler-101',kind='documentation'),
 dict(id='gmgn-doc-radar',url='https://docs.gmgn.ai/index/wallet-radar',kind='documentation'),
 dict(id='gmgn-doc-wallet',url='https://docs.gmgn.ai/index/wallet-detail-page',kind='documentation'),
 dict(id='jupiter-doc-swap',url='https://academy.jup.ag/lessons/jupiter-swap',kind='documentation'),
]
RESULTS=[]
async def save_doc_images(page,t,record):
    # Scroll normally to load lazily embedded official documentation screenshots.
    for frac in [.2,.45,.7,.95,0]:
        await page.evaluate('(f)=>window.scrollTo(0,document.body.scrollHeight*f)',frac)
        await page.wait_for_timeout(350)
    imgs=await page.locator('img').evaluate_all('(xs)=>xs.map(x=>({url:x.currentSrc||x.src,alt:x.alt,w:x.naturalWidth,h:x.naturalHeight})).filter(x=>x.w>=550&&x.h>=180)')
    record['documentationImages']=[]
    seen=set()
    for j,im in enumerate(imgs[:18]):
        if im['url'] in seen or not im['url'].startswith('https://'): continue
        seen.add(im['url'])
        try:
            res=await page.request.get(im['url'],timeout=20000)
            if not res.ok: continue
            content=await res.body(); mime=res.headers.get('content-type','')
            if not mime.startswith('image/') or len(content)>16000000: continue
            ext='.webp' if 'webp' in mime else '.jpg' if 'jpeg' in mime else '.png' if 'png' in mime else '.img'
            file=f'documentation/{t["id"]}-{j:02}{ext}'; (OUT/file).write_bytes(content)
            record['documentationImages'].append({**im,'file':file,'mime':mime,'bytes':len(content)})
        except Exception as e: record.setdefault('imageErrors',[]).append(str(e)[:180])
async def capture(browser,t,device):
    vp={'width':1440,'height':1000} if device=='desktop' else {'width':390,'height':844}
    ctx=await browser.new_context(viewport=vp,device_scale_factor=1,locale='en-US',color_scheme='light',is_mobile=device=='mobile',has_touch=device=='mobile',ignore_https_errors=False)
    if t['kind']=='pulp': await ctx.add_init_script("localStorage.setItem('pulp-white-theme','light');")
    page=await ctx.new_page(); errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)[:240]))
    rec={**t,'device':device,'viewport':vp,'capturedAt':datetime.now(timezone.utc).isoformat(),'signedIn':False,'walletConnected':False,'errors':errors}
    try:
        response=await page.goto(t['url'],wait_until='domcontentloaded',timeout=40000)
        rec['status']=response.status if response else None
        if t['kind']=='pulp':
            await page.locator('.b-main').wait_for(timeout=15000)
            await page.wait_for_timeout(1400)
            if t.get('tab'):
                btn=page.locator('[data-action="trade-tab"][data-value="'+t['tab']+'"]')
                if await btn.count(): await btn.click(); await page.wait_for_timeout(900)
        else:
            await page.wait_for_timeout(9500)
            # Dismiss only normal consent or welcome notices. Never a verification challenge.
            for pattern in ['Reject all','Reject All','Decline optional cookies','Necessary only','Only necessary','Got it']:
                b=page.get_by_role('button',name=pattern,exact=True)
                if await b.count()==1:
                    with contextlib.suppress(Exception): await b.click(timeout=1200)
        await page.evaluate('document.fonts.ready')
        rec['title']=await page.title();rec['finalUrl']=page.url
        body=await page.locator('body').inner_text(timeout=5000)
        rec['text']=body[:26000]
        rec['potentialBlock']=bool(re.search(r'verify you are human|checking your browser|access denied|sorry, you have been blocked|just a moment',body[:2500],re.I))
        rec['scrollWidth']=await page.evaluate('document.documentElement.scrollWidth')
        name=f'images/{t["id"]}-{device}.png'
        await page.screenshot(path=str(OUT/name),full_page=False,timeout=20000);rec['screenshot']=name
        if t['kind']=='pulp' or t['kind']=='documentation':
            full=f'images/{t["id"]}-{device}-full.png'
            await page.screenshot(path=str(OUT/full),full_page=True,timeout=20000);rec['fullScreenshot']=full
        if t['kind']=='documentation': await save_doc_images(page,t,rec)
        print(t['id'],device,rec['status'],rec['title'][:70],rec['potentialBlock'],flush=True)
    except Exception as e:
        rec['captureError']=str(e)[:1200]
        with contextlib.suppress(Exception):
            rec['finalUrl']=page.url; rec['text']=(await page.locator('body').inner_text(timeout=3000))[:8000]
            name=f'images/{t["id"]}-{device}-failure.png'
            await page.screenshot(path=str(OUT/name),timeout=6000);rec['failureScreenshot']=name
        print('FAILED',t['id'],device,str(e)[:160],flush=True)
    finally:
        RESULTS.append(rec)
        (OUT/'manifest.json').write_text(json.dumps({'date':datetime.now(timezone.utc).isoformat(),'commit':os.environ.get('GITHUB_SHA'),'method':'Unmodified Chromium viewport captures, no credentials or financial actions. Pulp served from same public/ UI. Official doc images are historical illustrations, not claimed live app sessions.','captures':RESULTS},indent=2,ensure_ascii=False))
        await ctx.close()
async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch()
        sem=asyncio.Semaphore(3)
        async def one(t,d):
            async with sem:await capture(browser,t,d)
        work=[]
        for t in TARGETS:
            work.append(one(t,'desktop'))
            if t.get('mobile'):work.append(one(t,'mobile'))
        await asyncio.gather(*work)
        await browser.close()
    server.shutdown()
asyncio.run(main())
