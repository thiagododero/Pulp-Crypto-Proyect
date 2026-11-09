"""Browser UI tests with injected local transport, due browser navigation policy.
No real wallets, external providers, funds or transactions are used.
"""
import asyncio,json,base64,urllib.request,urllib.error,http.cookiejar,os,traceback
from pathlib import Path
from playwright.async_api import async_playwright
from browser_assets import inline_css,install_assets
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding,PublicFormat
ROOT=Path(__file__).resolve().parents[1]
PORT=4183
base=f'http://127.0.0.1:{PORT}'
jar=http.cookiejar.CookieJar();opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
checks=[];errors=[]
priv=Ed25519PrivateKey.generate();pub=priv.public_key().public_bytes(Encoding.Raw,PublicFormat.Raw)
async def bridge(url, options=None):
    options=options or {};headers=dict(options.get('headers') or {});headers['Origin']=base
    body=options.get('body');req=urllib.request.Request(base+'/'+url.lstrip('/'),data=body.encode() if body else None,headers=headers,method=options.get('method','GET'))
    def fetch():
        try:
            with opener.open(req,timeout=90) as r:return {'status':r.status,'body':r.read().decode(),'headers':dict(r.headers)}
        except urllib.error.HTTPError as r:return {'status':r.code,'body':r.read().decode(),'headers':dict(r.headers)}
    return await asyncio.to_thread(fetch)
async def sign_bytes(data):return list(priv.sign(bytes(data)))
async def check(label,fn):
    try:
        await fn();checks.append({'name':label,'pass':True})
    except Exception as e:
        checks.append({'name':label,'pass':False,'error':str(e)});print('FAIL',label,str(e));raise
async def main():
  async with async_playwright() as p:
    browser=await p.chromium.launch(executable_path=os.environ.get('PULP_CHROMIUM') or '/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=await browser.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1)
    page.on('pageerror',lambda e:errors.append(str(e)))
    await page.expose_function('__testHTTP',bridge)
    await page.expose_function('__testSign',sign_bytes)
    css=inline_css(ROOT)
    await page.set_content('<html lang="es"><head><meta charset="utf-8"><style>'+css+'</style></head><body><div id="app"></div><div id="dialog-root"></div><div id="toast-root" role="status" aria-live="polite"></div><input id="test_marker" type="hidden" value="MOCK DATA TEST ONLY"></body></html>')
    await page.evaluate("""() => {window.fetch=async(url,options={})=>{const r=await window.__testHTTP(String(url),options);return new Response(r.body,{status:r.status,headers:r.headers});};if(!crypto.randomUUID)crypto.randomUUID=()=> 'ui-'+Math.random().toString(16).slice(2);window.__localStorage={};try{void localStorage;}catch{Object.defineProperty(window,'localStorage',{value:{getItem:k=>window.__localStorage[k],setItem:(k,v)=>window.__localStorage[k]=String(v)}});}}""")
    await install_assets(page,ROOT)
    await page.add_script_tag(content=(ROOT/'tests/.generated/components.js').read_text())
    await page.add_script_tag(content=(ROOT/'tests/.generated/bundle.js').read_text())
    await page.wait_for_timeout(900)
    print('Early JS errors:',errors)
    await page.wait_for_selector('main',timeout=5000)
    await page.wait_for_timeout(800)
    checks.append({'name':'Initial render','pass':True})
    print('initial errors',errors)
    # Register a test-only Wallet Standard provider that signs using an ephemeral test key.
    await page.evaluate("""pub=>{const sol=window.__testSolana,account={address:sol.b58encode(Uint8Array.from(pub)),publicKey:Uint8Array.from(pub),chains:['solana:mainnet','solana:devnet'],features:['solana:signMessage','solana:signTransaction']};window.__testOwner=account.address;const wallet={version:'1.0.0',name:'TEST ONLY Wallet',icon:'',chains:account.chains,accounts:[account],features:{'standard:connect':{version:'1.0.0',connect:async()=>({accounts:[account]})},'standard:disconnect':{version:'1.0.0',disconnect:async()=>{}},'standard:events':{version:'1.0.0',on:()=>()=>{}},'solana:signMessage':{version:'1.0.0',signMessage:async(...inputs)=>Promise.all(inputs.map(async i=>({signedMessage:i.message,signature:Uint8Array.from(await window.__testSign(Array.from(i.message))),signatureType:'ed25519'})))},'solana:signTransaction':{version:'1.0.0',supportedTransactionVersions:['legacy',0],signTransaction:async(...inputs)=>Promise.all(inputs.map(async i=>{const parsed=sol.parseTransaction(i.transaction),sig=Uint8Array.from(await window.__testSign(Array.from(parsed.message)));return {signedTransaction:sol.withSignature(i.transaction,account.address,sig)};}))}}};window.dispatchEvent(new CustomEvent('wallet-standard:register-wallet',{detail:app=>app.register(wallet)}));}""",list(pub))
    await page.locator('[data-action="connect"]').first.click()
    await page.locator('[data-action="connect-provider"]').click()
    await page.wait_for_function("!document.querySelector('[data-action=connect-provider]') && document.querySelector('[data-action=account]')")
    await page.wait_for_timeout(500)
    checks.append({'name':'Wallet Standard connection + Ed25519 login + session','pass':True})
    print('connected OK')
    async def good(name,condition=True):
      assert condition,name
      checks.append({'name':name,'pass':True})
    async def route(r):
      await page.evaluate("r=>location.hash='#/'+r",r);await page.wait_for_timeout(300)
    routes=['intelligence','wallet-inspector','alerts','strategies','liquidity','launch-planner','launchlab','governance-onchain','billing','account-security','operations']
    for width in [390,768,1440]:
      await page.set_viewport_size({'width':width,'height':950})
      for r in routes:
        await route(r)
        await good('v4 route '+r+' at '+str(width),await page.locator('main h1').count()==1)
        dims=await page.evaluate('({w:innerWidth,d:document.documentElement.scrollWidth})')
        await good('v4 no page overflow '+r+' at '+str(width),dims['d']<=width+2)
        await good('v4 no undefined text '+r+' at '+str(width),'undefined' not in await page.locator('main').inner_text())
    await page.set_viewport_size({'width':1440,'height':1040})
    await route('alerts')
    await page.locator('form[data-form="v4-alert"] input[name="label"]').fill('Test wallet alert')
    await page.locator('form[data-form="v4-alert"] input[name="address"]').fill(await page.evaluate('window.__testOwner'))
    await page.locator('form[data-form="v4-alert"] button[type=submit]').click();await page.wait_for_timeout(450)
    await good('Alert persists via real HTTP backend',await page.locator('main table').get_by_text('Test wallet alert',exact=True).count()==1)
    await page.locator('[data-action="v4-test-notification"]').click();await page.wait_for_timeout(350)
    await good('Inbox notification persisted',await page.get_by_text('Esta es tu prueba de notificaciones.',exact=True).count()==1)
    await route('strategies')
    await page.locator('form[data-form="v4-strategy"] input[name="name"]').fill('Test recurring')
    await page.locator('form[data-form="v4-strategy"] select[name="kind"]').select_option('dca')
    await page.locator('form[data-form="v4-strategy"] input[name="outputMint"]').fill('So11111111111111111111111111111111111111112')
    await page.locator('form[data-form="v4-strategy"] button[type=submit]').click();await page.wait_for_timeout(400)
    await good('Assisted DCA saved, not signed automatically',await page.locator('main table').get_by_text('Test recurring',exact=True).count()==1 and await page.locator('[role=dialog]').count()==0)
    await route('billing');await page.locator('[data-action="v4-invoice-create"][data-plan="pro"]').click();await page.wait_for_timeout(350)
    await good('Invoice creation does not request a financial signature',await page.locator('[data-action="v4-invoice-pay"]').count()==1 and await page.locator('[role=dialog]').count()==0)
    await route('governance-onchain')
    await page.locator('[data-action="v4-gov-detail"]').first.click();await page.wait_for_timeout(350)
    await good('Squads proposal shows a decoded payment before any vote',await page.get_by_text('0.1 SOL',exact=True).count()>0)
    await route('launchlab')
    await good('LaunchLab configuration is decoded from injected RPC accounts',await page.get_by_text('TEST FIXTURE',exact=True).count()>0)
    await good('LaunchLab has real preparation forms',await page.locator('form[data-form="v4-launchlab-create"]').count()==1 and await page.locator('form[data-form="v4-launchlab-trade"]').count()==1)
    await good('Official token exclusion visible', 'PULP oficial permanece sin emitir' in await page.locator('main').inner_text())
    # Screenshots are transparent test evidence, not claimed live data.
    await page.evaluate("()=>{const b=document.createElement('div');b.id='test-watermark';b.textContent='ENTORNO DE PRUEBAS · PROVEEDORES Y WALLET DE TEST · NO FONDOS REALES';b.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:999999;background:#211a2e;color:white;font:11px sans-serif;padding:7px;text-align:center';document.body.appendChild(b)}")
    (ROOT/'previews/v4').mkdir(parents=True,exist_ok=True)
    for r in ['home','intelligence','trade','alerts','strategies','launchlab','liquidity','billing','operations','ui-kit']:
      await route(r);await page.screenshot(path=ROOT/'previews/v4'/f'{r}-desktop.png',full_page=True)
    await page.set_viewport_size({'width':390,'height':844});await route('intelligence');await page.screenshot(path=ROOT/'previews/v4/intelligence-mobile.png',full_page=True)
    await good('No uncaught browser errors',not errors)
    await browser.close()
try:asyncio.run(main())
except Exception as e:
    errors.append(traceback.format_exc());print(traceback.format_exc())
finally:
    (ROOT/'docs/test-evidence/v4-browser-results.json').write_text(json.dumps({'transport':'Browser test harness; local HTTP bridge; ephemeral Wallet Standard mock; injected remote provider fixtures; no mainnet execution.','checks':checks,'errors':errors},indent=2,ensure_ascii=False))
    print('CHECKS',len(checks),'ERRORS',len(errors))

if errors:
    raise SystemExit(1)
