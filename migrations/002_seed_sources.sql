-- ORCA Lead Engine - Seed Sources
-- Execute this in Supabase SQL Editor AFTER 001_init.sql

-- Clear existing sources (optional, for re-running)
-- TRUNCATE sources RESTART IDENTITY CASCADE;

INSERT INTO sources (name, type, config, enabled) VALUES
-- GROUP A: RSS Feeds (5 sources)
('service.bund.de', 'rss',
 '{"url": "https://www.service.bund.de/Content/DE/Ausschreibungen/Ausschreibungen.rss"}'::jsonb,
 true),

('TED EU', 'rss',
 '{"url": "https://ted.europa.eu/TED/rss/notices/L_RU.xml"}'::jsonb,
 true),

('oeffentlichevergabe.de', 'rss',
 '{"url": "https://www.oeffentlichevergabe.de/data/notice/rss"}'::jsonb,
 true),

('DB Bieterportal', 'rss',
 '{"url": "https://bieterportal.deutschebahn.com/published/rss/rss_de.xml", "fallback": "tavily"}'::jsonb,
 true),

('Autobahn GmbH', 'rss',
 '{"url": "https://www.autobahn.de/portal/rss/bekanntmachungen", "fallback": "tavily"}'::jsonb,
 true),

-- GROUP B: Tavily Web Search (5 sources)
('competitionline', 'tavily',
 '{"query": "site:competitionline.com (\"Wettbewerb gewonnen\" OR \"Preisträger\" OR \"1. Preis\")", "max_results": 10}'::jsonb,
 true),

('wettbewerbe-aktuell.de', 'tavily',
 '{"query": "site:wettbewerbe-aktuell.de (\"Ergebnis\" OR \"Preisträger\" OR \"Wettbewerbsentscheid\")", "max_results": 10}'::jsonb,
 true),

('BauNetz', 'tavily',
 '{"query": "site:baunetz.de (\"Architektenranking\" OR \"Wettbewerbsgewinn\")", "max_results": 10}'::jsonb,
 true),

('eVergabe NRW', 'tavily',
 '{"query": "site:evergabe.nrw.de (\"Bekanntmachung\" OR \"Vergabe\")", "max_results": 10}'::jsonb,
 true),

('Vergabe Hessen', 'tavily',
 '{"query": "site:vergabe.hessen.de (\"Ausschreibung\" OR \"Auftrag\")", "max_results": 10}'::jsonb,
 true)

ON CONFLICT (name) DO NOTHING;
