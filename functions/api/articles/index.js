import { getDB } from '../../_lib/db.js';
import { json, badRequest, unauthorized, serverError } from '../../_lib/response.js';
import { requireAuth } from '../../_lib/auth.js';
function slugify(s){return String(s||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')}
function text(v,max){return String(v??'').slice(0,max)}
export async function onRequestGet({request,env}){
  try{const db=getDB(env),u=new URL(request.url), authed=await requireAuth(request,env); const type=u.searchParams.get('type'); const q=u.searchParams.get('q'); const limit=Math.min(Math.max(parseInt(u.searchParams.get('limit')||'20',10)||20,1),50); let sql=`SELECT a.*,m.title AS movie_title,m.slug AS movie_slug FROM articles a LEFT JOIN movies m ON m.id=a.movie_id`; const c=[],p=[]; if(!authed)c.push("a.status='published'"); if(type){c.push('a.content_type=?');p.push(type)} if(q){c.push('(a.title LIKE ? OR a.excerpt LIKE ?)');const x=`%${q}%`;p.push(x,x)} if(c.length)sql+=' WHERE '+c.join(' AND '); sql+=' ORDER BY a.is_featured DESC,a.created_at DESC LIMIT ?';p.push(limit); const {results}=await db.prepare(sql).bind(...p).all(); return json({articles:results});}catch(e){return serverError(e.message)}
}
export async function onRequestPost({request,env}){
  if(!await requireAuth(request,env)) return unauthorized(); try{const b=await request.json(),title=text(b.title,200),slug=slugify(b.slug||title); if(!title||!slug)return badRequest('Title is required.'); const type=String(b.content_type||'news'); if(!['review','news','trailer','box-office','recommendation','feature'].includes(type))return badRequest('Invalid article type.'); const db=getDB(env); const r=await db.prepare(`INSERT INTO articles(title,slug,content_type,excerpt,body,cover_url,movie_id,category,status,is_featured) VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(title,slug,type,text(b.excerpt,500),text(b.body,30000),text(b.cover_url,2000),b.movie_id?Number(b.movie_id):null,text(b.category,120),b.status==='published'?'published':'draft',b.is_featured?1:0).run(); return json({id:r.meta.last_row_id,slug},201);}catch(e){return badRequest(String(e.message).includes('UNIQUE')?'This slug already exists.':e.message)}
}
