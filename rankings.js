(()=>{
'use strict';
const $=s=>document.querySelector(s),cfg=CLAUS_DATA.ranking,canonical='https://claus.si/c/clausplex';
const embedded=window.parent!==window&&location.hostname==='claus-network-sites.vercel.app'&&!window.__CL_BASE,active=()=>embedded&&Date.now()<cfg.verifierExpiresAt;
let client,pending,readSequence=0;
function app(){
 if(client)return client;
 const channel=new MessageChannel(),requests=new Map();
 channel.port1.onmessage=({data:m})=>{if(m?.type!=='claus:app-result')return;const r=requests.get(m.id);if(!r)return;requests.delete(m.id);clearTimeout(r.timer);m.error?r.reject(Error(m.error)):r.resolve(m.data);};
 parent.postMessage({type:'claus:app-connect'},'https://claus.si',[channel.port2]);
 client={call(operation,input={}){return new Promise((resolve,reject)=>{if(requests.size>=4)return reject(Error('too_many_requests'));const id=crypto.randomUUID(),timer=setTimeout(()=>{requests.delete(id);reject(Error('outcome_unknown_read_before_retry'));},22000);requests.set(id,{resolve,reject,timer});channel.port1.postMessage({type:'claus:app-call',id,operation,input});});}};
 return client;
}
async function records(collection){
 const rows=[],seen=new Set();let after;
 do{const q=new URLSearchParams({collection,authorId:cfg.verifierId,limit:'100',...(after?{after}:{})});const r=await fetch(cfg.origin+'/v1/public/apps/'+cfg.projectId+'/records?'+q,{credentials:'omit',redirect:'error',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('read_failed');const page=await r.json();if(!Array.isArray(page.items))throw Error('read_failed');rows.push(...page.items.filter(x=>x.authorId===cfg.verifierId));after=page.nextCursor;if(after&&seen.has(after)||seen.size>60)throw Error('read_failed');seen.add(after);}while(after);
 return rows;
}
function time(steps){const total=Math.round(steps*1000/35);return Math.floor(total/60000)+':'+String(Math.floor(total/1000)%60).padStart(2,'0')+'.'+String(total%1000).padStart(3,'0');}
function enabled(){return active()&&$('#ranked-mode').checked;}
function status(text){$('#rank-status').textContent=text;}
function friendly(e){return ({sign_in_required:'Use Sign in on the Claus page, then try again. No transaction is needed.',app_session_expired:'Your session expired. Sign in on Claus again, then retry.',session_expired:'Your session expired. Sign in on Claus again, then retry.',outcome_unknown_read_before_retry:'The reply timed out. Check verification first, or retry this same submission; its request key is preserved.',quota_exceeded:'The app quota is full. Try again later.',rate_limited:'Too many requests. Wait a minute, then retry.'})[e.message]||'Could not reach Claus. Check your connection and sign-in, then retry the same submission.';}
async function loadBoard(){
 const sequence=++readSequence,level=Number($('#board-level').value),assisted=$('#board-category').value==='assisted';$('#board-status').textContent='Loading verified times…';$('#board-rows').replaceChildren();$('#board-refresh').disabled=true;
 try{const boards=await records('boards');if(sequence!==readSequence)return;const board=boards.filter(x=>x.data?.gameVersion===cfg.gameVersion&&x.data.level===level).sort((a,b)=>b.updatedAt-a.updatedAt)[0];const entries=(board?.data.entries||[]).filter(e=>e.assisted===assisted&&Number.isInteger(e.steps)&&e.steps>0&&e.steps<=cfg.maxSteps&&typeof e.name==='string'&&e.name.length<=24&&typeof e.receiptId==='string').slice(0,10);
 for(const [i,e] of entries.entries()){const row=document.createElement('tr');for(const value of [String(i+1),e.name,time(e.steps)]){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}$('#board-rows').append(row);}
 $('#board-status').textContent=entries.length?'Top verified times for this level.':'No verified times here yet. Find a way through.';
 }catch(e){if(sequence===readSequence)$('#board-status').textContent=window.__CL_BASE?'Leaderboards need an internet connection. Open the published game to view times.':'Times could not load. Check your connection and try Refresh.';}finally{if(sequence===readSequence)$('#board-refresh').disabled=false;}
}
async function check(){
 if(!pending?.record)return;$('#rank-check').disabled=true;status('Checking verification…');
 try{const result=(await records('receipts')).find(r=>r.data?.submissionId===pending.record.id&&r.data.gameVersion===cfg.gameVersion);
 if(!result){status('Queued. Verification usually takes a few minutes; GitHub may delay scheduled runs. You can leave this page.');return;}
 if(result.data.outcome==='verified'){status('Verified · '+time(result.data.steps)+(result.data.assisted?' · Assisted / original solve':' · Standard')+'. Your best time is on the leaderboard.');$('#rank-check').hidden=true;}
 else status(result.data.outcome==='duplicate'?'This replay is already verified. Your existing best time is kept.':'Verification rejected: '+String(result.data.reason).replaceAll('_',' ')+'.');
 }catch(e){status('Could not check verification. Your submitted replay remains queued. Try again later.');}finally{$('#rank-check').disabled=false;}
}
async function submit(event){
 event.preventDefault();if(!pending)return;
 if(!active()){status('Ranked submission is unavailable here. Open Claus, or wait for verifier renewal.');return;}
 if(!$('#rank-consent').checked){status('Confirm that your name and replay will be public.');return;}
 const name=$('#rank-name').value.trim();if(!/^[A-Za-z0-9][A-Za-z0-9 ._-]{2,23}$/.test(name)){status('Use 3–24 English letters, numbers, spaces, dots, underscores or hyphens.');return;}
 // Freeze the payload and key before the first write; uncertain replies never create a second run.
 $('#rank-save').disabled=true;status('Submitting replay…');
 try{const session=await app().call('session');if(!session.connected)throw Error('sign_in_required');pending.data??={...pending.capture,name,assisted:$('#rank-assisted').checked,runId:crypto.randomUUID()};$('#rank-name').disabled=true;$('#rank-assisted').disabled=true;pending.record=await app().call('app_record_create',{collection:'runs',data:pending.data,idempotencyKey:'run:'+pending.data.runId});$('#rank-save').hidden=true;$('#rank-check').hidden=false;status('Queued for server replay. Check verification in a few minutes. No transaction was sent.');}
 catch(e){status(friendly(e));}finally{$('#rank-save').disabled=false;}
}
function finish(Module,level,won,recorded){
 if(!won||recorded||!enabled())return;
 const section=$('#rank-result');section.hidden=false;
 if(!Module._claus_capture_valid?.()||Module._claus_capture_length()<1){status('This replay exceeded the recording limit and cannot be submitted. You can still keep playing.');$('#rank-form').hidden=true;return;}
 const bytes=Array.from({length:Module._claus_capture_length()},(_,i)=>Module._claus_capture_byte(i));
 pending={capture:{format:'clausplex-rle-v1',gameVersion:cfg.gameVersion,level,levelHash:CLAUS_DATA.levels[level-1].hash,seed:Module._claus_capture_seed(),steps:Module._claus_capture_steps(),replay:btoa(String.fromCharCode(...bytes))}};
 $('#rank-summary').textContent='Recorded time · '+time(pending.capture.steps)+'. The server will replay your inputs before publishing a time.';
 status('Choose a public name and submit when you are ready. Leaving now discards this unsent replay.');
}
$('#ranked-option').hidden=!active();$('#ranked-link').hidden=active();$('#ranked-link').href=canonical;
if(embedded&&!window.__CL_BASE){app();}
const route=new URLSearchParams(window.__CL_QUERY||(location.hash.startsWith('#level=')?location.hash.slice(1):location.search));$('#ranked-mode').checked=active()&&route.has('ranked');
for(const level of CLAUS_DATA.levels){const o=document.createElement('option');o.value=level.number;o.textContent=String(level.number).padStart(3,'0')+' · '+level.name;$('#board-level').append(o);}
$('#board-level').value=route.get('level')||1;$('#board-level').onchange=loadBoard;$('#board-category').onchange=loadBoard;$('#board-refresh').onclick=loadBoard;$('#rank-form').onsubmit=submit;$('#rank-check').onclick=check;
window.ClausRankings={enabled,finish,loadBoard,time};
})();
