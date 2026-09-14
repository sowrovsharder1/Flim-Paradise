PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS movie_meta (
  movie_id INTEGER PRIMARY KEY,
  duration TEXT NOT NULL DEFAULT '',
  release_date TEXT NOT NULL DEFAULT '',
  FOREIGN KEY(movie_id) REFERENCES movies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL DEFAULT 'news' CHECK (content_type IN ('review','news','trailer','box-office','recommendation','feature')),
  excerpt TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  cover_url TEXT NOT NULL DEFAULT '',
  movie_id INTEGER,
  category TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('published','draft')),
  is_featured INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(movie_id) REFERENCES movies(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS community_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  movie_id INTEGER NOT NULL,
  author_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 10),
  comment TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(movie_id) REFERENCES movies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_articles_type_status ON articles(content_type,status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_community_reviews_movie_status ON community_reviews(movie_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movie_meta_movie ON movie_meta(movie_id);
