-- ORCA Lead Engine v2 - Source Persona & Priority
-- Adds persona and priority metadata to sources table
-- Execute in Supabase SQL Editor AFTER 004_lead_engine_v2.sql

ALTER TABLE sources
  ADD COLUMN IF NOT EXISTS persona TEXT CHECK (
    persona IN ('bauherr_public', 'bauherr_private', 'gu', 'projektsteuerer', 'planer', 'mixed')
  ) DEFAULT 'mixed',
  ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 2 CHECK (priority IN (1, 2, 3)),
  ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN sources.persona IS 'Target persona this source is most likely to surface leads for';
COMMENT ON COLUMN sources.priority IS '1=hoch (taeglich), 2=mittel (woechentlich), 3=niedrig (monatlich)';

-- Backfill existing sources with persona/priority
UPDATE sources SET persona = 'bauherr_public', priority = 1 WHERE name = 'service.bund.de';
UPDATE sources SET persona = 'bauherr_public', priority = 1 WHERE name = 'TED EU';
UPDATE sources SET persona = 'bauherr_public', priority = 1 WHERE name = 'oeffentlichevergabe.de';
UPDATE sources SET persona = 'bauherr_public', priority = 1 WHERE name = 'DB Bieterportal';
UPDATE sources SET persona = 'bauherr_public', priority = 2 WHERE name = 'Autobahn GmbH';
UPDATE sources SET persona = 'planer',         priority = 1 WHERE name = 'competitionline';
UPDATE sources SET persona = 'planer',         priority = 1 WHERE name = 'wettbewerbe-aktuell.de';
UPDATE sources SET persona = 'planer',         priority = 2 WHERE name = 'BauNetz';
UPDATE sources SET persona = 'bauherr_public', priority = 2 WHERE name = 'eVergabe NRW';
UPDATE sources SET persona = 'bauherr_public', priority = 2 WHERE name = 'Vergabe Hessen';

-- New sources per Phase D buckets
INSERT INTO sources (name, type, config, enabled, persona, priority, description) VALUES

-- Bauherrn privat
('Klinik-Neubauten Tavily', 'tavily',
 '{"query": "Krankenhausneubau OR Klinikum Neubau Bauherr Generalunternehmer 2024 2025", "max_results": 10}'::jsonb,
 true, 'bauherr_private', 1, 'Privat-Bauherren im Klinik-Segment'),

('Industrie-Erweiterungen Tavily', 'tavily',
 '{"query": "Industriehalle Erweiterung Neubau Bauherr Baugenehmigung 2024 2025", "max_results": 10}'::jsonb,
 true, 'bauherr_private', 2, 'Industriebau-Projekte privater Bauherren'),

('Wohnungsbau Grossprojekte Tavily', 'tavily',
 '{"query": "Wohnungsbau Grossprojekt Bautraeger Neubau 100 Einheiten 2024 2025", "max_results": 10}'::jsonb,
 true, 'bauherr_private', 2, 'Grosser Wohnungsbau privater Traeger'),

-- GU-Bucket
('Goldbeck Projekte', 'tavily',
 '{"query": "site:goldbeck.de (Projekt OR Referenz OR Neubau) 2024 2025", "max_results": 8}'::jsonb,
 true, 'gu', 2, 'Goldbeck als GU identifizieren'),

('GU beauftragt Suche', 'tavily',
 '{"query": "(Zueblin OR Strabag OR Hochtief OR Goldbeck) \"beauftragt\" OR \"erhielt Auftrag\" Neubau 2024 2025", "max_results": 10}'::jsonb,
 true, 'gu', 1, 'Generelle GU-Beauftragungen'),

-- Projektsteuerer-Bucket
('DVP Projektsteuerer', 'tavily',
 '{"query": "site:dvp-projektmanagement.de Projektsteuerung Auftrag Bauherr 2024 2025", "max_results": 8}'::jsonb,
 true, 'projektsteuerer', 2, 'DVP als Projektsteuerer identifizieren'),

('Drees Sommer Projekte', 'tavily',
 '{"query": "site:dreso.com OR \"Drees & Sommer\" Projektsteuerung Bauherr 2024 2025", "max_results": 8}'::jsonb,
 true, 'projektsteuerer', 2, 'Drees & Sommer als Projektsteuerer'),

('VgV Projektsteuerung Tavily', 'tavily',
 '{"query": "VgV Projektsteuerung Ausschreibung Leistungsbild 2024 2025", "max_results": 10}'::jsonb,
 true, 'projektsteuerer', 1, 'VgV-Vergaben fuer Projektsteuerungsleistungen'),

-- Architekten/Tueroefffner (schon teilweise vorhanden, ergaenzen)
('Architektenkammer Wettbewerbe', 'tavily',
 '{"query": "Architektenkammer Wettbewerb Ergebnis Preistraeger 2024 2025", "max_results": 10}'::jsonb,
 true, 'planer', 1, 'Architektenkammer-Wettbewerbsergebnisse als Tueroefffner')

ON CONFLICT (name) DO NOTHING;
