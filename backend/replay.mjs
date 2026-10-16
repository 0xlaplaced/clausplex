import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
export const hash=value=>createHash('sha256').update(value).digest('hex');
export const inputHash=data=>hash(JSON.stringify(Object.fromEntries(Object.keys(data).sort().map(k=>[k,data[k]]))));
export const catalog=JSON.parse(await fs.readFile(new URL('catalog.json',import.meta.url),'utf8'));
const required=['format','gameVersion','level','levelHash','seed','steps','replay','name','runId','assisted'].sort();
export function validate(data){
 if(!data||Array.isArray(data)||Object.keys(data).sort().join()!==required.join())throw Error('invalid_fields');
 if(Buffer.byteLength(JSON.stringify(data))>7500)throw Error('submission_too_large');
 if(data.format!=='clausplex-rle-v1'||data.gameVersion!==catalog.gameVersion)throw Error('unsupported_game_version');
 if(!Number.isInteger(data.level)||data.level<1||data.level>catalog.levels.length)throw Error('invalid_level');
 const level=catalog.levels[data.level-1];
 if(data.levelHash!==level.hash||data.seed!==level.seed)throw Error('level_or_seed_mismatch');
 if(typeof data.name!=='string'||!/^[A-Za-z0-9][A-Za-z0-9 ._-]{2,23}$/.test(data.name)||data.name!==data.name.trim())throw Error('invalid_display_name');
 if(typeof data.assisted!=='boolean'||typeof data.runId!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(data.runId))throw Error('invalid_run_identity');
 if(typeof data.replay!=='string'||data.replay.length>5464||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data.replay))throw Error('invalid_replay_encoding');
 const bytes=Buffer.from(data.replay,'base64');
 if(!bytes.length||bytes.length>4096||bytes.toString('base64')!==data.replay)throw Error('invalid_replay_size');
 let steps=0;for(const byte of bytes){if((byte&15)>9)throw Error('invalid_input');steps+=(byte>>4)+1;}
 if(steps>126000||data.steps!==steps)throw Error('invalid_step_count');
 return {bytes,level};
}
export async function verifyReplay(data,{timeout=12000}={}){
 const {bytes,level}=validate(data);
 const engine=path.join(ROOT,'backend/engine.cjs');
 if(hash(await fs.readFile(engine))!==catalog.headlessSHA256)throw Error('verifier_build_mismatch');
 const all=await fs.readFile(path.join(ROOT,'resources/LEVELS.DAT'));
 const map=Buffer.from(all.subarray((data.level-1)*1536,data.level*1536));
 if(hash(map)!==level.hash)throw Error('verifier_level_mismatch');
 map.writeUInt16LE(level.seed,1534);
 const scratch=await fs.mkdtemp(path.join(os.tmpdir(),'clausplex-verify-'));
 try{
  await fs.cp(path.join(ROOT,'resources'),scratch,{recursive:true});
  const replay=path.join(scratch,'run.SP'),capture=path.join(scratch,'capture.rle');
  await fs.writeFile(replay,Buffer.concat([map,Buffer.from([129]),bytes,Buffer.from([255])]));
  const result=spawnSync(process.execPath,['--max-old-space-size=256',engine,'-u',replay],{cwd:scratch,env:{PATH:process.env.PATH||'',LANG:'C',TZ:'UTC',CLAUSPLEX_CAPTURE_FILE:capture},encoding:'utf8',timeout,maxBuffer:131072});
  if(result.error?.code==='ETIMEDOUT')throw Error('verification_timeout');
  const line=(result.stdout+'\n'+result.stderr).match(/^CLAUSPLEX_VERIFY (\{[^\n]+\})$/m);
  if(result.status!==0||!line)throw Error('replay_did_not_finish');
  const verdict=JSON.parse(line[1]);
  if(verdict.won!==1||verdict.valid!==1||verdict.seed!==level.seed||verdict.steps<1||verdict.steps>data.steps)throw Error('replay_not_a_valid_win');
  const normalized=await fs.readFile(capture);
  const replayHash=hash(catalog.gameVersion+':'+data.level+':'+level.seed+':'+normalized.toString('base64'));
  return {steps:verdict.steps,replayHash,assisted:data.assisted||replayHash===level.referenceReplayHash,normalizedReplay:normalized.toString('base64')};
 }finally{await fs.rm(scratch,{recursive:true,force:true});}
}
