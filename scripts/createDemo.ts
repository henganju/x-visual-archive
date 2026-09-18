import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {parseArchive,MetaSchema,type Post} from '../src/archive.ts';
const sources=JSON.parse(await readFile(new URL('./demo-sources.json',import.meta.url),'utf8')).filter(Boolean);
const descriptions=['Light across the water.','An afternoon along the coast.','The quiet between places.','A study in green.','Looking toward the horizon.','A path through the landscape.'];
const posts:Post[]=[];let photoIndex=0;
for(let year=2026;year>=2022;year--)for(const month of [8,5,2,0])for(let i=0;i<(year===2026&&month===8?6:3);i++){
 const id=`demo-${year}-${month+1}-${i+1}`;const count=[1,3,2,1,4,1][posts.length%6];
 posts.push({post_id:id,post_url:'https://x.com/mihina_48',username:'mihina_48',created_at:new Date(Date.UTC(year,month,18-i*2,9)).toISOString(),text:`${descriptions[posts.length%descriptions.length]} — Demo caption.`,photos:Array.from({length:count},()=>{const n=photoIndex++;const s=sources[n%sources.length];const portrait=n%3===0;const width=portrait?750:1100;const height=portrait?1000:Math.round(width*s.height/s.width);return {media_key:`demo-photo-${n}`,url:`https://picsum.photos/id/${s.id}/${width}/${height}`,width,height,alt_text:'Landscape photograph in the sample collection',credit:`${s.author} / Unsplash via Lorem Picsum`,source_url:s.url}})});
}
parseArchive(posts);
const meta=MetaSchema.parse({username:'mihina_48',display_name:'Demo collection',user_id:'',demo:true,last_synced:null,total_posts_scanned:0,total_photo_posts:posts.length,total_photos:photoIndex,oldest_post:posts.at(-1)!.created_at,newest_post:posts[0].created_at,newest_scanned_id:null,coverage:'Demo edition: fictional dates and captions across five years. No X account data has been retrieved.',completed:true});
await mkdir('public/data',{recursive:true});
await writeFile('public/data/archive.json',JSON.stringify(posts,null,2));await writeFile('public/data/archive-meta.json',JSON.stringify(meta,null,2));
console.log(`Demo ready: ${posts.length} posts, ${photoIndex} photos, 5 years / 20 months.`);
