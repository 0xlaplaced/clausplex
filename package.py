from pathlib import Path
import json,base64,hashlib,re,gzip,html as html_lib
R=Path(__file__).resolve().parent
SITE=R/'site';GAME=SITE/'game';GAME.mkdir(parents=True,exist_ok=True)
logo=base64.b64encode((R/'assets/claus-logo.png').read_bytes()).decode()
mascot='<span class="mascot-image" data-mascot aria-hidden="true"></span>'
brand_svg='''<svg xmlns="http://www.w3.org/2000/svg" viewBox="100 100 840 850"><defs><filter id="ink-__ID__" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1 0 0 1 0"/><feComponentTransfer><feFuncA type="linear" slope="1.25" intercept="-.25"/></feComponentTransfer></filter></defs><image href="data:image/png;base64,__LOGO__" width="1024" height="1024" filter="url(#ink-__ID__)"/><ellipse cx="543.5" cy="367" rx="61.5" ry="84.5" fill="#fff4d8"/><ellipse cx="690.5" cy="376.5" rx="50" ry="63" fill="#fff4d8"/><g class="claus-pupils" fill="#20211e"><circle cx="560" cy="367" r="26"/><circle cx="704" cy="376.5" r="20"/></g></svg>'''.replace('__LOGO__',logo)

font_license=(R/'assets/FONT-LICENSE.txt').read_text()
css='/* Embedded Bricolage Grotesque font license:\n'+font_license+'\n*/\n'+(R/'theme.css').read_text().replace('__FONT__',base64.b64encode((R/'assets/bricolage.woff2').read_bytes()).decode())
(GAME/'theme.css').unlink(missing_ok=True)
source=(R/'build/game.js').read_text()
encoded=base64.b64encode(gzip.compress(source.encode(),compresslevel=9,mtime=0)).decode()
for stale in GAME.glob('engine-*.js'):stale.unlink()
parts=[encoded[i:i+500_000] for i in range(0,len(encoded),500_000)]
for i,p in enumerate(parts):(GAME/f'engine-{i}.js').write_text('(window.__ospSourceParts ||= [])['+str(i)+']='+json.dumps(p)+';\n')
html=(R/'index.html').read_text().replace('__MASCOT__',mascot).replace('__ENGINE_SCRIPTS__','<!-- ENGINE_ON_DEMAND -->').replace('<link rel="stylesheet" href="theme.css">','<style>'+css+'</style>')
# Final HTML is written after the generated logo and initial scripts are ready.
(GAME/'app.js').write_text((R/'app.js').read_text())
(GAME/'rankings.js').write_text((R/'rankings.js').read_text())
ranking=json.loads((R/'backend/deployment.json').read_text());catalog=json.loads((R/'backend/catalog.json').read_text());ranking['gameVersion']=catalog['gameVersion']
gpl=(R/'assets/GPL-3.0.txt').read_text()
(GAME/'GPL-3.0.txt').write_text(gpl)
runtime_license='Emscripten runtime\n\n'+(R/'assets/EMSCRIPTEN-LICENSE.txt').read_text()+'\n\nSDL2\n\n'+(R/'assets/SDL2-LICENSE.txt').read_text()
(GAME/'RUNTIME-LICENSES.txt').write_text(runtime_license)
(GAME/'THIRD-PARTY.txt').write_text('Clausplex / 2.0 — independent community adaptation, not an official Claus product.\n\nEngine: OpenSupaplex 7.2.2 by Sergio Padrino and contributors, GPL version 3.\nUpstream: https://github.com/sergiou87/open-supaplex\nCommit: bad56a4e174e628643995284ea55d4c49af3137c\nCorresponding modified C source, resources and build instructions accompany this release in source.zip.\n\nOriginal Supaplex: Philip Jespersen and Michael Stopp. The original levels 1–111 and replay recordings retain their respective authors\' rights; the engine GPL does not relicense those materials. Original game artwork has been replaced with new terrain artwork and the official Claus logo asset in the presentation layer.\n\nBricolage Grotesque: The Bricolage Grotesque Project Authors, SIL Open Font License 1.1. Full font license is embedded in index.html.\n\nClaus logo source: https://claus.si/assets/claus-logo.png (retrieved 2026-10-15). The Claus brand asset retains its owner\'s rights and is not covered by the engine GPL. Claus branding is used for this community adaptation. Optional nickname rankings use a public score service and a scheduled headless verifier. No token or NFT integration is included.\n')
def rle(data):
    out=bytearray();i=0
    while i<len(data):
        j=i+1
        while j<len(data) and data[j]==data[i] and j-i<255:j+=1
        out.extend([j-i,data[i]]);i=j
    return bytes(out)
levels=[];b=(R/'resources/LEVELS.DAT').read_bytes()
assert len(b)%1536==0 and len(catalog['levels'])==len(b)//1536
for i in range(len(b)//1536):
    a=b[i*1536:(i+1)*1536];name=a[1446:1469].decode('ascii',errors='replace').strip(' -\0')
    levels.append({'number':i+1,'name':name,'required':a[1470] or a[:1440].count(4)%256,'rle':base64.b64encode(rle(a[:1440])).decode()})
for level in levels:
    level['hash']=catalog['levels'][level['number']-1]['hash'];level['rankedSeed']=catalog['levels'][level['number']-1]['seed']
atlas=(R/'assets/tiles.svg').read_text()
# Combine equal-colour vector paths. This changes SVG serialization only.
groups={}
for color,path in re.findall(r'<path fill="(#[a-f0-9]+)" d="([^"]+)"/>',atlas):groups.setdefault(color,[]).append(path)
atlas='<svg xmlns="http://www.w3.org/2000/svg" width="640" height="16" viewBox="0 0 640 16" shape-rendering="crispEdges">'+''.join(f'<path fill="{c}" d="'+''.join(ps)+'"/>' for c,ps in groups.items())+'</svg>'
(GAME/'data.js').write_text('const CLAUS_DATA='+json.dumps({'ranking':ranking,'levels':levels,'atlas':atlas,'mascot':brand_svg,'engineParts':len(parts),'engineCharacters':len(encoded),'engineEncoding':'gzip-base64','engineSourceCharacters':len(source)},ensure_ascii=False,separators=(',',':'))+';')
(SITE/'index.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Clausplex / Claus compatibility</title><style>html,body{margin:0;height:100%;background:#fff2d8}iframe{display:block;width:100%;height:100%;border:0}pre{margin:0;white-space:pre-wrap;font:11px monospace;background:#e7d9bc;padding:12px}pre:empty{display:none}</style><iframe id="game" title="Clausplex"></iframe><pre id="result"></pre><script>const q=new URLSearchParams(location.search),game=document.querySelector('#game');game.src='/strict/index.html?'+q.toString();addEventListener('message',e=>{if(e.source!==game.contentWindow||e.data?.probe!=='clausplex')return;const a={kind:e.data.kind,text:e.data.text,eventOrigin:e.origin};document.querySelector('#result').textContent=JSON.stringify(a);});</script></html>''')
# The official publisher accepts HTML/CSS/JS/JSON/SVG, so notices ship as HTML.
license_text='\n\n'.join((GAME/n).read_text() for n in ['THIRD-PARTY.txt','GPL-3.0.txt','RUNTIME-LICENSES.txt'])
(GAME/'licenses.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Clausplex corresponding source, original engine attribution, asset notices and open-source license terms for this community puzzle game."><link rel="canonical" href="https://claus.si/c/clausplex"><link rel="icon" href="logo.svg" type="image/svg+xml"><meta property="og:title" content="Clausplex | Source and licenses"><meta property="og:description" content="Corresponding source and open-source license terms for Clausplex."><meta property="og:image" content="preview.svg"><meta name="twitter:card" content="summary_large_image"><title>Clausplex | Source and licenses</title><style>body{max-width:64rem;margin:6rem auto 2rem;padding:1rem;background:#f36b35;color:#20211e;font:16px/1.6 system-ui}pre{white-space:pre-wrap;overflow-wrap:anywhere}a{color:inherit}</style><main><a href="index.html">Back to the game</a><h1>Source and licenses</h1><p id="source-access"><a href="https://github.com/0xlaplaced/clausplex">Complete corresponding source and build instructions on GitHub</a></p><pre>'+html_lib.escape(license_text)+'</pre></main></html>')
for n in ['THIRD-PARTY.txt','GPL-3.0.txt','RUNTIME-LICENSES.txt']:(GAME/n).unlink()
# The Network mark uses the same mascot as the game, inside a circular maze badge.
mascot_paths=brand_svg[brand_svg.index('>')+1:brand_svg.rindex('</svg>')].replace('__ID__','network-logo')
network_logo='<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" role="img" aria-label="Clausplex: Little Claus in a maze"><circle cx="128" cy="128" r="126" fill="#20211e"/><circle cx="128" cy="128" r="116" fill="#f36b35"/><path d="M38 113V81H70V45H126M42 174V208H92M165 210H207V153" fill="none" stroke="#20211e" stroke-width="9" stroke-linejoin="miter"/><svg x="51" y="64" width="151" height="153" viewBox="100 100 840 850">'+mascot_paths+'</svg><path d="M192 36L211 58L192 80L173 58Z" fill="#efbd55" stroke="#20211e" stroke-width="6"/><path d="M192 44L198 57L185 57Z" fill="#fff4d8"/></svg>'
(GAME/'logo.svg').write_text(network_logo)
# A self-contained preview uses the real terrain atlas and real Claus asset.
paths=atlas[atlas.index('>')+1:atlas.rindex('</svg>')]
a=levels[0];tiles=base64.b64decode(a['rle']);raw=b''.join(bytes([tiles[i+1]])*tiles[i] for i in range(0,len(tiles),2))
mx=raw.index(3)%60;my=raw.index(3)//60;ox=max(0,min(40,mx-9));oy=max(0,min(13,my-5))
mini=[]
for y in range(11):
 for x in range(20):
  t=raw[(y+oy)*60+x+ox];t=t if t<40 else 0
  mini.append(f'<svg x="{x*16}" y="{y*16}" width="16" height="16" viewBox="{t*16} 0 16 16"><use href="#atlas"/></svg>')
mini.append(f'<svg x="{(mx-ox)*16}" y="{(my-oy)*16}" width="16" height="16" viewBox="100 100 840 850">'+brand_svg[brand_svg.index('>')+1:brand_svg.rindex('</svg>')].replace('__ID__','mini')+'</svg>')
preview='<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540"><rect width="960" height="540" fill="#f36b35"/><text x="36" y="70" font-family="Arial,sans-serif" font-weight="bold" font-size="54" fill="#20211e">clausplex</text><text x="720" y="65" font-family="Arial,sans-serif" font-size="22" fill="#20211e">ALL 111 / 001–111</text><defs><g id="atlas">'+paths+'</g></defs><rect x="34" y="118" width="644" height="356" fill="#20211e"/><svg x="36" y="120" width="640" height="352" viewBox="0 0 320 176">'+''.join(mini)+'</svg><svg x="720" y="180" width="184" height="186" viewBox="100 100 840 850">'+brand_svg[brand_svg.index('>')+1:brand_svg.rindex('</svg>')].replace('__ID__','large')+'</svg><text x="36" y="515" font-family="Arial,sans-serif" font-size="21" fill="#20211e">A SMALL ESCAPE PLAN. · 111 ORIGINAL PUZZLES</text></svg>'
(GAME/'preview.svg').write_text(preview)
# Claus hides the complete iframe until its load event. Keep the usable first
# screen self-contained, so each initial script and repeated logo does not add
# another hosted-file request before the host reveals it. The engine stays lazy.
# Reuse the mascot PNG already held by CLAUS_DATA instead of serializing it
# again for the badge. A tiny maze favicon avoids a second full badge in <head>.
favicon='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#f36b35"/><path d="M13 31V19h12V9h17M13 44v11h13M43 54h12V39" fill="none" stroke="#20211e" stroke-width="4"/><text x="22" y="43" font-family="Arial,sans-serif" font-size="33" font-weight="bold" fill="#20211e">c</text><path d="m49 9 5 6-5 6-5-6z" fill="#20211e"/></svg>'
favicon_uri='data:image/svg+xml;base64,'+base64.b64encode(favicon.encode()).decode()
html=html.replace('src="logo.svg"','data-project-logo=""').replace('href="logo.svg"','href="'+favicon_uri+'"')
logo_template=network_logo.replace(logo,'__PROJECT_PNG__')
for name in ('data','rankings','app'):
    content=(GAME/(name+'.js')).read_text()
    if name=='data':
        content+='\nconst projectBadge="data:image/svg+xml,"+encodeURIComponent('+json.dumps(logo_template)+'.replace("__PROJECT_PNG__",CLAUS_DATA.mascot.match(/data:image\/png;base64,([^\"]+)/)[1]));for(const image of document.querySelectorAll("[data-project-logo]"))image.src=projectBadge;'
    html=html.replace('<script src="'+name+'.js" defer></script>', '<script data-claus-bootstrap="'+name+'">'+content.replace('</script','<\\/script')+'</script>')
assert not re.search(r'<script[^>]+src=|<img[^>]+src="(?!data:)',html),'Initial screen must have no external scripts or images'
(GAME/'index.html').write_text(html)
(GAME/'claus.json').write_text(json.dumps({'schema':'claus-project/1','name':'Clausplex','description':'A free Claus-inspired puzzle game featuring original Supaplex levels 1–111. Collect sparks, outsmart falling rocks and find the exit. Independent community adaptation.','logo':'logo.svg','preview':'preview.svg','connect':[ranking['origin'],ranking['scoresOrigin']]},ensure_ascii=False,separators=(',',':')))
files=[{'path':p.name,'content':p.read_text()} for p in sorted(GAME.iterdir()) if p.is_file()]
snapshot={'files':files,'entryPath':'index.html'}
serialized=json.dumps(snapshot,ensure_ascii=False,separators=(',',':')).encode()
report={'files':len(files),'maxFileBytes':max(len(f['content'].encode()) for f in files),'snapshotBytes':len(serialized),'fileLimit':1_000_000,'snapshotLimit':3_000_000,'valid':len(serialized)<=3_000_000 and all(len(f['content'].encode())<=1_000_000 for f in files),'filesDetail':[{'path':f['path'],'bytes':len(f['content'].encode())} for f in files],'engineSHA256':hashlib.sha256(source.encode()).hexdigest()}
(R/'package-check.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
# A single HTML download for the user. Its child retains an opaque sandbox.
inline=html.replace('<link rel="stylesheet" href="theme.css">','<style>'+css+'</style>')
inline=inline.replace('src="logo.svg"','src="data:image/svg+xml;base64,'+base64.b64encode(network_logo.encode()).decode()+'"')
for f in files:
    if f['path'].endswith('.js'):inline=inline.replace('<script src="'+f['path']+'" defer></script>','<script>'+f['content'].replace('</script','<\\/script')+'</script>')
inline=inline.replace('<!-- ENGINE_ON_DEMAND -->',''.join('<script>'+f['content'].replace('</script','<\\/script')+'</script>' for f in files if f['path'].startswith('engine-')))
meta='<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data:; font-src data:; connect-src \'none\'; worker-src \'none\'; media-src data:; frame-src \'none\'; form-action \'none\'; base-uri \'none\'; object-src \'none\'">'
inline=inline.replace('<head>','<head>'+meta+'<!-- OpenSupaplex GPLv3 source license:\n'+gpl+'\n\nRuntime licenses:\n'+runtime_license+'\n-->')
# Local srcdoc reloads navigate to the outer file with a query; the parent
# forwards that query into srcdoc so level/restart behavior remains consistent.
inline=inline.replace("const $=s=>document.querySelector(s), params=new URLSearchParams(location.hash.startsWith('#level=')?location.hash.slice(1):location.search);","const $=s=>document.querySelector(s), params=new URLSearchParams(window.__CL_QUERY||(location.hash.startsWith('#level=')?location.hash.slice(1):location.search));")
inline=inline.replace("const u=new URL(location.href);u.search='';","const u=new URL(window.__CL_BASE||location.href);u.search='';")
inline=inline.replace("const queryChanged=location.search!==u.search;location.href=u.href;if(!queryChanged)location.reload();","if(window.__CL_BASE){parent.postMessage({clausNavigate:u.hash.slice(1)},'*');}else{const queryChanged=location.search!==u.search;location.href=u.href;if(!queryChanged)location.reload();}")
inline=inline.replace('href="index.html" title="Clausplex home"','href="#" onclick="parent.postMessage({clausNavigate:\'\'},\'*\');return false" title="Clausplex home"')
offline='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Clausplex</title><style>html,body{margin:0;height:100%;background:#fff2d8}iframe{display:block;width:100%;height:100%;border:0}</style><iframe id="game" sandbox="allow-scripts" title="Clausplex"></iframe><script>const page=__PAGE__,frame=document.querySelector('#game');function load(q){frame.srcdoc=page.replace('<script srcdoc-config>', '<script>window.__CL_QUERY='+JSON.stringify(q)+';window.__CL_BASE='+JSON.stringify(location.href.split('?')[0])+';');}load(location.hash?.startsWith('#level=')?location.hash.slice(1):location.search);addEventListener('message',e=>{if(e.source===frame.contentWindow&&typeof e.data?.clausNavigate==='string')load(e.data.clausNavigate);});</script></html>'''
# Insert configuration before app.js, without additional executable text paths.
inline=inline.replace('<script data-claus-bootstrap="app">\'use strict\';','<script srcdoc-config>\'use strict\';')
(SITE/'clausplex.html').write_text(offline.replace('__PAGE__',json.dumps(inline,ensure_ascii=False).replace('</script','<\\/script')))
assert report['valid'],report
