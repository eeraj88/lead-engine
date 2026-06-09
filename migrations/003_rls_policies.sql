-- ORCA Lead Engine - RLS Policies
-- Execute this in Supabase SQL Editor to fix access issues

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON leads;
DROP POLICY IF EXISTS "Enable read access for all users" ON sources;
DROP POLICY IF EXISTS "Enable read access for all users" ON pipeline_runs;

-- Create policies for leads (public read, service insert)
CREATE POLICY "Enable read access for all users" ON leads
  FOR SELECT
  USING (true);

CREATE POLICY "Enable insert for service role" ON leads
  FOR INSERT
  WITH CHECK (true);

-- Create policies for sources (public read)
CREATE POLICY "Enable read access for all users" ON sources
  FOR SELECT
  USING (true);

-- Create policies for pipeline_runs (public read, service insert)
CREATE POLICY "Enable read access for all users" ON pipeline_runs
  FOR SELECT
  USING (true);

CREATE POLICY "Enable insert for service role" ON pipeline_runs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Enable update for service role" ON pipeline_runs
  FOR UPDATE
  WITH CHECK (true);

CREATE POLICY "Enable update for service role" ON sources
  FOR UPDATE
  WITH CHECK (true);
