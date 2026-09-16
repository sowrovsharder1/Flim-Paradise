(function(){

  const {apiFetch,esc,formatDate}=window.fp;

  const placeholder =
    'data:image/svg+xml;charset=UTF-8,' +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600">
        <rect width="100%" height="100%" fill="#121216"/>
        <text x="50%" y="50%"
          fill="#777"
          font-family="Arial"
          font-size="22"
          text-anchor="middle">
          FILM PARADISE
        </text>
      </svg>
    `);

  const img = u => u || placeholder;


  /* =====================================================
     MOVIE CARD
     ===================================================== */

  function card(m,rank){

    return `
      <a class="movie-card"
         href="/movie.html?slug=${encodeURIComponent(m.slug)}">

        <div class="poster-wrap">

          <img
            loading="lazy"
            src="${esc(img(m.poster_url))}"
            alt="${esc(m.title)} poster"
            onerror="this.src='${placeholder}'"
          >

          ${
            rank
              ? `<span class="rank">${rank}</span>`
              : ''
          }

          ${
            m.is_pinned
              ? '<span class="pin">TOP</span>'
              : ''
          }

        </div>

        <div class="card-info">

          <div class="card-title">
            ${esc(m.title)}
          </div>

          <div class="card-meta">

            ${esc(m.year || '—')}

            ·

            ${esc(m.language || '')}

            ${
              m.audience_rating
                ? ` · ★ ${esc(m.audience_rating)}`
                : ''
            }

          </div>

          <div class="card-summary">

            ${esc(
              m.quick_summary ||
              m.synopsis ||
              ''
            )}

          </div>

        </div>

      </a>
    `;
  }


  /* =====================================================
     TOP 10 CARD
     ===================================================== */

  function top10Card(post){

    const poster =
      post.main_poster_url ||
      (
        post.main_poster_key
          ? `/api/top10/image?key=${encodeURIComponent(post.main_poster_key)}`
          : placeholder
      );

    return `
      <a
        class="movie-card"
        href="/top-10.html?slug=${encodeURIComponent(post.slug || '')}"
      >

        <div class="poster-wrap">

          <img
            loading="lazy"
            src="${esc(poster)}"
            alt="${esc(post.title || 'Top 10')} poster"
            onerror="this.src='${placeholder}'"
          >

          <span class="rank">
            TOP 10
          </span>

        </div>

        <div class="card-info">

          <div class="card-title">
            ${esc(post.title || '')}
          </div>

          <div class="card-summary">
            ${esc(post.description || '')}
          </div>

        </div>

      </a>
    `;
  }


  /* =====================================================
     ARTICLE CARD
     ===================================================== */

  function articleCard(a){

    return `
      <a class="article-card"
         href="/article.html?slug=${encodeURIComponent(a.slug)}">

        <div class="article-thumb">

          ${
            a.cover_url
              ? `
                <img
                  loading="lazy"
                  src="${esc(a.cover_url)}"
                  alt=""
                >
              `
              : '<span>FILM</span>'
          }

        </div>

        <div class="article-body">

          <div class="eyebrow">
            ${esc(
              String(a.content_type || '')
                .replace('-', ' ')
            )}
          </div>

          <h3>
            ${esc(a.title)}
          </h3>

          <p>
            ${esc(a.excerpt || '')}
          </p>

          <time>
            ${formatDate(a.created_at)}
          </time>

        </div>

      </a>
    `;
  }


  /* =====================================================
     REVIEW CARD
     ===================================================== */

  function reviewCard(m){

    return `
      <a class="article-card"
         href="/movie.html?slug=${encodeURIComponent(m.slug)}">

        <div class="article-thumb">

          ${
            m.poster_url
              ? `
                <img
                  loading="lazy"
                  src="${esc(m.poster_url)}"
                  alt="${esc(m.title)} poster"
                >
              `
              : '<span>FILM</span>'
          }

        </div>

        <div class="article-body">

          <div class="eyebrow">
            FILMPARADISE REVIEW
          </div>

          <h3>
            ${esc(m.title)}
          </h3>

          <p>
            ${esc(
              m.quick_summary ||
              m.synopsis ||
              ''
            )}
          </p>

          ${
            m.review_rating
              ? `
                <div class="card-meta">
                  ★ FilmParadise ${esc(m.review_rating)}/10
                </div>
              `
              : ''
          }

        </div>

      </a>
    `;
  }


  /* =====================================================
     TRAILER CARD
     ===================================================== */

  function trailerCard(m){

    return `
      <a class="trailer-card"
         href="/movie.html?slug=${encodeURIComponent(m.slug)}">

        <div class="trailer-media">

          ${
            m.poster_url
              ? `
                <img
                  loading="lazy"
                  src="${esc(m.poster_url)}"
                  alt="${esc(m.title)} poster"
                >
              `
              : ''
          }

          <span class="play">
            ▶
          </span>

        </div>

        <strong>
          ${esc(m.title)}
        </strong>

        <small>
          ${esc(m.year || '')}
        </small>

      </a>
    `;
  }


  /* =====================================================
     BOX OFFICE ARTICLE CARD
     ===================================================== */

  function boxOfficeCard(a){

    return `
      <a class="box-card"
         href="/article.html?slug=${encodeURIComponent(a.slug)}">

        <div class="mini-poster">

          ${
            a.cover_url
              ? `
                <img
                  src="${esc(a.cover_url)}"
                  alt=""
                >
              `
              : '<span>FILM</span>'
          }

        </div>

        <div>

          <strong>
            ${esc(a.title)}
          </strong>

          <span>
            ${esc(a.excerpt || '')}
          </span>

        </div>

      </a>
    `;
  }


  /* =====================================================
     HOME PAGE
     ===================================================== */

  async function loadHome(){

    try{

      const [

        featured,
        recs,
        reviews,
        news,
        trailers,
        series,
        box

      ] = await Promise.all([

        /* FEATURED */

        apiFetch(
          '/movies?featured=1&limit=1'
        ),

        /* RECOMMENDED */

        apiFetch(
          '/movies?recommended=1&limit=8'
        ),

        /* REVIEWS */

        apiFetch(
          '/movies?reviews=1&limit=8'
        ),

        /* NEWS */

        apiFetch(
          '/articles?type=news&limit=8'
        ),

        /* TRAILERS */

        apiFetch(
          '/movies?trailer=1&limit=8'
        ),

        /* WEB SERIES */

        apiFetch(
          '/movies?type=series&limit=8'
        ),

        /* BOX OFFICE */

        apiFetch(
          '/articles?type=box-office&limit=8'
        )

      ]);


      /* =================================================
         FEATURED
         ================================================= */

      if(
        featured.movies &&
        featured.movies[0]
      ){

        const m =
          featured.movies[0];

        const hero =
          document.getElementById('hero');

        if(hero){

          hero.innerHTML = `

            <div
              class="hero-bg"
              style="
                background-image:
                linear-gradient(
                  90deg,
                  rgba(7,7,9,.98) 0%,
                  rgba(7,7,9,.8) 48%,
                  rgba(7,7,9,.35)
                ),
                url('${esc(
                  m.backdrop_url ||
                  m.poster_url ||
                  ''
                )}')
              "
            >

              <div class="hero-inner">

                <div class="eyebrow">
                  EDITOR'S FEATURE
                </div>

                <h1>
                  ${esc(m.title)}
                </h1>

                <div class="hero-meta">

                  ${esc(m.year || '')}

                  ·

                  ${esc(m.genre || '')}

                  ${
                    m.imdb_rating
                      ? ` · IMDb ${esc(m.imdb_rating)}`
                      : ''
                  }

                </div>

                <p>
                  ${esc(
                    m.quick_summary ||
                    m.synopsis ||
                    ''
                  )}
                </p>

                <a
                  class="btn btn-primary"
                  href="/movie.html?slug=${encodeURIComponent(m.slug)}"
                >
                  Read review & ratings
                </a>

              </div>

            </div>

          `;

        }

      }


      /* =================================================
         RECOMMENDED
         ================================================= */

      const recommended =
        document.getElementById('recommended');

      if(recommended){

        recommended.innerHTML =
          recs.movies &&
          recs.movies.length

            ? recs.movies
                .map((m,i)=>card(m,i+1))
                .join('')

            : `
              <div class="empty">
                No recommendations yet.
              </div>
            `;

      }


      /* =================================================
         TOP 10
         ================================================= */

      const top10List =
        document.getElementById('top10-list');

      if(top10List){

        /*
         * Top 10 is loaded separately so that
         * a Top 10 API problem cannot break
         * the rest of the homepage.
         */

        try{

          const top10 =
            await apiFetch('/top10/posts');

          const posts =
            Array.isArray(top10)
              ? top10
              : (
                  Array.isArray(top10?.posts)
                    ? top10.posts
                    : []
                );

          const publishedPosts =
            posts.filter(
              post =>
                String(post.status || '')
                  .toLowerCase() === 'published'
            );

          top10List.innerHTML =
            publishedPosts.length

              ? publishedPosts
                  .slice(0,8)
                  .map(top10Card)
                  .join('')

              : `
                <div class="empty">
                  No Top 10 lists yet.
                </div>
              `;

        }catch(top10Error){

          console.error(
            'FilmParadise Top 10 loading error:',
            top10Error
          );

          top10List.innerHTML = `
            <div class="empty">
              No Top 10 lists yet.
            </div>
          `;

        }

      }


      /* =================================================
         REVIEWS
         ================================================= */

      const reviewList =
        document.getElementById('review-list');

      if(reviewList){

        reviewList.innerHTML =
          reviews.movies &&
          reviews.movies.length

            ? reviews.movies
                .map(reviewCard)
                .join('')

            : `
              <div class="empty">
                No reviews yet.
              </div>
            `;

      }


      /* =================================================
         NEWS
         ================================================= */

      const newsList =
        document.getElementById('news-list');

      if(newsList){

        newsList.innerHTML =
          news.articles &&
          news.articles.length

            ? news.articles
                .map(articleCard)
                .join('')

            : `
              <div class="empty">
                No news yet.
              </div>
            `;

      }


      /* =================================================
         TRAILERS
         ================================================= */

      const trailerList =
        document.getElementById('trailers');

      if(trailerList){

        trailerList.innerHTML =
          trailers.movies &&
          trailers.movies.length

            ? trailers.movies
                .map(trailerCard)
                .join('')

            : `
              <div class="empty">
                No trailer entries yet.
              </div>
            `;

      }


      /* =================================================
         WEB SERIES
         ================================================= */

      const seriesList =
        document.getElementById('series');

      if(seriesList){

        seriesList.innerHTML =
          series.movies &&
          series.movies.length

            ? series.movies
                .map(m=>card(m))
                .join('')

            : `
              <div class="empty">
                No series yet.
              </div>
            `;

      }


      /* =================================================
         BOX OFFICE
         ================================================= */

      const boxOffice =
        document.getElementById('boxoffice');

      if(boxOffice){

        boxOffice.innerHTML =
          box.articles &&
          box.articles.length

            ? box.articles
                .map(boxOfficeCard)
                .join('')

            : `
              <div class="empty">
                No box-office data yet.
              </div>
            `;

      }


    }catch(e){

      console.error(
        'FilmParadise home loading error:',
        e
      );

      document
        .querySelectorAll('[data-loading]')
        .forEach(x=>{

          x.innerHTML = `
            <div class="empty">
              Could not load content right now.
            </div>
          `;

        });

    }

  }


  /* =====================================================
     NAVIGATION / SEARCH
     ===================================================== */

  function nav(){

    document
      .getElementById('searchForm')
      ?.addEventListener(
        'submit',
        e=>{

          e.preventDefault();

          const q =
            new FormData(
              e.currentTarget
            ).get('q');

          if(q){

            location.href =
              '/search.html?q=' +
              encodeURIComponent(q);

          }

        }
      );


    document
      .getElementById('menuBtn')
      ?.addEventListener(
        'click',
        ()=>{
          document
            .getElementById('nav')
            ?.classList.toggle('open');
        }
      );

  }


  /* =====================================================
     START
     ===================================================== */

  document.addEventListener(
    'DOMContentLoaded',
    ()=>{

      nav();

      if(
        document.body.dataset.page === 'home'
      ){

        loadHome();

      }

    }
  );

})();
