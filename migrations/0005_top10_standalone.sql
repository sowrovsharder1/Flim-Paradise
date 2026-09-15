CREATE TABLE IF NOT EXISTS top10_movies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  rank INTEGER NOT NULL UNIQUE,

  title TEXT NOT NULL,
  release_year INTEGER,
  language TEXT NOT NULL DEFAULT '',
  short_description TEXT NOT NULL DEFAULT '',

  poster_key TEXT NOT NULL DEFAULT '',
  poster_url TEXT NOT NULL DEFAULT '',

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CHECK (rank >= 1 AND rank <= 10)
);

CREATE INDEX IF NOT EXISTS idx_top10_movies_rank
ON top10_movies(rank);
