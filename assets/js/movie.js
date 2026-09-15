(function () {
  const { apiFetch, esc, formatDate } = window.fp;

  let movieId = null;

  const placeholder =
    'data:image/svg+xml;charset=UTF-8,' +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg"
           viewBox="0 0 400 600">
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

  function stars(rating) {
    const n = Math.round(Number(rating) || 0);

    return Array.from(
      { length: 10 },
      (_, i) =>
        `<span class="star ${i < n ? 'on' : ''}">★</span>`
    ).join('');
  }

  function toEmbed(url) {
    try {
      const x = new URL(url);

      if (x.hostname.includes('youtube.com')) {
        const id =
          x.searchParams.get('v') ||
          x.pathname.split('/').pop();

        return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
      }

      if (x.hostname === 'youtu.be') {
        return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
          x.pathname.slice(1)
        )}`;
      }

      return url;
    } catch {
      return '';
    }
  }

  /*
   * Convert normal text into paragraphs.
   */
  function paragraphs(text) {
    if (!text || !String(text).trim()) {
      return '';
    }

    return String(text)
      .trim()
      .split(/\n\s*\n/)
      .map(
        p => `<p>${esc(p.trim())}</p>`
      )
      .join('');
  }

  /*
   * Convert line-by-line text into a list.
   *
   * Admin can write:
   *
   * Strong action sequences
   * Good atmosphere
   * Interesting infected design
   *
   * or:
   *
   * - Strong action sequences
   * - Good atmosphere
   */
  function bulletList(text) {
    if (!text || !String(text).trim()) {
      return '';
    }

    const items = String(text)
      .split(/\n/)
      .map(x => x.trim())
      .filter(Boolean);

    if (!items.length) {
      return '';
    }

    return `
      <ul class="editorial-list">
        ${items
          .map(
            item =>
              `<li>${esc(
                item.replace(/^[-•*]\s*/, '')
              )}</li>`
          )
          .join('')}
      </ul>
    `;
  }

  /*
   * FilmParadise editorial rating.
   */
  function renderRating(rating) {
    if (
      rating === null ||
      rating === undefined ||
      rating === '' ||
      Number.isNaN(Number(rating))
    ) {
      return '';
    }

    const value =
      Number(rating).toFixed(1);

    return `
      <div class="filmparadise-rating">

        <div class="fp-rating-number">
          ${esc(value)}
        </div>

        <div class="fp-rating-info">

          <div class="fp-rating-stars">
            ${stars(Number(rating))}
          </div>

          <strong>
            FilmParadise Rating
          </strong>

          <span>
            Our editorial rating
          </span>

        </div>

      </div>
    `;
  }

  /*
   * Audience reviews.
   */
  function renderAudienceReviews(reviews) {
    if (
      !Array.isArray(reviews) ||
      !reviews.length
    ) {
      return `
        <div class="empty">
          No approved audience reviews yet.
          Be the first.
        </div>
      `;
    }

    return reviews
      .map(
        r => `
          <article class="review">

            <div class="review-top">

              <strong>
                ${esc(
                  r.author_name ||
                  'Anonymous'
                )}
              </strong>

              <span class="score">
                ${esc(r.rating)}/10
              </span>

            </div>

            <div class="stars-row">
              ${stars(r.rating)}
            </div>

            <p>
              ${esc(r.comment || '')}
            </p>

            <time>
              ${formatDate(r.created_at)}
            </time>

          </article>
        `
      )
      .join('');
  }

  async function load() {
    const slug =
      new URLSearchParams(
        location.search
      ).get('slug');

    if (!slug) {
      document.getElementById(
        'detail'
      ).innerHTML = `
        <div class="empty">
          Movie not found.
        </div>
      `;

      return;
    }

    try {
      const data =
        await apiFetch(
          '/movies/' +
          encodeURIComponent(slug)
        );

      if (
        !data ||
        !data.movie
      ) {
        throw new Error(
          'Movie not found.'
        );
      }

      const m = data.movie;

      movieId = m.id;

      /*
       * Page title.
       */
      document.title =
        `${m.title} — FilmParadise BD`;

      /*
       * Facts shown in the movie header.
       */
      const facts = [
        m.genre,
        m.language,
        m.country,
        m.duration,
        m.quality
      ]
        .filter(Boolean)
        .map(
          x =>
            `<span>${esc(x)}</span>`
        )
        .join('');

      /*
       * Quick Summary.
       *
       * New quick_summary field first.
       * Old synopsis is used as fallback
       * for older titles.
       */
      const quickSummary =
        m.quick_summary ||
        m.synopsis ||
        '';

      /*
       * Editorial fields.
       */
      const reviewBody =
        m.review_body || '';

      const reviewPros =
        m.review_pros || '';

      const reviewCons =
        m.review_cons || '';

      const whoShouldWatch =
        m.who_should_watch || '';

      const reviewVerdict =
        m.review_verdict || '';

      /*
       * FilmParadise rating.
       */
      const filmParadiseRating =
        renderRating(
          m.review_rating
        );

      /*
       * Audience rating.
       */
      const audienceRating =
        m.audience_rating !== null &&
        m.audience_rating !== undefined
          ? Number(
              m.audience_rating
            ).toFixed(1)
          : '0.0';

      /*
       * Render page.
       */
      document.getElementById(
        'detail'
      ).innerHTML = `

        <!-- ================================= -->
        <!-- MOVIE HEADER -->
        <!-- ================================= -->

        <div class="detail-grid">

          <div class="detail-poster">

            <img
              src="${esc(
                m.poster_url ||
                placeholder
              )}"
              onerror="this.src='${placeholder}'"
              alt="${esc(m.title)} poster"
            >

          </div>


          <div>

            <div class="eyebrow">

              ${esc(
                m.type ||
                'Movie'
              )}

              ${
                m.year
                  ? ` · ${esc(m.year)}`
                  : ''
              }

            </div>


            <h1 class="detail-title">
              ${esc(m.title)}
            </h1>


            ${
              facts
                ? `
                  <div class="facts">
                    ${facts}
                  </div>
                `
                : ''
            }


            <div class="rating-line">

              <div>

                <strong>
                  ${m.imdb_rating ?? '—'}
                </strong>

                <small>
                  IMDb
                </small>

              </div>


              <div>

                <strong>
                  ${esc(
                    audienceRating
                  )}
                </strong>

                <small>
                  Audience
                  (${m.review_count || 0})
                </small>

              </div>

            </div>


            <div class="people">

              <div>

                <b>
                  Director
                </b>

                <span>
                  ${esc(
                    m.director ||
                    '—'
                  )}
                </span>

              </div>


              <div>

                <b>
                  Cast
                </b>

                <span>
                  ${esc(
                    m.cast ||
                    '—'
                  )}
                </span>

              </div>


              <div>

                <b>
                  Box office
                </b>

                <span>
                  ${esc(
                    m.box_office ||
                    m.boxOffice ||
                    '—'
                  )}
                </span>

              </div>

            </div>

          </div>

        </div>


        <!-- ================================= -->
        <!-- MOVIE DETAILS -->
        <!-- ================================= -->

        <section class="content-section editorial-section">

          <div class="section-head">

            <h2>
              Movie Details
            </h2>

          </div>


          <div class="movie-detail-list">

            ${
              m.title
                ? `
                  <div>
                    <b>Title</b>
                    <span>
                      ${esc(m.title)}
                    </span>
                  </div>
                `
                : ''
            }


            ${
              m.type
                ? `
                  <div>
                    <b>Type</b>
                    <span>
                      ${esc(m.type)}
                    </span>
                  </div>
                `
                : ''
            }


            ${
              m.year
                ? `
                  <div>
                    <b>Year</b>
                    <span>
                      ${esc(m.year)}
                    </span>
                  </div>
                `
                : ''
            }


            ${
              m.release_date
                ? `
                  <div>
                    <b>Release Date</b>
                    <span>
                      ${esc(
                        m.release_date
                      )}
                    </span>
                  </div>
                `
                : ''
            }


            ${
              m.language
                ? `
                  <div>
                    <b>Language</b>
                    <span>
                      ${esc(
                        m.language
                      )}
                    </span>
                  </div>
                `
                : ''
            }


            ${
              m.country
                ? `
                  <div>
                    <b>Country</b>
                    <span>
                      ${esc(
                        m.country
                      )}
                    </span>
                  </div>
                `
                : ''
            }


            ${
              m.genre
                ? `
                  <div>
                    <b>Genre</b>
                    <span>
                      ${esc(m.genre)}
                    </span>
                  </div>
                `
                : ''
            }


            ${
              m.quality
                ? `
                  <div>
                    <b>Quality</b>
                    <span>
                      ${esc(
                        m.quality
                      )}
                    </span>
                  </div>
                `
                : ''
            }


            ${
              m.duration
                ? `
                  <div>
                    <b>Duration</b>
                    <span>
                      ${esc(
                        m.duration
                      )}
                    </span>
                  </div>
                `
                : ''
            }


            ${
              m.director
                ? `
                  <div>
                    <b>Director</b>
                    <span>
                      ${esc(
                        m.director
                      )}
                    </span>
                  </div>
                `
                : ''
            }


            ${
              m.cast
                ? `
                  <div>
                    <b>Cast</b>
                    <span>
                      ${esc(m.cast)}
                    </span>
                  </div>
                `
                : ''
            }


            ${
              m.box_office
                ? `
                  <div>
                    <b>Box Office</b>
                    <span>
                      ${esc(
                        m.box_office
                      )}
                    </span>
                  </div>
                `
                : ''
            }

          </div>

        </section>


        <!-- ================================= -->
        <!-- QUICK SUMMARY -->
        <!-- ================================= -->

        ${
          quickSummary
            ? `
              <section class="content-section editorial-section">

                <div class="section-head">

                  <h2>
                    Quick Summary
                  </h2>

                </div>


                <div class="editorial-content">

                  ${paragraphs(
                    quickSummary
                  )}

                </div>

              </section>
            `
            : ''
        }


        <!-- ================================= -->
        <!-- FILMPARADISE REVIEW -->
        <!-- ================================= -->

        ${
          reviewBody
            ? `
              <section class="content-section editorial-section">

                <div class="section-head">

                  <h2>
                    FilmParadise Review
                  </h2>

                </div>


                <div class="editorial-content">

                  ${paragraphs(
                    reviewBody
                  )}

                </div>

              </section>
            `
            : ''
        }


        <!-- ================================= -->
        <!-- WHAT WORKS -->
        <!-- ================================= -->

        ${
          reviewPros
            ? `
              <section class="content-section editorial-section">

                <div class="section-head">

                  <h2>
                    What Works
                  </h2>

                </div>


                <div class="editorial-content">

                  ${bulletList(
                    reviewPros
                  )}

                </div>

              </section>
            `
            : ''
        }


        <!-- ================================= -->
        <!-- WHAT DOESN'T WORK -->
        <!-- ================================= -->

        ${
          reviewCons
            ? `
              <section class="content-section editorial-section">

                <div class="section-head">

                  <h2>
                    What Doesn't Work
                  </h2>

                </div>


                <div class="editorial-content">

                  ${bulletList(
                    reviewCons
                  )}

                </div>

              </section>
            `
            : ''
        }


        <!-- ================================= -->
        <!-- WHO SHOULD WATCH -->
        <!-- ================================= -->

        ${
          whoShouldWatch
            ? `
              <section class="content-section editorial-section">

                <div class="section-head">

                  <h2>
                    Who Should Watch It?
                  </h2>

                </div>


                <div class="editorial-content">

                  ${paragraphs(
                    whoShouldWatch
                  )}

                </div>

              </section>
            `
            : ''
        }


        <!-- ================================= -->
        <!-- FINAL VERDICT -->
        <!-- ================================= -->

        ${
          reviewVerdict ||
          filmParadiseRating
            ? `
              <section class="content-section editorial-section verdict-section">

                <div class="section-head">

                  <h2>
                    Final Verdict
                  </h2>

                </div>


                ${
                  reviewVerdict
                    ? `
                      <div class="editorial-content">

                        ${paragraphs(
                          reviewVerdict
                        )}

                      </div>
                    `
                    : ''
                }


                ${filmParadiseRating}

              </section>
            `
            : ''
        }


        <!-- ================================= -->
        <!-- TRAILER -->
        <!-- ================================= -->

        ${
          m.trailer_url
            ? `
              <section class="content-section">

                <div class="section-head">

                  <h2>
                    Trailer
                  </h2>

                </div>


                <div class="trailer-frame">

                  <iframe
                    src="${esc(
                      toEmbed(
                        m.trailer_url
                      )
                    )}"
                    title="${esc(
                      m.title
                    )} trailer"
                    loading="lazy"
                    allowfullscreen>
                  </iframe>

                </div>

              </section>
            `
            : ''
        }


        <!-- ================================= -->
        <!-- AUDIENCE REVIEWS -->
        <!-- ================================= -->

        <section class="content-section">

          <div class="section-head">

            <h2>
              Audience Reviews
            </h2>

          </div>


          <div class="review-layout">


            <div id="reviews">

              ${renderAudienceReviews(
                data.reviews
              )}

            </div>


            <form
              class="review-form"
              id="reviewForm"
            >

              <h3>
                Rate this movie
              </h3>


              <!-- Honeypot field -->

              <input
                type="text"
                name="website"
                class="hp"
                tabindex="-1"
                autocomplete="off"
              >


              <label>

                Your name

                <input
                  type="text"
                  name="author_name"
                  maxlength="80"
                  required
                >

              </label>


              <label>

                Rating

                <select name="rating">

                  ${Array.from(
                    { length: 10 },
                    (_, i) =>
                      `<option value="${10 - i}">
                        ${10 - i}/10
                      </option>`
                  ).join('')}

                </select>

              </label>


              <label>

                Your review

                <textarea
                  name="comment"
                  maxlength="2000"
                  required
                  placeholder="What did you think?"
                ></textarea>

              </label>


              <button
                class="btn btn-primary"
                type="submit"
              >
                Submit review
              </button>


              <div
                id="reviewMsg"
                class="form-msg">
              </div>

            </form>

          </div>

        </section>

      `;


      /*
       * Audience review form.
       */
      const reviewForm =
        document.getElementById(
          'reviewForm'
        );

      if (reviewForm) {
        reviewForm.addEventListener(
          'submit',
          submitReview
        );
      }

    } catch (e) {

      document.getElementById(
        'detail'
      ).innerHTML = `
        <div class="empty">
          ${esc(
            e.message ||
            'Unable to load this title.'
          )}
        </div>
      `;

    }
  }


  /*
   * Submit audience review.
   */
  async function submitReview(e) {
    e.preventDefault();

    const form =
      e.currentTarget;

    const msg =
      document.getElementById(
        'reviewMsg'
      );

    msg.textContent =
      'Submitting…';

    msg.className =
      'form-msg';


    const body =
      Object.fromEntries(
        new FormData(form).entries()
      );


    body.movie_id =
      movieId;

    body.rating =
      Number(body.rating);


    try {

      const result =
        await apiFetch(
          '/reviews',
          {
            method: 'POST',
            body: JSON.stringify(body)
          }
        );


      msg.textContent =
        result.message ||
        'Your review has been submitted.';


      msg.className =
        'form-msg ok';


      form.reset();

    } catch (e) {

      msg.textContent =
        e.message ||
        'Could not submit review.';

      msg.className =
        'form-msg err';
    }
  }


  /*
   * Start page.
   */
  document.addEventListener(
    'DOMContentLoaded',
    load
  );

})();
