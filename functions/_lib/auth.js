const COOKIE = 'fp_session';

function bytesToHex(bytes){ return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join(''); }
async function sign(secret, value){
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  return bytesToHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
}
function b64url(text){ return btoa(unescape(encodeURIComponent(text))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function unb64url(text){ text=text.replace(/-/g,'+').replace(/_/g,'/'); while(text.length%4) text+='='; return decodeURIComponent(escape(atob(text))); }
function timingSafeEqual(a,b){
  if(a.length!==b.length) return false;
  let n=0; for(let i=0;i<a.length;i++) n |= a.charCodeAt(i)^b.charCodeAt(i); return n===0;
}
export function getCookie(request,name){
  const raw=request.headers.get('Cookie')||'';
  const m=raw.match(new RegExp('(?:^|;\\s*)'+name+'=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}
export async function createSession(env){
  const secret=env.SESSION_SECRET;
  if(!secret) throw new Error('SESSION_SECRET secret is not configured.');
  const payload=b64url(JSON.stringify({exp:Date.now()+7*24*60*60*1000, v:1}));
  const sig=await sign(secret,payload);
  return `${payload}.${sig}`;
}
export async function requireAuth(request,env){
  const token=getCookie(request,COOKIE); if(!token) return false;
  const parts=token.split('.'); if(parts.length!==2) return false;
  const secret=env.SESSION_SECRET; if(!secret) return false;
  const expected=await sign(secret,parts[0]);
  if(!timingSafeEqual(expected,parts[1])) return false;
  try { const p=JSON.parse(unb64url(parts[0])); return !!p.exp && p.exp>Date.now(); } catch { return false; }
}
export function sessionCookie(token){ return `${COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${7*24*60*60}`; }
export function clearSessionCookie(){ return `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`; }
