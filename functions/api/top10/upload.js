function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

function safeFileName(name) {
  return String(name || "poster")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    if (!env.POSTERS) {
      return json(
        {
          ok: false,
          error: "R2 POSTERS binding is not available."
        },
        500
      );
    }

    const contentType = request.headers.get("content-type") || "";

    if (!contentType.includes("multipart/form-data")) {
      return json(
        {
          ok: false,
          error: "Upload must use multipart/form-data."
        },
        400
      );
    }

    const formData = await request.formData();

    const file = formData.get("file");
    const rank = String(formData.get("rank") || "").trim();

    if (!(file instanceof File)) {
      return json(
        {
          ok: false,
          error: "No poster file was uploaded."
        },
        400
      );
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
      return json(
        {
          ok: false,
          error: "Only JPG, PNG and WebP images are allowed."
        },
        400
      );
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      return json(
        {
          ok: false,
          error: "Poster must be 5MB or smaller."
        },
        400
      );
    }

    const extensionMap = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp"
    };

    const extension = extensionMap[file.type];

    const cleanName =
      safeFileName(file.name) ||
      `poster-${Date.now()}.${extension}`;

    const baseName = cleanName.replace(
      /\.[^.]+$/,
      ""
    );

    const safeRank =
      /^[1-9]|10$/.test(rank)
        ? rank
        : "unranked";

    const key =
      `top10/${safeRank}-${Date.now()}-${baseName}.${extension}`;

    await env.POSTERS.put(
      key,
      file.stream(),
      {
        httpMetadata: {
          contentType: file.type,
          cacheControl: "public, max-age=31536000"
        },
        customMetadata: {
          originalName: file.name,
          section: "top10",
          rank: rank || "",
          uploadedAt: new Date().toISOString()
        }
      }
    );

    const origin = new URL(request.url).origin;

    const posterUrl =
      `${origin}/api/top10/image?key=${encodeURIComponent(key)}`;

    return json({
      ok: true,
      key,
      url: posterUrl,
      filename: file.name,
      size: file.size,
      content_type: file.type
    });

  } catch (error) {
    console.error("Top 10 poster upload error:", error);

    return json(
      {
        ok: false,
        error:
          error.message ||
          "Poster upload failed."
      },
      500
    );
  }
}
