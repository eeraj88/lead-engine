-- Migration 007: Structured procurement source fields
-- Execute in Supabase SQL Editor after 006_sales_fields.sql.
-- Additive only: existing lead rows remain valid.

ALTER TABLE leads ADD COLUMN IF NOT EXISTS deadline TIMESTAMP WITH TIME ZONE;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS notice_type TEXT
  CHECK (notice_type IS NULL OR notice_type IN (
    'prior_information',
    'market_exploration',
    'competition',
    'contract_notice',
    'award',
    'result',
    'unknown'
  ));

ALTER TABLE leads ADD COLUMN IF NOT EXISTS procedure_type TEXT;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS procurement_stage TEXT
  CHECK (procurement_stage IS NULL OR procurement_stage IN (
    'prior_information',
    'market_exploration',
    'competition',
    'tender',
    'planning_procurement',
    'award',
    'execution',
    'unknown'
  ));

ALTER TABLE leads ADD COLUMN IF NOT EXISTS sales_window TEXT
  CHECK (sales_window IS NULL OR sales_window IN ('open', 'closing_soon', 'too_late', 'unknown'));

ALTER TABLE leads ADD COLUMN IF NOT EXISTS cpv_codes JSONB;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS buyer_name TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS buyer_city TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS estimated_value NUMERIC(16, 2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS documents_url TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS external_notice_id TEXT;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS source_kind TEXT
  CHECK (source_kind IS NULL OR source_kind IN ('procurement_open_data', 'ted', 'tavily', 'rss', 'firecrawl'));

ALTER TABLE leads ADD COLUMN IF NOT EXISTS raw_notice JSONB;

CREATE INDEX IF NOT EXISTS idx_leads_deadline ON leads(deadline);
CREATE INDEX IF NOT EXISTS idx_leads_sales_window ON leads(sales_window);
CREATE INDEX IF NOT EXISTS idx_leads_external_notice_id ON leads(external_notice_id);
CREATE INDEX IF NOT EXISTS idx_leads_source_kind ON leads(source_kind);
CREATE INDEX IF NOT EXISTS idx_leads_cpv_codes ON leads USING GIN (cpv_codes);
