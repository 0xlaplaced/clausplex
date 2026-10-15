import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const site=path.join(root,'site');
const scripts=html=>[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
let checked=0;
const engineContext={window:{}};
for(const f of fs.readdirSync(path.join(site,'game')).filter(f=>f.endsWith('.js'))){new vm.Script(fs.readFileSync(path.join(site,'game',f),'utf8'),{filename:f});checked++;}
for(const f of fs.readdirSync(path.join(site,'game')).filter(f=>/^engine-\d+\.js$/.test(f)).sort())vm.runInNewContext(fs.readFileSync(path.join(site,'game',f),'utf8'),engineContext);
new vm.Script(engineContext.window.__ospSourceParts.join(''),{filename:'joined-engine'});checked++;
const offline=fs.readFileSync(path.join(site,'clausplex.html'),'utf8');
const outer=scripts(offline);if(outer.length!==1)throw Error('Expected one wrapper script');
new vm.Script(outer[0],{filename:'offline-wrapper'});
const frame={contentWindow:{}};let listener;
const context={document:{querySelector:()=>frame},location:{href:'file:///preview/clausplex.html?level=80&play=1',search:'?level=80&play=1'},addEventListener:(type,fn)=>{if(type==='message')listener=fn;},JSON};
vm.runInNewContext(outer[0],context);
if(!frame.srcdoc.includes('window.__CL_QUERY="?level=80&play=1"'))throw Error('Initial query not forwarded');
listener({source:{},data:{clausNavigate:'?level=2&play=1'}});
if(!frame.srcdoc.includes('window.__CL_QUERY="?level=80&play=1"'))throw Error('Foreign frame changed navigation');
let inner=scripts(frame.srcdoc);for(const [i,s] of inner.entries()){new vm.Script(s,{filename:'offline-child-'+i});checked++;}
if(inner.length!==6)throw Error('Wrong embedded child script count: '+inner.length);
listener({source:frame.contentWindow,data:{clausNavigate:'?level=111&play=1'}});
if(!frame.srcdoc.includes('window.__CL_QUERY="?level=111&play=1"'))throw Error('Restart query not forwarded');
if(/<script src=|<link[^>]+href="(?:theme|https?:)/.test(frame.srcdoc))throw Error('Unexpected remote dependency');
const result={passed:true,scriptsParsed:checked,joinedEngineSyntax:true,foreignFrameNavigationIgnored:true,offlineWrapperQueryForwarding:true,offlineWrapperNavigationForwarding:true,offlineChildScriptCount:inner.length,offlineChildHasExternalDependencies:false,scope:'Static syntax and wrapper unit checks; offline file was not visually automated.'};
fs.writeFileSync(path.join(root,'syntax-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
