-- ORCA Lead Engine v2 - Sales-Hebel, Personas, Scoring and Lookup fields
-- Execute this in Supabase SQL Editor AFTER 003_rls_policies.sql

ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_class TEXT
  CHECK (lead_class IN ('hot', 'warm', 'cold', 'not'));

ALTER TABLE leads ADD COLUMN IF NOT EXISTS persona TEXT
  CHECK (persona IN (
    'bauherr_public',
    'bauherr_private',
    'gu',
    'projektsteuerer',
    'planer',
    'unknown'
  ));

ALTER TABLE leads ADD COLUMN IF NOT EXISTS hebel_type TEXT
  CHECK (hebel_type IN ('direct', 'opener', 'indirect'));

ALTER TABLE leads ADD COLUMN IF NOT EXISTS hebel_multiplier NUMERIC DEFAULT 1.0;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS project_phase TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS project_date DATE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sales_trigger TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sales_strategy TEXT;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS bauherr_name TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS bauherr_type TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS architekt_name TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS gu_name TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ps_name TEXT;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS score_breakdown JSONB;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS basis_score INTEGER
  CHECK (basis_score IS NULL OR (basis_score >= 0 AND basis_score <= 100));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS final_score INTEGER
  CHECK (final_score IS NULL OR (final_score >= 0 AND final_score <= 100));

ALTER TABLE leads ADD COLUMN IF NOT EXISTS data_quality TEXT
  CHECK (data_quality IN ('verified', 'inferred', 'mock', 'missing'));

ALTER TABLE leads ADD COLUMN IF NOT EXISTS killer_arguments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS best_timing TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS decision_makers JSONB DEFAULT '[]'::jsonb;

-- If this lead was created from an OPENER lead via Bauherrn-Lookup.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS opener_lead_id UUID
  REFERENCES leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_class ON leads(lead_class);
CREATE INDEX IF NOT EXISTS idx_leads_hebel ON leads(hebel_type);
CREATE INDEX IF NOT EXISTS idx_leads_persona ON leads(persona);
CREATE INDEX IF NOT EXISTS idx_leads_final_score ON leads(final_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_opener_lead_id ON leads(opener_lead_id);
