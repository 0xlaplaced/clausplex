"""Rebuild using activated Emscripten 6.0.12. No source download required."""
from pathlib import Path
import argparse,json,os,shutil,subprocess
R=Path(__file__).resolve().parent
parser=argparse.ArgumentParser();parser.add_argument('--headless',action='store_true');args=parser.parse_args()
emcc=os.environ.get('EMCC') or shutil.which('emcc')
if not emcc:raise SystemExit('Activate Emscripten 6.0.12 first (source emsdk_env.sh), or set EMCC to its executable path.')
src=R/'source/src';out=R/'build';out.mkdir(exist_ok=True)
sources=sorted(src.glob('*.c'))+sorted((src/'sdl2').glob('*.c'))
if args.headless:sources=[p for p in sources if p!=src/'sdl2/video.c']+[src/'null/video.c']
sources += [src/'sdl_common/system.c',src/'null/audio.c',src/'null/virtualKeyboard.c',src/'lib/ini/ini.c',R/'bridge.c']
command=[emcc,*map(str,sources),'-Oz','-DHAVE_SDL2','-sUSE_SDL=2','-sASYNCIFY=1','-sWASM=0','-sALLOW_MEMORY_GROWTH=0','-sINITIAL_MEMORY=33554432','-sSTACK_SIZE=1048576']
if args.headless:command+=['-sENVIRONMENT=node','-sNODERAWFS=1','-o',str(out/'headless.js')]
else:
    exports=['_main']+['_claus_'+n for n in ['x','y','remaining','red','running','seconds','won','dead','frame','pause','touch','scroll_x','scroll_y','demo','outcome','set_ranked_seed','capture_length','capture_byte','capture_steps','capture_seed','capture_valid']]
    command+=['-sENVIRONMENT=web','-sEXPORTED_FUNCTIONS='+json.dumps(exports),'-sEXPORTED_RUNTIME_METHODS=["FS"]','--embed-file',str(R/'resources')+'@/','-o',str(out/'game.js')]
subprocess.run(command,cwd=R,check=True)
print('Built', 'headless simulation' if args.headless else 'web engine; run python3 package.py next.')
