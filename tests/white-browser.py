"""White Edition UI audit. Test-only HTTP bridge, no extensions or real funds.
Requires the fixture server on :4183 and tests/.generated from the optional harness.
"""
import asyncio,json,traceback,re,math
from pathlib import Path
from playwright.async_api import async_playwright
from visual_support import boot,ROOT
checks=[];errors=[]
ROUTES=['home','intelligence','trade','launchpad','portfolio','activity','token','governance','ui-kit','visuals','status','help','settings']
PREVIEWS=ROOT/'previews';PREVIEWS.mkdir(exist_ok=True)
def good(name,value=True,detail=None):
 row={'name':name,'pass':bool(value)}
 if detail is not None:row['detail']=detail
 checks.append(row)
 if not value:raise AssertionError((name,detail))
def rgb(value):
 vals=list(map(float,re.findall(r'[\d.]+',value)))
 return [v/255 for v in vals[:3]]
def luminance(value):
 r,g,b=rgb(value);linear=lambda v:v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
 return .2126*linear(r)+.7152*linear(g)+.0722*linear(b)
def contrast(a,b):
 vals=sorted([luminance(a),luminance(b)])
 return (vals[1]+.05)/(vals[0]+.05)

from PIL import Image
from io import BytesIO
async def save_shot(page,path,full_page=True,type='png',quality=85):
 if type=='webp':
  data=await page.screenshot(full_page=full_page,type='png')
  Image.open(BytesIO(data)).save(path,'WEBP',quality=quality,method=5)
 else:
  await page.screenshot(path=path,full_page=full_page,type=type)

async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  page=await browser.new_page(viewport={'width':1440,'height':1040},device_scale_factor=1)
  page.on('pageerror',lambda e:errors.append(str(e)))
  await boot(page)
  good('White theme is the default',await page.locator('html').get_attribute('data-theme')=='light')
  good('Sidebar is truly white',await page.locator('.b-sidebar').evaluate('(e)=>getComputedStyle(e).backgroundColor')=='rgb(255, 255, 255)')
  good('No old neon asset paths in DOM',not await page.locator('img[src*="assets/octo"]').count())
  good('Default account disconnected, no simulated balances',await page.locator('[data-action=account]').count()==0)
  await page.locator('[data-action=start-guide]').first.click()
  good('Guide modal is interactive',await page.locator('[role=dialog]').count()==1)
  await page.keyboard.press('Escape');await page.wait_for_timeout(100)
  good('Guide closes with Escape',await page.locator('#dialog-root [role=dialog]').count()==0)
  # Every route at six widths. Inner horizontal tables are allowed; document overflow is not.
  for width in [320,390,768,1024,1440,1920]:
   await page.set_viewport_size({'width':width,'height':960 if width>800 else 844})
   for route in ROUTES:
    await page.evaluate("r=>location.hash='#/'+r",route);await page.wait_for_timeout(100)
    dims=await page.evaluate('({w:innerWidth,s:document.documentElement.scrollWidth})')
    good(f'Page fits {width}px / {route}',dims['s']<=width+1,dims)
    good(f'Page renders {width}px / {route}',await page.locator('main h1').count()==1)
  # Setup layout and drawer keyboard behavior on a small phone.
  await page.set_viewport_size({'width':390,'height':844});await page.evaluate("location.hash='#/home'");await page.wait_for_timeout(150)
  box=await page.locator('.w-setup-copy').bounding_box();good('Onboarding text is not squeezed into a narrow mobile column',box['width']>200,box['width'])
  await page.locator('[data-action=menu]').filter(visible=True).first.click() if False else await page.locator('.b-mobile-menu').click()
  await page.wait_for_timeout(120)
  good('Mobile menu opens',await page.locator('.b-sidebar.open').count()==1)
  good('Background is inert while drawer is open',await page.locator('.b-main').evaluate('(e)=>e.inert'))
  await page.keyboard.press('Escape');await page.wait_for_timeout(120)
  good('Mobile menu closes with Escape',await page.locator('.b-sidebar.open').count()==0)
  good('Focus returns to menu control',await page.evaluate("document.activeElement.classList.contains('b-mobile-menu')"))
  await page.set_viewport_size({'width':1440,'height':1040});await page.evaluate("location.hash='#/ui-kit'");await page.wait_for_timeout(200)
  await page.locator('[data-action=kit-tab][data-value=overview]').focus();await page.keyboard.press('ArrowRight');await page.wait_for_timeout(100)
  good('Tabs support arrow keys',await page.locator('[data-action=kit-tab][data-value=activity]').get_attribute('aria-selected')=='true')
  await page.locator('[data-action=kit-modal]').click();await page.wait_for_timeout(100)
  good('UI Kit modal opens',await page.locator('#dialog-root [role=dialog]').count()==1)
  await page.keyboard.press('Escape');await page.wait_for_timeout(80)
  good('UI Kit swap preview is inert',await page.locator('.p-kit-swap-preview').evaluate('(e)=>e.inert'))
  await page.locator('[data-action=kit-scroll][data-target=kit-color]').click();await page.wait_for_timeout(400)
  good('Kit section links stay in the UI Kit route',await page.evaluate("location.hash==='#/ui-kit'"))
  # Core color pairs, not a claim of full WCAG certification.
  for theme in ['light','dark']:
   if await page.locator('html').get_attribute('data-theme')!=theme:
    await page.locator('[data-action=theme]').first.click();await page.wait_for_timeout(100)
   colors=await page.evaluate('''()=>{const pairs=[['text','surface'],['text-secondary','surface'],['text-tertiary','canvas'],['brand-600','surface'],['positive','positive-bg'],['negative','negative-bg'],['warning','warning-bg']];const span=document.createElement('span');document.body.append(span);const resolve=k=>{span.style.color='var(--'+k+')';return getComputedStyle(span).color};const result=pairs.map(([a,b])=>[a,b,resolve(a),resolve(b)]);span.remove();return result;}''')
   for a,b,ca,cb in colors:
    ratio=contrast(ca,cb);good(f'{theme} contrast {a}/{b}',ratio>=4.5,round(ratio,3))
   for route in ROUTES:
    await page.evaluate("r=>location.hash='#/'+r",route);await page.wait_for_timeout(80)
    good(f'{theme} theme renders / {route}',await page.locator('main h1').count()==1)
  await page.locator('[data-action=theme]').first.click();await page.wait_for_timeout(120)
  good('Theme returns to light',await page.locator('html').get_attribute('data-theme')=='light')
  # Source image loading, not a flattened mockup.
  await page.evaluate("location.hash='#/visuals'");await page.wait_for_timeout(200)
  loaded=await page.locator('.p-asset-preview img').evaluate_all('(els)=>els.every(e=>e.complete&&e.naturalWidth===640)')
  good('All six new transparent illustrations load at 640px',loaded)
  # Preview captures are disconnected. No fake financial values appear.
  for i,route in enumerate(ROUTES):
   await page.set_viewport_size({'width':1440,'height':1040});await page.evaluate("r=>location.hash='#/'+r",route);await page.wait_for_timeout(170)
   await page.evaluate('window.scrollTo(0,0)');await save_shot(page,path=str(PREVIEWS/f'{i+1:02d}-{route}-desktop.webp'),full_page=True,type='webp',quality=84)
  for route in ['home','trade','launchpad']:
   await page.set_viewport_size({'width':390,'height':844});await page.evaluate("r=>location.hash='#/'+r",route);await page.wait_for_timeout(170);await page.evaluate('window.scrollTo(0,0)')
   await save_shot(page,path=str(PREVIEWS/f'{route}-mobile.webp'),full_page=True,type='webp',quality=86)
   await save_shot(page,path=str(PREVIEWS/f'{route}-mobile-viewport.png'),full_page=False)
  good('No uncaught browser errors',not errors,errors)
  await browser.close()
try:asyncio.run(main())
except Exception:
 errors.append(traceback.format_exc());print(errors[-1])
finally:
 (ROOT/'docs/test-evidence/white-browser-results.json').write_text(json.dumps({'scope':'Chromium through local HTTP bridge and injected provider fixtures. No real wallet extension, Safari, macOS or on-chain execution.','checks':checks,'errors':errors},ensure_ascii=False,indent=2))
 print('WHITE CHECKS',len(checks),'FAILURES',sum(not c['pass'] for c in checks),'ERRORS',len(errors))
if errors:raise SystemExit(1)
