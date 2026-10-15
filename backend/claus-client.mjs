const ORIGIN='https://claus-network-api.vercel.app';
export function createClient({projectId,token,fetch:request=fetch}){
 async function call(method,path,body){
  const response=await request(ORIGIN+path,{method,headers:{accept:'application/json',...(token?{authorization:'Bearer '+token}:{}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(25000)});
  const data=await response.json();
  if(!response.ok)throw Object.assign(Error(data.error||'claus_request_failed'),{code:data.error,status:response.status});
  return data;
 }
 const pid=encodeURIComponent(projectId);
 return {
  async records(collection,authorId){
   const rows=[],seen=new Set();let after;
   do{const q=new URLSearchParams({collection,limit:'100',...(authorId?{authorId}:{}),...(after?{after}:{})});
    const page=await call('GET','/v1/public/apps/'+pid+'/records?'+q);
    rows.push(...page.items);after=page.nextCursor;
    if(after&&seen.has(after))throw Error('repeated_cursor');seen.add(after);
    if(seen.size>60)throw Error('collection_scan_limit');
   }while(after);
   return rows;
  },
  me:()=>call('GET','/v1/principals/me'),
  create:(collection,data,idempotencyKey)=>call('POST','/v1/apps/'+pid+'/records/'+collection,{data,idempotencyKey}),
  update:(collection,record,data,idempotencyKey)=>call('PUT','/v1/apps/'+pid+'/records/'+collection+'/'+encodeURIComponent(record.id),{data,expectedRevision:record.revision,idempotencyKey})
 };
}
