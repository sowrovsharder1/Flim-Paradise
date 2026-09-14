import { getDB } from '../../_lib/db.js';
import { json, badRequest, unauthorized, serverError, notFound } from '../../_lib/response.js';
import { requireAuth } from '../../_lib/auth.js';

export async function onRequestPost({request,env}){
  try{
    const b=await request.json(); const movieId=Number(b.movie_id); const name=String(b.author_name||'').trim(); const comment=String(b.comment||'').trim(); const rating=Number(b.rating);
    if(!movieId||!name||!comment) return badRequest('Name, rating, and review are required.');
    if(!Number.isInteger(rating)||rating<1||rating>10) return badRequest('Rating must be between 1 and 10.');
    if(name.length>80||comment.length>2000) return badRequest('Review is too long.');
    if(b.website) return badRequest('Spam detected.');
    const db=getDB(env); const movie=await db.prepare("SELECT id FROM movies WHERE id=? AND status='published'").bind(movieId).first(); if(!movie) return notFound('Movie not found.');
    await db.prepare('INSERT INTO community_reviews(movie_id,author_name,rating,comment,status) VALUES(?,?,?,?,\'pending\')').bind(movieId,name,rating,comment).run();
    return json({ok:true,message:'Thanks! Your review is pending moderation.'},201);
  }catch(e){return serverError(e.message)}
}

export async function onRequestGet({request,env}){
  if(!await requireAuth(request,env)) return unauthorized();
  try{const u=new URL(request.url); const status=u.searchParams.get('status')||'pending'; const db=getDB(env); const {results}=await db.prepare(`SELECT r.*,m.title AS movie_title FROM community_reviews r JOIN movies m ON m.id=r.movie_id WHERE r.status=? ORDER BY r.created_at DESC LIMIT 100`).bind(status).all(); return json({community_reviews:results});}catch(e){return serverError(e.message)}
}
