import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {catalog} from '../backend/replay.mjs';
import {deployment} from '../backend/verify-queue.mjs';
const source=await fs.readFile(new URL('../rankings.js',import.meta.url),'utf8'),fixtures=JSON.parse(await fs.readFile(new URL('reference-runs.json',import.meta.url),'utf8'));
let checks=0;
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function cycle(n){
 const elements=new Map();function el(id){if(['#board-level','#board-category'].includes(id))throw Error('Removed board filter accessed');if(!elements.has(id))elements.set(id,{hidden:false,disabled:false,checked:false,value:'',textContent:'',children:[],attributes:{},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];},focus(){this.focused=true;},click(){this.clicked=true;},append(...x){this.children.push(...x);},replaceChildren(...x){this.children=x;}});return elements.get(id);}
 const calls=[],timers=new Map();let timerId=0,failSave=true,result={status:'queued'},board={entries:[]};
 const context={CLAUS_DATA:{ranking:{...deployment,gameVersion:catalog.gameVersion},levels:catalog.levels.map(x=>({number:x.number,name:'Puzzle',hash:x.hash,rankedSeed:x.seed}))},document:{querySelector:el,createElement:()=>el('node-'+Math.random())},window:{parent:{},__CL_BASE:null},parent:{postMessage(){throw Error('No auth handshake is allowed');}},location:{href:'https://claus-network-sites.vercel.app/r/test/index.html',replace(href){this.href=href;this.hash=new URL(href).hash;},hostname:'claus-network-sites.vercel.app',hash:'#level=1&ranked=1&player='+encodeURIComponent('QA test '+n),search:''},crypto:webcrypto,URL,URLSearchParams,Date,Error,Promise,setTimeout(fn){timers.set(++timerId,fn);return timerId;},clearTimeout(id){timers.delete(id);},AbortSignal,btoa:s=>Buffer.from(s,'binary').toString('base64'),fetch:async(url,options)=>{calls.push({url,options});const path=new URL(url).pathname;if(path==='/runs'&&failSave){failSave=false;throw Error('lost reply');}return {ok:true,json:async()=>path==='/boards'?board:path==='/runs'?{id:JSON.parse(options.body).runId,status:'queued'}:path.startsWith('/runs/')?result:{saved:true}};}};
 context.window.parent=context.parent;
 vm.runInNewContext(source,context);const ui=context.window.ClausRankings;
 const check=(fn)=>{fn();checks++;};
 check(()=>assert.equal(calls.length,0)); // Menu display makes no wallet/session/write request.
 await ui.loadBoard();check(()=>assert.equal(calls.length,1));check(()=>assert.equal(calls[0].url,deployment.scoresOrigin+'/boards'));check(()=>assert.equal(calls[0].options.credentials,'omit'));
 check(()=>assert.equal(ui.enabled(),true));check(()=>assert.equal(el('#player-name').value,'QA test '+n));
 el('#player-name').value='<bad>';check(()=>assert.equal(ui.prepare(),false));check(()=>assert.equal(el('#player-name').attributes['aria-invalid'],'true'));
 el('#player-name').value='';check(()=>assert.equal(ui.prepare(),true));check(()=>assert.equal(ui.enabled(),false));check(()=>assert.equal(calls.filter(x=>x.url.endsWith('/players')).length,0));
 el('#player-name').value='QA test '+n;el('#player-name').oninput();check(()=>assert.equal(ui.prepare(37),true));await tick();check(()=>assert.equal(calls.filter(x=>x.url.endsWith('/players')).length,1));check(()=>assert.equal(new URLSearchParams(new URL(context.location.href).hash.slice(1)).get('player'),'QA test '+n));
 ui.prepare(37);await tick();check(()=>assert.equal(calls.filter(x=>x.url.endsWith('/players')).length,1));
 const f=fixtures[n===1?0:36],bytes=Buffer.from(f.replay,'base64'),engine={_claus_capture_valid:()=>1,_claus_capture_length:()=>bytes.length,_claus_capture_byte:i=>bytes[i],_claus_capture_steps:()=>f.steps,_claus_capture_seed:()=>f.seed};
 ui.finish(engine,f.level,false,false);ui.finish(engine,f.level,true,true);await tick();check(()=>assert.equal(calls.filter(x=>x.url.endsWith('/runs')).length,0));
 ui.finish(engine,f.level,true,false);await tick();const writes=()=>calls.filter(x=>x.url.endsWith('/runs'));check(()=>assert.equal(writes().length,1));check(()=>assert.equal(el('#score-retry').hidden,false));check(()=>assert.match(el('#result-score').textContent,/not saved/));
 await el('#score-retry').onclick();check(()=>assert.equal(writes().length,2));check(()=>assert.equal(writes()[0].options.body,writes()[1].options.body));check(()=>assert.equal(JSON.parse(writes()[1].options.body).replay,f.replay));check(()=>assert.equal(writes()[1].options.keepalive,true));check(()=>assert.match(el('#result-score').textContent,/Saved/));check(()=>assert.equal(el('#score-retry').hidden,true));
 await el('#score-retry').onclick();check(()=>assert.equal(writes().length,2));
 const runPoll=async()=>{const [id,fn]=[...timers][0];timers.delete(id);await fn();};await runPoll();check(()=>assert.match(el('#result-score').textContent,/automatic replay check/));
 result={status:'verified',steps:f.steps,assisted:true};await runPoll();check(()=>assert.match(el('#result-score').textContent,/Saved.*progress is on the leaderboard/));check(()=>assert.equal(timers.size,0));
 el('#result-submit').onclick();check(()=>assert.equal(el('#board-nav').clicked,true));check(()=>assert.equal(elements.has('#board-level'),false));
 board={entries:[{name:'<script>',completedLevels:1,totalSteps:1},{name:'Too Many',completedLevels:38,totalSteps:1125},{name:'Invalid Time',completedLevels:2,totalSteps:1},{name:'Valid Player',completedLevels:2,totalSteps:2250}]};await ui.loadBoard();check(()=>assert.equal(el('#board-rows').children.length,1));check(()=>assert.equal(el('#board-rows').children[0].children[1].textContent,'Valid Player'));
 check(()=>assert.equal(el('#board-rows').children[0].children[2].textContent,'2 / 37'));check(()=>assert.equal(el('#board-rows').children[0].children[3].textContent,ui.time(2250)));
 board={entries:[]};await el('#board-refresh').onclick();check(()=>assert.equal(calls.at(-1).url,deployment.scoresOrigin+'/boards'));check(()=>assert.match(el('#board-status').textContent,/finish a level/));check(()=>assert.equal(el('#board-refresh').disabled,false));
 check(()=>assert.equal(ui.time(1125),'0:32.143'));
 el('#player-name').value='';ui.prepare();const before=writes().length;ui.finish(engine,f.level,true,false);await tick();check(()=>assert.equal(writes().length,before));
 return {cycle:n,noWallet:true,automaticRegistration:true,automaticScore:true,samePayloadAfterLostReply:true,anonymousAndWatchedExcluded:true};
}
const results=[];for(const n of [1,2])results.push(await cycle(n));await fs.writeFile(new URL('rankings-results.json',import.meta.url),JSON.stringify({checks,results},null,2));console.log(JSON.stringify({checks,cycles:results.length}));
