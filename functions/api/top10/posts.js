import { getDB } from '../../_lib/db.js';
import {
  json,
  serverError,
  unauthorized,
  badRequest
} from '../../_lib/response.js';
import { requireAuth } from '../../_lib/auth.js';


function cleanSlug(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
}


function safeText(value, max = 10000) {
  return String(value ?? '').slice(0, max);
}


/*
=========================================================
GET
=========================================================
*/

export async function onRequestGet({ request, env }) {

  try {

    const db = getDB(env);

    const url =
      new URL(request.url);

    const id =
      url.searchParams.get('id');

    const slug =
      url.searchParams.get('slug');


    /*
    -----------------------------------------------------
    SINGLE POST
    -----------------------------------------------------
    */

    if (id || slug) {

      let post;


      if (id) {

        post = await db
          .prepare(`
            SELECT
              id,
              title,
              slug,
              description,
              status,
              created_at,
              updated_at
            FROM top10_posts
            WHERE id = ?
            LIMIT 1
          `)
          .bind(Number(id))
          .first();

      } else {

        post = await db
          .prepare(`
            SELECT
              id,
              title,
              slug,
              description,
              status,
              created_at,
              updated_at
            FROM top10_posts
            WHERE slug = ?
            LIMIT 1
          `)
          .bind(slug)
          .first();

      }


      if (!post) {

        return json(
          {
            ok: false,
            error: 'Top 10 post not found.'
          },
          404
        );

      }


      const items =
        await db
          .prepare(`
            SELECT
              id,
              post_id,
              rank,
              title,
              release_year,
              language,
              short_description,
              poster_key,
              poster_url,
              created_at,
              updated_at
            FROM top10_post_items
            WHERE post_id = ?
            ORDER BY rank ASC
          `)
          .bind(post.id)
          .all();


      return json({

        ok: true,

        post,

        items:
          items.results || []

      });

    }


    /*
    -----------------------------------------------------
    ALL POSTS
    -----------------------------------------------------
    */

    const result =
      await db
        .prepare(`
          SELECT
            id,
            title,
            slug,
            description,
            status,
            created_at,
            updated_at
          FROM top10_posts
          ORDER BY created_at DESC
        `)
        .all();


    return json({

      ok: true,

      posts:
        result.results || []

    });


  } catch (error) {

    return serverError(
      error.message
    );

  }

}


/*
=========================================================
CREATE TOP 10 POST
=========================================================
*/

export async function onRequestPost({
  request,
  env
}) {

  /*
  -------------------------------------------------------
  ADMIN LOGIN CHECK
  -------------------------------------------------------
  */

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


    const body =
      await request.json();


    /*
    -------------------------------------------------------
    BASIC POST INFORMATION
    -------------------------------------------------------
    */

    const title =
      safeText(
        body.title,
        200
      ).trim();


    const description =
      safeText(
        body.description,
        5000
      ).trim();


    const status =
      body.status === 'published'
        ? 'published'
        : 'draft';


    if (!title) {

      return badRequest(
        'Top 10 segment title is required.'
      );

    }


    const slug =
      cleanSlug(title);


    if (!slug) {

      return badRequest(
        'A valid Top 10 title is required.'
      );

    }


    /*
    -------------------------------------------------------
    MOVIE ITEMS
    -------------------------------------------------------
    */

    const items =
      Array.isArray(body.items)
        ? body.items
        : [];


    if (items.length !== 10) {

      return badRequest(
        'Exactly 10 Top 10 movies are required.'
      );

    }


    /*
    -------------------------------------------------------
    VALIDATE ALL 10 MOVIES
    -------------------------------------------------------
    */

    const cleanedItems = [];


    for (
      let i = 0;
      i < 10;
      i++
    ) {

      const item =
        items[i] || {};


      const rank =
        Number(item.rank);


      const movieTitle =
        safeText(
          item.title,
          200
        ).trim();


      const language =
        safeText(
          item.language,
          120
        ).trim();


      const shortDescription =
        safeText(
          item.short_description,
          3000
        ).trim();


      const posterKey =
        safeText(
          item.poster_key,
          1000
        ).trim();


      const posterUrl =
        safeText(
          item.poster_url,
          2000
        ).trim();


      const releaseYear =
        item.release_year === '' ||
        item.release_year === null ||
        item.release_year === undefined
          ? null
          : Number(item.release_year);


      if (
        rank !== i + 1
      ) {

        return badRequest(
          `Invalid rank for movie #${i + 1}.`
        );

      }


      if (!movieTitle) {

        return badRequest(
          `Movie title is required for #${rank}.`
        );

      }


      if (!language) {

        return badRequest(
          `Language is required for #${rank}.`
        );

      }


      if (!posterKey || !posterUrl) {

        return badRequest(
          `Poster is required for #${rank}.`
        );

      }


      cleanedItems.push({

        rank,

        title:
          movieTitle,

        release_year:
          releaseYear,

        language,

        short_description:
          shortDescription,

        poster_key:
          posterKey,

        poster_url:
          posterUrl

      });

    }


    /*
    -------------------------------------------------------
    CHECK DUPLICATE SLUG
    -------------------------------------------------------
    */

    const existing =
      await db
        .prepare(`
          SELECT id
          FROM top10_posts
          WHERE slug = ?
          LIMIT 1
        `)
        .bind(slug)
        .first();


    if (existing) {

      return badRequest(
        'A Top 10 post with this title already exists.'
      );

    }


    /*
    -------------------------------------------------------
    CREATE POST
    -------------------------------------------------------
    */

    const postResult =
      await db
        .prepare(`
          INSERT INTO top10_posts (
            title,
            slug,
            description,
            status
          )
          VALUES (?, ?, ?, ?)
        `)
        .bind(
          title,
          slug,
          description,
          status
        )
        .run();


    const postId =
      postResult.meta.last_row_id;


    /*
    -------------------------------------------------------
    CREATE 10 MOVIES
    -------------------------------------------------------
    */

    for (
      const item of cleanedItems
    ) {

      await db
        .prepare(`
          INSERT INTO top10_post_items (
            post_id,
            rank,
            title,
            release_year,
            language,
            short_description,
            poster_key,
            poster_url
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(

          postId,

          item.rank,

          item.title,

          item.release_year,

          item.language,

          item.short_description,

          item.poster_key,

          item.poster_url

        )
        .run();

    }


    /*
    -------------------------------------------------------
    SUCCESS
    -------------------------------------------------------
    */

    return json({

      ok: true,

      message:
        'Top 10 post saved successfully.',

      id:
        postId,

      slug

    }, 201);


  } catch (error) {

    console.error(
      'Top 10 create error:',
      error
    );


    return serverError(
      error.message ||
      'Failed to save Top 10 post.'
    );

  }

}
