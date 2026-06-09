-- Migration 006: Sales-Felder für bessere Lead-Qualität
-- Ausführen in Supabase SQL Editor
-- Datum: 2026-06-08

-- Step 2: KI-Zusammenfassung (max 3 Sätze, Fakten, kein PDF-Roh-Text)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_summary TEXT;

-- Step 3: Erweiterte Sales-Felder

-- Kontaktperson (aus Deep Research, echter Mensch)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_role TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_source TEXT; -- URL der Quelle

-- Beteiligte aus Quelltext
-- Struktur: [{ role: "Architekt", name: "Firma XY", source: "text" }]
ALTER TABLE leads ADD COLUMN IF NOT EXISTS involved_parties JSONB DEFAULT '[]'::jsonb;

-- Geplante Fertigstellung (wenn im Text genannt)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS planned_completion DATE;

-- Relevante Links aus Quelltext (Bauherr-Website, Pressemitteilung, Vergabeplattform)
-- Struktur: [{ url: "...", title: "...", type: "backlink_in_pdf|bauherr_website|press_release" }]
ALTER TABLE leads ADD COLUMN IF NOT EXISTS relevant_links JSONB DEFAULT '[]'::jsonb;

-- Step 4: Deep Research Flag
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deep_research_done BOOLEAN DEFAULT FALSE;

-- Sales-Trigger (aus Deep Research: Warum jetzt kontaktieren?)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sales_trigger TEXT;

-- Indizes für häufige Queries
CREATE INDEX IF NOT EXISTS leads_deep_research_done_idx ON leads(deep_research_done);
CREATE INDEX IF NOT EXISTS leads_contact_person_idx ON leads(contact_person) WHERE contact_person IS NOT NULL;
