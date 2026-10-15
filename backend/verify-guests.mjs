import {verifyReplay,validate} from './replay.mjs';
import {deployment} from './verify-queue.mjs';
export async function processGuests({request,verify=verifyReplay}={}){
 const queue=await request('/internal/queue'),report={processed:0,verified:0,rejected:0};
 if(!Array.isArray(queue.items)||queue.items.length>20)throw Error('invalid_guest_queue');
 for(const run of queue.items){
  let result;
  try{validate(run.data);if(run.id!==run.data.runId)throw Error('run_identity_mismatch');const v=await verify(run.data);result={id:run.id,status:'verified',steps:v.steps,assisted:v.assisted,reason:''};}
  catch(error){if(['verifier_build_mismatch','verifier_level_mismatch'].includes(error.message))throw error;result={id:run.id,status:'rejected',steps:0,assisted:false,reason:/^[a-z_]{1,80}$/.test(error.message)?error.message:'verification_failed'};}
  await request('/internal/verdict',result);report.processed++;report[result.status]++;
 }
 return report;
}
if(process.argv[1]&&new URL('file://'+process.argv[1]).href===import.meta.url){
 const key=process.env.CLAUS_SCORES_KEY;if(!key)throw Error('Missing protected score verifier key');
 const request=async(path,data)=>{const response=await fetch(deployment.scoresOrigin+path,{method:data?'POST':'GET',headers:{Authorization:'Bearer '+key,...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{}),redirect:'error',signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('score_service_'+response.status);return response.json();};
 try{console.log(JSON.stringify(await processGuests({request})));}catch(error){console.error('Guest verification stopped: '+error.message);process.exitCode=1;}
}
