import React, {useState} from 'react';
import collection from './gallery.json';
import './gallery.css';

// The preview contains only image references explicitly supplied by the curator.
// Previously imported post records remain in D1; no X widget or API is loaded here.
export default function PhotoGallery() {
  const groups = new Map<string, typeof collection>();
  for (const post of collection) {
    const month = post.created_at.slice(0, 7);
    groups.set(month, [...(groups.get(month) || []), post]);
  }
  return <div className="gallery-page">
    <a className="skip-link" href="#photographs">Skip to photographs</a>
    <header className="gallery-header">
      <a href="/" className="wordmark"><span className="archive-mark" aria-hidden="true">▥</span>X VISUAL ARCHIVE</a>
      <a className="gallery-account" href="https://x.com/mihina_48" target="_blank" rel="noreferrer">@mihina_48 ↗</a>
    </header>
    <main className="gallery-main" id="photographs">
      {[...groups.entries()].map(([month, posts]) => <section className="gallery-month" key={month} aria-label={month}>
        <aside className="gallery-time">
          <h1>{month.slice(0, 4)}</h1>
          <span className="gallery-month-name">{new Date(`${month}-01T00:00:00Z`).toLocaleString('en-US', {month:'long',timeZone:'UTC'})}</span>
          <span className="gallery-date-rule"/>
          <span className="gallery-day">{posts[0].created_at.slice(8,10)}</span>
        </aside>
        <div className="gallery-photographs">
          {posts.map(post => <div className="gallery-post" key={post.post_id}>
            {post.photos.map((photo, index) => <GalleryImage key={photo.url} photo={photo} post={post} index={index}/>) }
          </div>)}
        </div>
      </section>)}
    </main>
    <footer className="gallery-footer">
      <span>Independent archive · Images remain on X.</span>
      <a href="/curate">Curator ↗</a>
    </footer>
  </div>;
}

function GalleryImage({photo,post,index}:{photo:typeof collection[number]['photos'][number];post:typeof collection[number];index:number}) {
  const [failed,setFailed] = useState(false);
  const date = new Date(post.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric',timeZone:'UTC'});
  return <a className="gallery-image-link" href={post.post_url} target="_blank" rel="noreferrer" aria-label={`View original post on X — ${date}, photo ${index+1}`}>
    {failed ? <div className="gallery-image-unavailable">Image unavailable<span>View original post ↗</span></div> : <img src={photo.url} alt={photo.alt} decoding="async" onError={()=>setFailed(true)}/>}
    {!failed && <div className="gallery-image-caption"><span>{date}</span><span>View original post ↗</span></div>}
  </a>;
}

