-- Migration 009: Sektor-Erweiterung Tavily Quellen
--
-- Neue Tavily-Buckets für bisher nicht abgedeckte Bausektoren.
-- Ziel: lückenlose Abdeckung aller Bauvorhaben mit Lead-Potenzial.
--
-- AUSFÜHREN: Supabase SQL Editor → Run

INSERT INTO sources (name, type, config, enabled, persona, priority, description) VALUES

-- ── Bildung & Schulen ─────────────────────────────────────────────────────────
('Schulneubau Bildungsbauten', 'tavily',
 '{"query": "(Schulneubau OR Schulcampus OR Kita-Neubau OR Grundschule Neubau OR Bildungszentrum) (Bauherr OR Baugenehmigung OR Planungsauftrag OR Ausschreibung) 2025 2026 -fertiggestellt -eröffnet", "max_results": 10}'::jsonb,
 true, 'bauherr_public', 2,
 'Schulneubauten und Bildungseinrichtungen — Neubau und Erweiterung'),

('Hochschule Universitaet Neubau', 'tavily',
 '{"query": "(Universität OR Hochschule OR Campus) (Neubau OR Erweiterung OR Sanierung) Bauherr Millionen 2025 2026 -fertiggestellt -Jubiläum", "max_results": 10}'::jsonb,
 true, 'bauherr_public', 2,
 'Hochschul- und Universitätsbauten — Neubau und Campuserweiterungen'),

-- ── Kultur ────────────────────────────────────────────────────────────────────
('Kulturbauten Neubau', 'tavily',
 '{"query": "(Museum OR Theater OR Konzerthaus OR Philharmonie OR Bibliothek OR Kulturzentrum) (Neubau OR Erweiterung OR Sanierung) (Bauherr OR Ausschreibung OR Planungsauftrag) 2025 2026 -fertiggestellt -eröffnet", "max_results": 10}'::jsonb,
 true, 'bauherr_public', 2,
 'Kulturbauvorhaben: Museum, Theater, Konzerthaus, Bibliothek'),

-- ── Sport & Stadion ───────────────────────────────────────────────────────────
('Sport Stadion Freizeitbau', 'tavily',
 '{"query": "(Stadion OR Arena OR Sportzentrum OR Hallenbad OR Schwimmbad OR Sporthalle OR Fußballstadion OR Multifunktionsarena) (Neubau OR Sanierung OR Erweiterung) (Bauherr OR Baugenehmigung OR Ausschreibung OR Planungsstart) 2025 2026 -fertiggestellt -eröffnet", "max_results": 10}'::jsonb,
 true, 'bauherr_public', 2,
 'Stadion- und Sportanlagen-Neubauten, Hallenbäder, Multifunktionsarenen'),

-- ── Pflege & Soziales ─────────────────────────────────────────────────────────
('Pflege Seniorenresidenz Neubau', 'tavily',
 '{"query": "(Pflegeheim OR Seniorenresidenz OR Seniorenzentrum OR Pflegezentrum OR betreutes Wohnen) (Neubau OR Erweiterung) (Bauherr OR Baugenehmigung OR Ausschreibung) 2025 2026 -fertiggestellt -eröffnet", "max_results": 10}'::jsonb,
 true, 'bauherr_private', 2,
 'Pflegeheime und Seniorenresidenzen — Neubauvorhaben'),

-- ── Rechenzentren ─────────────────────────────────────────────────────────────
('Rechenzentrum Data Center Bau', 'tavily',
 '{"query": "(Rechenzentrum OR Data Center OR Hyperscaler OR Colocation) (Neubau OR Erweiterung OR Campus) (Bauherr OR Baugenehmigung OR Investition OR Ausschreibung) Deutschland 2025 2026 -fertiggestellt", "max_results": 10}'::jsonb,
 true, 'bauherr_private', 1,
 'Rechenzentrums-Neubauten und Erweiterungen — stark wachsender Sektor'),

-- ── Hotel & Tourismus ─────────────────────────────────────────────────────────
('Hotel Tourismus Neubau', 'tavily',
 '{"query": "(Hotel OR Resort OR Boarding House OR Serviced Apartments) (Neubau OR Erweiterung) (Bauherr OR Baugenehmigung OR Baustart OR Investitionsentscheidung) Deutschland 2025 2026 -fertiggestellt -eröffnet", "max_results": 10}'::jsonb,
 true, 'bauherr_private', 3,
 'Hotel- und Tourismusbau-Neuvorhaben'),

-- ── Justiz & Sicherheitsbehörden ──────────────────────────────────────────────
('Justiz Behoerden Sicherheit Bau', 'tavily',
 '{"query": "(Polizeipräsidium OR Feuerwache OR Justizzentrum OR Gericht OR Gefängnis OR Justizvollzug OR Behördenzentrum) (Neubau OR Erweiterung OR Sanierung) (Bauherr OR Ausschreibung OR Baugenehmigung) 2025 2026 -fertiggestellt", "max_results": 10}'::jsonb,
 true, 'bauherr_public', 2,
 'Justiz- und Sicherheitsbehörden-Neubauten: Polizei, Feuerwehr, Gerichte')

ON CONFLICT (name) DO UPDATE SET
  config      = EXCLUDED.config,
  enabled     = EXCLUDED.enabled,
  persona     = EXCLUDED.persona,
  priority    = EXCLUDED.priority,
  description = EXCLUDED.description;
