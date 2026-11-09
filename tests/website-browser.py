"""Static marketing page preview + links/layout checks; no financial execution."""
import asyncio,json,re,traceback
from pathlib import Path
from playwright.async_api import async_playwright
from browser_assets import install_assets
ROOT=Path(__file__).resolve().parents[1]
checks=[];errors=[]

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
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  page=await b.new_page(viewport={'width':1440,'height':1040})
  html=(ROOT/'public/sitio.html').read_text()
  html=re.sub(r'<link[^>]+rel="stylesheet"[^>]+>','',html)
  css='\n'.join((ROOT/'public/css'/n).read_text() for n in ['tokens.css','components.css'])
  html=html.replace('</head>','<style>'+css+'</style></head>')
  await page.set_content(html)
  await install_assets(page,ROOT)
  await page.wait_for_timeout(200)
  for w in [320,390,768,1440,1920]:
   await page.set_viewport_size({'width':w,'height':1040 if w>800 else 844});await page.wait_for_timeout(100)
   width=await page.evaluate('document.documentElement.scrollWidth')
   assert width<=w+1,(w,width)
   checks.append({'name':f'Presentation page fits {w}px','pass':True})
  await page.set_viewport_size({'width':1440,'height':1040});await save_shot(page,path=str(ROOT/'previews/15-sitio-desktop.webp'),full_page=True,type='webp',quality=85)
  await page.set_viewport_size({'width':390,'height':844});await save_shot(page,path=str(ROOT/'previews/sitio-mobile.webp'),full_page=True,type='webp',quality=85)
  assert await page.locator('img').evaluate_all('(els)=>els.every(e=>e.complete&&e.naturalWidth>0)')
  checks.append({'name':'All website assets load locally','pass':True})
  for href in await page.locator('a[href]').evaluate_all('(els)=>els.map(e=>e.getAttribute("href"))'):
   assert href.startswith('#') or href.startswith('index.html#/') or href=='sitio.html' or (href=='alcance.html' and (ROOT/'public/alcance.html').exists()),href
  checks.append({'name':'CTAs lead to actual routes or sections; no empty destinations','pass':True})
  await b.close()
try:asyncio.run(main())
except Exception:errors.append(traceback.format_exc());print(errors[-1])
finally:
 (ROOT/'docs/test-evidence/website-results.json').write_text(json.dumps({'checks':checks,'errors':errors},ensure_ascii=False,indent=2));print('WEBSITE',len(checks),len(errors))
if errors:raise SystemExit(1)
