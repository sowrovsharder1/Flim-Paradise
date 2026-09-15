import { getDB } from '../../_lib/db.js';
import {
  json,
  serverError,
  unauthorized,
  notFound,
  badRequest
} from '../../_lib/response.js';
import { requireAuth } from '../../_lib/auth.js';

function safeText(v, max = 12000) {
  return String(v ?? '').slice(0, max);
}

function numOrNull(v) {
  return v !== '' &&
    v !== null &&
    v !== undefined
    ? Number(v)
    : null;
}

function boolValue(v) {
  return v ? 1 : 0;
}

export async function onRequestGet({
  params,
  request,
  env
}) {
  try {
    const db = getDB(env);

    const authed =
      await requireAuth(
        request,
        env
      );

    const movie =
      await db.prepare(`
        SELECT
          m.*,

          COALESCE(
            (
              SELECT ROUND(
                AVG(r.rating),
                1
              )
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
          ) AS review_count,

          COALESCE(
            mm.duration,
            ''
          ) AS duration,

          COALESCE(
            mm.release_date,
            ''
          ) AS release_date

        FROM movies m

        LEFT JOIN movie_meta mm
          ON mm.movie_id=m.id

        WHERE m.slug=?
      `)
      .bind(params.slug)
      .first();

    if (
      !movie ||
      (
        movie.status !== 'published' &&
        !authed
      )
    ) {
      return notFound(
        'Title not found.'
      );
    }

    const [
      { results: categories },
      { results: reviews }
    ] = await Promise.all([

      db.prepare(`
        SELECT
          c.id,
          c.name,
          c.slug

        FROM categories c

        JOIN movie_categories mc
          ON mc.category_id=c.id

        WHERE mc.movie_id=?

        ORDER BY c.sort_order
      `)
      .bind(movie.id)
      .all(),

      db.prepare(`
        SELECT
          id,
          author_name,
          rating,
          comment,
          created_at

        FROM community_reviews

        WHERE movie_id=?
          AND status='approved'

        ORDER BY created_at DESC

        LIMIT 50
      `)
      .bind(movie.id)
      .all()
    ]);

    return json({
      movie,
      categories,
      reviews
    });

  } catch (e) {
    return serverError(
      e.message
    );
  }
}


export async function onRequestPut({
  params,
  request,
  env
}) {

  if (
    !await requireAuth(
      request,
      env
    )
  ) {
    return unauthorized();
  }

  try {

    const db = getDB(env);

    const existing =
      await db.prepare(
        'SELECT id FROM movies WHERE slug=?'
      )
      .bind(params.slug)
      .first();

    if (!existing) {
      return notFound();
    }

    const b =
      await request.json();

    /*
     * Basic + editorial + placement fields
     */
    const fields = [

      'title',
      'slug',
      'type',
      'poster_url',
      'year',
      'language',
      'genre',
      'quality',
      'imdb_rating',
      'country',
      'cast',
      'director',
      'synopsis',
      'trailer_url',
      'box_office',

      /*
       * Editorial
       */
      'quick_summary',
      'review_body',
      'review_pros',
      'review_cons',
      'who_should_watch',
      'review_verdict',
      'review_rating',

      /*
       * Placement
       */
      'show_home',
      'show_review',
      'show_trailer',
      'is_recommended',

      /*
       * Existing
       */
      'is_featured',
      'is_pinned',
      'status'
    ];

    const sets = [];
    const vals = [];

    for (
      const f of fields
    ) {

      if (
        b[f] === undefined
      ) {
        continue;
      }

      sets.push(
        `${f}=?`
      );

      /*
       * Numeric fields
       */
      if (
        f === 'year' ||
        f === 'imdb_rating' ||
        f === 'review_rating'
      ) {

        vals.push(
          numOrNull(b[f])
        );

        continue;
      }

      /*
       * Boolean fields
       */
      if (
        f === 'show_home' ||
        f === 'show_review' ||
        f === 'show_trailer' ||
        f === 'is_recommended' ||
        f === 'is_featured' ||
        f === 'is_pinned'
      ) {

        vals.push(
          boolValue(b[f])
        );

        continue;
      }

      /*
       * Text fields
       */
      let max = 3000;

      if (
        f === 'synopsis' ||
        f === 'quick_summary'
      ) {
        max = 12000;
      }

      if (
        f === 'review_body'
      ) {
        max = 30000;
      }

      if (
        f === 'review_pros' ||
        f === 'review_cons' ||
        f === 'who_should_watch' ||
        f === 'review_verdict'
      ) {
        max = 10000;
      }

      vals.push(
        safeText(
          b[f],
          max
        )
      );
    }

    /*
     * Keep synopsis and Quick Summary
     * compatible with the old site.
     *
     * If Quick Summary is supplied,
     * use it as synopsis too.
     */
    if (
      b.quick_summary !== undefined &&
      b.synopsis === undefined
    ) {

      const index =
        fields.indexOf(
          'synopsis'
        );

      /*
       * Only add synopsis if it was
       * not already added above.
       */
      if (
        !sets.includes(
          'synopsis=?'
        )
      ) {

        sets.push(
          'synopsis=?'
        );

        vals.push(
          safeText(
            b.quick_summary,
            12000
          )
        );
      }
    }

    /*
     * Recommended compatibility:
     *
     * Keep old pinned system working
     * when Recommended is enabled.
     */
    if (
      b.is_recommended !== undefined &&
      b.is_pinned === undefined
    ) {

      sets.push(
        'is_pinned=?'
      );

      vals.push(
        b.is_recommended
          ? 1
          : 0
      );
    }

    /*
     * UPDATE MOVIE
     */
    if (sets.length) {

      vals.push(
        existing.id
      );

      await db
        .prepare(`
          UPDATE movies

          SET
            ${sets.join(',')},
            updated_at=CURRENT_TIMESTAMP

          WHERE id=?
        `)
        .bind(...vals)
        .run();
    }

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
        existing.id,
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
    if (
      Array.isArray(
        b.category_ids
      )
    ) {

      await db
        .prepare(
          'DELETE FROM movie_categories WHERE movie_id=?'
        )
        .bind(
          existing.id
        )
        .run();

      for (
        const cid of b.category_ids
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
            existing.id,
            Number(cid)
          )
          .run();
      }
    }

    /*
     * Get updated movie
     */
    const updated =
      await db
        .prepare(`
          SELECT *
          FROM movies
          WHERE id=?
        `)
        .bind(
          existing.id
        )
        .first();

    return json({
      ok: true,
      movie: updated
    });

  } catch (e) {

    return badRequest(
      String(e.message)
        .includes('UNIQUE')
        ? 'This slug already exists.'
        : e.message
    );
  }
}


export async function onRequestDelete({
  params,
  request,
  env
}) {

  if (
    !await requireAuth(
      request,
      env
    )
  ) {
    return unauthorized();
  }

  try {

    const db =
      getDB(env);

    const r =
      await db
        .prepare(
          'DELETE FROM movies WHERE slug=?'
        )
        .bind(
          params.slug
        )
        .run();

    if (
      !r.meta.changes
    ) {
      return notFound();
    }

    return json({
      ok: true
    });

  } catch (e) {

    return serverError(
      e.message
    );
  }
}
