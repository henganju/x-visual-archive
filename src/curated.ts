import {z} from 'zod';
export const TARGET='mihina_48';
export const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
// X Snowflake: 41 timestamp bits followed by 22 worker/sequence bits.
// https://github.com/twitter-archive/snowflake (epoch 1288834974657 ms).
export function decodeXPostTimestamp(id:string,now=Date.now()):string|null {
 if(!/^[1-9]\d{0,19}$/.test(id))return null;
 const n=BigInt(id);if(n<4194304000000n||n>9223372036854775807n)return null;
 const time=Number((n>>22n)+1288834974657n);
 return time<=now+86400000?new Date(time).toISOString():null;
}
export function parsePostUrl(input:string){
 let u:URL;try{u=new URL(input.trim())}catch{throw Error('Use a complete https://x.com/…/status/… URL.')}
 if(!['https:','http:'].includes(u.protocol)||!['x.com','www.x.com','twitter.com','www.twitter.com','mobile.twitter.com'].includes(u.hostname)||u.username||u.password||u.port)throw Error('Only public X or Twitter post URLs are accepted.');
 const match=u.pathname.match(/^\/(\w+)\/status\/(\d+)(?:\/(?:photo|video)\/\d+)?\/?$/);
 const ambiguous=u.pathname.match(/^\/i\/web\/status\/(\d+)\/?$/);
 if(!match&&!ambiguous)throw Error('This URL does not identify a post.');
 if(match&&match[1].toLowerCase()!==TARGET)throw Error(`This archive accepts @${TARGET} only.`);
 const id=match?.[2]||ambiguous![1];if(!/^[1-9]\d{0,19}$/.test(id)||BigInt(id)>9223372036854775807n)throw Error('Invalid post ID.');
 return {post_id:id,username:TARGET,original_url:u.href,post_url:`https://x.com/${TARGET}/status/${id}`,ambiguous:!!ambiguous,created_at:decodeXPostTimestamp(id)};
}
export const Entry=z.object({post_id:z.string().regex(/^[1-9]\d{0,19}$/),username:z.literal(TARGET),original_url:z.string().url(),post_url:z.string().url(),created_at:z.string().datetime(),added_at:z.string().datetime(),notes:z.string().max(2000),date_source:z.enum(['snowflake','manual']),is_visible:z.union([z.literal(0),z.literal(1)])});
export type Entry=z.infer<typeof Entry>;
export function parseEntries(value:unknown){return z.array(Entry).parse(value)}
