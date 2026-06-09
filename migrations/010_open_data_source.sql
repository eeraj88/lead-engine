-- Migration 010: Bekanntmachungsservice Open-Data Source
-- Execute in Supabase SQL Editor after 009_sector_expansion.sql
-- Adds the German federal procurement open-data source (oeffentlichevergabe.de ZIP exports)

INSERT INTO sources (name, type, config, enabled, persona, priority, description)
VALUES (
  'Bekanntmachungsservice Vergabe',
  'api',
  '{"format": "csv", "url": "https://oeffentlichevergabe.de/api/notice-exports"}'::jsonb,
  true,
  'bauherr_public',
  1,
  'Zentrales Bekanntmachungsservice öffentliche Vergabe — CSV-Tagesexport (DE, AT, CH)'
)
ON CONFLICT (name) DO NOTHING;
