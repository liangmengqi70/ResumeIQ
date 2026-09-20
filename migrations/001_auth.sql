-- Run only after scripts/inspect-db.mjs verifies the existing schema.
-- Additive migration: existing business tables/data are never recreated.
CREATE TABLE auth_sessions (
  token_hash CHAR(64) NOT NULL PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at DATETIME(3) NOT NULL,
  KEY idx_auth_sessions_expiry (expires_at),
  KEY idx_auth_sessions_user (user_id),
  CONSTRAINT fk_auth_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE auth_challenges (
  phone VARCHAR(20) NOT NULL PRIMARY KEY,
  code_hash CHAR(64) NULL,
  salt CHAR(64) NULL,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  sent_at DATETIME(3) NULL,
  expires_at DATETIME(3) NULL,
  sent_count INT UNSIGNED NOT NULL DEFAULT 0,
  window_started_at DATETIME(3) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
