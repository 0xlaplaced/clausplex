'use strict';
const $=s=>document.querySelector(s), params=new URLSearchParams(location.hash.startsWith('#level=')?location.hash.slice(1):location.search);
const clampLevel=n=>Math.max(1,Math.min(37,Number(n)||1));
let selected=clampLevel(params.get('level')),started=false,ready=false,finished=false,paused=false,wasPausedForDialog=false,violations=0,lastRemaining=-1,startFrame=0;
const replay=params.has('replay'),test=params.has('test');
if(replay&&![1,2,3,5,10,20].includes(selected))selected=1;
const diagnostics={version:'Clausplex Part I / 1.0',cspViolations:0,errors:[],level:selected,replay};
const atlas=new Image();atlas.src='data:image/svg+xml,'+encodeURIComponent(CLAUS_DATA.atlas);
const tileUrl='url("data:image/svg+xml,'+encodeURIComponent(CLAUS_DATA.atlas)+'")';
for(const a of CLAUS_DATA.levels){const packed=Uint8Array.from(atob(a.rle),c=>c.charCodeAt(0)),tiles=new Uint8Array(1440);let pos=0;for(let i=0;i<packed.length;i+=2){tiles.fill(packed[i+1],pos,pos+packed[i]);pos+=packed[i];}if(pos!==1440)throw new Error('Invalid level preview');a.tiles=tiles;}
for(const [i,el] of [...document.querySelectorAll('[data-mascot]')].entries())el.innerHTML=CLAUS_DATA.mascot.replaceAll('__ID__',String(i));
const mascot=new Image();mascot.src='data:image/svg+xml,'+encodeURIComponent(CLAUS_DATA.mascot.replaceAll('__ID__','preview'));mascot.onload=drawPreview;
for(const el of document.querySelectorAll('[data-tile]')){el.style.backgroundImage=tileUrl;el.style.backgroundPosition=(Number(el.dataset.tile)/39*100)+'% 0';}
function announce(t){$('#announcer').textContent=t;}
function report(kind,text){if(test)parent.postMessage({probe:'clausplex',kind,text},'*');}
function renderDiagnostics(){if(test){$('#diagnostics').hidden=false;$('#diagnostics').textContent=JSON.stringify(diagnostics,null,2);}}
function error(t){if(!started){$('#boot-error').hidden=false;$('#boot-error').textContent=String(t);}diagnostics.errors.push(String(t));renderDiagnostics();report('error',String(t));if(!ready){$('#load-status').textContent='The game could not start. Reload the page to try again.';}announce('Game error. Reload the page to try again.');}
addEventListener('error',e=>error(e.message));addEventListener('unhandledrejection',e=>error(String(e.reason)));
addEventListener('securitypolicyviolation',e=>{violations++;diagnostics.cspViolations=violations;error('CSP: '+e.violatedDirective+' / '+e.blockedURI);});
function setSelected(n){selected=clampLevel(n);const a=CLAUS_DATA.levels[selected-1];$('#selected-name').textContent=a.name;$('#selected-level .mono').textContent=String(selected).padStart(3,'0');$('.art-caption .mono').textContent='CL / '+String(selected).padStart(3,'0');$('#preview').setAttribute('aria-label','Level '+selected+': '+a.name+' maze preview');$('#level-number').textContent=String(selected).padStart(3,'0');$('#level-title').textContent=a.name;$('#remaining').textContent=a.required;drawPreview();}
function drawPreview(){if(!atlas.complete||!atlas.naturalWidth||!mascot.complete||!mascot.naturalWidth)return;const c=$('#preview'),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;const a=CLAUS_DATA.levels[selected-1];const mx=a.tiles.indexOf(3)%60,my=Math.floor(a.tiles.indexOf(3)/60);const ox=Math.max(0,Math.min(40,mx-9)),oy=Math.max(0,Math.min(13,my-5));for(let y=0;y<11;y++)for(let x=0;x<20;x++){let t=a.tiles[(y+oy)*60+x+ox];if(t>39)t=0;ctx.drawImage(atlas,t*16,0,16,16,x*16,y*16,16,16);if(t===3&&mascot.complete&&mascot.naturalWidth)ctx.drawImage(mascot,x*16,y*16,16,16);}c.setAttribute('aria-busy','false');}
atlas.onload=drawPreview;setSelected(selected);
function sendKey(code,down){const bits={38:1,40:2,37:4,39:8,32:16};let mask=0;for(const k of held)mask|=bits[k]||0;if(!down)mask&=~(bits[code]||0);Module._claus_touch?.(mask);}
const held=new Set();
function clearKeys(){held.clear();Module._claus_touch?.(0);for(const b of document.querySelectorAll('.held'))b.classList.remove('held');}
function pause(to=!paused){if(!ready||finished||replay||to===paused)return;clearKeys();Module._claus_pause(to?1:0);paused=to;$('#pause-overlay').hidden=!paused;$('#pause').setAttribute('aria-label',paused?'Resume game':'Pause game');$('#pause').setAttribute('aria-pressed',String(paused));announce(paused?'Game paused.':'Game resumed.');if(paused)$('#resume').focus();else Module.canvas.focus();}
function showResult(won,recorded=false){
 if(finished)return;
 if(typeof window!=='undefined')window.ClausRankings?.finish(Module,selected,won,recorded);
 finished=true;clearKeys();if(!recorded||replay)Module._claus_pause?.(1);
 $('#loading').hidden=true;$('#pause-overlay').hidden=true;$('#actor').hidden=true;$('#result').hidden=false;$('#pause').disabled=true;
 $('#result-kicker').textContent=recorded?'ORIGINAL SOLUTION':won?'LEVEL '+String(selected).padStart(3,'0')+' COMPLETE':'TRY A DIFFERENT PATH';
 $('#result-title').textContent=recorded?(won?'A way through.':'The solve stopped.'):won?(selected===37?'Part I. Made it.':'Made it, little Claus.'):'One more try?';
 $('#result-copy').textContent=recorded?(won?'The original solution, in a new world. Your turn.':'Try playing this level yourself.'):won?(selected===37?'The final maze of Part I is behind you. Thanks for playing.':'All required sparks collected. The next maze is ready.'):'Watch the falling rocks and try a different route.';
 $('#result-action').textContent=recorded?'Play this level →':won&&selected<37?'Next level · '+String(selected+1).padStart(3,'0')+' →':won?'Replay Part I →':'Try again →';
 $('#result-action').onclick=()=>navigate(recorded||!won?selected:selected===37?1:selected+1,true);
 $('#result-action').focus({preventScroll:true});announce($('#result-title').textContent);report(won?'success':'ended',{level:selected,recorded,remaining:diagnostics.remaining});
}
function navigate(level,auto=false,watch=false){const u=new URL(location.href);u.search='';const route=new URLSearchParams();route.set('level',clampLevel(level));if(auto)route.set('play','1');if(watch)route.set('replay','1');if(!watch&&typeof window!=='undefined'&&window.ClausRankings?.enabled()){route.set('ranked','1');const name=window.ClausRankings?.playerName?.();if(name)route.set('player',name);}if(test)route.set('test','1');u.hash=route.toString();const queryChanged=location.search!==u.search;location.href=u.href;if(!queryChanged)location.reload();}
function gameArguments(level,watching){return ['-p',watching?'REPLAY'+String(level).padStart(3,'0')+'.SP':'CURRENT.SP','-g','5'];}
var Module={arguments:gameArguments(selected,replay),canvas:$('#canvas'),
 onRuntimeInitialized:()=>{if(!replay){Module._claus_set_ranked_seed(window.ClausRankings?.enabled()?CLAUS_DATA.levels[selected-1].rankedSeed:-1);const all=Module.FS.readFile('/LEVELS.DAT');Module.FS.writeFile('/CURRENT.SP',all.slice((selected-1)*1536,selected*1536));}diagnostics.runtimeReady=true;report('ready','runtime initialized');renderDiagnostics();},
 print:t=>report('stdout',String(t)),
 printErr:t=>{const s=String(t);if(s.includes('Demo successful:')){diagnostics.replayResult='success';showResult(true,true);renderDiagnostics();}else if(s.includes('Demo failed:')){diagnostics.replayResult='failed';error(s);showResult(false,true);}else if(!s.startsWith('INFO:'))error(s);},
 setStatus:t=>{if(t)$('#load-status').textContent=t;},onAbort:t=>error('ABORT: '+t),
 onExit:code=>{diagnostics.exitCode=code;if(!finished)showResult(Boolean(Module._claus_won?.()),replay);renderDiagnostics();}
};
let engineLoadPromise=null;
function loadEngineParts(){
 const complete=()=>window.__ospSourceParts?.length===CLAUS_DATA.engineParts&&window.__ospSourceParts.join('').length===CLAUS_DATA.engineCharacters;
 if(complete())return Promise.resolve();
 if(engineLoadPromise)return engineLoadPromise;
 window.__ospSourceParts=[];
 engineLoadPromise=Promise.all(Array.from({length:CLAUS_DATA.engineParts},(_,i)=>new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='engine-'+i+'.js';script.async=true;script.dataset.enginePart=String(i);script.onload=resolve;script.onerror=()=>reject(new Error('A game file could not be downloaded.'));document.body.appendChild(script);
 }))).then(()=>{if(!complete())throw new Error('The game download is incomplete.');}).catch(e=>{engineLoadPromise=null;throw e;});
 return engineLoadPromise;
}
async function start(){
 if(started)return;
 if(!replay&&window.ClausRankings?.prepare(selected)===false)return;
 started=true;diagnostics.level=selected;$('#home').hidden=true;$('#play').hidden=false;document.body.classList.add('is-playing');$('#loading').hidden=false;$('#retry-load').hidden=true;$('#load-status').textContent='Downloading the game…';$('#start').disabled=true;
 if(!replay&&window.ClausRankings?.enabled()){$('#play-note').textContent='Ranked attempt · fixed seed. Finish the level to submit your replay for verification.';$('#live-label').textContent='RANKED ATTEMPT';}
 if(replay){$('#mode-label').textContent='WATCH / ORIGINAL SOLUTION';$('#live-label').textContent='ORIGINAL SOLUTION · NORMAL SPEED';$('#pause').disabled=true;}
 try{
  await loadEngineParts();
  Module.arguments=gameArguments(selected,replay);
  $('#load-status').textContent='Opening the maze…';const script=document.createElement('script');script.textContent=window.__ospSourceParts.join('');window.__ospSourceParts.length=0;document.body.appendChild(script);Module.canvas.focus({preventScroll:true});
 }catch(e){started=false;$('#start').disabled=false;$('#load-status').textContent='The game could not download. Check your connection and try again.';$('#retry-load').hidden=false;$('#retry-load').focus();report('load-error',String(e.message));}
}
$('#start').onclick=start;$('#retry-load').onclick=start;$('#watch').onclick=()=>navigate(1,true,true);
$('#pause').onclick=()=>pause();$('#resume').onclick=()=>pause(false);
$('#restart').onclick=()=>navigate(selected,true);$('#leave').onclick=()=>navigate(selected);$('#result-home').onclick=()=>navigate(selected);
setInterval(()=>{if(!Module._claus_running||finished)return;try{const running=Module._claus_running(),frame=Module._claus_frame(),remaining=Module._claus_remaining(),red=Module._claus_red(),seconds=Module._claus_seconds();Object.assign(diagnostics,{running,frame,x:Module._claus_x(),y:Module._claus_y(),remaining,red,seconds,demo:Module._claus_demo(),outcome:Module._claus_outcome(),won:Module._claus_won(),dead:Module._claus_dead(),cspViolations:violations});$('#remaining').textContent=remaining;$('#red').textContent=red;$('#time').textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');if(!ready&&running&&frame>startFrame){ready=true;document.title='Clausplex — '+CLAUS_DATA.levels[selected-1].name;$('#loading').hidden=true;announce('Level '+selected+' started. '+remaining+(remaining===1?' spark left.':' sparks left.'));}if(ready&&lastRemaining!==remaining){lastRemaining=remaining;if(!replay)announce(remaining===0?'Sparks collected. Find the exit.':remaining+(remaining===1?' spark left.':' sparks left.'));}if(ready){if(Module._claus_won())showResult(true,replay);else if(Module._claus_dead())showResult(false,replay);}renderDiagnostics();report('state',diagnostics);}catch(e){error(e.message);}},150);
function openDialog(id){if(started&&ready&&!finished&&!paused&&!replay){pause(true);wasPausedForDialog=true;}else wasPausedForDialog=false;$(id).showModal();}
function closeDialog(d){d.close();if(wasPausedForDialog){wasPausedForDialog=false;pause(false);}}
$('#board-open').onclick=()=>{$('#board-level').value=String(selected);openDialog('#board-dialog');window.ClausRankings.loadBoard();};
$('#help-open').onclick=()=>openDialog('#help-dialog');$('#credits-open').onclick=()=>openDialog('#credits-dialog');
function renderLevels(){const query=$('#level-search').value.trim().toLowerCase();const filtered=CLAUS_DATA.levels.filter(a=>String(a.number).includes(query)||a.name.toLowerCase().includes(query));$('#level-grid').replaceChildren(...filtered.map(a=>{const b=document.createElement('button');b.setAttribute('aria-pressed',String(a.number===selected));b.setAttribute('aria-label','Level '+a.number+': '+a.name);const num=document.createElement('span');num.textContent=String(a.number).padStart(3,'0');b.append(num,document.createTextNode(a.name));b.onclick=()=>{if(started){navigate(a.number,true);}else{setSelected(a.number);closeDialog($('#levels-dialog'));$('#start').focus();}};return b;}));$('#search-count').textContent=filtered.length+(filtered.length===1?' level':' levels');$('#empty-levels').hidden=filtered.length>0;}
function openLevels(){$('#level-search').value='';renderLevels();openDialog('#levels-dialog');$('#level-search').focus();}
$('#levels-open').onclick=openLevels;$('#selected-level').onclick=openLevels;$('#level-search').oninput=renderLevels;
for(const d of document.querySelectorAll('dialog')){d.addEventListener('cancel',e=>{e.preventDefault();closeDialog(d);});for(const b of d.querySelectorAll('[data-close]'))b.onclick=()=>closeDialog(d);d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(d);}});}
for(const b of document.querySelectorAll('[data-key]')){const code=Number(b.dataset.key);b.addEventListener('pointerdown',e=>{e.preventDefault();if(!ready||paused||finished||replay)return;b.setPointerCapture(e.pointerId);b.classList.add('held');held.add(code);sendKey(code,true);});for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,e=>{e.preventDefault();if(held.has(code)){held.delete(code);sendKey(code,false);}b.classList.remove('held');});b.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!e.repeat){e.preventDefault();e.stopPropagation();if(ready&&!paused&&!finished){held.add(code);sendKey(code,true);}}});b.addEventListener('keyup',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();held.delete(code);sendKey(code,false);}});}
addEventListener('keydown',e=>{if(!e.isTrusted||!started||document.querySelector('dialog[open]')||e.target.matches?.('input,select,textarea'))return;if((e.key.toLowerCase()==='p'||e.key==='Escape')&&!e.repeat){e.preventDefault();e.stopImmediatePropagation();pause();return;}if(e.target.matches?.('button,a'))return;if(e.key.toLowerCase()==='r'&&!e.repeat){e.preventDefault();e.stopImmediatePropagation();navigate(selected,true);}else if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)){e.preventDefault();if(paused||finished||replay)e.stopImmediatePropagation();}},true);
addEventListener('blur',()=>{clearKeys();if(ready&&!finished&&!replay&&!paused)pause(true);});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearKeys();if(ready&&!finished&&!replay&&!paused)pause(true);}});
renderDiagnostics();if(params.has('play')||replay)start();

let previousX=0,previousY=0;
function renderActor(){
 if(ready&&!finished&&Module._claus_x){
  const x=Module._claus_x(),y=Module._claus_y(),sx=Module._claus_scroll_x(),sy=Module._claus_scroll_y(),actor=$('#actor');
  actor.hidden=false;actor.style.left=((x-8-sx)/320*100)+'%';actor.style.top=((y-8-sy)/176*100)+'%';
  const dx=Math.sign(x-previousX),dy=Math.sign(y-previousY);
  actor.classList.toggle('walking',!paused&&(dx!==0||dy!==0));
  if(dx||dy){actor.style.setProperty('--look-x',dx*18+'px');actor.style.setProperty('--look-y',dy*18+'px');}
  previousX=x;previousY=y;
 }
 requestAnimationFrame(renderActor);
}
requestAnimationFrame(renderActor);
