"""Pin the verifier, puzzle hashes, ranked seeds and known assisted references."""
from pathlib import Path
import concurrent.futures
import hashlib
import json
import os
import re
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
node = os.environ.get('NODE') or shutil.which('node')
if not node:
    raise SystemExit('Node.js is required.')
engine = ROOT / 'backend/engine.cjs'
shutil.copyfile(ROOT / 'build/headless.js', engine)
source = hashlib.sha256()
for file in sorted((ROOT / 'source/src').rglob('*')) + [ROOT / 'bridge.c']:
    if file.is_file():
        source.update(str(file.relative_to(ROOT)).encode())
        source.update(file.read_bytes())
version = 'sha256:' + source.hexdigest()
maps = (ROOT / 'resources/LEVELS.DAT').read_bytes()

def capture(level):
    replay = ROOT / f'tests/recordings/{level:03d}.SP'
    raw = replay.read_bytes()
    output = ROOT / f'build/reference-{level}.rle'
    env = dict(os.environ)
    env['CLAUSPLEX_CAPTURE_FILE'] = str(output)
    result = subprocess.run([node, str(engine), '-u', str(replay)], cwd=ROOT / 'resources', env=env, capture_output=True, text=True, timeout=20)
    match = re.search(r'^CLAUSPLEX_VERIFY (\{[^\n]+\})$', result.stdout + '\n' + result.stderr, re.M)
    if result.returncode or not match:
        raise RuntimeError(f'Reference simulation failed for level {level}')
    stats = json.loads(match[1])
    if stats['won'] != 1 or stats['valid'] != 1:
        raise RuntimeError(f'Invalid captured reference for level {level}')
    packed = output.read_bytes()
    import base64
    encoded = base64.b64encode(packed).decode()
    replay_hash = hashlib.sha256(f'{version}:{level}:{stats["seed"]}:{encoded}'.encode()).hexdigest()
    return {'number': level, 'hash': hashlib.sha256(maps[(level-1)*1536:level*1536]).hexdigest(), 'seed': stats['seed'], 'referenceSteps': stats['steps'], 'referenceReplayHash': replay_hash}, {'level': level, 'seed': stats['seed'], 'steps': stats['steps'], 'replay': encoded}

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    results = list(pool.map(capture, range(1, len(maps)//1536 + 1)))
catalog = {'format': 'clausplex-rle-v1', 'gameVersion': version, 'headlessSHA256': hashlib.sha256(engine.read_bytes()).hexdigest(), 'framesPerSecond': 35, 'levels': [x[0] for x in results]}
(ROOT / 'backend/catalog.json').write_text(json.dumps(catalog, indent=2) + '\n')
(ROOT / 'tests/reference-runs.json').write_text(json.dumps([x[1] for x in results], indent=2) + '\n')
print(json.dumps({'referencesCaptured': len(results), 'gameVersion': version, 'headlessSHA256': catalog['headlessSHA256']}))
