"""Crypto-only navigation regression. Offline Chromium; no accounts, network or funds."""
import json,os,re
from pathlib import Path
from playwright.sync_api import sync_playwright
from product_browser_support import boot,go,ROOT
checks=[];errors=[]
OUT=ROOT/'docs/test-evidence/product';OUT.mkdir(exist_ok=True,parents=True)
SHOTS=ROOT/'previews/crypto';SHOTS.mkdir(exist_ok=True,parents=True)
def ck(name,ok):
    if not ok:raise AssertionError(name)
    checks.append({'name':name,'pass':True})
routes='home intelligence trade earn liquidity launchpad wallet-inspector portfolio activity token governance alerts strategies launch-planner launchlab settings connections billing account-security operations governance-onchain status help ui-kit visuals'.split()
with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path=os.environ.get('PULP_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    page=b.new_page(viewport={'width':1440,'height':1000});page.on('pageerror',lambda e:errors.append(str(e)))
    try:
        boot(page)
        for width in [390,1440]:
            page.set_viewport_size({'width':width,'height':844 if width==390 else 1000})
            for route in routes:
                go(page,route)
                ck(f'{route} @ {width} renders without creative product or overflow', bool(page.locator('main').count()) and not re.search(r'AI Studio|Launch Studio|estudio creativo|moodboard',page.inner_text('body'),re.I) and page.evaluate('document.documentElement.scrollWidth <= innerWidth+1') and page.evaluate("[...document.images].filter(i=>i.offsetWidth&&i.complete&&!i.naturalWidth).length===0"))
            go(page,'home');page.screenshot(path=str(SHOTS/f'home-{width}.png'),full_page=True)
        go(page,'studio');ck('Retired URL normalizes to home',page.evaluate('location.hash')=='#/home' and page.locator('.p-route[data-route="home"]').count()==1)
        page.locator('[data-action="search"]').first.click();page.wait_for_timeout(100)
        page.locator('#search-q').fill('Studio');page.wait_for_timeout(180)
        ck('Global search has no retired module',page.locator('[data-action="go"][data-route="studio"]').count()==0)
        page.keyboard.press('Escape')
        go(page,'launch-planner');ck('Crypto launch planner remains', page.locator('form[data-form="ux-launch"]').count()==1 and 'Plan de lanzamiento' in page.locator('.b-breadcrumb').inner_text())
        go(page,'trade');ck('Financial actions remain disabled',page.locator('[data-action="connect"],[data-action="account"]').first.is_disabled() and page.locator('form[data-form="swap"] button[type="submit"]').is_disabled())
        page.set_viewport_size({'width':390,'height':844});go(page,'home');page.locator('.b-mobile-menu').click();page.wait_for_timeout(100)
        for name in ['Crear','Comunidad','Recursos']:
            el=page.locator('summary',has_text=name)
            if el.count() and not el.evaluate('e=>e.parentElement.open'):el.click()
        ck('Mobile drawer has no Studio link', page.locator('a[href="#/studio"]').count()==0)
        page.screenshot(path=str(SHOTS/'menu-390.png'))
        page.keyboard.press('Escape');ck('No uncaught errors',not errors)
        print('PASS',len(checks),flush=True)
    except Exception as exc:
        errors.append(str(exc));raise
    finally:
        (OUT/'crypto-browser.json').write_text(json.dumps({'method':'Offline Chromium; actual modules/styles/assets; no network. Not Safari or remote deployment.','checks':checks,'errors':errors},ensure_ascii=False,indent=2));b.close()
