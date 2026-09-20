import {parsePostUrl,decodeXPostTimestamp} from '../src/curated.ts';
export interface Statement {bind(...values:unknown[]):Statement;first<T=Record<string,unknown>>():Promise<T|null>;all<T=Record<string,unknown>>():Promise<{results:T[]}>;run():Promise<{meta:{changes:number}}>}
export interface Database {prepare(sql:string):Statement;batch(items:Statement[]):Promise<{meta:{changes:number}}[]>}
export interface Env {DB:Database;ADMIN_PASSWORD:string;ASSETS?:{fetch(r:Request):Promise<Response>}}
const json=(value:unknown,status=200,headers:Record<string,string>={})=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(b=>b.toString(16).padStart(2,'0')).join('');
async function equal(a:string,b:string){const aa=await hash(a),bb=await hash(b);let diff=0;for(let i=0;i<aa.length;i++)diff|=aa.charCodeAt(i)^bb.charCodeAt(i);return diff===0}
export async function handle(request:Request,env:Env):Promise<Response>{
 const url=new URL(request.url),path=url.pathname;
 if(!path.startsWith('/api/'))return env.ASSETS?env.ASSETS.fetch(request):new Response('Not found',{status:404});
 try{
 if(!env.DB)return json({error:'Archive storage is not connected yet.'},503);
 const cookie=(value:string,age=28800)=>`archive_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${url.protocol==='https:'?'; Secure':''}`;
 const token=request.headers.get('Cookie')?.match(/(?:^|;\s*)archive_session=([a-f0-9]{64})(?:;|$)/)?.[1];
 const now=Date.now();
 const authenticated=async()=>!!(token&&await env.DB.prepare('SELECT token_hash FROM sessions WHERE token_hash=? AND expires>?').bind(await hash(token),now).first());
 if(request.method==='GET'){
 if(path==='/api/session')return json({authenticated:await authenticated()});
 if(path==='/api/archive'||path==='/api/manage'){
 const admin=path==='/api/manage';if(admin&&!await authenticated())return json({error:'Please sign in.'},401);
 const offset=Number(url.searchParams.get('offset')||0);if(!Number.isSafeInteger(offset)||offset<0)return json({error:'Invalid page.'},400);
 const records=await env.DB.prepare(`SELECT * FROM archive_posts ${admin?'':'WHERE is_visible=1'} ORDER BY created_at DESC,post_id DESC LIMIT 500 OFFSET ?`).bind(offset).all();
 return json({posts:records.results,next:records.results.length===500?offset+500:null});
 }return json({error:'Not found.'},404);
 }
 if(request.method!=='POST')return json({error:'Method not allowed.'},405);
 if(request.headers.get('Origin')!==url.origin||!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Request origin could not be verified.'},403);
 const reader=request.body?.getReader();let body='',bytes=0;const decoder=new TextDecoder();if(reader){while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.length;if(bytes>500000){await reader.cancel();return json({error:'Import too large. Use batches of 500 links.'},413)}body+=decoder.decode(part.value,{stream:true})}}
 let data:any;try{data=JSON.parse(body)}catch{return json({error:'Invalid request data.'},400)}
 if(!data||typeof data!=='object')return json({error:'Invalid request data.'},400);
 if(path==='/api/login'){
 if(!env.ADMIN_PASSWORD||env.ADMIN_PASSWORD.length<16)return json({error:'The curator password has not been configured.'},503);
 const client=await hash((request.headers.get('CF-Connecting-IP')||'local')+env.ADMIN_PASSWORD);
 await env.DB.prepare('DELETE FROM login_attempts WHERE expires<?').bind(now).run();
 await env.DB.prepare('INSERT INTO login_attempts VALUES(?,1,?) ON CONFLICT(client_hash) DO UPDATE SET attempts=attempts+1').bind(client,now+900000).run();
 const attempts=await env.DB.prepare('SELECT attempts FROM login_attempts WHERE client_hash=?').bind(client).first<{attempts:number}>();
 if((attempts?.attempts||0)>5)return json({error:'Too many attempts. Try again in 15 minutes.'},429);
 if(typeof data.password!=='string'||!await equal(data.password,env.ADMIN_PASSWORD))return json({error:'The password is incorrect.'},401);
 const raw=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b=>b.toString(16).padStart(2,'0')).join('');
 await env.DB.prepare('DELETE FROM sessions WHERE expires<?').bind(now).run();
 await env.DB.prepare('INSERT INTO sessions VALUES(?,?)').bind(await hash(raw),now+28800000).run();
 await env.DB.prepare('DELETE FROM login_attempts WHERE client_hash=?').bind(client).run();
 return json({ok:true},200,{'Set-Cookie':cookie(raw)});
 }
 if(!await authenticated())return json({error:'Please sign in.'},401);
 if(path==='/api/logout'){await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await hash(token!)).run();return json({ok:true},200,{'Set-Cookie':cookie('',0)})}
 if(path==='/api/import'){
 if(data.reviewed!==true)return json({error:'Confirm that you reviewed these posts for authorship and photographs.'},400);
 if(!Array.isArray(data.entries)||data.entries.length>40)return json({error:'Send up to 40 links in each request. The curator automatically batches larger imports.'},400);
 let valid=0,added=0,duplicate=0;const invalid:{line:number;reason:string}[]=[],seen=new Set<string>();const writes:Statement[]=[];
 for(const [index,item] of data.entries.entries())try{
 if(!item||typeof item.url!=='string')throw Error('Missing post URL.');const p=parsePostUrl(item.url);
 if(item.post_id&&item.post_id!==p.post_id)throw Error('Backup ID does not match its URL.');
 const manual=item.date_source==='manual'||!p.created_at;
 const date=manual?new Date(item.created_at||data.manualDate||''):new Date(decodeXPostTimestamp(p.post_id)!);
 if(!Number.isFinite(+date)||+date<Date.UTC(2006,2,21)||+date>now+86400000)throw Error('A valid manual date is needed for this ID.');
 if(item.notes!==undefined&&typeof item.notes!=='string')throw Error('Notes must be text.');
 const notes=(item.notes||'').trim();if(notes.length>2000)throw Error('Keep notes under 2,000 characters.');
 valid++;if(seen.has(p.post_id)){duplicate++;continue}seen.add(p.post_id);
 writes.push(env.DB.prepare('INSERT OR IGNORE INTO archive_posts VALUES(?,?,?,?,?,?,?,?,?)').bind(p.post_id,p.username,p.original_url,p.post_url,date.toISOString(),new Date(now).toISOString(),notes,manual?'manual':'snowflake',item.is_visible===0?0:1));
 }catch(e){invalid.push({line:index+1,reason:e instanceof Error?e.message:'Invalid entry.'})}
 for(let start=0;start<writes.length;start+=50){const results=await env.DB.batch(writes.slice(start,start+50));for(const result of results){if(result.meta.changes)added++;else duplicate++}}
 const total=await env.DB.prepare('SELECT COUNT(*) AS count FROM archive_posts').first<{count:number}>();
 return json({valid,added,duplicate,invalid,total:total?.count||0});
 }
 if(path==='/api/visibility'||path==='/api/delete'){
 if(typeof data.post_id!=='string'||!/^\d{1,20}$/.test(data.post_id))return json({error:'Invalid post ID.'},400);
 if(path==='/api/delete'){if(data.confirm!==true)return json({error:'Deletion requires confirmation.'},400);await env.DB.prepare('DELETE FROM archive_posts WHERE post_id=?').bind(data.post_id).run()}
 else {if(![0,1].includes(data.is_visible))return json({error:'Invalid visibility.'},400);await env.DB.prepare('UPDATE archive_posts SET is_visible=? WHERE post_id=?').bind(data.is_visible,data.post_id).run()}
 return json({ok:true});
 }return json({error:'Not found.'},404);
 }catch{return json({error:'The archive could not complete this request. Please retry; imports safely skip duplicates.'},503)}
}
export default {fetch:handle};
