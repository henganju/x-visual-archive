import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decodeXPostTimestamp,parsePostUrl,parseEntries} from '../src/curated.ts';
import {localDatabase} from '../server/local.ts';
import {handle} from '../server/worker.ts';
const real='https://x.com/mihina_48/status/2057476552766665142/photo/1';
test('Snowflake timestamps retain 64-bit precision and reject unreliable IDs',()=>{
 assert.equal(decodeXPostTimestamp('2057476552766665142',Date.UTC(2026,8,18)),'2026-05-21T15:00:10.902Z');
 assert.equal(decodeXPostTimestamp('123'),null);assert.equal(decodeXPostTimestamp('bad'),null);assert.equal(decodeXPostTimestamp('9223372036854775807'),null);
});
test('URL parsing normalizes media suffixes and rejects spoofed hosts and other authors',()=>{assert.equal(parsePostUrl(real).post_url,'https://x.com/mihina_48/status/2057476552766665142');assert.equal(parsePostUrl(real.replace('x.com','twitter.com')).post_id,'2057476552766665142');assert.throws(()=>parsePostUrl(real.replace('mihina_48','someone')));assert.throws(()=>parsePostUrl(real.replace('x.com','x.com.evil.test')));assert.throws(()=>parsePostUrl('javascript:alert(1)'));assert.equal(parsePostUrl('https://x.com/i/web/status/2057476552766665142').ambiguous,true);assert.throws(()=>parseEntries([{post_id:12}]))});
test('bulk storage, protected writes, deduplication, hide, backup merge, delete, sessions and CSRF',async()=>{
 const env={DB:localDatabase(),ADMIN_PASSWORD:'a-long-test-password-only'};let cookie='';
 const call=(path:string,data?:unknown,origin='https://archive.test')=>handle(new Request('https://archive.test/api/'+path,{method:data?'POST':'GET',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{})}),env);
 assert.equal((await call('import',{entries:[]})).status,401);
 const login=await call('login',{password:env.ADMIN_PASSWORD});assert.equal(login.status,200);cookie=login.headers.get('Set-Cookie')!.split(';')[0];assert.match(login.headers.get('Set-Cookie')!,/HttpOnly.*SameSite=Strict.*Secure/);
 assert.equal((await call('import',{entries:[]},'https://evil.test')).status,403);
 const imported=await(await call('import',{reviewed:true,entries:[{url:real},{url:real}, {url:'not a url'},{url:real.replace('mihina_48','other')}]})).json() as any;
 assert.deepEqual([imported.valid,imported.added,imported.duplicate,imported.invalid.length,imported.total],[2,1,1,2,1]);
 let records=(await(await call('archive')).json() as any).posts;assert.equal(records.length,1);assert.equal(records[0].original_url,real);
 const backup=records.map((p:any)=>({...p,url:p.original_url}));assert.equal((await(await call('import',{reviewed:true,entries:backup})).json() as any).duplicate,1);
 const id=records[0].post_id;await call('visibility',{post_id:id,is_visible:0});assert.equal((await(await call('archive')).json() as any).posts.length,0);assert.equal((await(await call('manage')).json() as any).posts.length,1);
 assert.equal((await call('delete',{post_id:id})).status,400);await call('delete',{post_id:id,confirm:true});assert.equal((await(await call('manage')).json() as any).posts.length,0);
 const old=await(await call('import',{reviewed:true,manualDate:'2009-01-02',entries:[{url:'https://x.com/mihina_48/status/123'}]})).json() as any;assert.equal(old.added,1);
 const big=Array.from({length:120},(_,i)=>({url:`https://x.com/mihina_48/status/${2057476552766665142n+BigInt(i)}`}));let added=0;for(let i=0;i<big.length;i+=40)added+=(await(await call('import',{reviewed:true,entries:big.slice(i,i+40)})).json() as any).added;assert.equal(added,120);assert.equal((await call('import',{reviewed:true,entries:big})).status,400);
 await call('logout',{});assert.equal((await call('manage')).status,401);
});
test('login attempts are rate limited and missing deployment setup fails clearly',async()=>{const env={DB:localDatabase(),ADMIN_PASSWORD:'another-long-password'};for(let i=0;i<6;i++){const r=await handle(new Request('https://archive.test/api/login',{method:'POST',headers:{Origin:'https://archive.test','Content-Type':'application/json'},body:JSON.stringify({password:'incorrect'})}),env);assert.equal(r.status,i===5?429:401)}});

