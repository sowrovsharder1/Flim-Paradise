function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });
}

function getDb(env) {
  return env.DB;
}

function makeSlug(title) {
  return String(title || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

export async function onRequestGet(context) {
  try {
    const db = getDb(context.env);
    const url = new URL(context.request.url);
    const id = url.searchParams.get("id");
    const slug = url.searchParams.get("slug");

    // Get one Top 10 post
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
            error: "Top 10 post not found."
          },
          404
        );
      }

      const items = await db
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
        items: items.results || []
      });
    }

    // Get all Top 10 posts
    const result = await db
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
      posts: result.results || []
    });
  } catch (error) {
    return json(
      {
        ok: false,
        error: error.message || "Failed to load Top 10 posts."
      },
      500
    );
  }
}
