import fs from 'node:fs';import {fileURLToPath} from 'node:url';import vm from 'node:vm';import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url)),source=fs.readFileSync(root+'app.js','utf8'),loader=source.slice(source.indexOf('let engineLoadPromise=null;'),source.indexOf('async function start(){'));
const data=JSON.parse(fs.readFileSync(root+'docs/data.js','utf8').replace('const CLAUS_DATA=','').slice(0,-1));
function setup(){const scripts=[],context=vm.createContext({window:{},CLAUS_DATA:data,document:{createElement(){return {dataset:{}};},body:{appendChild(s){scripts.push(s);}}}});vm.runInContext(loader,context);return {scripts,context,load:()=>vm.runInContext('loadEngineParts()',context)};}
const checks=[];const check=(name,fn)=>{fn();checks.push({name,passed:true});};
let t=setup(),pending=t.load(),again=t.load();
check('Concurrent calls share one loader request',()=>assert.equal(pending,again));
check('All four parts start in parallel',()=>assert.equal(t.scripts.length,4));
for(const i of [3,1,2,0]){vm.runInContext(fs.readFileSync(root+'docs/engine-'+i+'.js','utf8'),t.context);t.scripts[i].onload();}
await pending;
check('Out-of-order downloads reproduce the exact engine source',()=>assert.equal(vm.runInContext('window.__ospSourceParts.join("")',t.context),fs.readFileSync(root+'build/game.js','utf8')));
await t.load();check('Already loaded parts are reused',()=>assert.equal(t.scripts.length,4));
t=setup();pending=t.load();t.scripts[0].onerror();await assert.rejects(pending);checks.push({name:'Failed downloads reject without a hang',passed:true});
pending=t.load();check('Failure permits a fresh retry',()=>assert.equal(t.scripts.length,8));
for(const i of [2,0,3,1]){vm.runInContext(fs.readFileSync(root+'docs/engine-'+i+'.js','utf8'),t.context);t.scripts[4+i].onload();}await pending;checks.push({name:'The retry finishes successfully',passed:true});
const report={passed:checks.length,total:checks.length,checks,scope:'Unit tests of the delivered loader and actual engine-part wrappers; no engine execution or network.'};fs.writeFileSync(root+'tests/loader-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
