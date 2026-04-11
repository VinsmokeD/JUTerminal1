-- CyberSim database initialisation
-- SQLAlchemy creates tables via ORM — this file handles extensions and functions

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper: update updated_at automatically (for future tables that need it)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Phase 17: Add role column to users for existing databases.
-- For fresh installs SQLAlchemy create_all handles this automatically.
-- For existing dev databases, run this manually if needed:
--   ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'student';
--
-- Default instructor account is seeded programmatically in main.py lifespan:
--   username: admin
--   password: CyberSimAdmin!
--   role: instructor

-- Performance indexes for faster queries under load (PROMPT 5 optimization)
-- These prevent full table scans on session/user/scenario lookups
CREATE INDEX IF NOT EXISTS idx_command_log_session ON command_log(session_id);
CREATE INDEX IF NOT EXISTS idx_command_log_user ON command_log(user_id);
CREATE INDEX IF NOT EXISTS idx_command_log_created ON command_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_siem_events_session ON siem_events(session_id);
CREATE INDEX IF NOT EXISTS idx_siem_events_scenario ON siem_events(scenario_id);
CREATE INDEX IF NOT EXISTS idx_siem_events_created ON siem_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_scenario ON sessions(scenario_id);
