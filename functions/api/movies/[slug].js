import { getDB } from '../../_lib/db.js';
import { json, serverError, unauthorized, notFound, badRequest } from '../../_lib/response.js';
import { requireAuth } from '../../_lib/auth.js';
function safeText(v,max=12000){return String(v??'').slice(0,max)}

export async function onRequestGet({params,request,env}){
  try{
    const db=getDB(env), authed=await requireAuth(request,env);
    const movie=await db.prepare(`SELECT m.*,
      COALESCE((SELECT ROUND(AVG(r.rating),1) FROM community_reviews r WHERE r.movie_id=m.id AND r.status='approved'),0) audience_rating,
      COALESCE((SELECT COUNT(*) FROM community_reviews r WHERE r.movie_id=m.id AND r.status='approved'),0) review_count,
      COALESCE(mm.duration,'') duration, COALESCE(mm.release_date,'') release_date
      FROM movies m LEFT JOIN movie_meta mm ON mm.movie_id=m.id WHERE m.slug=?`).bind(params.slug).first();
    if(!movie || (movie.status!=='published'&&!authed)) return notFound('Title not found.');
    const [{results:categories},{results:reviews}]=await Promise.all([
      db.prepare('SELECT c.id,c.name,c.slug FROM categories c JOIN movie_categories mc ON mc.category_id=c.id WHERE mc.movie_id=? ORDER BY c.sort_order').bind(movie.id).all(),
      db.prepare(`SELECT id,author_name,rating,comment,created_at FROM community_reviews WHERE movie_id=? AND status='approved' ORDER BY created_at DESC LIMIT 50`).bind(movie.id).all()
    ]);
    return json({movie,categories,reviews});
  }catch(e){return serverError(e.message)}
}

export async function onRequestPut({params,request,env}){
  if(!await requireAuth(request,env)) return unauthorized();
  try{
    const db=getDB(env), existing=await db.prepare('SELECT id FROM movies WHERE slug=?').bind(params.slug).first(); if(!existing) return notFound();
    const b=await request.json(); const fields=['title','slug','type','poster_url','year','language','genre','quality','imdb_rating','country','cast','director','synopsis','trailer_url','box_office','is_featured','is_pinned','status'];
    const sets=[],vals=[];
    for(const f of fields) if(b[f]!==undefined){sets.push(`${f}=?`); vals.push((f==='is_featured'||f==='is_pinned')?(b[f]?1:0):safeText(b[f],f==='synopsis'?12000:3000));}
    if(sets.length){vals.push(existing.id); await db.prepare(`UPDATE movies SET ${sets.join(',')},updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(...vals).run();}
    await db.prepare('INSERT INTO movie_meta(movie_id,duration,release_date) VALUES(?,?,?) ON CONFLICT(movie_id) DO UPDATE SET duration=excluded.duration,release_date=excluded.release_date').bind(existing.id,String(b.duration||''),String(b.release_date||'')).run();
    if(Array.isArray(b.category_ids)){await db.prepare('DELETE FROM movie_categories WHERE movie_id=?').bind(existing.id).run(); for(const cid of b.category_ids) await db.prepare('INSERT OR IGNORE INTO movie_categories(movie_id,category_id) VALUES(?,?)').bind(existing.id,Number(cid)).run();}
    return json({ok:true});
  }catch(e){return badRequest(String(e.message).includes('UNIQUE')?'This slug already exists.':e.message)}
}

export async function onRequestDelete({params,request,env}){
  if(!await requireAuth(request,env)) return unauthorized();
  try{const db=getDB(env), r=await db.prepare('DELETE FROM movies WHERE slug=?').bind(params.slug).run(); if(!r.meta.changes) return notFound(); return json({ok:true});}catch(e){return serverError(e.message)}
}
