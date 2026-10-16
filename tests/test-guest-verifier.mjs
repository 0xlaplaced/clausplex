import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {processGuests} from '../backend/verify-guests.mjs';
import {catalog} from '../backend/replay.mjs';
const fixtures=JSON.parse(await fs.readFile(new URL('reference-runs.json',import.meta.url),'utf8'));
let checks=0;
for(const level of [1,37,38,74,75,111]){
 const fixture=fixtures[level-1],data={format:'clausplex-rle-v1',gameVersion:catalog.gameVersion,level,levelHash:catalog.levels[level-1].hash,seed:fixture.seed,steps:fixture.steps,replay:fixture.replay,name:'Guest QA '+level,assisted:false,runId:crypto.randomUUID()};
 const invalid={...data,runId:crypto.randomUUID(),steps:0};
 const verdicts=[],request=async(path,body)=>{if(path==='/internal/queue')return {items:[{id:data.runId,data},{id:invalid.runId,data:invalid}]};verdicts.push(body);return {saved:true};};
 const result=await processGuests({request});assert.equal(result.verified,1);assert.equal(result.rejected,1);assert.equal(verdicts[0].assisted,true);assert.equal(verdicts[0].steps,fixture.steps);assert.equal(verdicts[1].status,'rejected');checks+=5;
 let writes=0;await assert.rejects(processGuests({request:async(path)=>path==='/internal/queue'?{items:[{id:data.runId,data}]}:(writes++,{}),verify:async()=>{throw Error('verifier_build_mismatch');}}),/verifier_build_mismatch/);assert.equal(writes,0);checks+=2;
 const empty=await processGuests({request:async()=>({items:[]})});assert.equal(empty.processed,0);checks++;
}
console.log(JSON.stringify({passed:true,checks,realOriginalReplays:[1,37,38,74,75,111]}));
