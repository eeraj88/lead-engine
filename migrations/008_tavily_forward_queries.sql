-- Migration 008: Tavily Forward-Looking Queries
--
-- Rückblickende Queries (Gewinner, Preisträger, GU beauftragt) → deaktivieren oder ersetzen.
-- Neue vorwärts-gerichtete Queries: VgV-Planung, BIM/CDE, Projektsteuerung, Beschlüsse.
-- Negative Terme an alle aktiven Queries anhängen.
--
-- AUSFÜHREN: Supabase SQL Editor → Run

-- ─── 1. Rückblickende Queries deaktivieren ───────────────────────────────────

-- competitionline: Wettbewerb-Ergebnisse → jetzt laufende Wettbewerbe
UPDATE sources
SET config = '{"query": "site:competitionline.com (\"Realisierungswettbewerb\" OR \"Planungswettbewerb\" OR \"Auslobung\") -Preisträger -gewonnen", "max_results": 10}'::jsonb
WHERE name = 'competitionline';

-- wettbewerbe-aktuell: Ergebnisse → laufende Auslobungen
UPDATE sources
SET config = '{"query": "site:wettbewerbe-aktuell.de (\"Auslobung\" OR \"Teilnahme\" OR \"Wettbewerbsaufgabe\") -Preisträger -Preisgericht -Ergebnis", "max_results": 10}'::jsonb
WHERE name = 'wettbewerbe-aktuell.de';

-- BauNetz: Rankings + Wettbewerbsgewinne → aktuelle Projektmeldungen
UPDATE sources
SET config = '{"query": "site:baunetz.de (Neubau OR Wettbewerb OR Planung) Bauherr -Ranking -Preisträger -fertiggestellt -eröffnet", "max_results": 10}'::jsonb
WHERE name = 'BauNetz';

-- GU beauftragt → deaktivieren (rückblickend, nach CDE-Einführung zu spät)
UPDATE sources
SET enabled = false
WHERE name = 'GU beauftragt Suche';

-- Klinik-Neubauten: Negativterme für bereits laufende Vorhaben hinzufügen
UPDATE sources
SET config = '{"query": "Krankenhausneubau OR Klinikum Neubau Planung Bauherr 2025 2026 -fertiggestellt -eröffnet -GU beauftragt", "max_results": 10}'::jsonb
WHERE name = 'Klinik-Neubauten Tavily';

-- Industrie-Erweiterungen: aktuell halten
UPDATE sources
SET config = '{"query": "Industriehalle Erweiterung Neubau Bauherr Baugenehmigung 2025 2026 -fertiggestellt -Baustart erfolgt", "max_results": 10}'::jsonb
WHERE name = 'Industrie-Erweiterungen Tavily';

-- ─── 2. Neue vorwärts-gerichtete Quellen ─────────────────────────────────────

-- ON CONFLICT: update config + enabled wenn Source schon existiert (idempotent)
INSERT INTO sources (name, type, config, enabled, persona, priority, description) VALUES

-- VgV-Planungsausschreibungen (offen, nicht vergeben)
('VgV Planungswettbewerb', 'tavily',
 '{"query": "\"VgV\" OR \"Vergabe von Planungsleistungen\" Architekt Hochbau Ausschreibung 2025 2026 -Zuschlag -Preisträger -Ergebnis", "max_results": 10}'::jsonb,
 true, 'bauherr_public', 2,
 'VgV-Ausschreibungen für Architektur und Planungsleistungen — offene Verfahren'),

-- BIM/CDE Marktkundung und Ausschreibungen
('BIM CDE Ausschreibung', 'tavily',
 '{"query": "(\"BIM-Pflicht\" OR \"Common Data Environment\" OR \"CDE\" OR \"Projektraum\") Ausschreibung OR Vergabe Hochbau 2025 2026 -Referenz", "max_results": 10}'::jsonb,
 true, 'bauherr_public', 1,
 'BIM- und CDE-bezogene Vergaben und Marktkundungen — direkter NetzWerkPlan-Fit'),

-- Projektsteuerung AHO/DVP — neue Aufträge
('Projektsteuerung AHO DVP', 'tavily',
 '{"query": "(\"Projektsteuerung\" OR \"Projektsteuerer\") (AHO OR DVP) (Ausschreibung OR Vergabe OR beauftragt) Hochbau 2025 2026 -Referenz -abgeschlossen", "max_results": 10}'::jsonb,
 true, 'projektsteuerer', 1,
 'Neue Projektsteuerungsaufträge im Hochbau — AHO/DVP-Kontext'),

-- Stadtrat/Gemeinderat Baubeschlüsse (früheste Phase, hoher Hebel)
('Baubeschlüsse Kommunen', 'tavily',
 '{"query": "(Gemeinderat OR Stadtrat OR Stadtparlament) (Baubeschluss OR Planungsauftrag OR Machbarkeitsstudie) Millionen 2025 2026", "max_results": 10}'::jsonb,
 true, 'bauherr_public', 2,
 'Kommunale Baubeschlüsse und Planungsaufträge — früheste Signalphase'),

-- Sanierung/Umbau öffentlicher Gebäude
('Sanierung oeffentliche Gebaeude', 'tavily',
 '{"query": "(Schulsanierung OR Verwaltungsgebäude OR Rathaus) (Sanierung OR Umbau OR Generalsanierung) Ausschreibung Planung 2025 2026 -fertig -abgeschlossen", "max_results": 10}'::jsonb,
 true, 'bauherr_public', 2,
 'Sanierungsprojekte öffentlicher Gebäude — aktive Planungsphasen'),

-- Private Großinvestoren (Büro, Logistik, Mixed-Use)
('Private Grossinvestoren Neubau', 'tavily',
 '{"query": "(Büroturm OR Logistikzentrum OR Mixed-Use OR Quartiersentwicklung) (Baugenehmigung OR Planungsstart OR Investitionsentscheidung) 2025 2026 -fertiggestellt", "max_results": 10}'::jsonb,
 true, 'bauherr_private', 2,
 'Neubau-Vorhaben privater Investoren in früher Planungsphase')

ON CONFLICT (name) DO UPDATE SET
  config      = EXCLUDED.config,
  enabled     = EXCLUDED.enabled,
  persona     = EXCLUDED.persona,
  priority    = EXCLUDED.priority,
  description = EXCLUDED.description;

-- ─── 3. Negativterme-Kommentar für manuell angelegte Quellen ─────────────────
-- eVergabe NRW und Vergabe Hessen bleiben unverändert (strukturierte Vergabequellen)
-- Goldbeck Projekte und DVP Projektsteuerer bleiben (können Signale liefern)
-- Drees Sommer Projekte bleibt (wenn vorhanden)
