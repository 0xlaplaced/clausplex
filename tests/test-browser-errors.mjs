import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const snippet=source.slice(source.indexOf('function isExtensionError('),source.indexOf("addEventListener('securitypolicyviolation'"));
const handlers={},reported=[];
vm.runInNewContext(snippet,{addEventListener:(type,fn)=>{handlers[type]=fn;},error:message=>reported.push(message)});
let checks=0;
for(const scheme of ['chrome-extension','moz-extension','safari-web-extension']){
 handlers.error({message:'Extension failed',filename:scheme+'://extension/inpage.js'});
 handlers.unhandledrejection({reason:{toString:()=>'Failed to connect to MetaMask',stack:'Error: Failed to connect to MetaMask\n at '+scheme+'://extension/inpage.js:7:42'}});
 assert.equal(reported.length,0);checks+=2;
}
handlers.error({message:'Broken game function',filename:'https://claus-network-sites.vercel.app/r/release/app.js'});
assert.deepEqual(reported,['Broken game function']);checks++;
handlers.unhandledrejection({reason:Error('Game promise rejected')});
assert.match(reported[1],/Game promise rejected/);checks++;
// The text alone is not an excuse to hide an application error.
handlers.unhandledrejection({reason:Error('Failed to connect to MetaMask')});
assert.match(reported[2],/Failed to connect to MetaMask/);checks++;
console.log(JSON.stringify({checks,extensionFailuresExcludedFromGameUI:true,applicationErrorsStillReported:true}));
