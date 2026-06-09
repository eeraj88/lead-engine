# NetzWerkPlan Lead Engine — Aufgaben & Fortschritt

## Heutiger Stand (2026-06-08) — Lead-Qualität fundamentale Reparatur

### ✅ Erledigt heute

- [x] **Score-Prompt komplett überarbeitet** (`lib/ai/prompts.ts`)
  - Neues 5-Kriterien-System mit exakten Punktzahlen (keine Ranges mehr)
  - Aktualität (25) / Volumen (25) / Phase (20) / Persona (15) / Komplexität (15)
  - Auto-NOT: Leads > 18 Monate alt oder Studierende
  - Pflicht-Check: runde Scores (85/80/75) werden gewarnt
  - Post-Validierung in `pass2-deep.ts`: re-classify wenn KI-Klasse nicht zum Score passt

- [x] **Pass-Namen überall ersetzt** (nur UI-Labels, keine DB-Migration)
  - Pass 1 → **Scan** (Quellen durchsuchen)
  - Pass 2 → **Match** (Leads bewerten und filtern)
  - Pass 3 → **Connect** (Kontakte recherchieren)
  - Geändert in: `PipelineStream.tsx`, `DashboardClient.tsx`, `app/runs/page.tsx`

- [x] **lib/constants.ts** erstellt mit `PIPELINE_STEPS` Konstanten

- [x] **LeadCard-Komponente** komplett neu (`components/LeadCard.tsx`)
  - Fixe Höhe: `height: 200px` — alle Karten gleich groß
  - Nur wichtigste Infos: Badges, Titel (max 2 Zeilen), Hauptakteur, Meta-Zeile
  - **Neu: "Gefunden: 08.06.2026, 08:57"** — aus `leads.created_at`
  - Kein Beschreibungstext, keine Sales-Strategie, keine Kontakte in der Card
  - Kleinerer ScoreRing (56px), kompaktere Badges

- [x] **Leads-Seite mit Filter + Pagination** (`app/leads/page.tsx`)
  - **Server-seitige Filterung** über Supabase-Queries (effizient)
  - Filter-Toolbar: Zeitraum, Persona, Hebel, Min-Score, Quelle, Sortierung
  - **Default: Heute** (zeigt nur heutige Pipeline-Ergebnisse)
  - 15 Leads pro Seite (hart) mit Pagination-Controls
  - Alle Filter als URL-Params → bookmarkbar, Reload-sicher
  - Bei Filter-Wechsel: automatisch zurück auf Seite 1

- [x] **Klassifizierungs-Schwellen angepasst** (neu konsistent überall)
  - HOT: ≥ 80 (war: ≥ 70)
  - WARM: 60-79 (war: 50-69)
  - COLD: 40-59 (war: 30-49)
  - NOT: < 40
  - Geändert in: `lib/lead-utils.ts`, `lib/pipeline/pass2-deep.ts`, `app/page.tsx`

- [x] **Zod-Schema robuster** (`lib/ai/schemas.ts`)
  - Alle Score-Felder clampen statt ablehnen (`too_big` Fehler behoben)
  - `clampInt(max)` Hilfsfunktion für `score_breakdown` Felder

- [x] **Bug-Fixes Session 2026-06-08**
  - `LeadCard.tsx` fehlte `'use client'` → Leads-Seite crashte
  - `getFinalScore/getLeadClass` nach `lib/lead-utils.ts` extrahiert (Server/Client-Grenze)

---

- [x] **Detail-Seite komplett neu** (`app/leads/[id]/page.tsx`)
  - **Volumen-Bug behoben**: `36 €` → `36,3 Mio €` (smartVolume-Heuristik: < 5000 = Mio-Wert)
  - **Prompt-Fix**: `project_value_estimate` jetzt explizit in Mio EUR dokumentiert
  - **Sales-Hero-Layout**: WHO/WHEN/WHERE/VOLUME als 2×2 Infoblock-Grid sofort sichtbar
  - **Score-Box**: Navy, Score groß (56px), Klassen-Badge, "von 100 Punkten"
  - **Score-Breakdown**: 5 farbige Balken (grün/gold/grau nach Erfüllungsgrad)
  - **Sales-Strategie**: Gold-Box prominent über dem Fold
  - **Beschreibung**: auf 400 Zeichen geclipt, kein PDF-Dump mehr
  - **Kontakte**: Grid-Layout falls decision_makers vorhanden
  - **Opener/Direct-Link**: Rechte Spalte, verlinkt auf verwandte Leads
  - Verwendet CSS-Variablen (`--navy`, `--gold`) statt alte `bg-orca-blue` Klassen

- [x] **SCHRITT 1: Hard-Filter in Code** (`lib/pipeline/pass2-deep.ts`)
  - `postProcessScoring()` Funktion nach KI-Call, vor DB-Speicherung
  - **Filter A (Alter):** `recency` Score hart begrenzt: >18M → 0 + Auto-NOT, >12M → max 3, >6M → max 10, >3M → max 20
  - **Filter B (Studenten):** Keyword-Match → `persona=0`, Auto-NOT mit Begründung
  - **Filter C:** `basis_score` neu aus echtem Breakdown-Sum berechnet (nicht KI-Behauptung)
  - **Filter D:** `final_score = basis_score × hebel_multiplier` (Code, nicht KI)
  - **Filter E:** `lead_class` aus `final_score` abgeleitet (canonische Schwellen)
  - Original KI-Antwort in `pass2Data.rawAIResponse` archiviert
  - Korrekturen in `pass2Data.postProcessed` dokumentiert (was wurde geändert)

- [x] **SCHRITT 2: KI-Zusammenfassung statt Raw-Text** (`lib/ai/`)
  - Neues Feld `ai_summary` in `ClassificationScoringSchema` (Zod)
  - Prompt-Anweisung: max 3 Sätze, nur Fakten, Format: [Bauherr] + [Objekt] + [Volumen] + [Phase]
  - Strict anti-hallucination: NIEMALS PDF-Roh-Text kopieren
  - `ScoredLead.aiSummary` + orchestrator DB-Insert
  - DB: `ai_summary TEXT` (migration 006)

- [x] **SCHRITT 3: Erweiterte Sales-Felder** (`lib/ai/schemas.ts`, `lib/ai/prompts.ts`)
  - `InvolvedPartySchema` + `RelevantLinkSchema` (neue Sub-Schemas)
  - `involved_parties`, `planned_completion`, `relevant_links` in ClassificationScoringSchema
  - Prompt: Extraktion aus Quelltext (nur wenn EXAKT im Text, niemals erfinden)
  - DB-Migration `006_sales_fields.sql`: 8 neue Spalten mit Indizes
  - orchestrator.ts: alle neuen Felder in DB-Insert

- [x] **SCHRITT 4: Deep Research für HOT-Leads** (`lib/pipeline/pass3-cross.ts`)
  - `runDeepResearch()` Funktion — nur für `lead_class = 'hot'`
  - **Schritt 4.1:** Tavily-Suche: Bauherr + Projekttitel + "Pressemitteilung 2024 2025 2026"
  - **Schritt 4.2:** Tavily-Extract: Top-3 `relevant_links` aus Pass 2
  - **Schritt 4.3:** KI-Analyse aller Web-Daten → `PASS_3_DEEP_PROMPT`
  - **Schritt 4.4:** `DeepResearchSchema` → contact_person, sales_trigger, involved_parties
  - Basis-Enrichment (alle topLeads) bleibt unverändert
  - HOT-Lead bekommt zusätzlich echte Web-Daten → bessere Kontakte
  - `deepResearchDone`, `contactPerson`, `contactRole`, `contactSource`, `salesTrigger`
  - DB: `deep_research_done`, `contact_person`, `contact_role`, `contact_source`, `sales_trigger`

- [x] **SCHRITT 5: DB-Migration ausführen** (manuell in Supabase)
  - SQL: `migrations/006_sales_fields.sql`
  - Danach: alte Leads löschen + frische Pipeline starten

### 🔄 In Arbeit

- [ ] **Score differenziert** — Hard-Filter jetzt aktiv, nächsten Run starten
  - Alte Leads (>18 Monate) sollten jetzt automatisch NOT werden
  - Scoring-Bandbreite 40-95 prüfen

---

### 📋 Offen für nächste Session

- [ ] **Bauherrn-Lookup verbessern**
  - Aktuell: Button sichtbar bei OPENER-Leads
  - Fehlende Funktion: Suchergebnis in der UI anzeigen
  - Error Handling verbessern

- [ ] **Apollo-Integration** (optional, Phase C)
  - Verifizierte Kontakte für HOT/WARM Bauherrn
  - Nur für Leads mit `persona = bauherr_public|bauherr_private`

- [ ] **Leads-Seite: "Alle" Tab**
  - Aktuell 4 Tabs (HOT/WARM/COLD/NOT) — kein "Alle anzeigen"
  - Optional: 5. Tab ohne Klassen-Filter

- [ ] **Dashboard-Widgets anpassen**
  - OPENER-Count zeigt 0 — prüfen ob Daten korrekt
  - LOOKUPS-Count logik verifizieren

---

## Technische Architektur (Stand 2026-06-08)

```
Pipeline: Scan → Match → Connect
DB: Supabase (leads, sources, pipeline_runs)
UI: Next.js 15 App Router, Tailwind v4, shadcn/ui
Scoring: 5 Kriterien × Punkte = basis_score × hebel_multiplier = final_score
Klassen: HOT≥80 / WARM60-79 / COLD40-59 / NOT<40
```

## Dateien-Übersicht (geänderte Dateien)

| Datei | Änderung |
|---|---|
| `lib/constants.ts` | NEU: PIPELINE_STEPS Scan/Match/Connect |
| `lib/lead-utils.ts` | Neue Schwellen 80/60/40 |
| `lib/ai/prompts.ts` | Komplett neuer Match-Prompt |
| `lib/ai/schemas.ts` | clampInt, kein too_big mehr |
| `lib/pipeline/pass2-deep.ts` | Post-Validierung, re-classify, round-score warning |
| `lib/pipeline/stream.ts` | `warning` Event-Typ hinzugefügt |
| `components/LeadCard.tsx` | Neu: 200px fix, Gefunden-Timestamp |
| `components/LeadFilters.tsx` | Komplett neu: Zeitraum/Persona/Hebel/Score/Quelle/Sort |
| `components/PipelineStream.tsx` | Scan/Match/Connect Labels |
| `components/DashboardClient.tsx` | Scan/Match/Connect Labels |
| `app/leads/page.tsx` | Neu: Server-Filter + Pagination |
| `app/leads/[id]/page.tsx` | Komplett neu: Sales-Layout, Volumen-Fix, Score-Balken |
| `app/runs/page.tsx` | Scan/Match/Connect Labels |
| `lib/ai/prompts.ts` | project_value_estimate explizit in Mio EUR |
| `lib/pipeline/pass2-deep.ts` | postProcessScoring + aiSummary/involvedParties/relevantLinks in ScoredLead |
| `lib/pipeline/pass3-cross.ts` | Deep Research für HOT-Leads via Tavily (Search + Extract + KI) |
| `lib/pipeline/orchestrator.ts` | 8 neue DB-Felder im Insert |
| `lib/ai/schemas.ts` | InvolvedPartySchema, RelevantLinkSchema, DeepResearchSchema, neue Felder |
| `lib/ai/prompts.ts` | ai_summary + involved_parties + relevant_links + PASS_3_DEEP_PROMPT |
| `migrations/006_sales_fields.sql` | NEU: 8 neue Spalten, 2 Indizes |

---

## Heutiges Projekt (Stand: 2026-06-08)

### UI-Verbesserungen

- [x] PassCard Terminal-Fenster: fixe Hoehe 240px
- [x] Auto-Scroll mit Scroll-Lock-Verhalten
- [x] Schriftgroesse auf 13px erhoeht
- [x] Kompakte Zeitstempel im Format HH:mm:ss
- [x] Scroll-Indikator bei neuen Logs

### Naechste Umsetzung

- [x] `components/PassCard.tsx` test-first auf fixes Terminal-Verhalten umbauen
- [ ] Pipeline-Smoke-Test: konstante Hoehe, neueste Zeile unten, manuelles Hochscrollen bleibt erhalten

### Lead-Qualitaet: Sales-Timing

- [x] Laufende Ausfuehrung / vergangener Baubeginn zwingend als NOT klassifizieren
- [x] LP5+ im Match-Prompt von 20 auf 0 Phasenpunkte korrigieren
- [x] Regressionstest mit Westendbruecke-Fall ergaenzen
- [x] Firecrawl als Content-Fallback integriert, wenn Tavily weniger als 1.000 Zeichen liefert
- [x] Firecrawl-v2-Live-Test erfolgreich: bereinigtes Markdown wird geliefert

### Naechstes Projekt: bessere aktuelle Quellen

- [x] Quellenstrategie dokumentiert: `docs/quellenstrategie-aktuelle-leads.md`
- [x] Verbindlichen Implementierungsplan erstellt: `docs/strukturierte-vergabedaten-implementierungsplan.md`
- [x] Schritt 1: Procurement-Typen und CPV-Helper
- [x] Schritt 2: Procurement Hard Filter mit TDD
- [x] Schritt 3: Migration `007_procurement_sources.sql` und Supabase-Typen
- [x] Migration 007 im Supabase SQL Editor ausgefuehrt und verifiziert
- [x] Runtime-Preflight und `npm run check:schema` um Migration 007 erweitert
- [ ] Entscheidung: `publication_date`/`fetched_at` als eigene Lead-Spalten
- [x] Schritt 4: TED Adapter mit isolierter HTTP-Schicht und Live-Smoke-Test
- [x] Schritt 5: Open-Data Adapter fuer OCDS/eForms/CSV
- [x] Bekanntmachungsservice Open Data als primaere deutsche Vergabequelle geprueft
- [x] **Task 6 - Pass 0 + Orchestrator** (`lib/pipeline/pass0-procurement.ts`)
  - TED fetch → Batch-Dedup → DB-Dedup → Hard Filter → RawLead[] (kein AI-Cost fuer gefilterte Notices)
  - `ProcurementMeta` Interface in `lib/sources/types.ts` (externalId, salesWindow, cpvCodes etc.)
  - `additionalContext` in RawLead: strukturierte Vergabedaten als Kontext fuer PASS_2_PROMPT
  - `procurement` Feld propagiert durch Pass 2 → Pass 3 → DB (13 Felder im Insert)
  - `pass0_complete` Stream-Event (fetched/relevant/filtered/duplicates)
  - Open-Data ZIP: TODO-Kommentar, wartet auf ZIP-Library
- [x] **Task 7 - Scoring + Prompts** (`lib/pipeline/pass2-deep.ts`, `lib/ai/prompts.ts`)
  - **Filter F** in `postProcessScoring()`: `too_late` → auto-NOT (Score ≤ 35)
  - `unknown` sales_window: kein Cap — hard filter hat expired/awarded bereits ausgeschlossen
  - Procurement leads: Filter A nutzt `publishedAt` (Publikationsdatum), nicht KI-extrahiertes project_date
  - PASS_2_PROMPT: Anti-Halluzination für project_date (= Publikationsdatum, kein historisches Baudatum)
- [x] **Task 8 - Tavily Forward Queries** (`migrations/008_tavily_forward_queries.sql`)
  - Deaktiviert: `GU beauftragt Suche` (rückblickend)
  - Aktualisiert: competitionline, wettbewerbe-aktuell, BauNetz, Klinik-Neubauten, Industrie
  - Neu: VgV Planungswettbewerb, BIM CDE Ausschreibung, Projektsteuerung AHO/DVP, Baubeschlüsse Kommunen, Sanierung oeffentliche Gebäude, Private Grossinvestoren Neubau
  - Migration 008 in Supabase ausgeführt ✓
- [x] **Task 9 - UI**: LeadCard + Detail-Seite für Procurement-Felder
  - LeadCard: TED/VERGABE-Badge, Sales-Window-Badge (Frist offen / Frist bald), Deadline in Meta-Zeile, buyer_name als Fallback
  - Detail-Seite: Vergabe-Daten Block (Notice-Typ, Phase, Deadline farbig, Sales-Window, Auftraggeber, Wert, CPV-Codes, Ausschreibungsunterlagen-Link, TED-Notice-ID-Link)
  - WHO-Block: buyer_name Fallback; WO-Block: buyer_city Fallback
  - Source-Kind-Badge + Sales-Window-Badge in Badges-Zeile
- [x] **Task 10 - Abschluss**: Echter TED-Lead end-to-end durch Pipeline → DB ✓
  - Root-Cause 1: `source_id: 'ted'` (String) statt UUID-FK → silent insert error → Fix: UUID-Lookup in `runPass0`
  - Root-Cause 2: KI halluziniert historisches `project_date` aus Beschreibung → Filter A rejected TED-Leads → Fix: procurement leads nutzen immer `publishedAt`
  - Error-Logging in orchestrator DB-Insert hinzugefügt (war silent)
  - Ergebnis: 2 echte HOT-TED-Leads in DB (Hochsauerlandkreis 82, DB InfraGO 92)
  - Dedup: zweiter Run zeigt `duplicates: 1` ✓
- [ ] Pass 0 Open-Data: ZIP-Archive entpacken (wartet auf fflate/jszip)
- [x] **Quellen-KPIs Dashboard-Widget** (`app/page.tsx`, `components/DashboardClient.tsx`)
  - Neue Sektion "Quellen-Performance · letzte 7 Tage" unter PipelineStream
  - Tabelle: Quelle | Gesamt | HOT+WARM | NOT | Qualitäts-Bar | Zuletzt
  - TED-Badge (navy) für `source_kind: ted`, VERGABE-Badge (lila) für Open-Data
  - Qualitäts-Bar: grün ≥50% / gold 25-49% / rot <25%
  - Sources-Query fetcht alle (inkl. disabled) für korrekte Name-Auflösung
  - Top 10 Quellen nach HOT+WARM sortiert

---

## Session 2026-06-09 — Bug-Fixes + Sektor-Erweiterung

### Bug-Fixes

- [x] **ContactSchema null-tolerant** (`lib/ai/schemas.ts`)
  - `email/phone/linkedin_url/source` von `.optional()` auf `.nullish()` — KI gibt `null` zurück, Schema crashte
  - Deep Research Zod-Fehler behoben: `decision_makers[0].email null` schlug fehl → HOT-Leads kein Deep Research
- [x] **DecisionMaker Interface** (`lib/pipeline/lead-validation.ts`)
  - `email/phone/linkedin_url/source` jetzt `| null` — TypeScript-Fehler behoben
  - `isUsableEmail()` signatur auf `string | null | undefined` erweitert

### Prompt-Qualität: Abgeschlossene Projekte filtern

- [x] **PASS_1_PROMPT** — neue KEIN-LEAD-Regeln gegen vergangene Projekte:
  - Fertiggestellte Projekte (Eröffnung, Inbetriebnahme) → `relevant=false`
  - Laufende Bauausführung LP5+ (Spatenstich, Rohbau, Richtfest) → `relevant=false`
  - GU/Zuschlag bereits erteilt, Vertrag unterzeichnet → `relevant=false`
  - Rückblickende Berichte, Schlüsselübergaben, Einweihungen → `relevant=false`
  - EIN LEAD = nur wenn Projekt AKTUELL oder ZUKÜNFTIG aktiv
- [x] **PASS_2_PROMPT** — Scoring-Regel für abgeschlossene Projekte:
  - Eröffnet/in Betrieb → `recency=0`, max Score 35, `lead_class=not`
  - Bau läuft → `phase=0`, `sales_window=too_late`
  - GU/Vertrag bereits unterzeichnet → `too_late`, `not`

### Sektor-Erweiterung: Vollständige Bauvorhaben-Abdeckung

- [x] **Migration 009** (`migrations/009_sector_expansion.sql`) — 8 neue Tavily-Buckets:
  - `Schulneubau Bildungsbauten` — Schulcampus, Kita, Bildungszentren
  - `Hochschule Universitaet Neubau` — Uni, Hochschule, Campus
  - `Kulturbauten Neubau` — Museum, Theater, Konzerthaus, Bibliothek
  - `Sport Stadion Freizeitbau` — Stadion, Arena, Hallenbad, Sporthalle
  - `Pflege Seniorenresidenz Neubau` — Pflegeheim, betreutes Wohnen
  - `Rechenzentrum Data Center Bau` — Data Center, Hyperscaler (Priorität 1)
  - `Hotel Tourismus Neubau` — Hotel, Resort, Serviced Apartments
  - `Justiz Behoerden Sicherheit Bau` — Polizei, Feuerwehr, Gericht
  - Migration 009 in Supabase ausgeführt ✓ → jetzt 32 aktive Quellen

### Offene Punkte

- [x] **Pass 0 Open-Data ZIP** — `lib/sources/procurement/open-data-zip.ts`
  - fflate installiert (pure-JS ZIP-Extraktion)
  - CSV-Parser (RFC 4180, BOM, multiline) — kein extra lib
  - OCDS-JSON-Parser für JSON/JSONL-Exporte
  - pass0: fetcht gestern + heute, graceful error wenn ZIP noch nicht bereit
  - Migration 010: `Bekanntmachungsservice Vergabe` als `api`-Source in DB ✓
  - Pass 1 filtert `type: 'api'` aus — kein "API adapter not implemented" Error mehr
- [x] **CSV-Export** — `app/api/leads/export/route.ts`
  - Download-Button auf `/leads`, gleiche Filter wie aktive Ansicht
  - 17 Spalten, UTF-8 BOM (Excel-kompatibel), Semicolon-Separator, max 500 Rows

---

## Offene Aufgaben (priorisiert, Stand 09.06.2026)

### 🔴 Dringend (vor nächstem Pipeline-Run)
- [ ] **Migration 011 ausführen** — Tavily max_results 10→3 (Limit bei 80%, Demo retten)
  - SQL: `migrations/011_tavily_reduce_results.sql`

### 🟡 Mittel (für vollständige Demo)
- [ ] **Bauherrn-Lookup UI** — Suchergebnis in UI anzeigen (Button vorhanden, Result-Anzeige fehlt)
- [ ] **publication_date / fetched_at** — Entscheidung: eigene Lead-Spalten oder im raw_notice belassen

### 🟢 Optional (Phase C)
- [ ] **Apollo-Integration** — verifizierte Kontakte für HOT/WARM Bauherrn (braucht API-Key)
- [ ] **Lead-Status-Workflow** — HOT → "In Outreach" → "Gewonnen/Verloren" Status-Tracking

---

## Session 2026-06-09 — Demo-Finalisierung (Smoke-Test + Bug-Fixes)

### ✅ Bug-Fixes Smoke-Test

- [x] **Dashboard KPIs korrigiert** (`app/page.tsx`, `components/DashboardClient.tsx`)
  - `OPENER-Count` → `TED-Leads` (source_kind: ted | procurement_open_data)
  - `LOOKUPS-Count` → `Neue heute` (created_at >= heute 00:00)
  - KPI-Strip: WARM-Leads / TED-Leads / Neue heute / Aktive Quellen

- [x] **"Alle"-Tab auf Leads-Seite** (`app/leads/page.tsx`)
  - 1. Tab mit `LayoutList`-Icon, Key `alle`
  - Kein `lead_class`-Filter wenn `activeTab === 'alle'`
  - Count = Summe aller 4 Klassen
  - Default `activeTab = p.tab ?? 'alle'`

- [x] **SSE-Abort-Bug behoben** (`app/api/pipeline/run/route.ts`)
  - Root Cause: `controller.enqueue()` wirft "Invalid state: Controller is already closed" wenn Browser-Tab geschlossen
  - Fix: `controllerOpen` Boolean-Flag + try-catch um `enqueue()` + Guard auf `controller.close()`
  - Pipeline läuft jetzt weiter auch nach Browser-Disconnect, speichert Leads in DB
  - Vorher: Run → Tab schließen → Run `failed`, 0 Leads gespeichert
  - Nachher: Pipeline läuft im Hintergrund, Run `completed` mit korrekten Counts

### ✅ Smoke-Test Ergebnisse (09.06.2026)

| Bereich | Status | Details |
|---------|--------|---------|
| Dashboard | ✅ | HOT-Count korrekt, KPI-Strip 4 Kacheln, Quellen-Performance-Tabelle |
| Leads-Seite | ✅ | "Alle"-Tab (44 Leads in 7d), HOT/WARM/COLD/NOT-Tabs, Filter, Pagination |
| Lead-Detail (PassCard) | ✅ | TED-Lead Score 92 — Vergabe-Daten, Score-Breakdown, Sales-Strategie |
| Pipeline SSE | ✅ | Stream kein Abort mehr nach Tab-Schließen |
| Deep Research | ✅ | Runs vom 08.06.2026 zeigen Connect 1-2 (Pass 3 läuft ohne Zod-Crash) |
| Quellen | ✅ | 32 aktive Quellen inkl. 8 neue Sektoren (Migration 009) |
| Pipeline-Runs | ✅ | `completed`-Status, Scan/Match/Connect-Zahlen korrekt |

### Demo-Freigabe: ✅ BEREIT FÜR OLIVER/CO

- [x] OPENER/LOOKUPS Dashboard-Count gefixt
- [x] "Alle"-Tab auf Leads-Seite
- [x] Deep Research end-to-end verifiziert
- [x] PassCard Smoke-Test dokumentiert

### Heute bereit für Oliver/Co (09.06.2026)
- **Funktionsumfang:**
  - 32 aktive Quellen inklusive TED EU und Open Data Procurement Scan (Pass 0).
  - Völlig neues 5-Kriterien-Scoring mit "Anti-Halluzinations-Schutz".
  - KI-Deep-Research findet Ansprechpartner und Rollen für HOT-Leads.
  - Das Dashboard ist komplett überarbeitet mit einem Quellen-Performance Slide-In.
  - Der "Alle"-Tab zeigt die Gesamt-Pipeline.
- **Bekannte Limitierungen:**
  - Open-Data ZIP-Import ist im Backend vorbereitet, aber in Pass 0 als Fallback zu TED EU konzipiert und kann Fehler bei leeren Downloads werfen (wird abgefangen).
  - Apollo.io Integration für E-Mails kommt in Phase C.

**Checklist-Datei:** `SMOKE-TEST.md` (vollständige Tester-Checkliste für Eeraj)

---

### Session 2026-06-09 — UI Refactoring & Bug Fixes

### UI-Verbesserungen Dashboard & Leads
- [x] Quellen-Performance-Tabelle als Slide-In Panel
- [x] Button "Quellen-Performance" im Dashboard-Header
- [x] Bestehende Tabelle aus Dashboard entfernt
- [x] Transparenz-Hinweis zu Qualität ≥ 60
- [x] Dashboard Header-Text überarbeitet auf "Identifizierte Projekte / im Sales-Cockpit."
- [x] Bookmark (Merkliste) Button in LeadCard repariert (optimistisches UI, Status "qualified")
- [x] "Markiert" in die Dropdown-Filter der Leads-Seite (LeadFilters) aufgenommen

