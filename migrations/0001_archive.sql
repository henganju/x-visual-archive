CREATE TABLE IF NOT EXISTS archive_posts (
 post_id TEXT PRIMARY KEY, username TEXT NOT NULL, original_url TEXT NOT NULL,
 post_url TEXT NOT NULL, created_at TEXT NOT NULL, added_at TEXT NOT NULL,
 notes TEXT NOT NULL DEFAULT '', date_source TEXT NOT NULL,
 is_visible INTEGER NOT NULL DEFAULT 1 CHECK(is_visible IN (0,1))
);
CREATE INDEX IF NOT EXISTS archive_chronology ON archive_posts(is_visible,created_at,post_id);
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS login_attempts(client_hash TEXT PRIMARY KEY,attempts INTEGER NOT NULL,expires INTEGER NOT NULL);
