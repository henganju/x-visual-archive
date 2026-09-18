import {appendFileSync} from 'node:fs';
const photo={media_key:'own',type:'photo',url:'https://pbs.twimg.com/media/example.jpg',width:600,height:800};
globalThis.fetch=async(input)=>{
 const url=new URL(input);if(url.hostname!=='api.x.com')throw new Error('Unexpected host in isolated test');
 appendFileSync('requests.jsonl',JSON.stringify(Object.fromEntries(url.searchParams))+'\n');
 if(url.pathname.includes('/by/username/'))return Response.json({data:{id:'42',name:'Fixture author',username:'mihina_48',protected:false}});
 const token=url.searchParams.get('next_token');
 if(process.env.FIXTURE_UPDATE_PAGES==='true'&&url.searchParams.has('since_id')){
  if(token==='u2'&&process.env.FIXTURE_FAIL==='true')return Response.json({error:'rate limit'},{status:429});
  const id=token==='u2'?'500':'600';
  return Response.json({data:[{id,author_id:'42',text:'Fixture update',created_at:`2026-01-0${Number(id)/100}T00:00:00.000Z`,attachments:{media_keys:['own']}}],includes:{media:[photo]},meta:{result_count:1,next_token:token?undefined:'u2'}});
 }
 if(process.env.FIXTURE_FAIL==='true'&&token==='p2')return Response.json({error:'rate limit'},{status:429,headers:{'x-rate-limit-reset':'1800000000'}});
 const id=url.searchParams.has('since_id')?'400':!token?'300':token==='p2'?'200':'100';
 const next=url.searchParams.has('since_id')?undefined:!token?'p2':token==='p2'?'p3':undefined;
 return Response.json({data:[{id,author_id:'42',text:'Fixture photograph',created_at:`2026-01-0${Number(id)/100}T00:00:00.000Z`,attachments:{media_keys:['own']}}],includes:{media:[photo]},meta:{result_count:1,next_token:next}});
};
