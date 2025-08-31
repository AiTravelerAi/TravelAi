-- SQL schema for signals, drops, audit logs
-- Example table
CREATE TABLE IF NOT EXISTS signals (
  id SERIAL PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
