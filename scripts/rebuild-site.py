"""Package the UI and update the committed static release bundle."""
from pathlib import Path
import base64
import gzip
import json
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
engine = ROOT / 'build/game.js'
if not engine.exists():
    # The committed parts are JSON string assignments; parsing does not execute JS.
    parts = []
    for i, file in enumerate(sorted((ROOT / 'docs').glob('engine-*.js'))):
        match = re.fullmatch(r'\(window\.__ospSourceParts \|\|= \[\]\)\[(\d+)\]=(.+);\s*', file.read_text())
        if not match or int(match[1]) != i:
            raise SystemExit('Invalid engine parts. Rebuild with build-portable.py.')
        parts.append(json.loads(match[2]))
    if not parts:
        raise SystemExit('No bundled engine. Run build-portable.py first.')
    engine.parent.mkdir(exist_ok=True)
    data=json.loads((ROOT/'docs/data.js').read_text().removeprefix('const CLAUS_DATA=').removesuffix(';'))
    packed=''.join(parts)
    engine.write_text(gzip.decompress(base64.b64decode(packed)).decode() if data.get('engineEncoding')=='gzip-base64' else packed)

subprocess.run([sys.executable, str(ROOT / 'package.py')], cwd=ROOT, check=True)
generated = ROOT / 'site/game'
docs = ROOT / 'docs'
docs.mkdir(exist_ok=True)
for file in docs.iterdir():
    if file.is_file() and file.name != '.nojekyll' and not (generated / file.name).exists():
        file.unlink()
shutil.copytree(generated, docs, dirs_exist_ok=True)
(docs / '.nojekyll').touch()
print('Updated docs/. Serve it locally or commit and push to publish.')
