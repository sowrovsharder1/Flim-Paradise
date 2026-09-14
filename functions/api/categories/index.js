import { getDB } from '../../_lib/db.js';
import { json, serverError, unauthorized, badRequest } from '../../_lib/response.js';
import { requireAuth } from '../../_lib/auth.js';

export async function onRequestGet({env}){
  try{ const {results}=await getDB(env).prepare('SELECT id,name,slug,sort_order FROM categories ORDER BY sort_order,name').all(); return json({categories:results}); }
  catch(e){ return serverError(e.message); }
}

export async function onRequestPost({request,env}){
  if(!await requireAuth(request,env)) return unauthorized();
  try{
    const body=await request.json(); const name=String(body.name||'').trim(); const slug=String(body.slug||'').trim();
    if(!name||!slug) return badRequest('Name and slug are required.');
    const {meta}=await getDB(env).prepare('INSERT INTO categories(name,slug,sort_order) VALUES(?,?,?)').bind(name,slug,Number(body.sort_order)||100).run();
    return json({id:meta.last_row_id},201);
  }catch(e){ return badRequest(String(e.message).includes('UNIQUE')?'Category already exists.':e.message); }
}
