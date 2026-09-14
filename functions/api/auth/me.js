import { json } from '../../_lib/response.js';
import { requireAuth } from '../../_lib/auth.js';
export async function onRequestGet({request,env}){ return json({authenticated:await requireAuth(request,env)}); }
