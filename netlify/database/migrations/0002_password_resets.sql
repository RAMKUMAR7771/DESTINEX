CREATE TABLE password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  used_at TEXT
);

CREATE INDEX idx_password_resets_user_created ON password_resets(user_id, created_at);
CREATE INDEX idx_password_resets_expires ON password_resets(expires_at);
