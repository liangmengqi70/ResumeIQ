-- ResumeIQ MVP schema
-- Target: MySQL 8.0.16+
-- This script only creates the new tables. It does not delete legacy tables or data.

SET NAMES utf8mb4;
USE resumeiq;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'User ID',
  phone VARCHAR(20) NOT NULL COMMENT 'E.164-style phone number, e.g. +8613800000000',
  nickname VARCHAR(20) NOT NULL COMMENT 'Display nickname',
  avatar_url VARCHAR(500) NULL COMMENT 'Custom avatar URL; NULL means default avatar',
  registered_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_login_at DATETIME(3) NULL COMMENT 'Latest successful login timestamp',
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL COMMENT 'Soft-delete timestamp',
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_phone (phone),
  KEY idx_users_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Registered users';

CREATE TABLE IF NOT EXISTS guest_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  token_hash CHAR(64) NOT NULL COMMENT 'SHA-256 hash of the random token stored in an HttpOnly cookie',
  bound_user_id BIGINT UNSIGNED NULL COMMENT 'User bound after login',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_active_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  draft_expires_at DATETIME(3) NOT NULL COMMENT 'Rolling 24-hour draft expiry based on last activity',
  bound_at DATETIME(3) NULL,
  invalidated_at DATETIME(3) NULL COMMENT 'Set after account binding or explicit invalidation',
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_guest_sessions_token_hash (token_hash),
  KEY idx_guest_sessions_draft_expiry (draft_expires_at, invalidated_at, deleted_at),
  KEY idx_guest_sessions_bound_user (bound_user_id),
  CONSTRAINT fk_guest_sessions_user
    FOREIGN KEY (bound_user_id) REFERENCES users (id)
    ON UPDATE RESTRICT ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Anonymous browser sessions; drafts expire 24 hours after last activity';

CREATE TABLE IF NOT EXISTS resume_files (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  guest_session_id BIGINT UNSIGNED NULL,
  original_filename VARCHAR(255) NOT NULL,
  storage_key VARCHAR(500) NOT NULL COMMENT 'Private storage path/key, not a public URL',
  file_extension VARCHAR(10) NOT NULL,
  mime_type VARCHAR(100) NULL,
  size_bytes BIGINT UNSIGNED NOT NULL,
  page_count SMALLINT UNSIGNED NULL,
  extracted_text LONGTEXT NULL,
  parse_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  parse_error_code VARCHAR(50) NULL,
  parse_error_message VARCHAR(500) NULL,
  uploaded_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at DATETIME(3) NULL COMMENT 'Set for unbound guest data; NULL for retained user data',
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_resume_files_user_history (user_id, uploaded_at DESC),
  KEY idx_resume_files_guest (guest_session_id),
  KEY idx_resume_files_expiry (expires_at, deleted_at),
  CONSTRAINT fk_resume_files_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_resume_files_guest
    FOREIGN KEY (guest_session_id) REFERENCES guest_sessions (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT chk_resume_files_owner
    CHECK (user_id IS NOT NULL OR guest_session_id IS NOT NULL),
  CONSTRAINT chk_resume_files_format
    CHECK (file_extension IN ('pdf', 'doc', 'docx')),
  CONSTRAINT chk_resume_files_size
    CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  CONSTRAINT chk_resume_files_pages
    CHECK (page_count IS NULL OR (page_count BETWEEN 1 AND 5)),
  CONSTRAINT chk_resume_files_parse_status
    CHECK (parse_status IN ('pending', 'processing', 'succeeded', 'failed'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Uploaded resume files and extracted text';

CREATE TABLE IF NOT EXISTS job_descriptions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  guest_session_id BIGINT UNSIGNED NULL,
  job_title VARCHAR(100) NULL COMMENT 'User-entered or inferred target job title',
  raw_text TEXT NOT NULL,
  normalized_text TEXT NOT NULL,
  character_count SMALLINT UNSIGNED NOT NULL,
  is_sample BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Whether the diagnosis uses the built-in sample JD',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at DATETIME(3) NULL,
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_job_descriptions_user (user_id, created_at DESC),
  KEY idx_job_descriptions_guest (guest_session_id),
  KEY idx_job_descriptions_expiry (expires_at, deleted_at),
  CONSTRAINT fk_job_descriptions_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_job_descriptions_guest
    FOREIGN KEY (guest_session_id) REFERENCES guest_sessions (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT chk_job_descriptions_owner
    CHECK (user_id IS NOT NULL OR guest_session_id IS NOT NULL),
  CONSTRAINT chk_job_descriptions_length
    CHECK (character_count BETWEEN 100 AND 5000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Target job descriptions';

CREATE TABLE IF NOT EXISTS background_surveys (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  guest_session_id BIGINT UNSIGNED NULL,
  current_identity VARCHAR(50) NOT NULL,
  application_status VARCHAR(50) NOT NULL,
  difficulties JSON NOT NULL COMMENT 'Array of selected job-search difficulties',
  additional_notes TEXT NULL,
  submitted_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at DATETIME(3) NULL,
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_background_surveys_user (user_id, submitted_at DESC),
  KEY idx_background_surveys_guest (guest_session_id),
  KEY idx_background_surveys_expiry (expires_at, deleted_at),
  CONSTRAINT fk_background_surveys_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_background_surveys_guest
    FOREIGN KEY (guest_session_id) REFERENCES guest_sessions (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT chk_background_surveys_owner
    CHECK (user_id IS NOT NULL OR guest_session_id IS NOT NULL),
  CONSTRAINT chk_background_surveys_difficulties
    CHECK (JSON_TYPE(difficulties) = 'ARRAY')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Survey snapshot for one diagnosis input set';

CREATE TABLE IF NOT EXISTS diagnosis_tasks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  guest_session_id BIGINT UNSIGNED NULL,
  resume_file_id BIGINT UNSIGNED NOT NULL,
  job_description_id BIGINT UNSIGNED NOT NULL,
  background_survey_id BIGINT UNSIGNED NOT NULL,
  idempotency_key CHAR(36) NOT NULL COMMENT 'Prevents duplicate model calls',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  model_name VARCHAR(100) NOT NULL,
  prompt_version VARCHAR(50) NOT NULL,
  retry_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
  error_code VARCHAR(50) NULL,
  error_message VARCHAR(1000) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  completed_at DATETIME(3) NULL,
  expires_at DATETIME(3) NULL COMMENT 'Set for unbound guest tasks',
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_diagnosis_tasks_idempotency (idempotency_key),
  KEY idx_diagnosis_tasks_user_history (user_id, status, completed_at DESC),
  KEY idx_diagnosis_tasks_guest (guest_session_id),
  KEY idx_diagnosis_tasks_expiry (expires_at, deleted_at),
  KEY idx_diagnosis_tasks_resume (resume_file_id),
  KEY idx_diagnosis_tasks_jd (job_description_id),
  KEY idx_diagnosis_tasks_survey (background_survey_id),
  CONSTRAINT fk_diagnosis_tasks_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_diagnosis_tasks_guest
    FOREIGN KEY (guest_session_id) REFERENCES guest_sessions (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_diagnosis_tasks_resume
    FOREIGN KEY (resume_file_id) REFERENCES resume_files (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_diagnosis_tasks_jd
    FOREIGN KEY (job_description_id) REFERENCES job_descriptions (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_diagnosis_tasks_survey
    FOREIGN KEY (background_survey_id) REFERENCES background_surveys (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT chk_diagnosis_tasks_owner
    CHECK (user_id IS NOT NULL OR guest_session_id IS NOT NULL),
  CONSTRAINT chk_diagnosis_tasks_status
    CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'expired'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Asynchronous AI diagnosis tasks';

CREATE TABLE IF NOT EXISTS ai_usage_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  task_id BIGINT UNSIGNED NOT NULL,
  attempt_number TINYINT UNSIGNED NOT NULL COMMENT '1 for initial call, 2+ for retries',
  provider VARCHAR(50) NOT NULL COMMENT 'AI API provider, e.g. openai',
  model_name VARCHAR(100) NOT NULL,
  provider_request_id VARCHAR(255) NULL,
  status VARCHAR(20) NOT NULL COMMENT 'succeeded or failed',
  latency_ms INT UNSIGNED NULL,
  input_tokens INT UNSIGNED NOT NULL DEFAULT 0,
  cached_input_tokens INT UNSIGNED NOT NULL DEFAULT 0,
  output_tokens INT UNSIGNED NOT NULL DEFAULT 0,
  reasoning_tokens INT UNSIGNED NOT NULL DEFAULT 0,
  total_tokens INT UNSIGNED NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'CNY',
  input_price_per_million DECIMAL(12,6) NOT NULL DEFAULT 0,
  cached_input_price_per_million DECIMAL(12,6) NOT NULL DEFAULT 0,
  output_price_per_million DECIMAL(12,6) NOT NULL DEFAULT 0,
  estimated_cost DECIMAL(14,8) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_ai_usage_task_attempt (task_id, attempt_number),
  UNIQUE KEY uk_ai_usage_provider_request (provider, provider_request_id),
  KEY idx_ai_usage_model_created (provider, model_name, created_at),
  CONSTRAINT fk_ai_usage_task
    FOREIGN KEY (task_id) REFERENCES diagnosis_tasks (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT chk_ai_usage_status
    CHECK (status IN ('succeeded', 'failed'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Per-request AI token usage and price snapshot, including retries';

CREATE TABLE IF NOT EXISTS diagnosis_reports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  task_id BIGINT UNSIGNED NOT NULL,
  conclusion VARCHAR(20) NOT NULL COMMENT 'recommended, concerned, or not_recommended',
  conclusion_summary TEXT NOT NULL,
  issues JSON NOT NULL COMMENT 'Ordered list of evidence-backed issue objects',
  strengths JSON NOT NULL COMMENT 'List of evidence-backed strength objects',
  raw_model_output JSON NULL COMMENT 'Validated raw JSON retained for troubleshooting',
  generated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  first_viewed_at DATETIME(3) NULL COMMENT 'First authenticated full-report view',
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_diagnosis_reports_task (task_id),
  KEY idx_diagnosis_reports_conclusion (conclusion),
  KEY idx_diagnosis_reports_first_viewed (first_viewed_at),
  CONSTRAINT fk_diagnosis_reports_task
    FOREIGN KEY (task_id) REFERENCES diagnosis_tasks (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT chk_diagnosis_reports_conclusion
    CHECK (conclusion IN ('recommended', 'concerned', 'not_recommended')),
  CONSTRAINT chk_diagnosis_reports_issues
    CHECK (JSON_TYPE(issues) = 'ARRAY'),
  CONSTRAINT chk_diagnosis_reports_strengths
    CHECK (JSON_TYPE(strengths) = 'ARRAY')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Rendered diagnosis report data; contains no numeric score';

CREATE TABLE IF NOT EXISTS free_usage_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  report_id BIGINT UNSIGNED NOT NULL,
  consumed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_free_usage_user (user_id),
  UNIQUE KEY uk_free_usage_report (report_id),
  CONSTRAINT fk_free_usage_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_free_usage_report
    FOREIGN KEY (report_id) REFERENCES diagnosis_reports (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='One-time free entitlement consumed on first authenticated report view';
