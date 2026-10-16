import fs from 'node:fs/promises';
import {createClient} from './claus-client.mjs';
import {catalog,inputHash,validate,verifyReplay,hash} from './replay.mjs';
export const deployment=JSON.parse(await fs.readFile(new URL('deployment.json',import.meta.url),'utf8'));
export async function processQueue({client,max=10,now=Date.now(),verify=verifyReplay}={}){
 const me=await client.me();
 if((me.id||me.principal?.id||me.principalId)!==deployment.verifierId)throw Error('wrong_verifier_identity');
 const [runs,receipts,boards]=await Promise.all([client.records('runs'),client.records('receipts',deployment.verifierId),client.records('boards',deployment.verifierId)]);
 const trustedReceipts=receipts.filter(r=>r.authorId===deployment.verifierId);
 const trustedBoards=boards.filter(r=>r.authorId===deployment.verifierId);
 const processed=new Map(trustedReceipts.map(r=>[r.data.submissionId,r]));
 const boardMap=new Map(trustedBoards.filter(r=>r.data.gameVersion===catalog.gameVersion).map(r=>[r.data.level,r]));
 const seen=new Set(trustedReceipts.filter(r=>r.data.outcome==='verified').map(r=>r.data.playerId+':'+r.data.replayHash));
 const ordered=[...runs].sort((a,b)=>a.createdAt-b.createdAt||a.id.localeCompare(b.id));
 const dayCounts=new Map(),lastAt=new Map(),perAuthor=new Map(),report={verified:0,rejected:0,duplicate:0,processed:0,pending:0};
 for(const run of ordered){
  const player=run.authorId,day=new Date(run.createdAt).toISOString().slice(0,10),key=player+':'+day;
  const ordinal=(dayCounts.get(key)||0)+1;dayCounts.set(key,ordinal);
  const previousAt=lastAt.get(player);lastAt.set(player,run.createdAt);
  const old=processed.get(run.id);
  // A result remains bound to the immutable author and the exact data hash.
  if(old)continue;
  if(report.processed>=max||(perAuthor.get(player)||0)>=2){report.pending++;continue;}
  perAuthor.set(player,(perAuthor.get(player)||0)+1);
  const data=run.data,ih=inputHash(data);
  let outcome='verified',reason='',result={steps:0,replayHash:'',assisted:Boolean(data.assisted)};
  try{
   validate(data);
   if(run.createdAt>now+60000)throw Error('invalid_server_timestamp');
   if(ordinal>deployment.submissionLimitPerPlayerDay)throw Error('daily_submission_limit');
   if(previousAt!==undefined&&run.createdAt-previousAt<60000)throw Error('submission_cooldown');
   result=await verify(data);
   const duplicate=player+':'+result.replayHash;
   if(seen.has(duplicate)){outcome='duplicate';reason='replay_already_verified';}else seen.add(duplicate);
  }catch(error){
   if(['verifier_build_mismatch','verifier_level_mismatch'].includes(error.message))throw error;
   outcome='rejected';reason=/^[a-z_]+$/.test(error.message)?error.message:'verification_failed';
  }
  const receiptData={submissionId:run.id,inputHash:ih,playerId:player,level:Number.isInteger(data.level)&&data.level>=1&&data.level<=catalog.levels.length?data.level:1,name:typeof data.name==='string'&&/^[A-Za-z0-9][A-Za-z0-9 ._-]{2,23}$/.test(data.name)?data.name:'Invalid entry',steps:result.steps,replayHash:result.replayHash,outcome,reason,assisted:result.assisted,gameVersion:catalog.gameVersion};
  const receipt=await client.create('receipts',receiptData,'verdict:'+hash(run.id));
  processed.set(run.id,receipt);
  report[outcome]++;report.processed++;
 }
 // Rebuild materialized boards from trusted immutable verdicts on every run.
 // A crash after writing a verdict cannot permanently lose its leaderboard row.
 const levels=new Map();
 for(const receipt of processed.values()){
  const d=receipt.data;if(d.outcome!=='verified'||d.gameVersion!==catalog.gameVersion)continue;
  if(!levels.has(d.level))levels.set(d.level,new Map());
  const group=levels.get(d.level),key=d.playerId+':'+d.assisted,prior=group.get(key);
  const entry={playerId:d.playerId,name:d.name,steps:d.steps,receiptId:receipt.id,replayHash:d.replayHash,assisted:d.assisted};
  if(!prior||entry.steps<prior.steps||(entry.steps===prior.steps&&entry.receiptId<prior.receiptId))group.set(key,entry);
 }
 for(const [level,group] of levels){
  const ordered=[...group.values()].sort((a,b)=>a.steps-b.steps||a.playerId.localeCompare(b.playerId));
  const entries=[...ordered.filter(e=>!e.assisted).slice(0,10),...ordered.filter(e=>e.assisted).slice(0,10)];
  const data={level,gameVersion:catalog.gameVersion,entries},board=boardMap.get(level);
  if(board&&JSON.stringify(board.data)===JSON.stringify(data))continue;
  if(Buffer.byteLength(JSON.stringify(data))>7900)throw Error('board_size_limit');
  if(board)await client.update('boards',board,data,'board:'+hash(board.id+':'+board.revision+':'+JSON.stringify(data)));
  else await client.create('boards',data,'board:'+hash(catalog.gameVersion+':'+level));
 }
 return report;
}
if(process.argv[1]&&new URL('file://'+process.argv[1]).href===import.meta.url){
 const token=process.env.CLAUS_VERIFIER_TOKEN;
 if(!token)throw Error('Missing verifier credential in protected environment');
 if(Date.now()>=deployment.verifierExpiresAt){console.log(JSON.stringify({paused:'verifier_credential_expired'}));process.exit(0);}
 const client=createClient({projectId:deployment.projectId,token});
 try{console.log(JSON.stringify(await processQueue({client})));}catch(error){console.error('Verification stopped: '+(error.code||error.message));process.exitCode=1;}
}
