# FilmParadise BD — Editorial Movie Platform

A lightweight Cloudflare Pages + Pages Functions + D1 + R2 movie discovery and community site. The site is intentionally **not** a download portal. It focuses on movie/series information, reviews, recommendations, trailers, box office, news and moderated audience reviews.

## Features
- Dark cinematic UI; red FilmParadise BD brand; yellow movie titles; white summaries
- Responsive desktop/tablet/mobile layout
- Homepage: Recommended For You, Reviews, News, Trailers, Box Office, Series
- Movie/series pages with IMDb-style 0–10 editorial score + audience rating
- Moderated audience reviews (1–10)
- Article system: review, news, trailer, box-office, recommendation, feature
- Search and category browsing
- Admin login with HttpOnly signed session cookie
- Admin CRUD for movies, articles, reviews and categories
- R2 poster upload (JPG/PNG/WEBP, 5MB max)
- SEO basics: titles, meta descriptions, robots.txt, sitemap

## Cloudflare bindings
Use these exact binding names in the Pages project:
- D1 binding: `DB`
- R2 binding: `POSTERS`

## Existing project migration
If your D1 already contains the earlier FilmParadise tables (`categories`, `movies`, `movie_categories`, etc.), **do not rerun the old migrations**. Run only:

`migrations/0003_editorial_community.sql`

It creates:
- `movie_meta`
- `articles`
- `community_reviews`

The migration is idempotent.

For a completely fresh D1 database, run `0001_core.sql`, then `0002_seed_categories.sql`, then `0003_editorial_community.sql`.

## Admin secrets
In the Cloudflare Pages project, configure Production secrets:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`

Never commit these values to GitHub or share them in chat.

## R2
Create an R2 bucket, bind it to the Pages project as `POSTERS`, then poster uploads from the admin panel are saved under `posters/` and served through `/api/posters/...`.

## GitHub + Cloudflare Pages
1. Upload the repository root so `index.html`, `admin/`, `assets/`, `functions/`, and `migrations/` are at the repository root.
2. Commit to the connected production branch (normally `main`).
3. Cloudflare Pages will deploy the new commit.
4. After binding changes or secrets are added, make a new deployment.

## Content workflow
1. Sign in at `/admin/login.html`.
2. Add a movie/series with original metadata and a poster.
3. Publish it.
4. Write supporting editorial articles from `/admin/article-form.html`.
5. Moderate audience reviews from `/admin/reviews.html`.

## Poster options
A poster can be supplied by direct image URL or uploaded to R2 from the admin form. The R2 upload route rejects unsupported file types and images over 5MB.

## Legal/content note
Use only media assets and links you are authorized to publish. Keep reviews/news/recommendations original and useful; do not scrape or republish copyrighted articles wholesale.
