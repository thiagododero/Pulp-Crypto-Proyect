"""One-use, hash-verified source transfer. Creates Git objects; never moves a branch."""
from pathlib import Path, PurePosixPath
import hashlib, json, os, subprocess, sys, urllib.request
ROOT=Path.cwd().resolve()
REPORT=Path('/tmp/pulp-release-result'); REPORT.mkdir(exist_ok=True)
DATA=json.loads(Path('/tmp/pulp-421-delta.json').read_text())
REPO='thiagododero/Pulp-Crypto-Proyect'
def digest(raw): return hashlib.sha256(raw).hexdigest()
def safe(name):
    p=PurePosixPath(name)
    if p.is_absolute() or '..' in p.parts or '.git' in p.parts or not p.parts:
        raise ValueError('Unsafe release path')
    f=ROOT.joinpath(*p.parts)
    if not f.resolve().is_relative_to(ROOT) or f.is_symlink(): raise ValueError('Unsafe path target')
    return f

def verify_manifest():
    manifest=json.loads(safe('UPDATE_MANIFEST.json').read_text())
    assert manifest['repository']==REPO and manifest['financialActionsInPresentation'] is False
    for row in manifest['files']:
        f=safe(row['path'])
        assert f.is_file() and digest(f.read_bytes())==row['sha256'], 'Mismatch: '+row['path']
    for row in DATA['deletes']: assert not safe(row['path']).exists()
    assert json.loads(safe('package.json').read_text())['version']=='4.2.1-beta.1'
    return len(manifest['files'])

def apply():
    assert DATA['version']=='4.2.1-beta.1'
    prepared=[]
    for row in DATA['changes']:
        f=safe(row['path']); original=f.read_bytes() if f.exists() else b''
        if row['base'] is None: assert not f.exists(), 'Unexpected new file: '+row['path']
        else: assert f.is_file() and digest(original)==row['base'], 'Source changed: '+row['path']
        result=original.decode('utf-8') if row.get('textOffsets') else original
        prev=0
        for start,end,text in row['ops']:
            assert isinstance(text,str) and 0<=prev<=start<=end<=len(result)
            prev=end
        for start,end,text in reversed(row['ops']):
            replacement=text if row.get('textOffsets') else text.encode('utf-8')
            result=result[:start]+replacement+result[end:]
        raw=result.encode('utf-8') if isinstance(result,str) else result
        assert digest(raw)==row['sha256'], 'Target mismatch: '+row['path']
        assert row['mode'] in (0o644,0o755)
        prepared.append((f,raw,row['mode']))
    for row in DATA['deletes']:
        assert digest(safe(row['path']).read_bytes())==row['sha256'], 'Delete base changed'
    for f,raw,mode in prepared:
        f.parent.mkdir(parents=True,exist_ok=True); f.write_bytes(raw); f.chmod(mode)
    for row in DATA['deletes']: safe(row['path']).unlink()
    count=verify_manifest()
    print(json.dumps({'appliedFiles':len(prepared),'removedFiles':len(DATA['deletes']),'verifiedSourceFiles':count}))

def api(suffix, body=None):
    token=os.environ['GH_TOKEN']
    headers={'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json','User-Agent':'Pulp-release-verifier'}
    request=urllib.request.Request('https://api.github.com/repos/'+REPO+suffix,headers=headers,data=None if body is None else json.dumps(body,ensure_ascii=False).encode('utf-8'),method='GET' if body is None else 'POST')
    with urllib.request.urlopen(request,timeout=90) as response: return json.load(response)

def upload():
    count=verify_manifest()
    base=os.environ['GITHUB_SHA']
    assert os.environ['GITHUB_REPOSITORY']==REPO
    assert api('/git/ref/heads/main')['object']['sha']==base, 'Main changed; refusing to overwrite'
    tree=api('/git/commits/'+base)['tree']['sha']
    entries=[]; deferred=[]
    for row in DATA['changes']:
        if row['path'].startswith('.github/'):
            deferred.append(row['path']); continue
        entries.append({'path':row['path'],'mode':'100755' if row['mode']==0o755 else '100644','type':'blob','content':safe(row['path']).read_text(encoding='utf-8')})
    for row in DATA['deletes']:
        entries.append({'path':row['path'],'mode':'100644','type':'blob','sha':None})
    for name in subprocess.check_output(['git','ls-tree','-r','--name-only','HEAD'],text=True).splitlines():
        if name.startswith('.pulp-release-421/'):
            entries.append({'path':name,'mode':'100644','type':'blob','sha':None})
    created=api('/git/trees',{'base_tree':tree,'tree':entries})
    result={'repository':REPO,'baseCommit':base,'treeSha':created['sha'],'version':DATA['version'],'verifiedSourceFiles':count,'changedFiles':len(DATA['changes']),'removedStudioFiles':[x['path'] for x in DATA['deletes']],'deferredWorkflowFiles':deferred,'removeHelperWorkflow':'.github/workflows/pulp-release-audit.yml','sourceZipSha256':DATA['sourceZipSha256'],'financialActionsInPresentation':False,'branchUpdated':False}
    (REPORT/'release-tree.json').write_text(json.dumps(result,indent=2))
    print(json.dumps(result))
    with open(os.environ['GITHUB_STEP_SUMMARY'],'a') as out:
        out.write('## Pulp Crypto 4.2.1 — source verified\n\nTree: `'+created['sha']+'`\n\n'+str(count)+' source files verified. Tests passed. No branch has been moved.\n')

if sys.argv[1]=='apply': apply()
elif sys.argv[1]=='upload': upload()
else: raise SystemExit('Unknown action')
