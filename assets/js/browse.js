(function () {
  async function initBrowse() {
    const container = 
      document.getElementById('browseGrid') || 
      document.getElementById('grid') || 
      document.querySelector('main');

    if (!container) return;

    const params = new URLSearchParams(window.location.search);
    const rawType = (params.get('article_type') || '').toLowerCase().trim();
    const isTrailer = params.get('trailer') === '1';
    const query = (params.get('q') || '').trim().toLowerCase();
    const isPinned = params.get('pinned') === '1';

    let pageHeading = 'Browse All';
    if (rawType === 'review') pageHeading = 'Reviews';
    else if (rawType === 'news') pageHeading = 'News';
    else if (isTrailer) pageHeading = 'Trailers';
    else if (rawType === 'box-office' || rawType === 'box_office') pageHeading = 'Box Office';
    else if (['recommendation', 'top10', 'top-10'].includes(rawType)) pageHeading = 'Top 10 & Recommendations';

    const pageTitleEl = document.getElementById('pageTitle') || document.querySelector('h1');
    if (pageTitleEl) pageTitleEl.textContent = pageHeading;
    document.title = `${pageHeading} — FilmParadise BD`;

    const esc = (s) => (s ? String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : '');
    const placeholder = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600"><rect width="100%" height="100%" fill="#121216"/><text x="50%" y="50%" fill="#777" font-family="Arial" font-size="22" text-anchor="middle">FILM PARADISE</text></svg>');

    async function fetchData(endpoint) {
      try {
        const res = await fetch(endpoint);
        if (!res.ok) return [];
        const data = await res.json();
        if (Array.isArray(data)) return data;
        return data.articles || data.movies || data.data || [];
      } catch (e) {
        return [];
      }
    }

    try {
      let [articles, movies] = await Promise.all([
        fetchData('/api/articles').then(res => res.length ? res : fetchData('/articles')),
        fetchData('/api/movies').then(res => res.length ? res : fetchData('/movies'))
      ]);

      const movieItems = movies.map(m => ({
        id: m.id,
        title: m.title || 'Untitled',
        slug: m.slug || '',
        kind: 'movie',
        typeLabel: m.type || 'MOVIE',
        poster: m.poster_url || m.cover_url || placeholder,
        summary: m.synopsis || m.summary || '',
        rating: m.imdb_rating || m.rating || '',
        boxOffice: m.box_office || m.boxOffice || '',
        trailerUrl: m.trailer_url || '',
        isPinned: Boolean(m.is_pinned || m.pinned)
      }));

      const articleItems = articles.map(a => ({
        id: a.id,
        title: a.title || 'Untitled',
        slug: a.slug || '',
        kind: 'article',
        typeLabel: (a.article_type || a.type || a.category || 'ARTICLE').toLowerCase(),
        poster: a.cover_url || a.poster_url || placeholder,
        summary: a.excerpt || a.summary || '',
        boxOffice: a.box_office || a.boxOffice || '',
        trailerUrl: a.trailer_url || '',
        isPinned: Boolean(a.is_pinned || a.pinned)
      }));

      let displayList = [];

      if (rawType === 'review') {
        displayList = articleItems.filter(a => a.typeLabel === 'review');
      } else if (rawType === 'news') {
        displayList = articleItems.filter(a => a.typeLabel === 'news');
      } else if (isTrailer) {
        displayList = [...movieItems, ...articleItems].filter(x => x.trailerUrl && x.trailerUrl.trim() !== '');
      } else if (rawType === 'box-office' || rawType === 'box_office') {
        displayList = [
          ...articleItems.filter(a => ['box-office', 'box_office'].includes(a.typeLabel)),
          ...movieItems.filter(m => m.boxOffice && m.boxOffice !== 'N/A' && m.boxOffice !== '—' && m.boxOffice.trim() !== '')
        ];
      } else if (['recommendation', 'top10', 'top-10'].includes(rawType)) {
        displayList = [
          ...articleItems.filter(a => ['recommendation', 'top10', 'top-10', 'recommendations'].includes(a.typeLabel)),
          ...movieItems.filter(m => m.isPinned)
        ];
      } else if (isPinned) {
        displayList = [...movieItems, ...articleItems].filter(x => x.isPinned);
      } else if (query) {
        displayList = [...movieItems, ...articleItems].filter(x => x.title.toLowerCase().includes(query));
      } else {
        displayList = [...movieItems, ...articleItems];
      }

      if (!displayList || displayList.length === 0) {
        container.innerHTML = `
          <div class="container section" style="text-align:center; padding:80px 20px;">
            <h2 style="color:#fff; font-size:28px;">${esc(pageHeading)}</h2>
            <p style="color:#aaa; font-size:16px; margin-top:10px;">এই ক্যাটাগরিতে এখনো কোনো পোস্ট বা মুভি আপলোড করা হয়নি।</p>
            <p style="color:#666; font-size:13px; margin-top:5px;">এডমিন প্যানেল থেকে আর্টিকেল বা মুভি যোগ করুন।</p>
          </div>`;
        return;
      }

      container.innerHTML = `
        <div class="container section">
          <div class="section-head" style="margin-bottom:25px;">
            <h2>${esc(pageHeading)} <span style="font-size:14px;color:#888;font-weight:normal;">(${displayList.length} items)</span></h2>
          </div>
          <div class="article-grid four">
            ${displayList.map(item => {
              const link = item.kind === 'movie' 
                ? `/movie.html?slug=${encodeURIComponent(item.slug)}` 
                : `/article.html?slug=${encodeURIComponent(item.slug)}`;
              
              return `
                <a href="${link}" class="card-item">
                  <div class="card-media">
                    <img src="${esc(item.poster)}" onerror="this.src='${placeholder}'" alt="${esc(item.title)}" loading="lazy">
                    ${item.rating ? `<span class="badge-rating" style="position:absolute;top:10px;right:10px;background:rgba(0,0,0,0.8);padding:3px 8px;border-radius:4px;color:#f5c518;font-weight:bold;font-size:12px;">★ ${item.rating}</span>` : ''}
                  </div>
                  <div class="card-content" style="padding:12px 0;">
                    <span class="card-tag" style="color:#e50914;font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">${esc(item.typeLabel)}</span>
                    <h3 class="card-title" style="margin:5px 0;font-size:16px;color:#fff;">${esc(item.title)}</h3>
                    ${item.boxOffice ? `<p style="color:#22c55e;font-weight:bold;font-size:13px;margin:3px 0;">💰 ${esc(item.boxOffice)}</p>` : ''}
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
      container.innerHTML = `<div class="container section" style="text-align:center; padding:50px; color:#e50914;">ডাটা লোড করতে সমস্যা হয়েছে। দয়া করে পেজটি রিফ্রেশ করুন।</div>`;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBrowse);
  } else {
    initBrowse();
  }
})();
