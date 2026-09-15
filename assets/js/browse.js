(async function() {
  const { apiFetch, esc, formatDate } = window.fp || {
    apiFetch: async (url) => { const r = await fetch(url); return r.json(); },
    esc: (s) => s ? String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : '',
    formatDate: (d) => d ? new Date(d).toLocaleDateString() : ''
  };

  const container = document.getElementById('browseGrid') || document.getElementById('grid') || document.querySelector('main');
  const pageTitleEl = document.getElementById('pageTitle') || document.querySelector('h1');
  
  const params = new URLSearchParams(window.location.search);
  const articleType = params.get('article_type') || '';
  const isTrailer = params.get('trailer') === '1';
  const query = params.get('q') || '';
  const isPinned = params.get('pinned') === '1';

  let pageHeading = 'Browse';
  if (articleType === 'review') pageHeading = 'Movie & Series Reviews';
  else if (articleType === 'news') pageHeading = 'Latest Entertainment News';
  else if (isTrailer) pageHeading = 'Movie & Series Trailers';
  else if (articleType === 'box-office' || articleType === 'box_office') pageHeading = 'Box Office Collection';
  else if (articleType === 'recommendation') pageHeading = 'Top 10 & Recommendations';
  
  if (pageTitleEl) pageTitleEl.textContent = pageHeading;
  document.title = `${pageHeading} — FilmParadise BD`;

  try {
    let items = [];

    const [articlesRes, moviesRes] = await Promise.allSettled([
      apiFetch('/api/articles').catch(() => apiFetch('/articles').catch(() => [])),
      apiFetch('/api/movies').catch(() => apiFetch('/movies').catch(() => []))
    ]);

    const rawArticles = (articlesRes.status === 'fulfilled' && articlesRes.value) ? (articlesRes.value.articles || articlesRes.value || []) : [];
    const rawMovies = (moviesRes.status === 'fulfilled' && moviesRes.value) ? (moviesRes.value.movies || moviesRes.value || []) : [];

    const movieItems = rawMovies.map(m => ({
      id: m.id,
      title: m.title,
      slug: m.slug,
      type: 'movie',
      item_type: m.type || 'MOVIE',
      poster_url: m.poster_url,
      summary: m.synopsis || m.summary || '',
      rating: m.imdb_rating || m.rating,
      year: m.year,
      trailer_url: m.trailer_url,
      box_office: m.box_office || m.boxOffice,
      created_at: m.created_at,
      is_pinned: m.is_pinned || m.pinned
    }));

    const articleItems = rawArticles.map(a => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      type: 'article',
      article_type: a.article_type || a.type,
      poster_url: a.cover_url || a.poster_url,
      summary: a.excerpt || a.summary || '',
      created_at: a.created_at,
      trailer_url: a.trailer_url,
      box_office: a.box_office,
      is_pinned: a.is_pinned || a.pinned
    }));

    if (articleType === 'review') {
      items = [...articleItems.filter(a => a.article_type === 'review'), ...movieItems];
    } else if (articleType === 'news') {
      items = articleItems.filter(a => a.article_type === 'news');
      if (!items.length) items = articleItems;
    } else if (isTrailer) {
      items = [...movieItems, ...articleItems].filter(x => x.trailer_url && x.trailer_url.trim() !== '');
    } else if (articleType === 'box-office' || articleType === 'box_office') {
      items = [...movieItems, ...articleItems].filter(x => x.box_office && x.box_office !== 'N/A' && x.box_office !== '—');
      if (!items.length) items = movieItems;
    } else if (articleType === 'recommendation') {
      items = [...articleItems.filter(a => a.article_type === 'recommendation' || a.article_type === 'top10'), ...movieItems.filter(m => m.is_pinned)];
      if (!items.length) items = movieItems;
    } else if (isPinned) {
      items = [...movieItems, ...articleItems].filter(x => x.is_pinned);
      if (!items.length) items = movieItems;
    } else if (query) {
      const q = query.toLowerCase();
      items = [...movieItems, ...articleItems].filter(x => x.title && x.title.toLowerCase().includes(q));
    } else {
      items = [...movieItems, ...articleItems];
    }

    if (!items || items.length === 0) {
      container.innerHTML = `<div class="empty" style="padding:40px; text-align:center; color:#888;">No content found in this section yet. Please add content from Admin.</div>`;
      return;
    }

    const placeholder = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600"><rect width="100%" height="100%" fill="#121216"/><text x="50%" y="50%" fill="#777" font-family="Arial" font-size="22" text-anchor="middle">FILM PARADISE</text></svg>`);

    container.innerHTML = `
      <div class="container section">
        <div class="section-head" style="margin-bottom:25px;">
          <h2>${esc(pageHeading)} <small style="font-size:14px;color:#888;font-weight:normal;">(${items.length} items)</small></h2>
        </div>
        <div class="article-grid four">
          ${items.map(item => {
            const link = item.type === 'movie' ? `/movie.html?slug=${encodeURIComponent(item.slug)}` : `/article.html?slug=${encodeURIComponent(item.slug)}`;
            const img = item.poster_url || placeholder;
            return `
              <a href="${link}" class="card-item">
                <div class="card-media">
                  <img src="${esc(img)}" onerror="this.src='${placeholder}'" alt="${esc(item.title)}" loading="lazy">
                  ${item.rating ? `<span class="badge-rating" style="position:absolute;top:10px;right:10px;background:rgba(0,0,0,0.8);padding:3px 8px;border-radius:4px;color:#f5c518;font-weight:bold;font-size:12px;">★ ${item.rating}</span>` : ''}
                </div>
                <div class="card-content" style="padding:12px 0;">
                  <span class="card-tag" style="color:#e50914;font-size:11px;font-weight:bold;letter-spacing:1px;">${esc(item.item_type || item.article_type || 'POST').toUpperCase()}</span>
                  <h3 class="card-title" style="margin:5px 0;font-size:16px;">${esc(item.title)}</h3>
                  ${item.summary ? `<p class="card-excerpt" style="color:#aaa;font-size:13px;line-height:1.4;">${esc(item.summary.slice(0, 80))}...</p>` : ''}
                </div>
              </a>
            `;
          }).join('')}
        </div>
      </div>
    `;

  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="empty">Error loading content. Please try again.</div>`;
  }
})();
