import { getDB } from '../../_lib/db.js';
import { json, unauthorized, notFound, serverError, badRequest } from '../../_lib/response.js';
import { requireAuth } from '../../_lib/auth.js';
export async function onRequestPut({params,request,env}){
  if(!await requireAuth(request,env)) return unauthorized();
  try{const status=String((await request.json()).status||''); if(!['pending','approved','rejected'].includes(status)) return badRequest('Invalid status.'); const r=await getDB(env).prepare('UPDATE community_reviews SET status=? WHERE id=?').bind(status,params.id).run(); if(!r.meta.changes)return notFound(); return json({ok:true});}catch(e){return serverError(e.message)}
}
export async function onRequestDelete({params,request,env}){
  if(!await requireAuth(request,env)) return unauthorized();
  try{const r=await getDB(env).prepare('DELETE FROM community_reviews WHERE id=?').bind(params.id).run(); if(!r.meta.changes)return notFound(); return json({ok:true});}catch(e){return serverError(e.message)}
}
