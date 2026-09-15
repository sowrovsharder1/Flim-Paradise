-- FilmParadise BD
-- Migration 0004
-- Content placements + editorial review structure + Top 10

-- =========================================================
-- 1. Fix old database schema
-- =========================================================

ALTER TABLE movies ADD COLUMN synopsis TEXT NOT NULL DEFAULT '';

-- =========================================================
-- 2. Editorial review fields
-- =========================================================

ALTER TABLE movies ADD COLUMN quick_summary TEXT NOT NULL DEFAULT '';

ALTER TABLE movies ADD COLUMN review_body TEXT NOT NULL DEFAULT '';

ALTER TABLE movies ADD COLUMN review_pros TEXT NOT NULL DEFAULT '';

ALTER TABLE movies ADD COLUMN review_cons TEXT NOT NULL DEFAULT '';

ALTER TABLE movies ADD COLUMN who_should_watch TEXT NOT NULL DEFAULT '';

ALTER TABLE movies ADD COLUMN review_verdict TEXT NOT NULL DEFAULT '';

ALTER TABLE movies ADD COLUMN review_rating REAL;

-- =========================================================
-- 3. Homepage / section placement controls
-- =========================================================

ALTER TABLE movies ADD COLUMN show_home INTEGER NOT NULL DEFAULT 0;

ALTER TABLE movies ADD COLUMN show_review INTEGER NOT NULL DEFAULT 0;

ALTER TABLE movies ADD COLUMN show_trailer INTEGER NOT NULL DEFAULT 0;

ALTER TABLE movies ADD COLUMN is_recommended INTEGER NOT NULL DEFAULT 0;

-- =========================================================
-- 4. Preserve old content
-- =========================================================

-- Old synopsis/review text becomes Quick Summary
UPDATE movies
SET quick_summary = synopsis
WHERE quick_summary = ''
  AND synopsis IS NOT NULL
  AND synopsis != '';

-- Old pinned titles become Recommended
UPDATE movies
SET is_recommended = 1
WHERE is_pinned = 1;

-- Existing published movies appear on Home
UPDATE movies
SET show_home = 1
WHERE status = 'published';

-- Movies with trailers appear in Trailer section
UPDATE movies
SET show_trailer = 1
WHERE trailer_url IS NOT NULL
  AND trailer_url != '';

-- =========================================================
-- 5. Top 10 table
-- =========================================================

CREATE TABLE IF NOT EXISTS top10 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    movie_id INTEGER NOT NULL UNIQUE,

    rank INTEGER NOT NULL UNIQUE,

    note TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,

    CHECK (rank >= 1 AND rank <= 10)
);

CREATE INDEX IF NOT EXISTS idx_top10_rank
ON top10(rank);

CREATE INDEX IF NOT EXISTS idx_movies_show_home
ON movies(show_home);

CREATE INDEX IF NOT EXISTS idx_movies_show_review
ON movies(show_review);

CREATE INDEX IF NOT EXISTS idx_movies_show_trailer
ON movies(show_trailer);

CREATE INDEX IF NOT EXISTS idx_movies_recommended
ON movies(is_recommended);
