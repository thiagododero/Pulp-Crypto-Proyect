"""Test-only asset embedding for browsers where localhost navigation is blocked."""
import base64,re
from pathlib import Path
MIME={'.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'}
def asset_url(p):return 'data:'+MIME[p.suffix]+';base64,'+base64.b64encode(p.read_bytes()).decode()
def inline_css(root):
 css='\n'.join((root/'public/css'/f).read_text() for f in ['tokens.css','components.css','app.css','v4.css'])
 def sub(m):
  rel=m.group(1);p=root/'public'/rel.removeprefix('../')
  return 'url("'+asset_url(p)+'")' if p.is_file() else m.group(0)
 return re.sub(r'url\([\'"]?(\.\./assets/[^\)\'\"]+)[\'"]?\)',sub,css)
async def install_assets(page,root):
 assets={str(p.relative_to(root/'public')):asset_url(p) for p in (root/'public/assets').rglob('*') if p.is_file() and p.suffix in MIME}
 await page.evaluate('''assets=>{window.__testAssets=assets;const fix=()=>{document.querySelectorAll('img[src]').forEach(img=>{const src=img.getAttribute('src');if(assets[src])img.src=assets[src];});};new MutationObserver(fix).observe(document.body,{childList:true,subtree:true});fix();}''',assets)
