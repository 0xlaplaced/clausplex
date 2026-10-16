from pathlib import Path
import concurrent.futures,json,shutil,subprocess
R=Path(__file__).resolve().parent
node=shutil.which('node')
if not node:raise SystemExit('Node.js is required.')
def run(p):
    q=subprocess.run([node,str(R/'build/headless.js'),'-u',str(p)],cwd=R/'resources',capture_output=True,text=True,timeout=120)
    return {'level':int(p.stem),'passed':q.returncode==0 and 'Demo successful:' in q.stdout+q.stderr,'log':q.stdout+q.stderr}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:results=list(pool.map(run,sorted((R/'tests/recordings').glob('*.SP'))))
report={'passed':sum(r['passed'] for r in results),'total':len(results),'results':results}
(R/'test-results.json').write_text(json.dumps(report,indent=2));print(report['passed'],'/',report['total'])
if len(results)!=len((R/'resources/LEVELS.DAT').read_bytes())//1536 or not all(r['passed'] for r in results):raise SystemExit(1)
