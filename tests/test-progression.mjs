// Unit-test the delivered result-screen action for every original level.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const file=path.resolve(here,'../docs/app.js');
const source=fs.readFileSync(file,'utf8');
const start=source.indexOf('function showResult('),end=source.indexOf('\nfunction navigate(',start);
if(start<0||end<0)throw Error('Could not locate the delivered result-screen implementation');
const implementation=source.slice(start,end),navigation=source.slice(end+1,source.indexOf('\nvar Module=',end)),results=[];
for(const ranked of [false,true])for(let level=1;level<=37;level++){
 const elements=new Map();let target=null,paused=false;
 const element=selector=>{if(!elements.has(selector))elements.set(selector,{hidden:false,disabled:false,textContent:'',focus(){}});return elements.get(selector);};
 const scope={selected:level,finished:false,diagnostics:{remaining:0},Module:{_claus_pause(value){paused=value===1;}},$:element,clearKeys(){},announce(){},report(){},navigate(...args){target=args;}};
 vm.runInNewContext(implementation+'\nshowResult(true,false);',scope);
 const action=element('#result-action');action.onclick();
 const expected=level===37?1:level+1;
 const routeLocation={href:'https://claus-network-sites.vercel.app/r/fixture/index.html',search:'',reloads:0,reload(){this.reloads++;}};
 const navigationScope={URL,URLSearchParams,location:routeLocation,clampLevel:n=>Math.max(1,Math.min(37,Number(n)||1)),test:false,window:{ClausRankings:{enabled:()=>ranked,playerName:()=>'Test Player'}}};
 vm.runInNewContext(navigation+'\nnavigate('+JSON.stringify(target[0])+',true);',navigationScope);
 const route=new URL(routeLocation.href),fragment=new URLSearchParams(route.hash.slice(1));
 const passed=route.search===''&&fragment.get('level')===String(expected)&&fragment.get('play')==='1'&&fragment.has('ranked')===ranked&&(ranked?fragment.get('player')==='Test Player':!fragment.has('player'))&&routeLocation.reloads===1&&target?.[0]===expected&&target?.[1]===true&&paused&&element('#result').hidden===false&&(level===37?action.textContent.includes('Replay Part I'):action.textContent.includes(String(expected).padStart(3,'0')));
 results.push({level,ranked,expectedNext:expected,actualNext:target?.[0],queryFree:route.search==='',route:route.hash,passed});
}
const report={testedAtUTC:new Date().toISOString(),scope:'Unit check of the delivered result-screen action and real fragment navigation for all 37 levels; DOM and browser Location are stubs, not a rendered browser run.',passed:results.filter(x=>x.passed).length,total:results.length,results};
fs.writeFileSync(path.join(here,'progression-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,total:report.total,queryFree:results.every(r=>r.queryFree)},null,2));
if(report.passed!==74)process.exitCode=1;
