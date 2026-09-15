(function () {
  const params = new URLSearchParams(location.search);

  const articleType = params.get('article_type') || '';
  const trailer = params.get('trailer') === '1';
  const recommended = params.get('recommended') === '1';
  const home = params.get('home') === '1';
  const review = params.get('review') === '1';

  const grid = document.getElementById('grid');
  const title = document.getElementById('pageTitle');

  const { apiFetch, esc } = window.fp;

  function movieCard(m) {
    const poster = m.poster_url
      ? `<img src="${esc(m.poster_url)}" alt="${esc(m.title)}">`
      : `<div class="article-thumb"><span>${esc(m.title)}</span></div>`;

    return `
      <a class="movie-card" href="/movie.html?slug=${encodeURIComponent(m.slug)}">
        <div class="poster-wrap">
          ${poster}
          ${
            m.is_featured
              ? `<span class="pin">FEATURED</span>`
              : ''
          }
          ${
            m.type === 'web_series'
              ? `<span class="type-badge">SERIES</span>`
              : `<span class="type-badge">MOVIE</span>`
          }
        </div>

        <div class="card-info">
          <div class="card-title">${esc(m.title)}</div>

          <div class="card-meta">
            ${esc(m.year || '')}
            ${m.imdb_rating ? ` · IMDb ${esc(m.imdb_rating)}` : ''}
          </div>

          ${
            m.quick_summary || m.synopsis
              ? `
                <div class="card-summary">
                  ${esc(m.quick_summary || m.synopsis)}
                </div>
              `
              : ''
          }
        </div>
      </a>
    `;
  }

  function articleCard(a) {
    const image = a.cover_url
      ? `<img src="${esc(a.cover_url)}" alt="${esc(a.title)}">`
      : `<span>NEWS</span>`;

    return `
      <a class="article-card" href="/article.html?slug=${encodeURIComponent(a.slug)}">

        <div class="article-thumb">
          ${image}
        </div>

        <div class="article-body">

          <h3>${esc(a.title)}</h3>

          ${
            a.excerpt
              ? `<p>${esc(a.excerpt)}</p>`
              : ''
          }

          ${
            a.published_at
              ? `<time>${esc(a.published_at)}</time>`
              : ''
          }

        </div>

      </a>
    `;
  }

  async function loadMovies(endpoint, heading) {
    title.textContent = heading;

    const data = await apiFetch(endpoint);

    const movies = data.movies || [];

    if (!movies.length) {
      grid.innerHTML = `
        <div class="empty">
          No titles found.
        </div>
      `;
      return;
    }

    grid.innerHTML = movies
      .map(movieCard)
      .join('');
  }

  async function loadArticles(type, heading) {
    title.textContent = heading;

    const data = await apiFetch(
      '/articles?type=' + encodeURIComponent(type)
    );

    const articles = data.articles || [];

    if (!articles.length) {
      grid.innerHTML = `
        <div class="empty">
          No articles found.
        </div>
      `;
      return;
    }

    grid.innerHTML = articles
      .map(articleCard)
      .join('');
  }

  async function load() {

    /*
     * NEWS
     *
     * News is ARTICLE content only.
     * Never load movies here.
     */
    if (articleType === 'news') {
      await loadArticles(
        'news',
        'Latest News'
      );
      return;
    }

    /*
     * BOX OFFICE
     *
     * Box-office content is ARTICLE content only.
     * We will build the full Box Office Manager
     * in a later step.
     */
    if (articleType === 'box-office') {
      await loadArticles(
        'box-office',
        'Box Office'
      );
      return;
    }

    /*
     * TOP 10
     *
     * Top 10 will be handled separately.
     */
    if (articleType === 'recommendation') {
      window.location.href = '/top-10.html';
      return;
    }

    /*
     * TRAILERS
     */
    if (trailer) {
      await loadMovies(
        '/movies?trailer=1',
        'Latest Trailers'
      );
      return;
    }

    /*
     * REVIEWS
     */
    if (review) {
      await loadMovies(
        '/movies?review=1',
        'Latest Reviews'
      );
      return;
    }

    /*
     * RECOMMENDED
     */
    if (recommended) {
      await loadMovies(
        '/movies?recommended=1',
        'Recommended For You'
      );
      return;
    }

    /*
     * HOMEPAGE MOVIES
     */
    if (home) {
      await loadMovies(
        '/movies?home=1',
        'Movies'
      );
      return;
    }

    /*
     * DEFAULT
     */
    await loadMovies(
      '/movies',
      'Movies & Series'
    );
  }

  document.addEventListener(
    'DOMContentLoaded',
    () => {
      load().catch(err => {
        console.error(err);

        grid.innerHTML = `
          <div class="empty">
            Could not load content.
          </div>
        `;
      });
    }
  );

})();
