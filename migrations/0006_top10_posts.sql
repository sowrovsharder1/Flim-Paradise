CREATE TABLE IF NOT EXISTS top10_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_top10_posts_status
ON top10_posts(status);

CREATE INDEX IF NOT EXISTS idx_top10_posts_created_at
ON top10_posts(created_at);


CREATE TABLE IF NOT EXISTS top10_post_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  rank INTEGER NOT NULL,
  title TEXT NOT NULL,
  release_year INTEGER,
  language TEXT NOT NULL DEFAULT '',
  short_description TEXT NOT NULL DEFAULT '',
  poster_key TEXT NOT NULL DEFAULT '',
  poster_url TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (post_id)
    REFERENCES top10_posts(id)
    ON DELETE CASCADE,

  UNIQUE(post_id, rank),

  CHECK (rank >= 1 AND rank <= 10)
);

CREATE INDEX IF NOT EXISTS idx_top10_post_items_post_id
ON top10_post_items(post_id);

CREATE INDEX IF NOT EXISTS idx_top10_post_items_rank
ON top10_post_items(post_id, rank);
