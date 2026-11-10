"""Linux shell check for the shipped Mac launch scripts. Does not replace a Mac test."""
import os,subprocess,tempfile,pathlib,socket,time,json,urllib.request,signal,shutil
ROOT=pathlib.Path(__file__).resolve().parents[1]
checks=[]
with tempfile.TemporaryDirectory(prefix='pulp-white-shell-') as tmp:
 tmp=pathlib.Path(tmp);bin=tmp/'bin';bin.mkdir()
 (bin/'xdg-open').write_text('#!/bin/sh\nprintf "%s" "$1" > "$PULP_OPEN_LOG"\n');(bin/'xdg-open').chmod(0o755)
 for name,suffix in [('Abrir.command','/'),('Abrir-UI-Kit.command','/#/ui-kit'),('Abrir-Web.command','/sitio.html')]:
  sock=socket.socket();sock.bind(('127.0.0.1',0));port=sock.getsockname()[1];sock.close()
  log=tmp/(name+'.open');data=tmp/(name+'.data');out=tmp/(name+'.log')
  env={**os.environ,'PULP_NODE':shutil.which('node'),'PORT':str(port),'PULP_DATA_DIR':str(data),'PULP_OPEN_LOG':str(log),'PATH':str(bin)+':'+os.environ['PATH']}
  with out.open('w') as output:
   proc=subprocess.Popen(['bash',str(ROOT/name)],cwd=ROOT,env=env,stdout=output,stderr=subprocess.STDOUT,start_new_session=True)
   try:
    ready=False
    for attempt in range(100):
     try:
      with urllib.request.urlopen(f'http://127.0.0.1:{port}/api/health',timeout=.3) as r:
       health=json.load(r);ready=health.get('version')=='4.2.0-beta.1'
      if ready and log.exists():break
     except Exception:pass
     time.sleep(.05)
    assert ready,(name,out.read_text())
    assert log.read_text()==f'http://127.0.0.1:{port}'+suffix,(name,log.read_text())
    checks.append({'name':name+' opens correct URL','pass':True})
    with urllib.request.urlopen(f'http://127.0.0.1:{port}/'+('sitio.html' if name=='Abrir-Web.command' else ''),timeout=2) as r:assert r.status==200
    checks.append({'name':name+' serves the expected local page','pass':True})
   finally:
    try:os.killpg(proc.pid,signal.SIGTERM)
    except ProcessLookupError:pass
    try:proc.wait(timeout=3)
    except subprocess.TimeoutExpired:os.killpg(proc.pid,signal.SIGKILL)
(ROOT/'docs/test-evidence/shell-launcher-results.json').write_text(json.dumps({'scope':'Bash and Node on Linux with a stub browser opener. Not physical macOS validation.','checks':checks},indent=2))
print('SHELL CHECKS',len(checks),'PASS')
