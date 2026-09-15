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

export async function onRequestGet(context) {
  try {
    const db = getDb(context.env);

    const result = await db
      .prepare(`
        SELECT
          id,
          rank,
          title,
          release_year,
          language,
          short_description,
          poster_url,
          created_at,
          updated_at
        FROM top10_movies
        ORDER BY rank ASC
      `)
      .all();

    return json({
      ok: true,
      items: result.results || []
    });
  } catch (error) {
    return json(
      {
        ok: false,
        error: error.message || "Failed to load Top 10."
      },
      500
    );
  }
}

export async function onRequestPost(context) {
  try {
    const db = getDb(context.env);

    const body = await context.request.json();

    const rank = Number(body.rank);
    const title = String(body.title || "").trim();
    const releaseYear =
      body.release_year === "" ||
      body.release_year === null ||
      body.release_year === undefined
        ? null
        : Number(body.release_year);

    const language = String(body.language || "").trim();
    const shortDescription = String(
      body.short_description || ""
    ).trim();

    const posterKey = String(body.poster_key || "").trim();
    const posterUrl = String(body.poster_url || "").trim();

    if (!Number.isInteger(rank) || rank < 1 || rank > 10) {
      return json(
        {
          ok: false,
          error: "Rank must be between 1 and 10."
        },
        400
      );
    }

    if (!title) {
      return json(
        {
          ok: false,
          error: "Movie title is required."
        },
        400
      );
    }

    if (!language) {
      return json(
        {
          ok: false,
          error: "Language is required."
        },
        400
      );
    }

    const existing = await db
      .prepare(`
        SELECT id
        FROM top10_movies
        WHERE rank = ?
      `)
      .bind(rank)
      .first();

    if (existing) {
      await db
        .prepare(`
          UPDATE top10_movies
          SET
            title = ?,
            release_year = ?,
            language = ?,
            short_description = ?,
            poster_key = ?,
            poster_url = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE rank = ?
        `)
        .bind(
          title,
          releaseYear,
          language,
          shortDescription,
          posterKey,
          posterUrl,
          rank
        )
        .run();
    } else {
      await db
        .prepare(`
          INSERT INTO top10_movies (
            rank,
            title,
            release_year,
            language,
            short_description,
            poster_key,
            poster_url
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          rank,
          title,
          releaseYear,
          language,
          shortDescription,
          posterKey,
          posterUrl
        )
        .run();
    }

    return json({
      ok: true,
      message: `Top 10 rank ${rank} saved successfully.`
    });
  } catch (error) {
    return json(
      {
        ok: false,
        error: error.message || "Failed to save Top 10."
      },
      500
    );
  }
}
