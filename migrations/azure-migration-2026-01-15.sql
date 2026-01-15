-- =====================================================
-- ACCLAIM PORTAL - DATABASE MIGRATION SQL FOR AZURE
-- Date: 2026-01-15
-- Run these commands on your Azure PostgreSQL database
-- =====================================================

-- 1. NEW TABLE: muted_cases (allows users to mute notifications for specific cases)
CREATE TABLE IF NOT EXISTS muted_cases (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_muted_cases_user_id ON muted_cases(user_id);
CREATE INDEX IF NOT EXISTS idx_muted_cases_case_id ON muted_cases(case_id);

-- 2. ORGANISATIONS TABLE: Add scheduled reports enabled column
ALTER TABLE organisations 
ADD COLUMN IF NOT EXISTS scheduled_reports_enabled BOOLEAN NOT NULL DEFAULT true;

-- 3. USER_ORGANISATIONS TABLE: Add role column for owner functionality
ALTER TABLE user_organisations 
ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'member';

-- 4. USERS TABLE: Add document notifications preference
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS document_notifications BOOLEAN DEFAULT true;

-- 5. SCHEDULED_REPORTS TABLE: Add new columns for multi-report and custom recipient support
ALTER TABLE scheduled_reports 
ADD COLUMN IF NOT EXISTS organisation_id INTEGER REFERENCES organisations(id) ON DELETE CASCADE;

ALTER TABLE scheduled_reports 
ADD COLUMN IF NOT EXISTS recipient_email VARCHAR(255);

ALTER TABLE scheduled_reports 
ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_org_id ON scheduled_reports(organisation_id);

-- 6. NEW TABLE: case_access_restrictions (admins can restrict users from specific cases)
CREATE TABLE IF NOT EXISTS case_access_restrictions (
    id SERIAL PRIMARY KEY,
    case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    blocked_user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_by VARCHAR(255) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_case_access_restrictions_case_id ON case_access_restrictions(case_id);
CREATE INDEX IF NOT EXISTS idx_case_access_restrictions_user_id ON case_access_restrictions(blocked_user_id);
