import { json } from '../../_lib/response.js';
import { clearSessionCookie } from '../../_lib/auth.js';
export async function onRequestPost(){ return json({ok:true},200,{'Set-Cookie':clearSessionCookie()}); }
