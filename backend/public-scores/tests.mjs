import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {createWorker} from './worker/index.js';
const catalog=JSON.parse(await fs.readFile('worker/catalog.json','utf8'));
const sql=await fs.readFile('drizzle/0000_scores.sql','utf8');
const reports=[];
for(let cycle=1;cycle<=2;cycle++){
 const db=new DatabaseSync(':memory:');db.exec(sql);
 const DB={prepare(sql){const statement=db.prepare(sql);let values=[];const wrapper={bind(...args){values=args;return wrapper;},async first(){return statement.get(...values)||null;},async all(){return {results:statement.all(...values)};},async run(){return statement.run(...values);}};return wrapper;}};
 const worker=createWorker(catalog),env={DB,VERIFIER_KEY:'local-test-only-key'};
 const call=async(path,method='GET',data,key)=>{const response=await worker.fetch(new Request('https://scores.example'+path,{method,headers:{'Content-Type':'application/json',...(key?{Authorization:'Bearer '+key}:{})},...(data?{body:JSON.stringify(data)}:{})}),env);return {status:response.status,data:await response.json()};};
 let checks=0;const equal=(a,b)=>{assert.deepEqual(a,b);checks++;};
 equal((await call('/players','POST',{name:'Tester One'})).status,200);
 equal((await call('/players','POST',{name:'tester one'})).status,200);equal(db.prepare('SELECT COUNT(*) AS n FROM players').get().n,1);
 equal((await call('/players','POST',{name:'<script>alert(1)</script>'})).status,400);
 equal((await call('/boards?level=1')).data.entries,[]);
 const data={format:'clausplex-rle-v1',gameVersion:catalog.gameVersion,level:1,levelHash:catalog.levels[0].hash,seed:catalog.levels[0].seed,steps:1,replay:'AA==',name:'Tester One',runId:crypto.randomUUID(),assisted:false};
 equal((await call('/runs','POST',data)).status,202);
 equal((await call('/runs','POST',data)).status,200);equal(db.prepare('SELECT COUNT(*) AS n FROM runs').get().n,1);
 equal((await call('/runs','POST',{...data,steps:2,replay:'EA=='})).status,409);
 equal((await call('/boards?level=1')).data.entries,[]); // Unverified time must never reach board.
 equal((await call('/internal/queue')).status,401);
 equal((await call('/internal/verdict','POST',{id:data.runId,status:'verified',steps:1,reason:'',assisted:false})).status,401);
 equal((await call('/internal/queue','GET',null,env.VERIFIER_KEY)).data.items[0].data,data);
 equal((await call('/internal/verdict','POST',{id:data.runId,status:'verified',steps:1,reason:'',assisted:false},env.VERIFIER_KEY)).status,200);
 equal((await call('/boards?level=1')).data.entries[0].name,data.name);
 equal((await call('/runs/'+data.runId)).data.status,'verified');
 equal((await call('/boards?level=1&assisted=true')).data.entries,[]);
 equal((await call('/internal/queue','GET',null,env.VERIFIER_KEY)).data.items,[]);
 equal((await call('/runs','POST',{...data,runId:crypto.randomUUID(),seed:0})).status,400);
 equal((await call('/runs','POST',{...data,runId:crypto.randomUUID(),steps:0})).status,400);
 equal((await call('/runs','POST',{...data,runId:crypto.randomUUID(),replay:'****'})).status,400);
 equal((await call('/runs','POST',{...data,runId:crypto.randomUUID(),name:'ab'})).status,400);
 equal((await call('/runs','POST',{...data,runId:crypto.randomUUID(),admin:true})).status,400);
 equal((await call('/boards?level=38')).status,400);
 equal((await call('/internal/verdict','POST',{id:data.runId,status:'verified',steps:0,reason:'',assisted:false},env.VERIFIER_KEY)).status,400);
 const huge=await worker.fetch(new Request('https://scores.example/runs',{method:'POST',headers:{'Content-Type':'application/json'},body:'x'.repeat(8100)}),env);equal(huge.status,413);
 // Nickname best-time grouping is case-insensitive; categories remain separate.
 const data2={...data,runId:crypto.randomUUID(),name:'tester one',replay:'EA==',steps:2};await call('/runs','POST',data2);await call('/internal/verdict','POST',{id:data2.runId,status:'verified',steps:2,reason:'',assisted:false},env.VERIFIER_KEY);
 equal((await call('/boards?level=1')).data.entries.length,1);equal((await call('/boards?level=1')).data.entries[0].steps,1);
 const data3={...data,runId:crypto.randomUUID(),name:'Assisted QA',assisted:true};await call('/runs','POST',data3);await call('/internal/verdict','POST',{id:data3.runId,status:'verified',steps:1,reason:'',assisted:true},env.VERIFIER_KEY);
 equal((await call('/boards?level=1&assisted=true')).data.entries[0].name,'Assisted QA');
 // A rejected replay is recorded but cannot enter either table.
 const data4={...data,runId:crypto.randomUUID(),name:'Rejected QA'};await call('/runs','POST',data4);await call('/internal/verdict','POST',{id:data4.runId,status:'rejected',steps:0,reason:'replay_not_a_valid_win',assisted:false},env.VERIFIER_KEY);equal((await call('/boards?level=1')).data.entries.length,1);
 db.close();reports.push({cycle,checks});
}
console.log(JSON.stringify({passed:true,reports}));
