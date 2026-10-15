import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {catalog} from '../backend/replay.mjs';
import {deployment} from '../backend/verify-queue.mjs';
const source=await fs.readFile(new URL('../rankings.js',import.meta.url),'utf8'),fixtures=JSON.parse(await fs.readFile(new URL('reference-runs.json',import.meta.url),'utf8'));
let checks=0;
async function cycle(n){
 const elements=new Map();function el(id){if(!elements.has(id))elements.set(id,{hidden:false,disabled:false,checked:false,value:'',textContent:'',children:[],append(...x){this.children.push(...x);},replaceChildren(...x){this.children=x;}});return elements.get(id);}
 const rows={boards:[],receipts:[]},writes=[];let connected=false,loseReply=true;
 class Channel{constructor(){this.port1={postMessage:m=>{queueMicrotask(()=>{let data,error;if(m.operation==='session')data={connected};else{writes.push(m.input);if(loseReply){loseReply=false;error='outcome_unknown_read_before_retry';}else data={id:'saved-run',authorId:'tester'};}this.port1.onmessage({data:{type:'claus:app-result',id:m.id,data,error}});});}};this.port2={};}}
 const context={CLAUS_DATA:{ranking:{...deployment,gameVersion:catalog.gameVersion},levels:catalog.levels.map(x=>({number:x.number,name:'Puzzle',hash:x.hash,rankedSeed:x.seed}))},document:{querySelector:el,createElement:()=>el('node-'+Math.random())},window:{parent:{},__CL_BASE:null},parent:{postMessage(){}},location:{hostname:'claus-network-sites.vercel.app',hash:'#level=1&ranked=1',search:''},MessageChannel:Channel,crypto:webcrypto,URLSearchParams,Date,Error,Promise,setTimeout,clearTimeout,AbortSignal,btoa:s=>Buffer.from(s,'binary').toString('base64'),fetch:async url=>({ok:true,json:async()=>({items:rows[new URL(url).searchParams.get('collection')],nextCursor:null})})};
 context.window.parent=context.parent;el('#board-level').value='1';el('#board-category').value='standard';
 vm.runInNewContext(source,context);const ui=context.window.ClausRankings;
 assert.equal(ui.enabled(),true);checks++;
 const f=fixtures[n===1?0:36],bytes=Buffer.from(f.replay,'base64'),engine={_claus_capture_valid:()=>1,_claus_capture_length:()=>bytes.length,_claus_capture_byte:i=>bytes[i],_claus_capture_steps:()=>f.steps,_claus_capture_seed:()=>f.seed};
 ui.finish(engine,f.level,true,false);assert.equal(el('#rank-result').hidden,false);checks++;
 el('#rank-name').value='QA test '+n;el('#rank-consent').checked=false;await el('#rank-form').onsubmit({preventDefault(){}});assert.equal(writes.length,0);checks++;
 el('#rank-consent').checked=true;await el('#rank-form').onsubmit({preventDefault(){}});assert.match(el('#rank-status').textContent,/Sign in/);assert.equal(writes.length,0);checks++;
 connected=true;await el('#rank-form').onsubmit({preventDefault(){}});assert.match(el('#rank-status').textContent,/timed out/);checks++;
 await el('#rank-form').onsubmit({preventDefault(){}});assert.equal(writes[0].idempotencyKey,writes[1].idempotencyKey);assert.deepEqual(writes[0].data,writes[1].data);assert.equal(writes[1].data.replay,f.replay);assert.equal(el('#rank-check').hidden,false);checks++;
 await el('#rank-check').onclick();assert.match(el('#rank-status').textContent,/Queued/);checks++;
 rows.receipts.push({authorId:'attacker',data:{submissionId:'saved-run',gameVersion:catalog.gameVersion,outcome:'verified',steps:1}});await el('#rank-check').onclick();assert.match(el('#rank-status').textContent,/Queued/);checks++;
 rows.receipts.push({authorId:deployment.verifierId,data:{submissionId:'saved-run',gameVersion:catalog.gameVersion,outcome:'verified',steps:f.steps,assisted:true}});await el('#rank-check').onclick();assert.match(el('#rank-status').textContent,/Verified.*Assisted/);checks++;
 rows.boards.push({authorId:'attacker',data:{gameVersion:catalog.gameVersion,level:1,entries:[{name:'Fake',steps:1,assisted:false,receiptId:'fake'}]}});await ui.loadBoard();assert.equal(el('#board-rows').children.length,0);checks++;
 rows.boards.push({authorId:deployment.verifierId,data:{gameVersion:catalog.gameVersion,level:1,entries:[{name:'Real',steps:1125,assisted:false,receiptId:'real'}]}});await ui.loadBoard();assert.equal(el('#board-rows').children.length,1);checks++;
 el('#board-category').value='assisted';await ui.loadBoard();assert.equal(el('#board-rows').children.length,0);checks++;
 assert.equal(ui.time(1125),'0:32.143');checks++;
 return {cycle:n,uiConsent:true,signInRequired:true,sameKeyAfterUnknownOutcome:true,recordedReplayUnchanged:true,pending:true,trustedReceipt:true,forgedAuthorIgnored:true,publicBoard:true};
}
const results=[];for(const n of [1,2])results.push(await cycle(n));await fs.writeFile(new URL('rankings-results.json',import.meta.url),JSON.stringify({checks,results},null,2));console.log(JSON.stringify({checks,cycles:results.length}));
