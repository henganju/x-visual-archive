import {PostSchema,type Post} from '../src/archive.ts';
export type XPost={id:string;author_id:string;text:string;created_at:string;attachments?:{media_keys?:string[]};referenced_tweets?:{type:string;id:string}[];edit_history_tweet_ids?:string[];note_tweet?:{text:string;entities?:any};entities?:any;withheld?:unknown};
export type Page={data?:XPost[];includes?:{media?:{media_key:string;type:string;url?:string;width?:number;height?:number;alt_text?:string}[]};meta?:{next_token?:string;result_count?:number};errors?:unknown[]};
export type Config={username:string;includeReplies:boolean;source:'full-archive'|'timeline';pageSize:number;postReadUSD:number;userReadUSD:number};
export function normalizeUsername(s:string){const name=s.trim().replace(/^@/,'');if(!/^[A-Za-z0-9_]{1,15}$/.test(name))throw new Error('Invalid X username. Use 1–15 letters, numbers, or underscores.');return name;}
export function toPhotoPosts(page:Page,userId:string,config:Config):Post[]{
 const media=new Map((page.includes?.media||[]).map(m=>[m.media_key,m]));const result:Post[]=[];
 for(const p of page.data||[]){
  if(p.author_id!==userId||p.withheld||p.referenced_tweets?.some(r=>r.type==='retweeted'||(!config.includeReplies&&r.type==='replied_to')))continue;
  const photos=(p.attachments?.media_keys||[]).map(k=>media.get(k)).filter(m=>m?.type==='photo'&&m.url&&m.width&&m.height).map(m=>({media_key:m!.media_key,url:m!.url!,width:m!.width!,height:m!.height!,alt_text:m!.alt_text}));
  if(!photos.length)continue;
  const content=p.note_tweet||p;const entities=[...(content.entities?.urls||[]).map((e:any)=>({start:e.start,end:e.end,url:e.url,label:e.display_url||e.url})),...(content.entities?.mentions||[]).map((e:any)=>({start:e.start,end:e.end,url:`https://x.com/${e.username}`,label:`@${e.username}`})),...(content.entities?.hashtags||[]).map((e:any)=>({start:e.start,end:e.end,url:`https://x.com/search?q=${encodeURIComponent('#'+e.tag)}`,label:`#${e.tag}`}))];
  result.push(PostSchema.parse({post_id:p.id,post_url:`https://x.com/${config.username}/status/${p.id}`,username:config.username,created_at:p.created_at,text:content.text,photos,entities,edited:(p.edit_history_tweet_ids?.length||0)>1}));
 }
 return result;
}
export function mergePosts(a:Post[],b:Post[]){return [...new Map([...a,...b].map(p=>[p.post_id,p])).values()].sort((a,b)=>b.created_at.localeCompare(a.created_at));}
export function highestId(ids:string[]){return ids.filter(id=>/^\d+$/.test(id)).reduce((max,id)=>BigInt(id)>BigInt(max)?id:max,'0');}
export function pageUrl(config:Config,userId:string,token:string|undefined,sinceId:string|undefined,endTime:string,pageSize:number){
 const u=new URL(config.source==='full-archive'?'https://api.x.com/2/tweets/search/all':`https://api.x.com/2/users/${userId}/tweets`);
 const params:Record<string,string>={'max_results':String(pageSize),'tweet.fields':'id,text,author_id,created_at,attachments,referenced_tweets,entities,note_tweet,edit_history_tweet_ids,withheld','expansions':'attachments.media_keys','media.fields':'media_key,type,url,width,height,alt_text','end_time':endTime};
 if(config.source==='full-archive'){params.query=`from:${config.username} has:images -is:retweet${config.includeReplies?'':' -is:reply'}`;params.sort_order='recency';if(!sinceId)params.start_time='2006-03-21T00:00:00Z';if(token)params.next_token=token;}
 else {params.exclude='retweets';if(token)params.pagination_token=token;}
 if(sinceId)params.since_id=sinceId;
 for(const [k,v] of Object.entries(params))u.searchParams.set(k,v);return u;
}
export function budgetPageSize(remaining:number,rate:number,desired:number,minimum:number){const n=Math.min(desired,Math.floor((remaining+1e-9)/rate));if(n<minimum)throw new Error('Approved budget exhausted. Progress is saved; no further API request was sent.');return n;}
export function apiError(status:number,reset:string|null){if(status===401)return 'X rejected the credential. Check the local X_BEARER_TOKEN.';if(status===402)return 'X credits are missing or exhausted. No purchase was made.';if(status===403)return 'X denied access. The account may be private, suspended, withheld, or your app may lack endpoint access.';if(status===404)return 'The account or post was not found. It may be deleted, suspended, renamed, or unavailable.';if(status===429)return `X rate limit reached. Progress is saved. Rerun after ${reset?new Date(Number(reset)*1000).toISOString():'the documented reset time'}.`;return `X returned HTTP ${status}. Progress is saved. Retry later.`;}
