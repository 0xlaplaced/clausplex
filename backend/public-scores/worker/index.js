// Public nickname leaderboard. Nicknames are display labels, not verified identities.
const NAME=/^[A-Za-z0-9][A-Za-z0-9 ._-]{2,23}$/;
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const origin='https://claus.si';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
const fail=(code,status=400)=>{throw Object.assign(Error(code),{status});};
async function body(request){
 if(!request.headers.get('content-type')?.startsWith('application/json'))fail('json_required',415);
 if(Number(request.headers.get('content-length')||0)>8000)fail('request_too_large',413);
 const reader=request.body?.getReader();if(!reader)fail('invalid_json');let text='',size=0;const decoder=new TextDecoder();
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>8000){await reader.cancel();fail('request_too_large',413);}text+=decoder.decode(value,{stream:true});}
 try{return JSON.parse(text+decoder.decode());}catch{fail('invalid_json');}
}
async function digest(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
function authorized(request,env){if(!env.VERIFIER_KEY||request.headers.get('Authorization')!=='Bearer '+env.VERIFIER_KEY)fail('unauthorized',401);}
async function rate(request,env,bucket,max){
 // Daily salted network bucket; raw IP addresses are never stored.
 const day=Math.floor(Date.now()/86400000),ip=request.headers.get('cf-connecting-ip')||'unknown';
 const id=await digest(env.VERIFIER_KEY+':'+day+':'+bucket+':'+ip);
 const result=await env.DB.prepare('INSERT INTO limits (id,count,day) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count').bind(id,day).first();
 if(result.count>max)fail('rate_limited',429);
}
function validate(data,catalog){
 const keys=['format','gameVersion','level','levelHash','seed','steps','replay','name','runId','assisted'].sort();
 if(!data||Array.isArray(data)||Object.keys(data).sort().join()!==keys.join())fail('invalid_fields');
 if(data.format!=='clausplex-rle-v1'||data.gameVersion!==catalog.gameVersion)fail('unsupported_game_version');
 if(!Number.isInteger(data.level)||data.level<1||data.level>37)fail('invalid_level');
 const level=catalog.levels[data.level-1];if(data.levelHash!==level.hash||data.seed!==level.seed)fail('level_or_seed_mismatch');
 if(typeof data.name!=='string'||!NAME.test(data.name)||data.name!==data.name.trim())fail('invalid_display_name');
 if(typeof data.assisted!=='boolean'||typeof data.runId!=='string'||!UUID.test(data.runId))fail('invalid_run_identity');
 if(typeof data.replay!=='string'||data.replay.length>5464||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data.replay))fail('invalid_replay_encoding');
 const bytes=atob(data.replay);if(!bytes.length||bytes.length>4096||btoa(bytes)!==data.replay)fail('invalid_replay_size');
 let steps=0;for(const char of bytes){const byte=char.charCodeAt(0);if((byte&15)>9)fail('invalid_input');steps+=(byte>>4)+1;}
 if(steps>126000||data.steps!==steps)fail('invalid_step_count');
}
export function createWorker(catalog){return {async fetch(request,env){try{
 const url=new URL(request.url),path=url.pathname;
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(path==='/'&&request.method==='GET')return json({service:'Clausplex Scores',game:origin+'/c/clausplex',mode:'nickname-only'});
 if(!env.DB||!env.VERIFIER_KEY)fail('service_unavailable',503);
 if(path==='/players'&&request.method==='POST'){
  const data=await body(request);if(Object.keys(data).sort().join()!=='name'||typeof data.name!=='string'||!NAME.test(data.name)||data.name!==data.name.trim())fail('invalid_display_name');
  await rate(request,env,'players',120);const nameKey=data.name.toLowerCase();
  await env.DB.prepare('INSERT INTO players (name_key,name,first_seen,last_seen) VALUES (?,?,?,?) ON CONFLICT(name_key) DO UPDATE SET last_seen=excluded.last_seen').bind(nameKey,data.name,Date.now(),Date.now()).run();
  return json({saved:true,name:data.name});
 }
 if(path==='/runs'&&request.method==='POST'){
  const data=await body(request);validate(data,catalog);const serialized=JSON.stringify(data),fingerprint=await digest(serialized);
  const old=await env.DB.prepare('SELECT fingerprint,status,steps,assisted,reason FROM runs WHERE id=?').bind(data.runId).first();
  if(old){if(old.fingerprint!==fingerprint)fail('idempotency_conflict',409);return json({id:data.runId,status:old.status,steps:old.steps,assisted:Boolean(old.assisted),reason:old.reason});}
  await rate(request,env,'runs',180);
  const now=Date.now(),nameKey=data.name.toLowerCase();
  const counts=await env.DB.prepare('SELECT COUNT(*) AS total,SUM(status=\'queued\') AS pending FROM runs').first();
  if(counts.total>=50000||counts.pending>=500)fail('queue_full',429);
  const recent=await env.DB.prepare('SELECT COUNT(*) AS count FROM runs WHERE name_key=? AND created_at>?').bind(nameKey,now-86400000).first();if(recent.count>=90)fail('daily_limit',429);
  await env.DB.prepare('INSERT INTO runs (id,name_key,name,level,payload,fingerprint,created_at,status) VALUES (?,?,?,?,?,?,?,\'queued\') ON CONFLICT(id) DO NOTHING').bind(data.runId,nameKey,data.name,data.level,serialized,fingerprint,now).run();
  const saved=await env.DB.prepare('SELECT fingerprint FROM runs WHERE id=?').bind(data.runId).first();if(saved.fingerprint!==fingerprint)fail('idempotency_conflict',409);
  return json({id:data.runId,status:'queued'},202);
 }
 if(path==='/boards'&&request.method==='GET'){
  if(!url.searchParams.has('level')){
   const {results}=await env.DB.prepare(`WITH best AS (
    SELECT name_key,level,MIN(steps) AS steps FROM runs
    WHERE status='verified' AND level BETWEEN 1 AND 37 GROUP BY name_key,level
   ), totals AS (
    SELECT name_key,COUNT(*) AS completedLevels,SUM(steps) AS totalSteps FROM best GROUP BY name_key
   ), names AS (
    SELECT name_key,name,ROW_NUMBER() OVER (PARTITION BY name_key ORDER BY created_at DESC,id) AS latest
    FROM runs WHERE status='verified'
   ) SELECT names.name,totals.completedLevels,totals.totalSteps FROM totals
   JOIN names ON names.name_key=totals.name_key AND names.latest=1
   ORDER BY totals.completedLevels DESC,totals.totalSteps,totals.name_key LIMIT 50`).all();
   return json({entries:results});
  }
  const level=Number(url.searchParams.get('level')),assisted=url.searchParams.get('assisted')==='true'?1:0;
  if(!Number.isInteger(level)||level<1||level>37)fail('invalid_level');
  const {results}=await env.DB.prepare('SELECT name,steps,id AS receiptId FROM (SELECT name,steps,id,ROW_NUMBER() OVER (PARTITION BY name_key ORDER BY steps,id) AS best FROM runs WHERE status=\'verified\' AND level=? AND assisted=?) WHERE best=1 ORDER BY steps,id LIMIT 10').bind(level,assisted).all();
  return json({entries:results});
 }
 if(path.startsWith('/runs/')&&request.method==='GET'){
  const id=path.slice(6);if(!UUID.test(id))fail('not_found',404);
  const row=await env.DB.prepare('SELECT status,steps,assisted,reason FROM runs WHERE id=?').bind(id).first();if(!row)fail('not_found',404);
  return json({id,...row,assisted:Boolean(row.assisted)});
 }
 if(path==='/internal/queue'&&request.method==='GET'){
  authorized(request,env);const {results}=await env.DB.prepare('SELECT id,payload FROM runs WHERE status=\'queued\' ORDER BY created_at,id LIMIT 20').all();
  return json({items:results.map(row=>({id:row.id,data:JSON.parse(row.payload)}))});
 }
 if(path==='/internal/verdict'&&request.method==='POST'){
  authorized(request,env);const d=await body(request);if(!UUID.test(d.id)||!['verified','rejected'].includes(d.status)||!Number.isInteger(d.steps)||d.steps<0||d.steps>126000||typeof d.assisted!=='boolean'||typeof d.reason!=='string'||!/^[a-z_]{0,80}$/.test(d.reason))fail('invalid_verdict');
  if(d.status==='verified'&&(d.steps<1||d.reason))fail('invalid_verdict');
  const row=await env.DB.prepare('SELECT status FROM runs WHERE id=?').bind(d.id).first();if(!row)fail('not_found',404);
  if(row.status==='queued')await env.DB.prepare('UPDATE runs SET status=?,steps=?,assisted=?,reason=? WHERE id=? AND status=\'queued\'').bind(d.status,d.steps,d.assisted?1:0,d.reason,d.id).run();
  // Keep daily rate data bounded. Scores and registrations remain durable.
  await env.DB.prepare('DELETE FROM limits WHERE day<?').bind(Math.floor(Date.now()/86400000)-2).run();
  return json({saved:true});
 }
 return json({error:'not_found'},404);
 }catch(error){return json({error:error.status?error.message:'service_unavailable'},error.status||503);}}};}
// CATALOG is injected by the deterministic build.
