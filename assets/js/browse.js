(function () {
  const params = new URLSearchParams(window.location.search);

  const articleType = params.get("article_type") || "";
  const trailer = params.get("trailer") === "1";
  const recommended = params.get("recommended") === "1";

  const movieGrid = document.getElementById("movieGrid");
  const articleGrid = document.getElementById("articleGrid");
  const pageQuery = document.getElementById("pageQuery");

  const fp = window.fp || {};
  const apiFetch = fp.apiFetch;
  const esc = fp.esc || function (value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  if (!apiFetch) {
    console.error("FilmParadise API helper is missing.");
    return;
  }

  function setTitle(title) {
    if (pageQuery) {
      pageQuery.textContent = title;
    }

    document.title = title + " | FilmParadise BD";
  }

  function showLoading(target) {
    if (target) {
      target.innerHTML = `
        <div class="empty">
          Loading...
        </div>
      `;
    }
  }

  function showEmpty(target, message) {
    if (target) {
      target.innerHTML = `
        <div class="empty">
          ${esc(message)}
        </div>
      `;
    }
  }

  function posterUrl(movie) {
    return (
      movie.poster_url ||
      movie.poster ||
      ""
    );
  }

  function movieCard(movie) {
    const poster = posterUrl(movie);

    return `
      <a
        class="movie-card"
        href="/movie.html?slug=${encodeURIComponent(movie.slug || "")}"
      >

        <div class="poster-wrap">

          ${
            poster
              ? `
                <img
                  src="${esc(poster)}"
                  alt="${esc(movie.title || "")}"
                  loading="lazy"
                >
              `
              : `
                <div class="article-thumb">
                  <span>${esc(movie.title || "Movie")}</span>
                </div>
              `
          }

          ${
            movie.is_featured
              ? `<span class="pin">FEATURED</span>`
              : ""
          }

          <span class="type-badge">
            ${
              String(movie.type || "").toLowerCase() === "series"
                ? "SERIES"
                : "MOVIE"
            }
          </span>

        </div>

        <div class="card-info">

          <div class="card-title">
            ${esc(movie.title || "")}
          </div>

          <div class="card-meta">

            ${
              movie.year
                ? esc(movie.year)
                : ""
            }

            ${
              movie.language
                ? ` · ${esc(movie.language)}`
                : ""
            }

            ${
              movie.imdb_rating
                ? ` · IMDb ${esc(movie.imdb_rating)}`
                : ""
            }

          </div>

          ${
            movie.quick_summary || movie.synopsis
              ? `
                <div class="card-summary">
                  ${esc(
                    movie.quick_summary ||
                    movie.synopsis ||
                    ""
                  )}
                </div>
              `
              : ""
          }

        </div>

      </a>
    `;
  }

  function articleImage(article) {
    return (
      article.cover_url ||
      article.poster_url ||
      article.image_url ||
      ""
    );
  }

  function articleCard(article) {
    const image = articleImage(article);

    return `
      <a
        class="article-card"
        href="/article.html?slug=${encodeURIComponent(article.slug || "")}"
      >

        <div class="article-thumb">

          ${
            image
              ? `
                <img
                  src="${esc(image)}"
                  alt="${esc(article.title || "")}"
                  loading="lazy"
                >
              `
              : `
                <span>
                  ${esc(article.title || "Article")}
                </span>
              `
          }

        </div>

        <div class="article-body">

          <div class="eyebrow">
            ${esc(
              String(article.content_type || "")
                .replace(/-/g, " ")
                .toUpperCase()
            )}
          </div>

          <h3>
            ${esc(article.title || "")}
          </h3>

          ${
            article.excerpt
              ? `
                <p>
                  ${esc(article.excerpt)}
                </p>
              `
              : ""
          }

        </div>

      </a>
    `;
  }

  async function loadMovies(url, title) {
    setTitle(title);

    showLoading(movieGrid);

    if (articleGrid) {
      articleGrid.innerHTML = "";
    }

    try {
      const data = await apiFetch(url);

      const movies = Array.isArray(data.movies)
        ? data.movies
        : [];

      if (!movies.length) {
        showEmpty(
          movieGrid,
          "এই ক্যাটাগরিতে এখনো কোনো পোস্ট বা মুভি আপলোড করা হয়নি।"
        );
        return;
      }

      movieGrid.innerHTML = movies
        .map(movieCard)
        .join("");

    } catch (error) {
      console.error("Movie loading error:", error);

      showEmpty(
        movieGrid,
        "Content load করা যাচ্ছে না।"
      );
    }
  }

  async function loadArticles(type, title) {
    setTitle(title);

    showLoading(articleGrid);

    if (movieGrid) {
      movieGrid.innerHTML = "";
    }

    try {
      /*
        Important:
        Articles API uses content_type.
      */

      const data = await apiFetch(
        "/articles?type=" +
        encodeURIComponent(type) +
        "&limit=100"
      );

      const articles = Array.isArray(data.articles)
        ? data.articles
        : [];

      if (!articles.length) {
        showEmpty(
          articleGrid,
          "এই ক্যাটাগরিতে এখনো কোনো পোস্ট বা মুভি আপলোড করা হয়নি।"
        );
        return;
      }

      articleGrid.innerHTML = articles
        .map(articleCard)
        .join("");

    } catch (error) {
      console.error("Article loading error:", error);

      showEmpty(
        articleGrid,
        "Content load করা যাচ্ছে না।"
      );
    }
  }

  async function loadReviews() {
    setTitle("Latest Reviews");

    showLoading(movieGrid);

    if (articleGrid) {
      articleGrid.innerHTML = "";
    }

    try {

      /*
        Reviews are MOVIE records.

        We do NOT query /articles here.
        Movie review visibility is controlled
        by show_review.
      */

      const data = await apiFetch(
        "/movies?review=1&limit=100"
      );

      let movies = Array.isArray(data.movies)
        ? data.movies
        : [];

      /*
        Safety fallback:
        If the API ignores review=1 for any reason,
        filter the returned movies locally.
      */

      if (movies.length) {
        movies = movies.filter(function (movie) {
          return (
            Number(movie.show_review) === 1 ||
            movie.show_review === true ||
            movie.show_review === "1"
          );
        });
      }

      if (!movies.length) {
        showEmpty(
          movieGrid,
          "এই ক্যাটাগরিতে এখনো কোনো পোস্ট বা মুভি আপলোড করা হয়নি।"
        );
        return;
      }

      movieGrid.innerHTML = movies
        .map(movieCard)
        .join("");

    } catch (error) {
      console.error("Review loading error:", error);

      showEmpty(
        movieGrid,
        "Review load করা যাচ্ছে না।"
      );
    }
  }

  async function loadTrailers() {
    await loadMovies(
      "/movies?trailer=1&limit=100",
      "Latest Trailers"
    );
  }

  async function loadRecommended() {
    await loadMovies(
      "/movies?recommended=1&limit=100",
      "Recommended"
    );
  }

  async function loadDefault() {
    await loadMovies(
      "/movies?limit=100",
      "Movies & Series"
    );
  }

  async function init() {

    /*
      REVIEWS
    */

    if (articleType === "review") {
      await loadReviews();
      return;
    }

    /*
      NEWS
    */

    if (articleType === "news") {
      await loadArticles(
        "news",
        "Latest News"
      );
      return;
    }

    /*
      BOX OFFICE
    */

    if (articleType === "box-office") {
      await loadArticles(
        "box-office",
        "Box Office"
      );
      return;
    }

    /*
      TRAILERS
    */

    if (trailer) {
      await loadTrailers();
      return;
    }

    /*
      RECOMMENDED
    */

    if (recommended) {
      await loadRecommended();
      return;
    }

    /*
      SEARCH
      (Newly added to handle search queries like ?q=colony)
    */

    const q = params.get("q");

    if (q) {
      await loadMovies(
        "/movies?q=" + encodeURIComponent(q) + "&limit=100",
        `Search: ${q}`
      );
      return;
    }

    /*
      DEFAULT
    */

    await loadDefault();
  }

  document.addEventListener(
    "DOMContentLoaded",
    function () {
      init().catch(function (error) {
        console.error(
          "Browse initialization error:",
          error
        );
      });
    }
  );

})();
