(()=>{
'use strict';
const $=s=>document.querySelector(s),cfg=CLAUS_DATA.ranking,canonical='https://claus.si/c/clausplex';
const embedded=window.parent!==window&&location.hostname==='claus-network-sites.vercel.app'&&!window.__CL_BASE,active=()=>!window.__CL_BASE&&Boolean(cfg.scoresOrigin);
let pending,readSequence=0,attemptName=null,registeredName='',pollTimer;
const validName=name=>/^[A-Za-z0-9][A-Za-z0-9 ._-]{2,23}$/.test(name);
function playerName(){return attemptName??$('#player-name').value.trim();}
async function api(path,data){
 const response=await fetch(cfg.scoresOrigin+path,{credentials:'omit',redirect:'error',signal:AbortSignal.timeout(15000),...(data?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),keepalive:true}:{})});
 if(!response.ok){let code='connection_failed';try{code=(await response.json()).error||code;}catch{}throw Error(code);}
 return response.json();
}
function register(name){if(!name||registeredName===name)return;registeredName=name;api('/players',{name}).catch(()=>{registeredName='';});}
function prepare(level=1){
 const field=$('#player-name'),name=field.value.trim();
 if(active()&&name&&!validName(name)){field.setAttribute('aria-invalid','true');$('#player-error').hidden=false;$('#player-error').textContent='Use 3–24 English letters, numbers, spaces, dots, underscores or hyphens.';field.focus();return false;}
 attemptName=active()?name:'';field.value=attemptName;$('#ranked-mode').checked=Boolean(attemptName);field.removeAttribute('aria-invalid');$('#player-error').hidden=true;
 if(attemptName)register(attemptName);
 if(embedded){const url=new URL(location.href),next=new URLSearchParams(url.hash.slice(1));next.set('level',String(level));if(attemptName){next.set('ranked','1');next.set('player',attemptName);}else{next.delete('ranked');next.delete('player');}url.hash=next.toString();if(url.href!==location.href)location.replace(url.href);}
 return true;
}
function time(steps){const total=Math.round(steps*1000/35);return Math.floor(total/60000)+':'+String(Math.floor(total/1000)%60).padStart(2,'0')+'.'+String(total%1000).padStart(3,'0');}
function enabled(){return active()&&$('#ranked-mode').checked;}
function status(text){$('#result-score').textContent=text;}
function friendly(e){return ['rate_limited','daily_limit','queue_full'].includes(e.message)?'The score service is busy. Your replay is still here; try Save again shortly.':'Your time has not saved yet. Check your connection, then choose Save again before leaving.';}
async function loadBoard(){
 const sequence=++readSequence;$('#board-status').textContent='Loading leaderboard…';$('#board-rows').replaceChildren();$('#board-refresh').disabled=true;
 try{if(!active())throw Error('offline_copy');const board=await api('/boards');if(sequence!==readSequence)return;
 const entries=(board.entries||[]).filter(e=>Number.isInteger(e.completedLevels)&&e.completedLevels>0&&e.completedLevels<=CLAUS_DATA.levels.length&&Number.isInteger(e.totalSteps)&&e.totalSteps>=e.completedLevels&&e.totalSteps<=cfg.maxSteps*e.completedLevels&&typeof e.name==='string'&&validName(e.name)).slice(0,50);
 for(const [i,e] of entries.entries()){const row=document.createElement('tr');for(const value of [String(i+1),e.name,e.completedLevels+' / '+CLAUS_DATA.levels.length,time(e.totalSteps)]){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}$('#board-rows').append(row);}
 $('#board-status').textContent=entries.length?'Most levels completed first. Faster total time breaks a tie.':'No completed games yet. Enter a name and finish a level to join.';
 }catch(e){if(sequence===readSequence)$('#board-status').textContent=window.__CL_BASE?'The leaderboard needs an internet connection. Open the published game to view it.':'The leaderboard could not load. Check your connection and try Refresh.';}finally{if(sequence===readSequence)$('#board-refresh').disabled=false;}
}
async function check(run=pending){
 if(!run?.saved)return;
 try{const result=await api('/runs/'+run.data.runId);if(run!==pending)return;
 if(result.status==='verified'){status('Saved · '+time(result.steps)+'. Your progress is on the leaderboard.');return;}
 if(result.status==='rejected'){status('This replay could not be verified. You can keep playing.');return;}
 status('Saved · '+time(run.data.steps)+'. Your time will appear after the automatic replay check.');
 }catch{if(run===pending)status('Your time is saved. The leaderboard will update after the replay check.');}
 if(run===pending&&run.polls++<18)pollTimer=setTimeout(()=>check(run),10000);
}
async function save(run=pending){
 if(!run||run.busy||run.saved)return;
 run.busy=true;$('#score-retry').hidden=true;status('Saving your time…');
 try{await api('/runs',run.data);run.saved=true;register(run.data.name);if(run!==pending)return;status('Saved · '+time(run.data.steps)+'. Your time will appear after the automatic replay check.');pollTimer=setTimeout(()=>check(run),10000);}
 catch(e){if(run!==pending)return;status(friendly(e));$('#score-retry').hidden=false;}
 finally{run.busy=false;}
}
function finish(Module,level,won,recorded){
 if(!won||recorded||!enabled())return;
 clearTimeout(pollTimer);$('#result-submit').hidden=false;$('#result-score').hidden=false;
 if(!Module._claus_capture_valid?.()||Module._claus_capture_length()<1){status('This attempt exceeded the replay limit. Your next attempt can still save a time.');return;}
 const bytes=Array.from({length:Module._claus_capture_length()},(_,i)=>Module._claus_capture_byte(i));
 pending={data:{format:'clausplex-rle-v1',gameVersion:cfg.gameVersion,level,levelHash:CLAUS_DATA.levels[level-1].hash,seed:Module._claus_capture_seed(),steps:Module._claus_capture_steps(),replay:btoa(String.fromCharCode(...bytes)),name:playerName(),assisted:false,runId:crypto.randomUUID()},saved:false,busy:false,polls:0};
 save(pending);
}
$('#player-setup').hidden=!active();$('#ranked-link').hidden=active();$('#ranked-link').href=canonical;
// Nickname-only public API: no Claus session, wallet request or host auth handshake.
const route=new URLSearchParams(window.__CL_QUERY||(location.hash.startsWith('#level=')?location.hash.slice(1):location.search));const restoredName=route.has('ranked')?route.get('player')||'':'';$('#player-name').value=validName(restoredName)?restoredName:'';$('#ranked-mode').checked=active()&&validName(restoredName);
$('#result-submit').onclick=()=>$('#board-nav').click();
$('#score-retry').onclick=()=>save();
$('#player-name').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();$('#start').click();}};
$('#player-name').oninput=()=>{$('#ranked-mode').checked=Boolean($('#player-name').value.trim());$('#player-name').removeAttribute('aria-invalid');$('#player-error').hidden=true;};
$('#board-refresh').onclick=loadBoard;
window.ClausRankings={enabled,prepare,playerName,finish,loadBoard,time};
})();
