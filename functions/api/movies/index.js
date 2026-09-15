import { getDB } from '../../_lib/db.js';
import {
  json,
  serverError,
  unauthorized,
  badRequest
} from '../../_lib/response.js';
import { requireAuth } from '../../_lib/auth.js';

function cleanSlug(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function safeText(v, max = 10000) {
  return String(v ?? '').slice(0, max);
}

function numOrNull(v) {
  return v !== '' && v !== null && v !== undefined
    ? Number(v)
    : null;
}

function boolValue(v) {
  return v ? 1 : 0;
}

export async function onRequestGet({ request, env }) {
  try {
    const db = getDB(env);
    const u = new URL(request.url);

    const authed =
      await requireAuth(request, env);

    const status =
      u.searchParams.get('status') ||
      (authed ? 'all' : 'published');

    const type =
      u.searchParams.get('type');

    const category =
      u.searchParams.get('category');

    const q =
      u.searchParams.get('q');

    const featured =
      u.searchParams.get('featured');

    const pinned =
      u.searchParams.get('pinned');

    const recommended =
      u.searchParams.get('recommended');

    const home =
      u.searchParams.get('home');

    const review =
      u.searchParams.get('review');

    const trailer =
      u.searchParams.get('trailer');

    const limit =
      Math.min(
        Math.max(
          parseInt(
            u.searchParams.get('limit') || '24',
            10
          ) || 24,
          1
        ),
        100
      );

    let sql = `
      SELECT DISTINCT
        m.*,

        COALESCE(
          (
            SELECT ROUND(AVG(r.rating),1)
            FROM community_reviews r
            WHERE r.movie_id=m.id
              AND r.status='approved'
          ),
          0
        ) AS audience_rating,

        COALESCE(
          (
            SELECT COUNT(*)
            FROM community_reviews r
            WHERE r.movie_id=m.id
              AND r.status='approved'
          ),
          0
        ) AS review_count

      FROM movies m
    `;

    const conditions = [];
    const params = [];

    /*
     * CATEGORY FILTER
     */
    if (category) {
      sql += `
        JOIN movie_categories mc
          ON mc.movie_id=m.id

        JOIN categories c
          ON c.id=mc.category_id
      `;

      conditions.push('c.slug=?');
      params.push(category);
    }

    /*
     * STATUS
     */
    if (status !== 'all') {
      conditions.push('m.status=?');
      params.push(status);
    }

    /*
     * MOVIE / SERIES
     */
    if (type) {
      conditions.push('m.type=?');
      params.push(type);
    }

    /*
     * FEATURED
     */
    if (featured === '1') {
      conditions.push('m.is_featured=1');
    }

    /*
     * OLD PINNED SUPPORT
     */
    if (pinned === '1') {
      conditions.push('m.is_pinned=1');
    }

    /*
     * RECOMMENDED
     */
    if (recommended === '1') {
      conditions.push('m.is_recommended=1');
    }

    /*
     * HOMEPAGE
     */
    if (home === '1') {
      conditions.push('m.show_home=1');
    }

    /*
     * REVIEWS
     */
    if (review === '1') {
      conditions.push('m.show_review=1');
    }

    /*
     * TRAILERS
     */
    if (trailer === '1') {
      conditions.push(
        "m.show_trailer=1"
      );
    }

    /*
     * SEARCH
     */
    if (q) {
      conditions.push(
        '(m.title LIKE ? OR m.genre LIKE ? OR m.language LIKE ?)'
      );

      const x = `%${q}%`;

      params.push(
        x,
        x,
        x
      );
    }

    if (conditions.length) {
      sql +=
        ' WHERE ' +
        conditions.join(' AND ');
    }

    /*
     * New editorial priority:
     * Featured → Recommended → Pinned → newest
     */
    sql += `
      ORDER BY
        m.is_featured DESC,
        m.is_recommended DESC,
        m.is_pinned DESC,
        m.created_at DESC
      LIMIT ?
    `;

    params.push(limit);

    const { results } =
      await db
        .prepare(sql)
        .bind(...params)
        .all();

    return json({
      movies: results
    });

  } catch (e) {
    return serverError(e.message);
  }
}


export async function onRequestPost({
  request,
  env
}) {

  if (!await requireAuth(request, env)) {
    return unauthorized();
  }

  try {

    const db = getDB(env);

    const b =
      await request.json();

    const title =
      safeText(b.title, 200);

    const slug =
      cleanSlug(
        b.slug || title
      );

    if (!title || !slug) {
      return badRequest(
        'Title is required.'
      );
    }

    if (
      !['movie', 'series']
        .includes(b.type)
    ) {
      return badRequest(
        'Invalid type.'
      );
    }

    /*
     * EDITORIAL CONTENT
     */

    const quickSummary =
      safeText(
        b.quick_summary,
        12000
      );

    const reviewBody =
      safeText(
        b.review_body,
        30000
      );

    const reviewPros =
      safeText(
        b.review_pros,
        10000
      );

    const reviewCons =
      safeText(
        b.review_cons,
        10000
      );

    const whoShouldWatch =
      safeText(
        b.who_should_watch,
        10000
      );

    const reviewVerdict =
      safeText(
        b.review_verdict,
        10000
      );

    const reviewRating =
      numOrNull(
        b.review_rating
      );

    /*
     * For backward compatibility:
     *
     * synopsis will use Quick Summary.
     */
    const synopsis =
      quickSummary ||
      safeText(
        b.synopsis,
        12000
      );

    /*
     * SITE PLACEMENTS
     */

    const showHome =
      boolValue(b.show_home);

    const showReview =
      boolValue(b.show_review);

    const showTrailer =
      boolValue(b.show_trailer);

    const isRecommended =
      boolValue(b.is_recommended);

    const isFeatured =
      boolValue(b.is_featured);

    /*
     * Keep old pinned system compatible.
     *
     * Recommended titles are also treated
     * as pinned for the existing homepage
     * logic until the homepage is updated.
     */
    const isPinned =
      isRecommended
        ? 1
        : boolValue(b.is_pinned);

    /*
     * INSERT MOVIE
     */

    const result =
      await db.prepare(`
        INSERT INTO movies(
          title,
          slug,
          type,
          poster_url,
          year,
          language,
          genre,
          quality,
          imdb_rating,
          country,
          cast,
          director,
          synopsis,
          trailer_url,
          box_office,

          quick_summary,
          review_body,
          review_pros,
          review_cons,
          who_should_watch,
          review_verdict,
          review_rating,

          show_home,
          show_review,
          show_trailer,
          is_recommended,

          is_featured,
          is_pinned,
          status
        )

        VALUES(
          ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,
          ?,?,?,?,?,?,?,
          ?,?,?,?,
          ?,?,?
        )
      `)
      .bind(

        title,
        slug,
        b.type,

        safeText(
          b.poster_url,
          2000
        ),

        b.year
          ? Number(b.year)
          : null,

        safeText(
          b.language,
          120
        ),

        safeText(
          b.genre,
          300
        ),

        safeText(
          b.quality,
          120
        ),

        numOrNull(
          b.imdb_rating
        ),

        safeText(
          b.country,
          120
        ),

        safeText(
          b.cast,
          1000
        ),

        safeText(
          b.director,
          300
        ),

        synopsis,

        safeText(
          b.trailer_url,
          1000
        ),

        safeText(
          b.box_office,
          300
        ),

        quickSummary,
        reviewBody,
        reviewPros,
        reviewCons,
        whoShouldWatch,
        reviewVerdict,
        reviewRating,

        showHome,
        showReview,
        showTrailer,
        isRecommended,

        isFeatured,
        isPinned,

        b.status === 'published'
          ? 'published'
          : 'draft'
      )
      .run();

    const id =
      result.meta.last_row_id;

    /*
     * MOVIE META
     */

    await db
      .prepare(`
        INSERT INTO movie_meta(
          movie_id,
          duration,
          release_date
        )

        VALUES(?,?,?)

        ON CONFLICT(movie_id)
        DO UPDATE SET
          duration=excluded.duration,
          release_date=excluded.release_date
      `)
      .bind(
        id,
        safeText(
          b.duration,
          80
        ),
        safeText(
          b.release_date,
          40
        )
      )
      .run();

    /*
     * CATEGORIES
     */

    const cats =
      Array.isArray(
        b.category_ids
      )
        ? b.category_ids
        : [];

    for (
      const cid of cats
    ) {

      await db
        .prepare(`
          INSERT OR IGNORE INTO
            movie_categories(
              movie_id,
              category_id
            )

          VALUES(?,?)
        `)
        .bind(
          id,
          Number(cid)
        )
        .run();
    }

    return json(
      {
        id,
        slug
      },
      201
    );

  } catch (e) {

    return badRequest(
      String(e.message)
        .includes('UNIQUE')
        ? 'This slug already exists.'
        : e.message
    );
  }
}
