ALTER TABLE ai_usage_records
  ADD COLUMN latency_ms INT UNSIGNED NULL AFTER status,
  ADD COLUMN currency CHAR(3) NOT NULL DEFAULT 'CNY' AFTER total_tokens,
  CHANGE COLUMN input_price_per_million_usd input_price_per_million DECIMAL(12,6) NOT NULL DEFAULT 0,
  CHANGE COLUMN cached_input_price_per_million_usd cached_input_price_per_million DECIMAL(12,6) NOT NULL DEFAULT 0,
  CHANGE COLUMN output_price_per_million_usd output_price_per_million DECIMAL(12,6) NOT NULL DEFAULT 0,
  CHANGE COLUMN estimated_cost_usd estimated_cost DECIMAL(14,8) NOT NULL DEFAULT 0;

-- Earlier completed tasks did not retain provider usage metadata. Preserve an
-- explicit zero-valued row so they are distinguishable from missing records.
INSERT INTO ai_usage_records (task_id, attempt_number, provider, model_name, status, latency_ms, currency)
SELECT t.id, 1, 'deepseek', t.model_name, 'succeeded', NULL, 'CNY'
FROM diagnosis_tasks t
LEFT JOIN ai_usage_records u ON u.task_id = t.id AND u.attempt_number = 1
WHERE t.status = 'succeeded' AND u.id IS NULL;
