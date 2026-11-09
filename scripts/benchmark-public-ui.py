"""Anonymous read-only browser captures. No user account, wallet, signature or transaction.
Normal public-interface entry notices are acknowledged only in ephemeral crawler sessions.
No challenge bypass, DOM removal or screenshot alteration.
"""
import asyncio,json,contextlib
from pathlib import Path
from datetime import datetime,timezone
from playwright.async_api import async_playwright
OUT=Path('.benchmark-captures');(OUT/'images').mkdir(parents=True,exist_ok=True)
targets=[('raydium-launchpad','https://raydium.io/launchpad'),('raydium-create','https://raydium.io/launchpad/create'),('raydium-pools','https://raydium.io/liquidity-pools/'),('meteora-pools','https://app.meteora.ag/'),('jupiter-earn','https://jup.ag/lend/earn'),('realms-governance','https://app.realms.today/realms')]
records=[]
async def capture(browser,item,mobile=False):
 ident,url=item;device='mobile' if mobile else 'desktop';vp={'width':390,'height':844} if mobile else {'width':1440,'height':1000}
 ctx=await browser.new_context(viewport=vp,device_scale_factor=1,color_scheme='light',locale='en-US',is_mobile=mobile,has_touch=mobile);p=await ctx.new_page();r={'id':ident,'url':url,'device':device,'viewport':vp,'capturedAt':datetime.now(timezone.utc).isoformat(),'kind':'live','signedIn':False,'walletConnected':False,'actions':[]}
 try:
  resp=await p.goto(url,wait_until='domcontentloaded',timeout=45000);r['status']=resp.status if resp else None;await p.wait_for_timeout(9000)
  if ident.startswith('raydium') and await p.get_by_role('button',name='Enter Raydium',exact=True).count():
   await p.get_by_text('Agree to terms',exact=True).click();await p.get_by_role('button',name='Enter Raydium',exact=True).click();r['actions'].append('Acknowledged public-interface entry notice in anonymous browser, no account/wallet')
  elif ident=='meteora-pools':
   b=p.get_by_role('button',name='Enter',exact=True)
   if await b.count():await b.click();r['actions'].append('Entered public interface through its normal welcome button')
  elif ident=='jupiter-earn':
   b=p.get_by_role('button',name='Accept and Continue',exact=True)
   if await b.count():await b.click();r['actions'].append('Acknowledged public-interface entry notice in anonymous browser, no account/wallet')
  elif ident=='realms-governance':
   b=p.get_by_role('button',name='Reject',exact=True)
   if await b.count():await b.click();r['actions'].append('Rejected optional new-version invitation')
  await p.wait_for_timeout(5000);r['finalUrl']=p.url;r['title']=await p.title();r['text']=(await p.locator('body').inner_text())[:30000]
  fn=f'images/{ident}-{device}.png';await p.screenshot(path=str(OUT/fn));r['screenshot']=fn
  if ident in ['raydium-create','meteora-pools']:
   fn=f'images/{ident}-{device}-full.png';await p.screenshot(path=str(OUT/fn),full_page=True);r['fullScreenshot']=fn
 except Exception as e:r['error']=str(e)[:600]
 finally:
  records.append(r);(OUT/'manifest.json').write_text(json.dumps({'method':'Unmodified screenshots of anonymous public UI; entry notices handled by visible controls. No personal accounts, no funds, no wallet.', 'captures':records},ensure_ascii=False,indent=2));print(ident,device,r.get('error'),r.get('actions'),flush=True);await ctx.close()
async def main():
 async with async_playwright() as pw:
  b=await pw.chromium.launch();sem=asyncio.Semaphore(2)
  async def run(t,m=False):
   async with sem:await capture(b,t,m)
  await asyncio.gather(*([run(t) for t in targets]+[run(t,True) for t in targets if t[0] in ['raydium-launchpad','meteora-pools','jupiter-earn']]))
  await b.close()
asyncio.run(main())
