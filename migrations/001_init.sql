-- ORCA Lead Engine - Initial Schema
-- Execute this in Supabase SQL Editor

-- Sources table: The 10 data sources (RSS + Tavily)
CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('rss', 'tavily', 'api')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  last_results_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leads table: Qualified leads from pipeline
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  source_url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  company_name TEXT, -- Architekturbüro / Bauherr
  project_type TEXT CHECK (project_type IN ('competition', 'tender', 'pre-tender')),
  project_category TEXT, -- hospital, school, stadium, etc.
  project_value_estimate NUMERIC(10, 2),
  location TEXT,
  score INTEGER CHECK (score >= 0 AND score <= 100) DEFAULT 0,
  score_reasoning TEXT,
  pass_1_data JSONB DEFAULT '{}'::jsonb,
  pass_2_data JSONB DEFAULT '{}'::jsonb,
  pass_3_data JSONB,
  enrichment JSONB,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pipeline runs table: Track execution history
CREATE TABLE IF NOT EXISTS pipeline_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  pass_1_results INTEGER DEFAULT 0,
  pass_2_results INTEGER DEFAULT 0,
  pass_3_results INTEGER DEFAULT 0,
  error_log JSONB,
  duration_seconds INTEGER
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_source_id ON leads(source_id);
CREATE INDEX IF NOT EXISTS idx_runs_started ON pipeline_runs(started_at DESC);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
