PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 100
);

CREATE TABLE IF NOT EXISTS movies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'movie' CHECK (type IN ('movie','series')),
  poster_url TEXT NOT NULL DEFAULT '',
  backdrop_url TEXT NOT NULL DEFAULT '',
  year INTEGER,
  language TEXT NOT NULL DEFAULT '',
  genre TEXT NOT NULL DEFAULT '',
  quality TEXT NOT NULL DEFAULT '',
  duration TEXT NOT NULL DEFAULT '',
  imdb_rating REAL,
  country TEXT NOT NULL DEFAULT '',
  cast TEXT NOT NULL DEFAULT '',
  director TEXT NOT NULL DEFAULT '',
  release_date TEXT NOT NULL DEFAULT '',
  synopsis TEXT NOT NULL DEFAULT '',
  trailer_url TEXT NOT NULL DEFAULT '',
  box_office TEXT NOT NULL DEFAULT '',
  is_featured INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0,1)),
  is_pinned INTEGER NOT NULL DEFAULT 0 CHECK (is_pinned IN (0,1)),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('published','draft')),
  views INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS movie_categories (
  movie_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  PRIMARY KEY (movie_id, category_id),
  FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
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
  FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  movie_id INTEGER NOT NULL,
  author_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 10),
  comment TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_movies_slug ON movies(slug);
CREATE INDEX IF NOT EXISTS idx_movies_status_created ON movies(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movies_type_status ON movies(type, status);
CREATE INDEX IF NOT EXISTS idx_movies_pinned_featured ON movies(is_pinned DESC, is_featured DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_type_status ON articles(content_type, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_movie ON articles(movie_id);
CREATE INDEX IF NOT EXISTS idx_reviews_movie_status ON reviews(movie_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movie_categories_category ON movie_categories(category_id);
