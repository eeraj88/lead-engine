-- Migration 012: Bookmark-Felder für Leads
-- Ausführen in Supabase SQL Editor nach 011_tavily_reduce_results.sql

ALTER TABLE leads ADD COLUMN IF NOT EXISTS bookmarked     BOOLEAN     DEFAULT FALSE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS bookmarked_at  TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS bookmark_note  TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_bookmarked
  ON leads(bookmarked) WHERE bookmarked = TRUE;

-- Bestehende "qualified" Status-Leads als bookmarked übernehmen
UPDATE leads SET bookmarked = TRUE, bookmarked_at = NOW()
WHERE status = 'qualified' AND (bookmarked IS NULL OR bookmarked = FALSE);
