function errorResponse(message, status = 400) {
  return new Response(
    JSON.stringify({
      ok: false,
      error: message
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      }
    }
  );
}

export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    if (!env.POSTERS) {
      return errorResponse(
        "R2 POSTERS binding is not available.",
        500
      );
    }

    const url = new URL(request.url);
    const key = url.searchParams.get("key");

    if (!key) {
      return errorResponse(
        "Poster key is required.",
        400
      );
    }

    if (!key.startsWith("top10/")) {
      return errorResponse(
        "Invalid poster key.",
        403
      );
    }

    const object = await env.POSTERS.get(key);

    if (!object) {
      return errorResponse(
        "Poster not found.",
        404
      );
    }

    const headers = new Headers();

    object.writeHttpMetadata(headers);

    headers.set(
      "etag",
      object.httpEtag
    );

    headers.set(
      "Cache-Control",
      "public, max-age=31536000"
    );

    return new Response(
      object.body,
      {
        headers
      }
    );

  } catch (error) {
    console.error(
      "Top 10 poster image error:",
      error
    );

    return errorResponse(
      error.message ||
        "Failed to load poster.",
      500
    );
  }
}
