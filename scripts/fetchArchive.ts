import {readFile,writeFile,rename,mkdir,open,unlink} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {MetaSchema,parseArchive,type Post,type Meta} from '../src/archive.ts';
import {normalizeUsername,toPhotoPosts,mergePosts,highestId,pageUrl,budgetPageSize,apiError,type Config,type Page} from './x-core.ts';

// Secrets are read only by this local command; never imported by the frontend.
if(existsSync('.env'))process.loadEnvFile('.env');
async function renameWithRetry(from:string,to:string){for(let attempt=0;;attempt++){try{await rename(from,to);return;}catch(e){if(attempt>=6||!['EPERM','EBUSY','EACCES'].includes((e as NodeJS.ErrnoException).code||''))throw e;await new Promise(r=>setTimeout(r,50*2**attempt));}}}
export async function atomic(path:string,data:unknown){const file=await open(path+'.tmp','w');try{await file.writeFile(JSON.stringify(data,null,2));await file.sync();}finally{await file.close();}await renameWithRetry(path+'.tmp',path);}
type User={id:string;username:string;name:string;profile_image_url?:string;protected?:boolean;withheld?:unknown};
type State={version:1;mode:string;config:string;user?:User;records:Post[];seen:string[];pages:number;token?:string;sinceId?:string;endTime:string;newestId:string;reservedUSD:number;complete:boolean;started:string;lastSuccess?:string;baseScanned?:number};
async function run(){
 const config:Config=JSON.parse(await readFile('archive.config.json','utf8'));config.username=normalizeUsername(config.username);
 if(config.username!=='mihina_48')throw new Error('This archive is configured for @mihina_48. Update the schema and site before changing the account.');
 if(!['full-archive','timeline'].includes(config.source)||!Number.isInteger(config.pageSize)||config.pageSize<10||config.pageSize>100||config.postReadUSD<=0||config.userReadUSD<=0)throw new Error('Archive configuration is invalid.');
 const mode=process.argv.includes('--update')?'update':'full';
 if(!process.env.X_BEARER_TOKEN)throw new Error('X credential missing. Add your X developer app Bearer Token to the local .env file. No API request was made.');
 const budget=Number(process.env.X_MAX_COST_USD||0);
 if(process.env.X_APPROVE_PAID!=='true'||!Number.isFinite(budget)||budget<=0)throw new Error('Paid access is locked. Review current X pricing, approve a budget, then set X_APPROVE_PAID=true and X_MAX_COST_USD locally. No API request was made.');
 await mkdir('.state',{recursive:true});await mkdir('public/data',{recursive:true});
 if(existsSync('.state/import.lock')){
  const owner=Number(await readFile('.state/import.lock','utf8'));
  if(Number.isInteger(owner)&&owner>0){try{process.kill(owner,0);}catch(e){if((e as NodeJS.ErrnoException).code==='ESRCH')await unlink('.state/import.lock');}}
 }
 const lock=await open('.state/import.lock','wx').catch(()=>{throw new Error('Another import is running or its lock cannot be verified. No API request was made.');});
 await lock.writeFile(String(process.pid));
 try{
 const statePath=`.state/${mode}.json`;let state:State;let previousMeta:Meta|null=null;let prior:Post[]=[];
 if(existsSync('public/data/archive-meta.json')){previousMeta=MetaSchema.parse(JSON.parse(await readFile('public/data/archive-meta.json','utf8')));if(!previousMeta.demo)prior=parseArchive(JSON.parse(await readFile('public/data/archive.json','utf8')));}
 let existing:State|undefined=existsSync(statePath)?JSON.parse(await readFile(statePath,'utf8')):undefined;
 if(mode==='update'&&!existing&&(!previousMeta||previousMeta.demo||!previousMeta.completed))throw new Error('Complete the initial X archive before running update:x. Demo records cannot be used as an update cursor.');
 if(existing&&existing.config!==JSON.stringify(config))throw new Error('Configuration changed since this checkpoint. Keep the original configuration to resume; use a new checkpoint only for an intentional fresh import.');
 if(existing?.complete&&mode==='full'&&previousMeta?.completed&&!previousMeta.demo){console.log('Historical import already complete. Run npm run update:x to retrieve newer posts.');return;}
 if(existing?.complete&&mode==='update'){await renameWithRetry(statePath,`.state/update-${Date.now()}.json`);existing=undefined;}
 state=existing||{version:1,mode,config:JSON.stringify(config),records:prior,seen:[],pages:0,sinceId:mode==='update'?(previousMeta?.newest_scanned_id||undefined):undefined,endTime:new Date(Date.now()-3600000).toISOString(),newestId:previousMeta&&!previousMeta.demo?(previousMeta.newest_scanned_id||'0'):'0',reservedUSD:0,complete:false,started:new Date().toISOString(),baseScanned:mode==='update'?(previousMeta?.total_posts_scanned||0):0};
 if(state.baseScanned===undefined)state.baseScanned=mode==='update'?Math.max(0,(previousMeta?.total_posts_scanned||0)-(previousMeta?.completed?0:state.seen.length)):0;
 async function request(url:URL,cost:number){
  if(state.reservedUSD+cost>budget+1e-9)throw new Error('Approved budget exhausted. Increase it only after reviewing the saved progress and approving any additional cost.');
  // Reserve BEFORE the request. Interrupted/failed calls stay reserved, preventing retries from escaping the budget.
  state.reservedUSD=Math.round((state.reservedUSD+cost)*1e6)/1e6;await atomic(statePath,state);
  let response:Response;try{response=await fetch(url,{headers:{Authorization:`Bearer ${process.env.X_BEARER_TOKEN}`},signal:AbortSignal.timeout(30000)})}catch{throw new Error('Network request failed or timed out. Progress and the conservative cost reservation are saved. Rerun to resume.');}
  if(!response.ok)throw new Error(apiError(response.status,response.headers.get('x-rate-limit-reset')));
  return response.json();
 }
 if(!state.user){const url=new URL(`https://api.x.com/2/users/by/username/${config.username}`);url.searchParams.set('user.fields','id,name,username,profile_image_url,protected,withheld');const body=await request(url,config.userReadUSD);if(!body.data||body.errors?.length)throw new Error('User lookup did not return an accessible account. It may be invalid, deleted, or suspended.');if(body.data.protected||body.data.withheld)throw new Error('This account is protected or withheld. Only accessible public content can be archived.');if(body.data.username.toLowerCase()!==config.username.toLowerCase())throw new Error('X returned a different username. Import stopped.');state.user=body.data;await atomic(statePath,state);}
 console.log(`Fetching @${config.username} using ${config.source}. Resuming after page ${state.pages}. Approved budget: $${budget.toFixed(2)}; reserved so far: $${state.reservedUSD.toFixed(2)}.`);
 async function publish(){const records=mergePosts([],state.records);const meta=MetaSchema.parse({username:config.username,user_id:state.user!.id,display_name:state.user!.name,profile_image_url:state.user!.profile_image_url,demo:false,last_synced:state.lastSuccess||null,oldest_post:records.at(-1)?.created_at||null,newest_post:records[0]?.created_at||null,newest_scanned_id:state.newestId==='0'?null:state.newestId,total_posts_scanned:new Set(state.seen).size+(state.baseScanned||0),total_photo_posts:records.length,total_photos:records.reduce((n,p)=>n+p.photos.length,0),completed:state.complete,coverage:config.source==='full-archive'?`Official full-archive search, photo matches only. ${state.complete?'All returned pages processed':'Import incomplete'}. Public, searchable content only; deleted, protected, and withheld content is excluded. The latest hour is deferred.`:'Official user timeline only: up to 3,200 recent posts; this is not a complete historical archive. Replies filtered locally. The latest hour is deferred.'});await atomic('public/data/archive.json',records);await atomic('public/data/archive-meta.json',meta);}
 // Recover materialized JSON from the canonical checkpoint after a crash between writes.
 if(state.pages)await publish();
 while(!state.complete){
  const size=budgetPageSize(budget-state.reservedUSD,config.postReadUSD,config.pageSize,config.source==='full-archive'?10:5);
  const page:Page=await request(pageUrl(config,state.user!.id,state.token,state.sinceId,state.endTime,size),size*config.postReadUSD);
  if(page.errors?.length)throw new Error('X returned a partial response. The page has not been advanced; resolve the API access/media error before resuming.');
  if(!page.meta||(!Array.isArray(page.data)&&page.meta.result_count!==0))throw new Error('X returned an unexpected response. Checkpoint preserved.');
  if(page.meta.next_token&&page.meta.next_token===state.token)throw new Error('X returned a repeated pagination token. Stopped to avoid duplicate paid requests.');
  const result=toPhotoPosts(page,state.user!.id,config);
  state.records=mergePosts(state.records,result);state.seen=[...new Set([...state.seen,...(page.data||[]).map(p=>p.id)])];state.newestId=highestId([state.newestId,...(page.data||[]).map(p=>p.id)]);state.pages++;state.token=page.meta.next_token;state.complete=!state.token;state.lastSuccess=new Date().toISOString();await atomic(statePath,state);await publish();
  console.log(`Page ${state.pages}\n${state.seen.length} posts checked\n${state.records.length} photo posts found\n${state.records.reduce((n,p)=>n+p.photos.length,0)} total photos\nConservative reserved cost: $${state.reservedUSD.toFixed(2)}`);
  if(!state.complete)await new Promise(resolve=>setTimeout(resolve,1100));
 }
 console.log(`Complete: ${state.seen.length} posts inspected; ${state.records.length} photo posts; ${state.records.reduce((n,p)=>n+p.photos.length,0)} photos. No images were downloaded. Rebuild and redeploy after reviewing data.`);
 }finally{await lock.close();await unlink('.state/import.lock');}
}
run().catch(e=>{console.error(`\nArchive stopped: ${e.message}`);process.exitCode=1});
