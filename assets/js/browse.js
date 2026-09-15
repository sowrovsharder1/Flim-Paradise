```javascript
(function () {
  const params = new URLSearchParams(location.search);

  const articleType = params.get('article_type') || '';
  const trailer = params.get('trailer') === '1';
  const recommended = params.get('recommended') === '1';
  const home = params.get('home') === '1';

  /*
    Current browse.html uses:

    #pageQuery
    #movieGrid
    #articleGrid

    So this JS uses those exact IDs.
  */

  const movieGrid = document.getElementById('movieGrid');
  const articleGrid = document.getElementById('articleGrid');
  const pageTitle = document.getElementById('pageQuery');

  const { apiFetch, esc } = window.fp;


  /* =========================================================
     MOVIE CARD
     ========================================================= */

  function movieCard(m) {

    const poster = m.poster_url
      ? `
        <img
          src="${esc(m.poster_url)}"
          alt="${esc(m.title)}"
          loading="lazy"
        >
      `
      : `
        <div class="article-thumb">
          <span>${esc(m.title)}</span>
        </div>
      `;


    return `
      <a
        class="movie-card"
        href="/movie.html?slug=${encodeURIComponent(m.slug)}"
      >

        <div class="poster-wrap">

          ${poster}

          ${
            m.is_featured
              ? `<span class="pin">FEATURED</span>`
              : ''
          }

          ${
            m.type === 'series' || m.type === 'web_series'
              ? `<span class="type-badge">SERIES</span>`
              : `<span class="type-badge">MOVIE</span>`
          }

        </div>


        <div class="card-info">

          <div class="card-title">
            ${esc(m.title)}
          </div>


          <div class="card-meta">

            ${esc(m.year || '')}

            ${
              m.language
                ? ` · ${esc(m.language)}`
                : ''
            }

            ${
              m.imdb_rating
                ? ` · IMDb ${esc(m.imdb_rating)}`
                : ''
            }

          </div>


          ${
            m.quick_summary || m.synopsis
              ? `
                <div class="card-summary">
                  ${esc(
                    m.quick_summary ||
                    m.synopsis ||
                    ''
                  )}
                </div>
              `
              : ''
          }

        </div>

      </a>
    `;
  }



  /* =========================================================
     ARTICLE CARD
     ========================================================= */

  function articleCard(a) {

    const image = a.cover_url
      ? `
        <img
          src="${esc(a.cover_url)}"
          alt="${esc(a.title)}"
          loading="lazy"
        >
      `
      : `
        <span>FILM</span>
      `;


    return `
      <a
        class="article-card"
        href="/article.html?slug=${encodeURIComponent(a.slug)}"
      >

        <div class="article-thumb">
          ${image}
        </div>


        <div class="article-body">

          <div class="eyebrow">
            ${esc(
              String(a.content_type || '')
                .replace(/-/g, ' ')
                .toUpperCase()
            )}
          </div>


          <h3>
            ${esc(a.title)}
          </h3>


          ${
            a.excerpt
              ? `
                <p>
                  ${esc(a.excerpt)}
                </p>
              `
              : ''
          }


          ${
            a.published_at || a.created_at
              ? `
                <time>
                  ${esc(
                    a.published_at ||
                    a.created_at ||
                    ''
                  )}
                </time>
              `
              : ''
          }

        </div>

      </a>
    `;
  }



  /* =========================================================
     LOAD MOVIES
     ========================================================= */

  async function loadMovies(endpoint, heading) {

    pageTitle.textContent = heading;

    articleGrid.innerHTML = '';

    movieGrid.innerHTML = `
      <div class="loading">
        Loading...
      </div>
    `;


    const data = await apiFetch(endpoint);

    const movies = Array.isArray(data.movies)
      ? data.movies
      : [];


    if (!movies.length) {

      movieGrid.innerHTML = `
        <div class="empty">
          No titles found.
        </div>
      `;

      return;
    }


    movieGrid.innerHTML =
      movies
        .map(movieCard)
        .join('');
  }



  /* =========================================================
     LOAD ARTICLES
     ========================================================= */

  async function loadArticles(type, heading) {

    pageTitle.textContent = heading;

    movieGrid.innerHTML = '';


    articleGrid.innerHTML = `
      <div class="loading">
        Loading...
      </div>
    `;


    const data = await apiFetch(
      '/articles?type=' +
      encodeURIComponent(type) +
      '&limit=50'
    );


    const articles = Array.isArray(data.articles)
      ? data.articles
      : [];


    if (!articles.length) {

      articleGrid.innerHTML = `
        <div class="empty">
          No ${esc(heading.toLowerCase())} found.
        </div>
      `;

      return;
    }


    articleGrid.innerHTML =
      articles
        .map(articleCard)
        .join('');
  }



  /* =========================================================
     MAIN LOADER
     ========================================================= */

  async function load() {


    /* ---------------------------------------------------------
       REVIEWS
       --------------------------------------------------------- */

    if (articleType === 'review') {

      await loadArticles(
        'review',
        'Latest Reviews'
      );

      return;
    }



    /* ---------------------------------------------------------
       NEWS
       --------------------------------------------------------- */

    if (articleType === 'news') {

      await loadArticles(
        'news',
        'Latest News'
      );

      return;
    }



    /* ---------------------------------------------------------
       BOX OFFICE
       --------------------------------------------------------- */

    if (articleType === 'box-office') {

      await loadArticles(
        'box-office',
        'Box Office'
      );

      return;
    }



    /* ---------------------------------------------------------
       TOP 10
       --------------------------------------------------------- */

    if (articleType === 'recommendation') {

      window.location.href =
        '/top-10.html';

      return;
    }



    /* ---------------------------------------------------------
       TRAILERS
       --------------------------------------------------------- */

    if (trailer) {

      await loadMovies(
        '/movies?trailer=1&limit=100',
        'Latest Trailers'
      );

      return;
    }



    /* ---------------------------------------------------------
       RECOMMENDED
       --------------------------------------------------------- */

    if (recommended) {

      await loadMovies(
        '/movies?recommended=1&limit=100',
        'Recommended For You'
      );

      return;
    }



    /* ---------------------------------------------------------
       HOMEPAGE MOVIES
       --------------------------------------------------------- */

    if (home) {

      await loadMovies(
        '/movies?home=1&limit=100',
        'Movies'
      );

      return;
    }



    /* ---------------------------------------------------------
       DEFAULT
       --------------------------------------------------------- */

    await loadMovies(
      '/movies?limit=100',
      'Movies & Series'
    );

  }



  /* =========================================================
     START
     ========================================================= */

  document.addEventListener(
    'DOMContentLoaded',
    function () {

      load().catch(function (err) {

        console.error(
          'Browse page error:',
          err
        );


        if (movieGrid) {

          movieGrid.innerHTML = `
            <div class="empty">
              Could not load content right now.
            </div>
          `;
        }


        if (articleGrid) {

          articleGrid.innerHTML = `
            <div class="empty">
              Could not load content right now.
            </div>
          `;
        }

      });

    }
  );

})();
```
