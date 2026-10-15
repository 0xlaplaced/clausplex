"""Package tracked corresponding source; never collect local work or test logs."""
from pathlib import Path
import argparse, base64, hashlib, json, subprocess, zipfile
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,default=ROOT/'build/source');args=p.parse_args();out=args.output.resolve();out.mkdir(parents=True,exist_ok=True)
tracked=subprocess.check_output(['git','ls-files','-z'],cwd=ROOT).decode().split('\0')
files=[f for f in tracked if f and not f.startswith('docs/') and f not in {'backend/engine.cjs','assets/screenshot.jpg'}]
with zipfile.ZipFile(out/'source.zip','w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for name in files:
  info=zipfile.ZipInfo('clausplex/'+name,date_time=(2026,10,15,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,(ROOT/name).read_bytes())
b=(out/'source.zip').read_bytes();digest=hashlib.sha256(b).hexdigest();site=out/'source-site';site.mkdir(exist_ok=True)
page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Clausplex corresponding source</title><style>body{max-width:48rem;margin:6rem auto;padding:1.5rem;background:#fff2d8;color:#151513;font:17px/1.6 system-ui}code{overflow-wrap:anywhere}a{color:inherit}</style><h1>Clausplex Part I — verified times</h1><p>Corresponding C source, UI, original levels 1–37, solution recordings, verifier source and build instructions. See BUILD.txt and README.md to rebuild both engines. Credentials are not included.</p><p><a download="clausplex-source.zip" href="data:application/zip;base64,__DATA__">Download source ZIP</a></p><p>SHA-256: <code>__HASH__</code></p><p><a href="https://github.com/0xlaplaced/clausplex">Source on GitHub</a> · <a href="https://claus.si/c/clausplex">Play Clausplex</a></p></html>'''.replace('__DATA__',base64.b64encode(b).decode()).replace('__HASH__',digest)
assert len(page.encode())<1000000, 'Source download page exceeds the host file limit'
(site/'index.html').write_text(page);report={'files':len(files),'zipBytes':len(b),'sourceHTMLBytes':len(page.encode()),'sha256':digest};(out/'source-check.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
