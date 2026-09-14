import {json,notFound,serverError} from '../../_lib/response.js';

export async function onRequestGet({params,env}){
  try{
    if(!env.POSTERS) return new Response('R2 binding missing',{status:500});
    
    let key = Array.isArray(params.key) ? params.key.join('/') : (params.key || '');
    
    if(!key || key.includes('..')) return notFound();
    
    let obj = await env.POSTERS.get(key);
    if(!obj && !key.startsWith('posters/')) {
      obj = await env.POSTERS.get('posters/' + key);
    }
    
    if(!obj) return notFound();
    
    const h = new Headers();
    obj.writeHttpMetadata(h);
    h.set('etag', obj.httpEtag);
    h.set('cache-control', 'public, max-age=31536000, immutable');
    
    return new Response(obj.body, {headers: h});
  } catch(e) {
    return serverError(e.message);
  }
}
