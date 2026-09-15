import { getDB } from '../../_lib/db.js';
import { json, serverError, unauthorized, badRequest } from '../../_lib/response.js';
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

export async function onRequestGet({ request, env }) {
  try {
    const db = getDB(env);
    const u = new URL(request.url);
    const authed = await requireAuth(request, env);

    const status = u.searchParams.get('status') || (authed ? 'all' : 'published');
    const type = u.searchParams.get('type');
    const category = u.searchParams.get('category');
    const q = u.searchParams.get('q');

    const featured = u.searchParams.get('featured');
    const recommended = u.searchParams.get('recommended');
    const home = u.searchParams.get('home');
    const reviews = u.searchParams.get('reviews');
    const trailer = u.searchParams.get('trailer');

    const limit = Math.min(
      Math.max(parseInt(u.searchParams.get('limit') || '24', 10) || 24, 1),
      100
    );

    let sql = `
      SELECT DISTINCT m.*,
        COALESCE(
          (
            SELECT ROUND(AVG(r.rating), 1)
            FROM community_reviews r
            WHERE r.movie_id = m.id
              AND r.status = 'approved'
          ),
          0
        ) AS audience_rating,

        COALESCE(
          (
            SELECT COUNT(*)
            FROM community_reviews r
            WHERE r.movie_id = m.id
              AND r.status = 'approved'
          ),
          0
        ) AS review_count

      FROM movies m
    `;

    const conditions = [];
    const params = [];

    if (category) {
      sql += `
        JOIN movie_categories mc
          ON mc.movie_id = m.id
        JOIN categories c
          ON c.id = mc.category_id
      `;

      conditions.push('c.slug = ?');
      params.push(category);
    }

    if (status !== 'all') {
      conditions.push('m.status = ?');
      params.push(status);
    }

    if (type) {
      conditions.push('m.type = ?');
      params.push(type);
    }

    if (featured === '1') {
      conditions.push('m.is_featured = 1');
    }

    if (recommended === '1') {
      conditions.push('m.is_recommended = 1');
    }

    if (home === '1') {
      conditions.push('m.show_home = 1');
    }

    if (reviews === '1') {
      conditions.push('m.show_review = 1');
    }

    if (trailer === '1') {
      conditions.push("m.show_trailer = 1 AND m.trailer_url != ''");
    }

    if (q) {
      conditions.push(
        '(m.title LIKE ? OR m.genre LIKE ? OR m.language LIKE ?)'
      );

      const search = `%${q}%`;
      params.push(search, search, search);
    }

    if (conditions.length) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += `
      ORDER BY
        m.is_featured DESC,
        m.is_recommended DESC,
        m.created_at DESC
      LIMIT ?
    `;

    params.push(limit);

    const { results } = await db
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

export async function onRequestPost({ request, env }) {
  if (!await requireAuth(request, env)) {
    return unauthorized();
  }

  try {
    const db = getDB(env);
    const b = await request.json();

    const title = safeText(b.title, 200);
    const slug = cleanSlug(b.slug || title);

    if (!title || !slug) {
      return badRequest('Title is required.');
    }

    if (!['movie', 'series'].includes(b.type)) {
      return badRequest('Invalid type.');
    }

    const result = await db.prepare(`
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
        quick_summary,
        review_body,
        review_pros,
        review_cons,
        who_should_watch,
        review_verdict,
        review_rating,
        trailer_url,
        box_office,
        is_featured,
        is_pinned,
        show_home,
        show_review,
        show_trailer,
        is_recommended,
        status
      )

      VALUES(
        ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
      )
    `).bind(

      title,
      slug,
      b.type,

      safeText(b.poster_url, 2000),
      b.year ? Number(b.year) : null,
      safeText(b.language, 120),
      safeText(b.genre, 300),
      safeText(b.quality, 120),

      b.imdb_rating !== '' && b.imdb_rating != null
        ? Number(b.imdb_rating)
        : null,

      safeText(b.country, 120),
      safeText(b.cast, 1000),
      safeText(b.director, 300),

      safeText(b.synopsis, 12000),
      safeText(b.quick_summary, 12000),
      safeText(b.review_body, 20000),
      safeText(b.review_pros, 8000),
      safeText(b.review_cons, 8000),
      safeText(b.who_should_watch, 10000),
      safeText(b.review_verdict, 10000),

      b.review_rating !== '' && b.review_rating != null
        ? Number(b.review_rating)
        : null,

      safeText(b.trailer_url, 1000),
      safeText(b.box_office, 300),

      b.is_featured ? 1 : 0,

      b.is_pinned ? 1 : 0,

      b.show_home ? 1 : 0,
      b.show_review ? 1 : 0,
      b.show_trailer ? 1 : 0,

      b.is_recommended ? 1 : 0,

      b.status === 'published'
        ? 'published'
        : 'draft'

    ).run();

    const id = result.meta.last_row_id;

    await db.prepare(`
      INSERT INTO movie_meta(
        movie_id,
        duration,
        release_date
      )
      VALUES(?,?,?)

      ON CONFLICT(movie_id)
      DO UPDATE SET
        duration = excluded.duration,
        release_date = excluded.release_date
    `).bind(
      id,
      safeText(b.duration, 80),
      safeText(b.release_date, 40)
    ).run();

    const cats = Array.isArray(b.category_ids)
      ? b.category_ids
      : [];

    for (const cid of cats) {
      await db.prepare(`
        INSERT OR IGNORE INTO movie_categories(
          movie_id,
          category_id
        )
        VALUES(?,?)
      `).bind(
        id,
        Number(cid)
      ).run();
    }

    return json({
      id,
      slug
    }, 201);

  } catch (e) {
    return badRequest(
      String(e.message).includes('UNIQUE')
        ? 'This slug already exists.'
        : e.message
    );
  }
}
