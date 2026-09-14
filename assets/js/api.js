(function(){
  const esc = (s) => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  async function apiFetch(path, options={}){
    const headers = new Headers(options.headers || {});
    if(options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type','application/json');
    const res = await fetch('/api'+path, {...options, headers, credentials:'include'});
    let data={}; try{data=await res.json()}catch{}
    if(!res.ok){const e=new Error(data.error||`Request failed (${res.status})`);e.status=res.status;throw e;}
    return data;
  }
  window.fp={apiFetch,esc,escapeHtml:esc,formatDate:(v)=>v?new Date(v+'Z').toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}):''};
})();
