"""Optional offline Chromium QA of the actual Pages UI. No external traffic/funds."""
from pathlib import Path
import json,os,traceback
from playwright.sync_api import sync_playwright
from product_browser_support import boot,go,ROOT
OUT=ROOT/'docs/test-evidence/product';OUT.mkdir(parents=True,exist_ok=True)
SHOTS=ROOT/'previews/product';SHOTS.mkdir(parents=True,exist_ok=True)
checks=[];errors=[]
def ck(name,ok=True):
 if not ok:raise AssertionError(name)
 checks.append({'name':name,'pass':True})
ROUTES='home intelligence trade earn liquidity launchpad wallet-inspector portfolio activity token governance alerts strategies launch-planner launchlab settings connections billing account-security operations governance-onchain status help ui-kit visuals'.split()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('PULP_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1);page.set_default_timeout(4000);page.on('pageerror',lambda e:errors.append(str(e)))
 try:
  boot(page)
  for w in ([] if os.environ.get('PULP_INTERACTIONS_ONLY') else [320,390,430,768,1024,1440]):
   page.set_viewport_size({'width':w,'height':844 if w<700 else 1000})
   for r in ROUTES:
    go(page,r)
    d=page.evaluate('''()=>({width:document.documentElement.scrollWidth,main:!!document.querySelector('main'),broken:[...document.images].filter(i=>i.offsetWidth&&i.complete&&!i.naturalWidth).length})''')
    
    if d['width']>w+1 or d['broken']:print('LAYOUT FAILURE',r,w,d,flush=True)
    ck(f'{r} @ {w}: render, width, images',d['main'] and d['width']<=w+1 and not d['broken'])
    if r in 'home trade intelligence launchpad portfolio activity earn liquidity'.split() and w in [390,1440]:page.screenshot(path=str(SHOTS/f'{r}-{w}.png'),full_page=True)
   print('viewport',w,'checks',len(checks),'errors',errors,flush=True)
  page.set_viewport_size({'width':1440,'height':1000})
  def click(s):page.locator(s).first.click();page.wait_for_timeout(100)
  def fill(s,v):page.locator(s).fill(v);page.wait_for_timeout(100)
  def sel(s,v):page.select_option(s,v);page.wait_for_timeout(100)
  go(page,'intelligence');ck('Eight candidate rows',page.locator('.r-radar-table tbody tr').count()==8)
  fill('#radarQ','coral');ck('Radar search',page.locator('.r-radar-table tbody tr').count()==1)
  click('[data-action="ux-favorite"][data-kind="wallet"]');ck('Wallet favorite',page.locator('[data-action="ux-favorite"][aria-pressed="true"]').count()==1)
  click('[data-action="ux-save-view"]');ck('Saved radar view',page.locator('#radarSaved option').count()==2)
  click('[data-action="ux-profile"]');ck('Profile detail','Coral Flow' in page.locator('h1').inner_text())
  for tab in ['assets','events','method','overview']:
   click(f'[data-key="walletTab"][data-value="{tab}"]');ck('Wallet tab '+tab,page.locator(f'[data-key="walletTab"][data-value="{tab}"][aria-selected="true"]').count()==1)
  click('.r-back');ck('Return preserves search',page.locator('#radarQ').input_value()=='coral')
  fill('#radarQ','');click('[data-action="ux-only-favorites"]');ck('Favorite filter',page.locator('.r-radar-table tbody tr').count()==1);click('[data-action="ux-only-favorites"]')
  before=page.locator('.r-radar-table tbody tr td').nth(1).inner_text();click('[data-key="radarPeriod"][data-value="7d"]');ck('Window changes data',before!=page.locator('.r-radar-table tbody tr td').nth(1).inner_text())
  page.locator('[data-action="ux-compare-add"]').nth(0).click();page.wait_for_timeout(100);page.locator('[data-action="ux-compare-add"]').nth(1).click();page.wait_for_timeout(100)
  click('[data-action="ux-compare"]');ck('Compare dialog',page.locator('[role="dialog"]').count()==1);page.keyboard.press('Escape');ck('Escape closes dialog',page.locator('[role="dialog"]').count()==0)
  go(page,'earn');sel('#marketType','stable');ck('Stablecoin filter',page.locator('.r-table tbody tr').count()==2)
  click('.r-table [data-action="ux-favorite"]');click('[data-key="marketTab"][data-value="saved"]');ck('Market favorites',page.locator('.r-table tbody tr').count()==1)
  click('.r-table a.btn');ck('Market detail',page.locator('h1').inner_text().endswith('Lending'));fill('#market-amount','25');ck('Deposit stays blocked',page.locator('.r-action-panel button:enabled').count()==0);page.screenshot(path=str(SHOTS/'market-detail-1440.png'),full_page=True)
  go(page,'liquidity');sel('#poolType','CPMM');ck('CPMM filter',page.locator('.r-table tbody tr').count()==2);click('.r-table a.btn');ck('No range editor on CPMM',page.locator('.r-reserve-donut').count()==1 and page.locator('input[type="range"]').count()==0)
  click('[data-key="poolDetailTab"][data-value="positions"]');ck('Pool position tab',page.locator('[data-key="poolDetailTab"][aria-selected="true"]').inner_text()=='Mi posición')
  go(page,'liquidity?id=sol-jitosol');click('[data-key="poolDetailTab"][data-value="overview"]');ck('Concentrated pool capabilities honest','Integración pendiente' in page.inner_text('main') and page.locator('input[type="range"]').count()==0)
  go(page,'launchpad');ck('Six project identities',page.locator('.r-project-card').count()==6);sel('#projectStatus','curve');ck('Launch stage filter',page.locator('.r-project-card').count()==3)
  click('.r-project-open');ck('Project lifecycle',page.locator('.r-launch-milestones>div').count()==4);click('[data-action="ux-project-doc"]');ck('Project document',page.locator('[role="dialog"]').count()==1);page.keyboard.press('Escape')
  go(page,'launchpad');click('[data-action="ux-new-project"]');fill('#ux-launch-name','Mi proyecto QA');fill('#ux-launch-symbol','QA');fill('#ux-launch-supply','1000000');click('form[data-form="ux-launch"] button[type="submit"]');ck('Wizard identity step',page.locator('#ux-launch-community').count()==1)
  fill('#ux-launch-community','44');click('form[data-form="ux-launch"] button[type="submit"]');ck('Reject allocation 99 percent','100%' in page.locator('.r-form-errors').inner_text())
  fill('#ux-launch-community','45');click('form[data-form="ux-launch"] button[type="submit"]');ck('Accept allocation 100 percent',page.locator('#ux-launch-vesting').count()==1)
  click('form[data-form="ux-launch"] button[type="submit"]');ck('Wizard review','Revisión' in page.locator('.r-panel-head h2').first.inner_text());click('form[data-form="ux-launch"] button[type="submit"]');ck('Draft saved','Mi proyecto QA' in page.inner_text('main'))
  click('[data-action="ux-load-draft"]');ck('Reopen draft',page.locator('#ux-launch-name').input_value()=='Mi proyecto QA');go(page,'launchpad');click('[data-action="ux-delete-draft"]');ck('Delete confirmation',page.locator('[role="dialog"]').count()==1);click('[data-action="ux-delete-draft-confirm"]');ck('Delete local draft','Mi proyecto QA' not in page.inner_text('main'))
  go(page,'portfolio');click('[data-key="portfolioTab"][data-value="positions"]');ck('Separate DeFi positions',page.locator('.r-table tbody tr').count()==2);click('[data-key="portfolioTab"][data-value="assets"]');ck('Assets table',page.locator('.r-table tbody tr').count()==2)
  page.locator('[data-chart-values]').first.focus();page.keyboard.press('End');ck('Accessible chart values',page.locator('.r-chart-tip:not([hidden])').count()==1)
  go(page,'activity');sel('#eventType','swap');ck('Event kind filter',page.locator('.r-event').count()==2);sel('#eventStatus','failed');ck('Event state filter',page.locator('.r-event').count()==1);click('.r-event');ck('No fake explorer hash','No emitido' in page.locator('[role="dialog"]').inner_text());page.keyboard.press('Escape')
  go(page,'alerts');click('[data-action="ux-new-alert"]');fill('#v4-alert-label','Alerta de prueba');click('form[data-form="v4-alert"] button[type="submit"]');ck('Rule save closes dialog',page.locator('[role="dialog"]').count()==0);ck('Local rule listed','Alerta de prueba' in page.inner_text('main'))
  go(page,'strategies');click('[data-action="ux-new-strategy"]');fill('#v4-strategy-name','Plan QA');fill('#v4-strategy-maxDailyUsdc','1');click('form[data-form="v4-strategy"] button[type="submit"]');ck('Budget validation',page.locator('[role="dialog"]').count()==1);fill('#v4-strategy-maxDailyUsdc','30');click('form[data-form="v4-strategy"] button[type="submit"]');ck('Local strategy save','Plan QA' in page.inner_text('main') and page.locator('[role="dialog"]').count()==0)
  go(page,'settings');fill('#profile-name','Thiago');click('form[data-form="profile"] button[type="submit"]');ck('Local profile save',page.locator('#profile-name').input_value()=='Thiago')
  go(page,'trade');fill('#swap-amount','0.5');ck('Swap submission blocked',page.locator('form[data-form="swap"] button[type="submit"]').is_disabled());click('[data-action="token-picker"]');ck('Token selector explorable',page.locator('[role="dialog"]').count()==1);page.keyboard.press('Escape');ck('Wallet disabled',page.locator('[data-action="account"],[data-action="connect"]').first.is_disabled())
  result=page.evaluate("()=>{const w=new (window.__testLoad('/js/wallet.mjs').Wallets)();let denied=0;for(const n of ['connect','message','sign'])try{w[n]()}catch{denied++}return {wallets:w.list().length,denied}}");ck('Wallet driver inert',result=={'wallets':0,'denied':3})
  go(page,'ui-kit');ck('Shared component library',page.locator('.r-component-showcase').count()==1);click('[data-action="kit-modal"]');ck('UI kit dialog',page.locator('[role="dialog"]').count()==1);page.keyboard.press('Escape')
  page.set_viewport_size({'width':390,'height':844});go(page,'home');click('.b-mobile-menu');ck('Mobile drawer opens',page.locator('.b-sidebar[role="dialog"]').count()==1);page.keyboard.press('Escape');page.wait_for_timeout(100);ck('Mobile drawer closes',page.locator('.b-sidebar.open').count()==0)
  for r in ['wallet-inspector?id=orbit','earn?id=usdc-jupiter','liquidity?id=sol-usdc','liquidity?id=sol-jitosol','launchpad?id=orbita','launch-planner']:
   go(page,r);ck('Detail responsive '+r,page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
  page.set_viewport_size({'width':1440,'height':1000});go(page,'home')
  ck('Desktop task links have product styling',page.locator('.r-apps>a').first.evaluate("e=>getComputedStyle(e).textDecorationLine==='none'"))
  go(page,'launchpad');click('[data-key="projectTab"][data-value="discover"]');ck('Desktop project links have product styling',page.locator('.r-project-name a').first.evaluate("e=>getComputedStyle(e).textDecorationLine==='none'"))
  go(page,'home');click('[data-action="theme"]')
  for r in ['home','intelligence','trade','earn','liquidity','launchpad','portfolio','activity','settings']:
   go(page,r);ck('Dark theme '+r,page.evaluate("document.documentElement.dataset.theme==='dark'") and page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
  page.screenshot(path=str(SHOTS/'activity-dark-1440.png'),full_page=True);ck('No uncaught JS errors',not errors)
  print('PASS',len(checks),flush=True)
 except Exception:
  errors.append(traceback.format_exc());page.screenshot(path=str(SHOTS/'failure.png'),full_page=True);print(traceback.format_exc(),flush=True)
 finally:
  (OUT/'browser-results.json').write_text(json.dumps({'method':'Offline Chromium harness; real app modules/styles/assets; no network/funds. Not Safari or live deployment.','checks':checks,'errors':errors},ensure_ascii=False,indent=2));b.close()
if errors:raise SystemExit(1)
