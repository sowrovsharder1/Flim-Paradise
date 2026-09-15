import { getDB } from "../../_lib/db.js";
import {
  json,
  badRequest,
  unauthorized,
  serverError
} from "../../_lib/response.js";
import { requireAuth } from "../../_lib/auth.js";


/*
=====================================================
SLUG GENERATOR
=====================================================
*/

function makeSlug(title) {
  return String(title || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}


/*
=====================================================
UNIQUE SLUG
=====================================================
*/

async function makeUniqueSlug(db, title) {

  const baseSlug =
    makeSlug(title) ||
    `top-10-${Date.now()}`;

  let slug = baseSlug;
  let counter = 2;

  while (true) {

    const existing =
      await db
        .prepare(
          "SELECT id FROM top10_posts WHERE slug = ? LIMIT 1"
        )
        .bind(slug)
        .first();

    if (!existing) {
      return slug;
    }

    slug =
      `${baseSlug}-${counter}`;

    counter++;

  }

}


/*
=====================================================
GET
=====================================================

Returns Top 10 posts.

Admin manager can use this endpoint.
Published posts are also available for future public
Top 10 pages.
*/

export async function onRequestGet({ request, env }) {

  try {

    const db =
      getDB(env);


    const url =
      new URL(request.url);


    const slug =
      url.searchParams.get("slug");


    /*
    -------------------------------------------------
    SINGLE POST
    -------------------------------------------------
    */

    if (slug) {

      const post =
        await db
          .prepare(
            `
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
            `
          )
          .bind(slug)
          .first();


      if (!post) {

        return json(
          {
            ok: false,
            error: "Top 10 post not found."
          },
          404
        );

      }


      const itemsResult =
        await db
          .prepare(
            `
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
            `
          )
          .bind(post.id)
          .all();


      return json(
        {
          ok: true,
          post: {
            ...post,
            items:
              itemsResult.results || []
          }
        }
      );

    }


    /*
    -------------------------------------------------
    ALL POSTS
    -------------------------------------------------
    */

    const postsResult =
      await db
        .prepare(
          `
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
          `
        )
        .all();


    const posts =
      postsResult.results || [];


    /*
    -------------------------------------------------
    GET #1 POSTER FOR EACH TOP 10 POST
    -------------------------------------------------
    */

    for (const post of posts) {

      const firstItem =
        await db
          .prepare(
            `
            SELECT
              poster_key,
              poster_url
            FROM top10_post_items
            WHERE post_id = ?
              AND rank = 1
            LIMIT 1
            `
          )
          .bind(post.id)
          .first();


      post.main_poster_key =
        firstItem?.poster_key || "";

      post.main_poster_url =
        firstItem?.poster_url || "";

    }


    return json(
      {
        ok: true,
        posts
      }
    );


  } catch (error) {

    console.error(
      "Top 10 GET error:",
      error
    );


    return serverError(
      error.message ||
      "Failed to load Top 10 posts."
    );

  }

}


/*
=====================================================
POST
=====================================================

Creates a new Top 10 post and its 10 ranked movies.
*/

export async function onRequestPost({ request, env }) {

  try {

    /*
    -------------------------------------------------
    ADMIN AUTHENTICATION
    -------------------------------------------------
    */

    if (
      !await requireAuth(
        request,
        env
      )
    ) {

      return unauthorized();

    }


    /*
    -------------------------------------------------
    DATABASE
    -------------------------------------------------
    */

    const db =
      getDB(env);


    /*
    -------------------------------------------------
    REQUEST BODY
    -------------------------------------------------
    */

    const body =
      await request.json();


    const title =
      String(
        body.title || ""
      ).trim();


    const description =
      String(
        body.description || ""
      ).trim();


    const status =
      body.status === "draft"
        ? "draft"
        : "published";


    const items =
      Array.isArray(body.items)
        ? body.items
        : [];


    /*
    -------------------------------------------------
    VALIDATE TITLE
    -------------------------------------------------
    */

    if (!title) {

      return badRequest(
        "Top 10 Segment Title is required."
      );

    }


    /*
    -------------------------------------------------
    VALIDATE ITEMS
    -------------------------------------------------
    */

    if (items.length !== 10) {

      return badRequest(
        "Exactly 10 movies are required."
      );

    }


    /*
    -------------------------------------------------
    VALIDATE EACH RANK
    -------------------------------------------------
    */

    const ranks =
      items
        .map(
          item =>
            Number(item.rank)
        )
        .sort(
          (a, b) =>
            a - b
        );


    for (
      let i = 0;
      i < 10;
      i++
    ) {

      if (
        ranks[i] !== i + 1
      ) {

        return badRequest(
          "Top 10 rankings must contain #1 through #10."
        );

      }

    }


    /*
    -------------------------------------------------
    VALIDATE MOVIE DATA
    -------------------------------------------------
    */

    for (const item of items) {

      if (
        !String(
          item.title || ""
        ).trim()
      ) {

        return badRequest(
          `Movie title is required for #${item.rank}.`
        );

      }


      if (
        !String(
          item.language || ""
        ).trim()
      ) {

        return badRequest(
          `Language is required for #${item.rank}.`
        );

      }


      if (
        !String(
          item.poster_key || ""
        ).trim()
      ) {

        return badRequest(
          `Poster is required for #${item.rank}.`
        );

      }

    }


    /*
    -------------------------------------------------
    CREATE UNIQUE SLUG
    -------------------------------------------------
    */

    const slug =
      await makeUniqueSlug(
        db,
        title
      );


    /*
    -------------------------------------------------
    CREATE TOP 10 POST
    -------------------------------------------------
    */

    const postResult =
      await db
        .prepare(
          `
          INSERT INTO top10_posts
          (
            title,
            slug,
            description,
            status
          )
          VALUES (?, ?, ?, ?)
          `
        )
        .bind(
          title,
          slug,
          description,
          status
        )
        .run();


    if (
      !postResult.success
    ) {

      throw new Error(
        "Failed to create Top 10 post."
      );

    }


    /*
    -------------------------------------------------
    GET NEW POST ID
    -------------------------------------------------
    */

    const post =
      await db
        .prepare(
          `
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
          `
        )
        .bind(slug)
        .first();


    if (!post) {

      throw new Error(
        "Top 10 post was created but could not be loaded."
      );

    }


    /*
    -------------------------------------------------
    INSERT 10 MOVIES
    -------------------------------------------------
    */

    try {

      for (const item of items) {

        const year =
          item.release_year === null ||
          item.release_year === "" ||
          typeof item.release_year === "undefined"
            ? null
            : Number(item.release_year);


        await db
          .prepare(
            `
            INSERT INTO top10_post_items
            (
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
            `
          )
          .bind(
            post.id,
            Number(item.rank),
            String(item.title || "").trim(),
            year,
            String(item.language || "").trim(),
            String(item.short_description || "").trim(),
            String(item.poster_key || "").trim(),
            String(item.poster_url || "").trim()
          )
          .run();

      }

    } catch (itemError) {

      /*
      -----------------------------------------------
      CLEAN UP POST IF ITEM INSERT FAILS
      -----------------------------------------------
      */

      try {

        await db
          .prepare(
            "DELETE FROM top10_posts WHERE id = ?"
          )
          .bind(post.id)
          .run();

      } catch (cleanupError) {

        console.error(
          "Top 10 cleanup error:",
          cleanupError
        );

      }


      throw itemError;

    }


    /*
    -------------------------------------------------
    SUCCESS
    -------------------------------------------------
    */

    return json(
      {
        ok: true,
        message:
          "Top 10 post created successfully.",
        post: {
          ...post,
          items
        }
      },
      201
    );


  } catch (error) {

    console.error(
      "Top 10 POST error:",
      error
    );


    return serverError(
      error.message ||
      "Failed to save Top 10 post."
    );

  }

}
