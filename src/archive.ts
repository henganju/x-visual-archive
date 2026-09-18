import { z } from 'zod';
const safeUrl = z.string().url().refine(v => new URL(v).protocol === 'https:', 'Only HTTPS URLs are allowed');
export const PhotoSchema = z.object({ media_key:z.string(),url:safeUrl,width:z.number().positive(),height:z.number().positive(),alt_text:z.string().optional(),credit:z.string().optional(),source_url:safeUrl.optional() });
export const PostSchema = z.object({ post_id:z.string().min(1),post_url:safeUrl,username:z.literal('mihina_48'),created_at:z.string().datetime(),text:z.string(),photos:z.array(PhotoSchema).min(1),edited:z.boolean().optional(),entities:z.array(z.object({start:z.number(),end:z.number(),url:safeUrl,label:z.string()})).optional() });
export const MetaSchema = z.object({username:z.literal('mihina_48'),display_name:z.string(),user_id:z.string(),profile_image_url:safeUrl.optional(),demo:z.boolean(),last_synced:z.string().datetime().nullable(),total_posts_scanned:z.number().nonnegative(),total_photo_posts:z.number().nonnegative(),total_photos:z.number().nonnegative(),oldest_post:z.string().nullable(),newest_post:z.string().nullable(),newest_scanned_id:z.string().nullable(),coverage:z.string(),completed:z.boolean()});
export type Photo = z.infer<typeof PhotoSchema>;
export type Post = z.infer<typeof PostSchema>;
export type Meta = z.infer<typeof MetaSchema>;
export const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export function parseArchive(raw:unknown):Post[]{
 const posts = z.array(PostSchema).parse(raw);
 if(new Set(posts.map(p=>p.post_id)).size!==posts.length) throw new Error('Duplicate archive records');
 return posts;
}
export type Filters = {year:string;month:string;type:string;search:string;order:string};
export function filterPosts(posts:Post[], f:Filters){
 return posts.filter(p=>{const d=new Date(p.created_at);const y=String(d.getUTCFullYear());const m=String(d.getUTCMonth());return (!f.year||f.year===y)&&(!f.month||f.month===m)&&(f.type!=='single'||p.photos.length===1)&&(f.type!=='multiple'||p.photos.length>1)&&`${p.text} ${y} ${months[d.getUTCMonth()]}`.toLocaleLowerCase().includes(f.search.trim().toLocaleLowerCase());}).sort((a,b)=>(f.order==='oldest'?1:-1)*a.created_at.localeCompare(b.created_at));
}
