import { getDB } from '../../_lib/db.js';
import { json, unauthorized, notFound, badRequest, serverError } from '../../_lib/response.js';
import { requireAuth } from '../../_lib/auth.js';
export async function onRequestPut({params,request,env}){
  if(!await requireAuth(request,env)) return unauthorized();
  try{ const body=await request.json(); const r=await getDB(env).prepare('UPDATE categories SET name=?,slug=?,sort_order=? WHERE id=?').bind(String(body.name||''),String(body.slug||''),Number(body.sort_order)||100,params.id).run(); if(!r.meta.changes) return notFound(); return json({ok:true}); }
  catch(e){ return badRequest(String(e.message).includes('UNIQUE')?'Category already exists.':e.message); }
}
export async function onRequestDelete({params,request,env}){
  if(!await requireAuth(request,env)) return unauthorized();
  try{ const db=getDB(env); const r=await db.prepare('DELETE FROM categories WHERE id=?').bind(params.id).run(); if(!r.meta.changes) return notFound(); return json({ok:true}); }catch(e){ return serverError(e.message); }
}
