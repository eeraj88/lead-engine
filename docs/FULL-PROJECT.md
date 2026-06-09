# NetzWerkPlan Lead Engine - Full Project Overview

> Stand: 09.06.2026
>
> Zweck dieser Datei: ein belastbarer Gesamtüberblick über das Projekt, die eingebundenen Bausteine, den aktuellen Implementierungsstand und die noch offenen Punkte.  
> Diese Übersicht basiert auf `README.md`, `docs/TASKS.md`, `docs/SMOKE-TEST.md`, den vorhandenen Migrations, Tests und der aktuellen Ordnerstruktur.

## 1. Projektziel

NetzWerkPlan Lead Engine ist eine autonome Lead-Generation-Pipeline für den B2B-Vertrieb in der Baubranche. Das System sammelt Quellen, bewertet Projekte mit einem mehrstufigen KI- und Regelwerk, reichert hochwertige Leads mit Web-Recherche an und stellt die Ergebnisse in einer Next.js-Oberfläche dar.

Die fachliche Kette ist aktuell:

`Scan -> Match -> Connect`

- `Scan`: Quellen und Bekanntmachungen einsammeln
- `Match`: Leads bewerten, filtern und klassifizieren
- `Connect`: HOT-Leads mit Deep Research anreichern

## 2. Tech Stack und Einbindungen

### Frontend und App

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Framer Motion
- Lucide Icons

### Backend und Daten

- Supabase Postgres
- `@supabase/supabase-js`
- `@supabase/ssr`
- SQL-Migrationen im Ordner `migrations/`

### KI und Recherche

- OpenRouter als LLM-Gateway
- Tavily für Websuche und Extraktion
- Firecrawl als Content-Fallback
- OpenAI SDK im Projekt vorhanden

### Quellen und Parsing

- RSS-Feeds mit `rss-parser`
- TED-/Vergabe-Quellen
- Open-Data-Adapter für Ausschreibungsdaten
- ZIP-Extraktion mit `fflate`

### Tests und Quality Gates

- Vitest
- Playwright
- Schema-Check-Skript für Supabase

## 3. Projektstruktur

### App-Routen

- `app/page.tsx` - Dashboard
- `app/leads/page.tsx` - Lead-Liste mit Filtern und Pagination
- `app/leads/[id]/page.tsx` - Lead-Detailansicht
- `app/sources/page.tsx` - Quellenübersicht
- `app/runs/page.tsx` - Pipeline-Runs
- `app/api/pipeline/run/route.ts` - SSE-Pipeline-Endpoint
- `app/api/leads/export/route.ts` - Export
- `app/api/leads/[id]/status/route.ts` - Statusänderung
- `app/api/bauherrn-lookup/[leadId]/route.ts` - Bauherrn-Lookup

### Komponenten

- `components/DashboardClient.tsx`
- `components/PipelineStream.tsx`
- `components/LeadCard.tsx`
- `components/LeadFilters.tsx`
- `components/PassCard.tsx`
- `components/BookmarkButton.tsx`
- `components/BauherrnLookupButton.tsx`
- `components/SourcesPanel.tsx`
- `components/Sidebar.tsx`
- `components/pass-card-scroll.ts`
- `components/ui/*`

### Lib-Bausteine

- `lib/ai/*` - Prompts, Schemas, OpenRouter-Anbindung
- `lib/pipeline/*` - Orchestrierung, Pass 0 bis Pass 3, Scoring, Validation, Stream
- `lib/sources/*` - RSS, Tavily, Firecrawl, Procurement-Quellen
- `lib/supabase/*` - Client, Server, Schema-Check, Types
- `lib/constants.ts`
- `lib/lead-utils.ts`
- `lib/utils.ts`

### Datenbank und Migrationen

- `migrations/001_init.sql`
- `migrations/002_seed_sources.sql`
- `migrations/003_rls_policies.sql`
- `migrations/004_lead_engine_v2.sql`
- `migrations/005_source_persona.sql`
- `migrations/006_sales_fields.sql`
- `migrations/007_procurement_sources.sql`
- `migrations/008_tavily_forward_queries.sql`
- `migrations/009_sector_expansion.sql`
- `migrations/010_open_data_source.sql`

### Tests

- Unit- und Integrationstests in `tests/`
- E2E-Smoke-Test in `tests/e2e/app-smoke.spec.ts`

## 4. Was bereits eingebaut ist

### 4.1 Dashboard

- Hero-Sektion mit aktuellem Status
- KPI-Strip
- Pipeline-Stream
- Quellen-Performance-Ansicht
- CTA zum Starten der Pipeline

### 4.2 Leads-Seite

- Tabs für `alle`, `hot`, `warm`, `cold`, `not`
- Serverseitige Filter
- Sortierung
- Pagination mit 15 Leads pro Seite
- URL-basierte Filter, bookmarkbar und reload-sicher

### 4.3 Lead-Detail

- Sales-orientiertes PassCard-Layout
- Score-Box
- Score-Breakdown
- WHO / WHEN / WHERE / VOLUME-Block
- Sales-Strategie
- Kontakte / Deep Research
- Vergabe-Daten für Procurement-Leads

### 4.4 Pipeline

- SSE-basierte Live-Ausgabe
- Mehrstufige Verarbeitung
- Scan / Match / Connect
- Post-Processing und Re-Klassifizierung
- Robustere Behandlung von Browser-Disconnects

### 4.5 Quellen

- RSS-Adapter
- Tavily-Adapter
- Firecrawl-Fallback
- TED-Adapter
- Open-Data-Adapter
- Quellen-KPIs

### 4.6 Datenmodell

- Leads
- Sources
- Pipeline-Runs
- Procurement-Felder
- Sales-Felder
- Deep-Research-Felder

## 5. Fachliche Logik

### Scoring

Das Projekt arbeitet mit einem 5-Kriterien-Modell:

- Aktualität
- Volumen
- Phase
- Persona
- Komplexität

Die resultierende Logik ist:

`basis_score * hebel_multiplier = final_score`

Die Klassen sind aktuell:

- `HOT` ab 80
- `WARM` 60 bis 79
- `COLD` 40 bis 59
- `NOT` unter 40

### Lead-Filter

- alte Leads werden hart abgewertet
- studentische bzw. nicht passende Leads werden ausgeschlossen
- abgeschlossene oder zu späte Projekte werden nicht als Leads behandelt
- laufende oder vergangene Bauphasen werden strenger gefiltert

### Deep Research

Nur HOT-Leads gehen in den zusätzlichen Recherche-Pfad:

- Tavily Search
- Tavily Extract
- KI-Analyse der Webdaten
- Extraktion von Kontakt, Trigger, beteiligten Parteien

### Procurement

Das Projekt enthält zusätzlich einen Procurement-Pfad:

- TED-Quellen
- Open-Data-Quellen
- procurement-spezifische Hard-Filter
- sales-window-basierte Bewertung
- spezielle Anzeige in Card und Detailansicht

## 6. Was die bisherigen Dokumente zeigen

### README

Die `README.md` beschreibt bereits:

- Setup über `npm install`
- Umgebungsvariablen in `.env.local`
- Supabase-Migrationen
- Start mit `npm run dev`
- erste Projektphasen

### TASKS

`docs/TASKS.md` zeigt den tatsächlichen Entwicklungsverlauf sehr detailliert. Dort sind unter anderem dokumentiert:

- Score- und Prompt-Überarbeitung
- Pass-Namen von `Pass 1/2/3` auf `Scan/Match/Connect`
- neue LeadCard- und Detailansichten
- Procurement-Erweiterung mit TED und Open Data
- Dashboard-Korrekturen
- Smoke-Test-Stand

Wichtig: `TASKS.md` enthält an einigen Stellen historische Checkboxen, die durch spätere Einträge faktisch überholt wurden. Diese Übersicht bewertet deshalb den zuletzt dokumentierten Stand, nicht nur den ersten offenen Checkbox-Status.

### Smoke-Test

`docs/SMOKE-TEST.md` dokumentiert die manuelle Abnahme auf:

- Dashboard
- Leads
- Lead-Detail
- Pipeline-Start
- Quellen
- Pipeline-Runs
- API-Smoke

## 7. Aktueller Stand: was als erledigt gilt

Auf Basis der Dokumentation und der Struktur sind diese Bereiche aktuell umgesetzt:

- Dashboard mit KPI-Ansicht
- Leads-Listenansicht mit Filterung
- Lead-Detail mit PassCard
- Pipeline-SSE
- Scoring- und Klassifikationslogik
- Deep Research für HOT-Leads
- Procurement-Quellen und Vergabedaten
- TED- und Open-Data-Anbindung
- Quellen-KPIs
- E2E- und Unit-Test-Suite

## 8. Was noch fehlt oder offen ist

Stand: 09.06.2026 — aktualisiert nach Session Demo-Finalisierung

### 🔴 Dringend
- **Migration 011 ausführen** — Tavily max_results 10→3 (Monatslimit bei 80%)

### 🟡 Mittel
- **Bauherrn-Lookup UI** — Button vorhanden, Suchergebnis-Anzeige fehlt
- **publication_date / fetched_at** — Entscheidung: eigene Spalten oder in raw_notice belassen

### 🟢 Optional / Phase C
- **Apollo-Integration** — verifizierte Kontakte für HOT/WARM (braucht API-Key)
- **Lead-Status-Workflow** — HOT → "In Outreach" → Gewonnen/Verloren

### ✅ Seit letztem Stand erledigt
- Open-Data ZIP-Extraktion (fflate + CSV-Parser) — `lib/sources/procurement/open-data-zip.ts`
- CSV-Export auf Leads-Seite — `app/api/leads/export/route.ts`
- Pass 1 überspringt `api`-Sources (kein doppeltes Processing)
- SSE-Abort-Bug behoben (Pipeline läuft nach Browser-Disconnect weiter)
- Dashboard KPIs: TED-Leads + Neue heute (statt OPENER/LOOKUPS)
- "Alle"-Tab auf Leads-Seite

## 9. Bekannte Risiken und Dokumentationsinkonsistenzen

- `TASKS.md` ist kein reiner Bugtracker, sondern ein Mischdokument aus Verlauf, Fortschritt und Restarbeiten.
- Einige frühere Checkboxen sind durch spätere Einträge bereits überholt.
- Einzelne Funktionsbeschreibungen in der Doku wurden im Verlauf umbenannt, insbesondere bei den Pipeline-Pässen.
- Es gibt einen dokumentierten Konflikt zwischen frühem Open-Data-TODO und späterer Notiz zur fertigen ZIP-Extraktion. Der Code-Stand sollte gegenüber der aktuellen Implementierung geprüft werden, bevor daraus ein offener Blocker abgeleitet wird.

## 10. Relevante Befehle

```bash
npm install
npm run dev
npm run build
npm run test
npm run test:e2e
npm run check:schema
```

## 11. Dokumentenindex

- `README.md` - Einstieg und Setup
- `docs/TASKS.md` - Fortschritt und offene Punkte
- `docs/SMOKE-TEST.md` - manuelle Abnahme
- `docs/quellenstrategie-aktuelle-leads.md` - Quellenstrategie
- `docs/strukturierte-vergabedaten-implementierungsplan.md` - Procurement-Implementierungsplan
- `docs/demo-mersch-script.md` - Demo-Skript
- `docs/orca-lead-engine-v2-arbeitsplan.md` - umfassender Arbeitsplan

## 12. Kurzfazit

Das Projekt ist kein leerer Prototyp mehr, sondern eine durchgezogene Lead-Engine mit UI, Pipeline, Scoring, Deep Research, Procurement-Erweiterung, Datenbankmigrationen und Tests. Die offenen Punkte liegen vor allem in der Verfeinerung von Kontaktrecherche, optionalen Integrationen und einzelnen Datenmodell-Entscheidungen.
