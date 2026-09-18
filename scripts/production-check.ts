import {MetaSchema,parseArchive} from '../src/archive.ts';
export function verifyProduction(data:unknown,metadata:unknown){
 const posts=parseArchive(data),meta=MetaSchema.parse(metadata);
 if(meta.demo)throw new Error('Deployment blocked: demo data is development-only. Import the real @mihina_48 archive first.');
 if(!meta.completed||!meta.last_synced)throw new Error('Deployment blocked: the real import is incomplete. Resume the importer first.');
 if(!/^\d+$/.test(meta.user_id)||!meta.display_name.trim())throw new Error('Deployment blocked: missing resolved X account identity.');
 if(!posts.length)throw new Error('Deployment blocked: no real photo posts have been imported.');
 if(meta.total_photo_posts!==posts.length||meta.total_photos!==posts.reduce((n,p)=>n+p.photos.length,0)||meta.total_posts_scanned<posts.length)throw new Error('Deployment blocked: archive statistics do not match the records.');
 const dates=posts.map(p=>p.created_at).sort();if(meta.oldest_post!==dates[0]||meta.newest_post!==dates.at(-1))throw new Error('Deployment blocked: archive date range is inconsistent.');
 for(const post of posts){
  if(!/^\d+$/.test(post.post_id)||post.post_url!==`https://x.com/mihina_48/status/${post.post_id}`)throw new Error('Deployment blocked: an invalid or placeholder post was found.');
  for(const photo of post.photos){if(new URL(photo.url).hostname!=='pbs.twimg.com'||photo.media_key.startsWith('demo-')||photo.credit||photo.source_url)throw new Error('Deployment blocked: a demo image or non-X media reference was found.');}
 }
 return {target:'@mihina_48',posts_inspected:meta.total_posts_scanned,photo_posts:posts.length,photos:meta.total_photos,oldest:meta.oldest_post,newest:meta.newest_post};
}
