"""Local-only QA pages. Fixtures never enter the shipped release."""
from pathlib import Path
import re
R=Path(__file__).resolve().parent;Q=R/'site/qa';Q.mkdir(exist_ok=True)
html=(R/'site/game/index.html').read_text().replace('href="theme.css"','href="/strict/theme.css"')
html=re.sub(r'src="(data|engine-[0-9]+)\.js"',r'src="/strict/\1.js"',html).replace('src="app.js"','src="/qa/app.js"')
(Q/'win.html').write_text(html)
app=(R/'app.js').read_text().replace('all.slice((selected-1)*1536,selected*1536)','qaLevel(all,selected)')
app=app.replace("'CURRENT.SP','-g','5'","'CURRENT.SP','-g',params.has('recording')?'10':'5'")
app+='''
function qaLevel(all,selected){
 const a=all.slice((selected-1)*1536,selected*1536);
 if(params.has('recording')){diagnostics.qaInput='original recorded inputs through the play UI at engine speed 10';return Module.FS.readFile('/REPLAY'+String(selected).padStart(3,'0')+'.SP');}
 if(selected!==1&&selected!==37)return a;
 diagnostics.qaInput='manual, adjacent-exit fixture';
 a.fill(6,0,1440);for(let y=17;y<23;y++)for(let x=27;x<35;x++)a[y*60+x]=0;
 a[20*60+30]=3;a[20*60+31]=7;a[1444]=0;a[1469]=0;a[1470]=0;a[1471]=0;
 if(params.has('locked'))a[19*60+30]=4;
 return a;
}
'''
# Keep QA flags across navigation to verify repeated wins, not just one callback.
app=app.replace("if(test)route.set('test','1');", "if(test)route.set('test','1');if(params.has('recording'))route.set('recording','1');")
(Q/'app.js').write_text(app)
print('Prepared manual exit and normal UI replay fixtures outside the release.')

# Exercise the actual srcdoc navigation bridge, using a manual-exit fixture.
wrapper=(R/'site/clausplex.html').read_text()
fixture="((a)=>{if(selected!==1)return a;a.fill(6,0,1440);for(let y=17;y<23;y++)for(let x=27;x<35;x++)a[y*60+x]=0;a[20*60+30]=3;a[20*60+31]=7;a[1444]=0;a[1469]=0;a[1470]=0;a[1471]=0;return a;})(all.slice((selected-1)*1536,selected*1536))"
assert wrapper.count('all.slice((selected-1)*1536,selected*1536)')==1
wrapper=wrapper.replace('all.slice((selected-1)*1536,selected*1536)',fixture)
(R/'site/srcdoc-qa.html').write_text(wrapper)
(R/'site/responsive-qa.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><title>Clausplex responsive QA</title><style>html,body{margin:0;background:#e7d9bc}iframe{display:block;border:0;height:896px;margin:0}</style><iframe id="game" title="Clausplex responsive test"></iframe><script>const q=new URLSearchParams(location.search),w=Math.max(280,Math.min(700,Number(q.get('width'))||414)),f=document.querySelector('#game');q.delete('width');f.style.width=w+'px';f.src='/strict/index.html?'+q;</script></html>''')
