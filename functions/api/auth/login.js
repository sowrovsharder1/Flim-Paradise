import { json, badRequest, unauthorized, serverError } from '../../_lib/response.js';
import { createSession, sessionCookie } from '../../_lib/auth.js';

function eq(a,b){ if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length) return false; let n=0; for(let i=0;i<a.length;i++) n|=a.charCodeAt(i)^b.charCodeAt(i); return n===0; }

export async function onRequestPost({request,env}){
  try{
    const body=await request.json();
    const username=String(body.username||'');
    const password=String(body.password||'');
    if(!username||!password) return badRequest('Username and password are required.');
    const adminUser=env.ADMIN_USERNAME;
    const adminPass=env.ADMIN_PASSWORD;
    if(!adminUser||!adminPass) return serverError('Admin secrets are not configured.');
    if(!eq(username,adminUser)||!eq(password,adminPass)) return unauthorized('Invalid username or password.');
    const token=await createSession(env);
    return json({ok:true},200,{'Set-Cookie':sessionCookie(token)});
  }catch(e){ return serverError(e.message); }
}
