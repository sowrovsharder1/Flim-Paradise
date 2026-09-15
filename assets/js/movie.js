(function () {
  const detail = document.getElementById('detail');

  let movieId = null;

  const { apiFetch, esc } = window.fp;

  function paragraphs(text) {
    if (!text) return '';
    return String(text)
      .split(/\n\s*\n/)
      .map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  function listItems(text) {
    if (!text) return '';

    return String(text)
      .split(/\n+/)
      .map(x => x.trim())
      .filter(Boolean)
      .map(x => `<li>${esc(x)}</li>`)
      .join('');
  }

  function stars(value) {
    const n = Math.max(0, Math.min(10, Number(value) || 0));
    const full = Math.round(n / 2);

    return Array.from({ length: 5 }, (_, i) =>
      `<span class="${i < full ? 'star on' : 'star'}">★</span>`
    ).join('');
  }

  function ratingCard(value, label, extra = '') {
    const hasRating =
      value !== null &&
      value !== undefined &&
      value !== '' &&
      !Number.isNaN(Number(value));

    return `
      <div class="movie-rating-card">
        <div class="movie-rating-value">
          ${hasRating ? esc(Number(value).toFixed(1)) : '—'}
        </div>

        <div class="movie-rating-stars">
          ${hasRating ? stars(value) : '<span class="rating-empty">Not rated</span>'}
        </div>

        <div class="movie-rating-label">
          ${esc(label)}
        </div>

        ${extra ? `<div class="movie-rating-extra">${esc(extra)}</div>` : ''}
      </div>
    `;
  }

  function metaRow(label, value) {
    if (!value) return '';

    return `
      <div class="movie-meta-row">
        <span class="movie-meta-label">${esc(label)}:</span>
        <span class="movie-meta-value">${esc(value)}</span>
      </div>
    `;
  }

  function detailRow(label, value) {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return '';
    }

    return `
      <div class="movie-detail-row">
        <span class="movie-detail-label">${esc(label)}:</span>
        <span class="movie-detail-value">${esc(value)}</span>
      </div>
    `;
  }

  function trailerEmbed(url) {
    if (!url) return '';

    try {
      const u = new URL(url);

      if (u.hostname.includes('youtube.com')) {
        const id =
          u.searchParams.get('v') ||
          u.pathname.split('/').filter(Boolean).pop();

        if (id) {
          return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
        }
      }

      if (u.hostname === 'youtu.be') {
        const id = u.pathname.slice(1);

        if (id) {
          return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
        }
      }

      return url;
    } catch {
      return '';
    }
  }

  function renderAudienceReviews(reviews = []) {
    if (!reviews.length) {
      return `
        <div class="audience-empty">
          <p>No audience reviews yet.</p>
          <p>Be the first person to share your opinion.</p>
        </div>
      `;
    }

    return reviews.map(r => `
      <article class="audience-review">
        <div class="audience-review-top">
          <strong>${esc(r.name || 'Anonymous')}</strong>

          <span class="audience-review-rating">
            ${esc(Number(r.rating || 0).toFixed(1))}/10
          </span>
        </div>

        <div class="audience-review-stars">
          ${stars(r.rating)}
        </div>

        <p>${esc(r.body || '')}</p>
      </article>
    `).join('');
  }

  async function load() {
    const params = new URLSearchParams(location.search);
    const slug = params.get('slug');

    if (!slug) {
      detail.innerHTML = `
        <div class="container">
          <div class="form-msg err">
            Movie not found.
          </div>
        </div>
      `;
      return;
    }

    try {
      const data = await apiFetch(
        '/movies/' + encodeURIComponent(slug)
      );

      const m = data.movie || {};
      const reviews = data.reviews || [];

      movieId = m.id;

      const audienceRating =
        m.audience_rating !== null &&
        m.audience_rating !== undefined
          ? Number(m.audience_rating)
          : 0;

      const audienceCount =
        Number(m.review_count || reviews.length || 0);

      const filmParadiseRating =
        m.review_rating !== null &&
        m.review_rating !== undefined &&
        m.review_rating !== ''
          ? Number(m.review_rating)
          : null;

      const quickSummary =
        m.quick_summary ||
        '';

      const reviewBody =
        m.review_body ||
        '';

      const reviewPros =
        m.review_pros ||
        '';

      const reviewCons =
        m.review_cons ||
        '';

      const whoShouldWatch =
        m.who_should_watch ||
        '';

      const reviewVerdict =
        m.review_verdict ||
        '';

      const hasEditorialContent =
        reviewBody ||
        reviewPros ||
        reviewCons ||
        whoShouldWatch ||
        reviewVerdict ||
        filmParadiseRating !== null;

      const showReviewSection =
        Number(m.show_review) === 1 ||
        Boolean(hasEditorialContent);

      detail.innerHTML = `
        <div class="container">

          <!-- MOVIE HEADER -->
          <section class="movie-header">

            <div class="movie-poster-wrap">
              <img
                class="movie-poster"
                src="${esc(m.poster_url || '')}"
                alt="${esc(m.title || 'Movie poster')}"
                loading="eager"
                onerror="this.style.display='none'"
              >
            </div>

            <div class="movie-header-content">

              <div class="movie-kicker">
                ${esc(m.type || 'movie')} · ${esc(m.year || '')}
              </div>

              <h1 class="movie-title">
                ${esc(m.title || '')}
              </h1>

              <div class="movie-tags">
                ${esc(m.genre || '')}
                ${m.language ? ` · ${esc(m.language)}` : ''}
                ${m.country ? ` · ${esc(m.country)}` : ''}
                ${m.duration ? ` · ${esc(m.duration)} min` : ''}
                ${m.quality ? ` · ${esc(m.quality)}` : ''}
              </div>

              <!-- RATING FLOW -->
              <div class="movie-rating-flow">

                ${ratingCard(
                  m.imdb_rating,
                  'IMDb'
                )}

                ${ratingCard(
                  filmParadiseRating,
                  'FilmParadise Rating'
                )}

                ${ratingCard(
                  audienceRating,
                  'Audience Rating',
                  `(${audienceCount})`
                )}

              </div>

              <!-- BASIC MOVIE INFO -->
              <div class="movie-meta">

                ${metaRow(
                  'Director',
                  m.director
                )}

                ${metaRow(
                  'Cast',
                  m.cast
                )}

                ${metaRow(
                  'Box office',
                  m.box_office
                )}

              </div>

            </div>
          </section>


          <!-- MOVIE DETAILS -->
          <section class="content-section movie-details-section">

            <div class="section-head">
              <h2>Movie Details</h2>
            </div>

            <div class="movie-detail-list">

              ${detailRow('Title', m.title)}

              ${detailRow('Type', m.type)}

              ${detailRow('Year', m.year)}

              ${detailRow(
                'Release Date',
                m.release_date
              )}

              ${detailRow(
                'Language',
                m.language
              )}

              ${detailRow(
                'Country',
                m.country
              )}

              ${detailRow(
                'Genre',
                m.genre
              )}

              ${detailRow(
                'Quality',
                m.quality
              )}

              ${detailRow(
                'Duration',
                m.duration
                  ? `${m.duration} min`
                  : ''
              )}

              ${detailRow(
                'Director',
                m.director
              )}

              ${detailRow(
                'Cast',
                m.cast
              )}

              ${detailRow(
                'Box Office',
                m.box_office
              )}

            </div>

          </section>


          <!-- QUICK SUMMARY -->
          ${
            quickSummary
              ? `
                <section class="content-section editorial-section">

                  <div class="section-head">
                    <h2>Quick Summary</h2>
                  </div>

                  <div class="editorial-content quick-summary-content">
                    ${paragraphs(quickSummary)}
                  </div>

                </section>
              `
              : ''
          }


          <!-- FILMPARADISE REVIEW -->
          ${
            showReviewSection
              ? `
                <section class="content-section editorial-section filmparadise-review-section">

                  <div class="section-head">
                    <h2>FilmParadise Review</h2>
                  </div>

                  ${
                    reviewBody
                      ? `
                        <div class="editorial-content filmparadise-review-body">
                          ${paragraphs(reviewBody)}
                        </div>
                      `
                      : `
                        <div class="editorial-empty">
                          FilmParadise editorial review has not been published yet.
                        </div>
                      `
                  }

                </section>
              `
              : ''
          }


          <!-- WHAT WORKS -->
          ${
            reviewPros
              ? `
                <section class="content-section editorial-section">

                  <div class="section-head">
                    <h2>What Works</h2>
                  </div>

                  <div class="editorial-list">
                    <ul>
                      ${listItems(reviewPros)}
                    </ul>
                  </div>

                </section>
              `
              : ''
          }


          <!-- WHAT DOESN'T WORK -->
          ${
            reviewCons
              ? `
                <section class="content-section editorial-section">

                  <div class="section-head">
                    <h2>What Doesn't Work</h2>
                  </div>

                  <div class="editorial-list">
                    <ul>
                      ${listItems(reviewCons)}
                    </ul>
                  </div>

                </section>
              `
              : ''
          }


          <!-- WHO SHOULD WATCH -->
          ${
            whoShouldWatch
              ? `
                <section class="content-section editorial-section">

                  <div class="section-head">
                    <h2>Who Should Watch It?</h2>
                  </div>

                  <div class="editorial-content">
                    ${paragraphs(whoShouldWatch)}
                  </div>

                </section>
              `
              : ''
          }


          <!-- FINAL VERDICT -->
          ${
            reviewVerdict
              ? `
                <section class="content-section editorial-section final-verdict-section">

                  <div class="section-head">
                    <h2>Final Verdict</h2>
                  </div>

                  <div class="editorial-content">
                    ${paragraphs(reviewVerdict)}
                  </div>

                  ${
                    filmParadiseRating !== null
                      ? `
                        <div class="final-rating-badge">
                          <span>FilmParadise Rating</span>
                          <strong>
                            ${esc(filmParadiseRating.toFixed(1))}/10
                          </strong>
                        </div>
                      `
                      : ''
                  }

                </section>
              `
              : ''
          }


          <!-- TRAILER -->
          ${
            m.trailer_url
              ? `
                <section class="content-section trailer-section">

                  <div class="section-head">
                    <h2>Trailer</h2>
                  </div>

                  <div class="trailer-frame">

                    <iframe
                      src="${esc(trailerEmbed(m.trailer_url))}"
                      title="${esc(m.title || 'Movie trailer')}"
                      loading="lazy"
                      frameborder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowfullscreen>
                    </iframe>

                  </div>

                </section>
              `
              : ''
          }


          <!-- AUDIENCE REVIEWS -->
          <section class="content-section audience-section">

            <div class="section-head">
              <h2>Audience Reviews</h2>
            </div>

            <div class="audience-review-list">
              ${renderAudienceReviews(reviews)}
            </div>

            <div class="audience-review-form-wrap">

              <h3>Write a Review</h3>

              <form id="reviewForm" class="review-form">

                <div class="form-grid">

                  <label>
                    Name
                    <input
                      type="text"
                      name="name"
                      maxlength="80"
                      required
                    >
                  </label>

                  <label>
                    Rating
                    <select name="rating" required>
                      <option value="">Select</option>
                      <option value="10">10</option>
                      <option value="9">9</option>
                      <option value="8">8</option>
                      <option value="7">7</option>
                      <option value="6">6</option>
                      <option value="5">5</option>
                      <option value="4">4</option>
                      <option value="3">3</option>
                      <option value="2">2</option>
                      <option value="1">1</option>
                    </select>
                  </label>

                </div>

                <label>
                  Your Review
                  <textarea
                    name="body"
                    rows="5"
                    maxlength="2000"
                    required
                  ></textarea>
                </label>

                <button type="submit" class="btn">
                  Submit Review
                </button>

                <div id="reviewMsg" class="form-msg"></div>

              </form>

            </div>

          </section>

        </div>
      `;

      const reviewForm =
        document.getElementById('reviewForm');

      if (reviewForm) {
        reviewForm.addEventListener(
          'submit',
          submitReview
        );
      }

      // Update browser title
      document.title =
        `${m.title || 'Movie'} — FilmParadise BD`;

      // Update meta description
      const metaDescription =
        document.querySelector(
          'meta[name="description"]'
        );

      if (metaDescription) {
        const description =
          quickSummary ||
          `Read the FilmParadise BD review, ratings, trailer and audience reviews for ${m.title || 'this movie'}.`;

        metaDescription.setAttribute(
          'content',
          String(description).slice(0, 160)
        );
      }

    } catch (error) {
      detail.innerHTML = `
        <div class="container">
          <div class="form-msg err">
            ${esc(error.message || 'Unable to load movie.')}
          </div>
        </div>
      `;
    }
  }

  async function submitReview(e) {
    e.preventDefault();

    const form = e.currentTarget;
    const msg = document.getElementById('reviewMsg');

    msg.textContent = 'Submitting…';
    msg.className = 'form-msg';

    const body = Object.fromEntries(
      new FormData(form).entries()
    );

    body.movie_id = movieId;
    body.rating = Number(body.rating);

    try {
      const result = await apiFetch(
        '/reviews',
        {
          method: 'POST',
          body: JSON.stringify(body)
        }
      );

      msg.textContent =
        result.message ||
        'Review submitted successfully.';

      msg.className = 'form-msg ok';

      form.reset();

    } catch (error) {
      msg.textContent =
        error.message ||
        'Unable to submit review.';

      msg.className = 'form-msg err';
    }
  }

  document.addEventListener(
    'DOMContentLoaded',
    load
  );

})();
