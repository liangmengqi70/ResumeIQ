-- Add the latest successful login time shown in Personal Center.
ALTER TABLE users ADD COLUMN last_login_at DATETIME(3) NULL AFTER registered_at;

UPDATE users u
LEFT JOIN (
  SELECT user_id, MAX(created_at) AS last_login_at
  FROM auth_sessions
  GROUP BY user_id
) sessions ON sessions.user_id = u.id
SET u.last_login_at = COALESCE(sessions.last_login_at, u.registered_at)
WHERE u.last_login_at IS NULL;
