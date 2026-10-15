import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {catalog,validate,verifyReplay,hash} from '../backend/replay.mjs';
import {processQueue,deployment} from '../backend/verify-queue.mjs';
const fixtures=JSON.parse(await fs.readFile(new URL('reference-runs.json',import.meta.url),'utf8'));
const list=Array.isArray(fixtures)?fixtures:fixtures.runs;
const data=(level=1)=>{const f=list.find(x=>x.level===level);return {format:'clausplex-rle-v1',gameVersion:catalog.gameVersion,level,levelHash:catalog.levels[level-1].hash,seed:f.seed,steps:f.steps,replay:f.replay,name:'QA original solve',runId:randomUUID(),assisted:false};};
let checks=0;const ok=(value)=>{assert.ok(value);checks++;};
for(const patch of [{level:38},{levelHash:'0'.repeat(64)},{seed:0},{gameVersion:'old'},{steps:1},{name:'<script>'},{name:' ab '},{replay:'!!!'},{replay:Buffer.from([15]).toString('base64')},{assisted:'false'},{runId:'wrong'},{extra:1},{replay:''},{replay:'A'.repeat(5500)}]){assert.throws(()=>validate({...data(),...patch}));checks++;}
await assert.rejects(verifyReplay({...data(),replay:Buffer.from([0]).toString('base64'),steps:1}));checks++;
await assert.rejects(verifyReplay(data(),{timeout:1}),/verification_timeout/);checks++;
// Faithful storage stub: author and revision are server-owned; keys are immutable.
function store(runs=[]){let serial=0;const rows={runs,receipts:[],boards:[]},keys=new Map();return {rows,failBoard:false,loseReceiptReply:false,async me(){return {id:deployment.verifierId};},async records(c){return structuredClone(rows[c]);},async create(c,d,k){if(keys.has(k))return structuredClone(keys.get(k));if(c==='boards'&&this.failBoard){this.failBoard=false;throw Error('storage_unavailable');}const row={id:'record_'+(++serial),authorId:deployment.verifierId,revision:1,createdAt:Date.now(),data:structuredClone(d)};rows[c].push(row);keys.set(k,row);if(c==='receipts'&&this.loseReceiptReply){this.loseReceiptReply=false;throw Error('reply_lost');}return structuredClone(row);},async update(c,r,d){const row=rows[c].find(x=>x.id===r.id);assert.equal(row.revision,r.revision);row.revision++;row.data=structuredClone(d);return structuredClone(row);}};}
const at=Date.UTC(2026,9,15,12);let sequence=0;
const run=(player='alice',offset=0,patch={})=>({id:'run_'+(++sequence),authorId:player,createdAt:at+offset,data:{...data(),...patch}});
const verify=async d=>({steps:100,replayHash:hash(d.level+':'+d.replay),assisted:d.assisted});
const runQueue=(client)=>processQueue({client,verify,now:at+3600000});
let s=store([run()]);let r=await runQueue(s);ok(r.verified===1&&s.rows.boards[0].data.entries[0].steps===100);await runQueue(s);ok(s.rows.receipts.length===1&&s.rows.boards.length===1);
s.rows.runs.push(run('alice',60000));r=await runQueue(s);ok(r.duplicate===1&&s.rows.boards[0].data.entries.length===1);
s=store([run()]);s.failBoard=true;await assert.rejects(runQueue(s),/storage_unavailable/);await runQueue(s);ok(s.rows.receipts.length===1&&s.rows.boards.length===1);
s=store([run()]);s.loseReceiptReply=true;await assert.rejects(runQueue(s),/reply_lost/);await runQueue(s);ok(s.rows.receipts.length===1&&s.rows.boards.length===1);
s=store([run('alice',0),run('alice',1000),run('alice',120000),run('bob',0)]);r=await runQueue(s);ok(r.processed===3&&r.pending===1&&r.rejected===1);await runQueue(s);ok(s.rows.receipts.length===4);
s=store(Array.from({length:7},(_,i)=>run('alice',i*60000,{level:i+1,levelHash:catalog.levels[i].hash,seed:catalog.levels[i].seed,...(()=>{const d=data(i+1);return {steps:d.steps,replay:d.replay};})()})));for(let i=0;i<4;i++)await runQueue(s);ok(s.rows.receipts.filter(x=>x.data.reason==='daily_submission_limit').length===1);
s=store([run()]);s.rows.receipts.push({id:'forged',authorId:'attacker',data:{submissionId:s.rows.runs[0].id,outcome:'verified',gameVersion:catalog.gameVersion,level:1,playerId:'attacker',steps:1}});s.rows.boards.push({id:'forged-board',authorId:'attacker',data:{gameVersion:catalog.gameVersion,level:1,entries:[]}});await runQueue(s);ok(s.rows.receipts.length===2&&s.rows.boards.length===2&&s.rows.boards[1].data.entries[0].steps===100);
s=store([run('alice',0,{steps:1})]);r=await runQueue(s);ok(r.rejected===1&&s.rows.boards.length===0);
s=store([run('alice',0,{assisted:true}),run('bob')]);await runQueue(s);ok(s.rows.boards[0].data.entries.length===2&&s.rows.boards[0].data.entries.some(x=>x.assisted));
s=store(Array.from({length:25},(_,i)=>run('player_'+i)));await processQueue({client:s,verify,max:30,now:at+3600000});ok(s.rows.boards[0].data.entries.length===10);
s=store([run()]);await runQueue(s);s.rows.runs[0].data.steps=1;await runQueue(s);ok(s.rows.receipts.length===1&&s.rows.boards[0].data.entries[0].steps===100);
const cycle=Number(process.argv[2]||1),results=[];
for(const f of list){const d=data(f.level),v=await verifyReplay(d);assert.equal(v.steps,f.steps);assert.equal(v.assisted,true);assert.equal(v.replayHash,catalog.levels[f.level-1].referenceReplayHash);results.push({level:f.level,steps:v.steps,verified:true,assisted:true});console.log('Cycle '+cycle+' / level '+f.level+' verified');}
await fs.writeFile(new URL('verifier-cycle-'+cycle+'-results.json',import.meta.url),JSON.stringify({cycle,checks,replays:results.length,results},null,2));console.log(JSON.stringify({cycle,checks,replays:results.length}));
