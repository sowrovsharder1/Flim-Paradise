(function(){
  const {apiFetch,esc,formatDate}=window.fp;
  const placeholder='data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600"><rect width="100%" height="100%" fill="#121216"/><text x="50%" y="50%" fill="#777" font-family="Arial" font-size="22" text-anchor="middle">FILM PARADISE</text></svg>`);
  const img=u=>u||placeholder;
  function card(m,rank){return `<a class="movie-card" href="/movie.html?slug=${encodeURIComponent(m.slug)}"><div class="poster-wrap"><img loading="lazy" src="${esc(img(m.poster_url))}" alt="${esc(m.title)} poster" onerror="this.src='${placeholder}'">${rank?`<span class="rank">${rank}</span>`:''}${m.is_pinned?'<span class="pin">TOP</span>':''}</div><div class="card-info"><div class="card-title">${esc(m.title)}</div><div class="card-meta">${esc(m.year||'—')} · ${esc(m.language||'')} ${m.audience_rating?`· ★ ${esc(m.audience_rating)}`:''}</div><div class="card-summary">${esc(m.synopsis||'')}</div></div></a>`}
  function articleCard(a){return `<a class="article-card" href="/article.html?slug=${encodeURIComponent(a.slug)}"><div class="article-thumb">${a.cover_url?`<img loading="lazy" src="${esc(a.cover_url)}" alt="">`:'<span>FILM</span>'}</div><div class="article-body"><div class="eyebrow">${esc(a.content_type.replace('-',' '))}</div><h3>${esc(a.title)}</h3><p>${esc(a.excerpt||'')}</p><time>${formatDate(a.created_at)}</time></div></a>`}
  async function loadHome(){
    try{
      const [featured,recs,reviews,news,trailers,series,box]=await Promise.all([
        apiFetch('/movies?featured=1&limit=1'),apiFetch('/movies?pinned=1&limit=8'),apiFetch('/articles?type=review&limit=8'),apiFetch('/articles?type=news&limit=8'),apiFetch('/movies?trailer=1&limit=8'),apiFetch('/movies?type=series&limit=8'),apiFetch('/movies?limit=20')
      ]);
      if(featured.movies[0]){const m=featured.movies[0];document.getElementById('hero').innerHTML=`<div class="hero-bg" style="background-image:linear-gradient(90deg,rgba(7,7,9,.98) 0%,rgba(7,7,9,.8) 48%,rgba(7,7,9,.35)),url('${esc(m.backdrop_url||m.poster_url)}')"><div class="hero-inner"><div class="eyebrow">EDITOR'S FEATURE</div><h1>${esc(m.title)}</h1><div class="hero-meta">${esc(m.year||'')} · ${esc(m.genre||'')} ${m.imdb_rating?`· IMDb ${esc(m.imdb_rating)}`:''}</div><p>${esc(m.synopsis||'')}</p><a class="btn btn-primary" href="/movie.html?slug=${encodeURIComponent(m.slug)}">Read review & ratings</a></div></div>`;}
      document.getElementById('recommended').innerHTML=recs.movies.length?recs.movies.map((m,i)=>card(m,i+1)).join(''):'<div class="empty">No recommendations yet.</div>';
      document.getElementById('review-list').innerHTML=reviews.articles.length?reviews.articles.map(articleCard).join(''):'<div class="empty">No reviews yet.</div>';
      document.getElementById('news-list').innerHTML=news.articles.length?news.articles.map(articleCard).join(''):'<div class="empty">No news yet.</div>';
      document.getElementById('trailers').innerHTML=trailers.movies.length?trailers.movies.map(m=>`<a class="trailer-card" href="/movie.html?slug=${encodeURIComponent(m.slug)}"><div class="trailer-media">${m.poster_url?`<img src="${esc(m.poster_url)}" alt="">`:''}<span class="play">▶</span></div><strong>${esc(m.title)}</strong><small>${esc(m.year||'')}</small></a>`).join(''):'<div class="empty">No trailer entries yet.</div>';
      document.getElementById('series').innerHTML=series.movies.length?series.movies.map(m=>card(m)).join(''):'<div class="empty">No series yet.</div>';
      document.getElementById('boxoffice').innerHTML=box.movies.filter(m=>m.box_office).slice(0,8).map(m=>`<a class="box-card" href="/movie.html?slug=${encodeURIComponent(m.slug)}"><div class="mini-poster"><img src="${esc(img(m.poster_url))}" alt=""></div><div><strong>${esc(m.title)}</strong><span>${esc(m.box_office)}</span></div></a>`).join('')||'<div class="empty">No box-office data yet.</div>';
    }catch(e){document.querySelectorAll('[data-loading]').forEach(x=>x.innerHTML='<div class="empty">Could not load content right now.</div>');}
  }
  function nav(){document.getElementById('searchForm')?.addEventListener('submit',e=>{e.preventDefault();const q=new FormData(e.currentTarget).get('q'); if(q) location.href='/search.html?q='+encodeURIComponent(q)});document.getElementById('menuBtn')?.addEventListener('click',()=>document.getElementById('nav')?.classList.toggle('open'));}
  document.addEventListener('DOMContentLoaded',()=>{nav();if(document.body.dataset.page==='home')loadHome();});
})();
