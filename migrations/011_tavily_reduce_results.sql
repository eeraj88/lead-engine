-- Migration 011: Reduziere Tavily max_results von 10 auf 3
-- Grund: Tavily-Monatslimit bei 80% — Demo-Runs sparen
-- Ausführen in Supabase SQL Editor

UPDATE sources
SET config = jsonb_set(config, '{max_results}', '3')
WHERE type = 'tavily'
  AND (config->>'max_results')::int > 3;
