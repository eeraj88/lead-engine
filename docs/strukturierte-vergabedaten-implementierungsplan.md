# Strukturierte Vergabedaten Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Orca Lead Engine priorisiert strukturierte, offene Vergabeverfahren und laesst nur Leads mit realistischem winplan-2.0-Sales-Fenster in das KI-Scoring.

**Architecture:** TED und der Bekanntmachungsservice liefern normalisierte `ProcurementNotice`-Datensaetze in einen neuen Pass 0. CPV- und Procurement-Hard-Filter entscheiden deterministisch vor jedem AI-Call; Tavily bleibt fuer fruehe unstrukturierte Signale, Firecrawl nur fuer fehlende Detailinhalte und PDFs.

**Tech Stack:** Next.js 15, TypeScript, Vitest, Zod, Supabase/Postgres, TED Search API, Bekanntmachungsservice Open Data, Tavily, Firecrawl.

---

## Leitplanken

- LP2-LP4, offene Planungsvergaben, Projektsteuerung und BIM/CDE sind das primaere Sales-Fenster.
- Award, Result, Zuschlag, abgelaufene Frist, LP5+ und laufende Ausfuehrung werden deterministisch NOT.
- KI darf Frist, Notice-Typ, Bauherr, Ansprechpartner oder Projektphase nicht erfinden.
- Fehlende strukturierte Daten bleiben `null`.
- `final_score` ist kanonisch; `score` bleibt nur Legacy-Alias.
- Keine komplette UI-Neugestaltung und keine rekursiven Portal-Crawls.

## Dateien

**Neu:**

- `lib/sources/procurement/types.ts`
- `lib/sources/procurement/ted-adapter.ts`
- `lib/sources/procurement/open-data-adapter.ts`
- `lib/pipeline/cpv.ts`
- `lib/pipeline/procurement-filter.ts`
- `migrations/007_procurement_sources.sql`
- `tests/cpv.test.ts`
- `tests/procurement-filter.test.ts`
- `tests/ted-adapter.test.ts`
- `tests/open-data-adapter.test.ts`

**Aendern:**

- `lib/sources/types.ts`
- `lib/sources/index.ts`
- `lib/pipeline/orchestrator.ts`
- `lib/pipeline/pass1-broad.ts`
- `lib/pipeline/pass2-deep.ts`
- `lib/pipeline/scoring.ts`
- `lib/pipeline/stream.ts`
- `lib/ai/prompts.ts`
- `lib/ai/schemas.ts`
- `lib/supabase/types.ts`
- `components/LeadCard.tsx`
- `app/leads/[id]/page.tsx`
- `app/page.tsx`
- Tavily-Source-Migration oder neue Seed-Migration

## Task 1 - Procurement-Typen und CPV

- [x] `ProcurementNotice`, `NoticeType`, `ProcurementStage`, `SalesWindow` und `SourceKind` in `lib/sources/procurement/types.ts` definieren.
- [x] `tests/cpv.test.ts` mit relevanten Hauptcodes, Untercodes und irrelevanten Tiefbaucodes schreiben.
- [x] Test ausfuehren und erwartetes Fehlschlagen wegen fehlendem Modul bestaetigen.
- [x] `isRelevantCpv(cpvCodes: string[])` in `lib/pipeline/cpv.ts` gruppenbasiert implementieren.
- [x] CPV-Test und bestehende Source-Tests ausfuehren.

**Stand 2026-06-08:**

- CPV-Division `71` wird inklusive Untercodes und formatierter Codes mit Pruefziffer erkannt.
- Reine Bauausfuehrungs-Codes der Division `45` werden nicht automatisch relevant.
- Offenes Risiko: direkte Software-/Dokumentenmanagement-/CDE-Codes ausserhalb Division `71` anhand echter Notices validieren.

## Task 2 - Procurement Hard Filter

- [x] `tests/procurement-filter.test.ts` fuer Award, abgelaufene Frist, offene Planung, AHO-Projektsteuerung, Fertigstellung, Strassenbau und CDE-Markterkundung schreiben.
- [x] Ein Ergebnisformat mit `relevant`, `salesWindow`, `procurementStage` und begruendeten `reasons` definieren.
- [x] `filterProcurementNotice()` ohne AI-Abhaengigkeit implementieren.
- [x] Positive und negative Signale priorisieren; harte Ausschluesse gewinnen immer.

**Stand 2026-06-08:**

- Geaendert: `lib/pipeline/procurement-filter.ts`
- Neue Tests: `tests/procurement-filter.test.ts` mit sieben geforderten Geschaeftsfaellen.
- Maschinenlesbare Filtergruende koennen spaeter direkt in Stream-Events und Quellen-KPIs einfliessen.
- Offenes Risiko: Notice-Typ-Mappings aus TED/eForms muessen konsistent auf die internen Enum-Werte normalisiert werden.
- Naechster Schritt: Migration `007_procurement_sources.sql` und Supabase-Typen.

## Task 3 - Supabase-Felder

- [x] Bestehende Migrationen auf Feldkonflikte pruefen.
- [x] `migrations/007_procurement_sources.sql` mit `deadline`, `notice_type`, `procedure_type`, `procurement_stage`, `sales_window`, `cpv_codes`, Buyer-Feldern, `documents_url`, `external_notice_id`, `source_kind` und `raw_notice` erstellen.
- [x] Check-Constraints fuer `procurement_stage`, `sales_window` und `source_kind` definieren.
- [x] Indexe fuer `deadline`, `sales_window`, `external_notice_id` und GIN auf `cpv_codes` anlegen.
- [x] `lib/supabase/types.ts` synchronisieren.

**Stand 2026-06-08:**

- Geaendert: `migrations/007_procurement_sources.sql`, `lib/supabase/types.ts`.
- Neuer Test: `tests/procurement-schema.test.ts` prueft Spalten, Constraints, Indizes und Type-Synchronitaet.
- Migration 006 fehlte teilweise in den manuellen Types und wurde in Row/Insert/Update nachgezogen.
- Migration 007 wurde am 2026-06-08 in Supabase ausgefuehrt und per REST sowie `npm run check:schema` verifiziert.
- Der Pipeline-Preflight prueft jetzt v2- und Procurement-Spalten vor Source-/AI-Arbeit.
- Offene Entscheidung vor Adapter-Persistierung: `publication_date` und `fetched_at` als eigene Lead-Spalten oder nur in `raw_notice`.
- Naechster Schritt: TED Adapter mit isolierter HTTP-Schicht.

## Task 4 - TED Adapter

- [x] `tests/ted-adapter.test.ts` mit echten Response-aehnlichen Fixtures schreiben.
- [x] HTTP-Zugriff als injizierbare Funktion isolieren.
- [x] TED-Felder auf `ProcurementNotice` abbilden; fehlende Werte bleiben `null`.
- [x] Suche auf Deutschland, aktuelle Publikation, Planning/Competition und relevante CPV begrenzen.
- [x] Award-/Result-Notices durch positive Form-Type-Liste vermeiden; Hard Filter bleibt zweite Schutzschicht.

**Stand 2026-06-08:**

- Geaendert: `lib/sources/procurement/ted-adapter.ts`, `lib/sources/index.ts`.
- Neue Tests: `tests/ted-adapter.test.ts` fuer Normalisierung, Null-Verhalten, Request und injizierte HTTP-Schicht.
- Live verifiziert: TED v3 akzeptiert `buyer-country = DEU`, hierarchischen CPV-Filter `classification-cpv = 71000000` und `(form-type = planning OR form-type = competition)`.
- Live-Ergebnis am 2026-06-08: 397 aktuelle Treffer seit 2026-06-01; Beispiel-CPVs `71250000`, `71300000`, `71521000`.
- Reale TED-Deadline ist ein Array; der Mapper normalisiert den ersten Wert. NUTS wird aus `place-of-performance` extrahiert.
- Offenes Risiko: `procedure-type` kann TED-interne Codes enthalten und benoetigt spaeter ein kanonisches Mapping.
- Naechster Schritt: Open-Data Adapter fuer Bekanntmachungsservice.

## Task 5 - Open-Data Adapter

- [x] `tests/open-data-adapter.test.ts` fuer OCDS-, eForms- und CSV-aehnliche Eingaben schreiben.
- [x] Mapper nach Format trennen, aber ein gemeinsames `ProcurementNotice` ausgeben.
- [x] `external_id`, Original-URL, Dokumenten-URL und Rohdatensatz erhalten.
- [x] Netzwerkzugriff und Format-Normalisierung getrennt testbar halten.

**Stand 2026-06-08:**

- Geaendert: `lib/sources/procurement/open-data-adapter.ts`, `lib/sources/index.ts`.
- Neue Tests: `tests/open-data-adapter.test.ts` fuer OCDS, eForms-Business-Term-Projektion, CSV-Relationen, Export-URL und injizierte HTTP-Schicht.
- Offizielle API verifiziert: `GET /api/notice-exports?pubDay=YYYY-MM-DD&format=ocds.zip|eforms.zip|csv.zip`.
- Live-Smoke-Test fuer `pubDay=2026-06-07` und `ocds.zip` liefert HTTP 200 und `notices_2026-06-07_OCDS.zip`.
- Die API liefert Tages- oder Monatsarchive und stellt Daten erst nach Mitternacht fuer den Vortag bereit.
- Offenes Risiko: ZIP-Entpackung sowie Parsing der realen XML-/CSV-Dateien gehoeren als eigene Importstufe in Pass 0; der Adapter normalisiert bereits entpackte Datensaetze.
- Naechster Schritt: Pass 0 mit Archiv-Importer, Deduplizierung und Procurement Hard Filter.

## Task 6 - Pass 0 und Orchestrator ✅ (2026-06-08)

- [x] `pass0_complete` Stream-Event (fetched/relevant/filtered/duplicates) ergaenzt.
- [x] `ProcurementMeta` Interface in `lib/sources/types.ts`; `RawLead` um `procurement?` und `additionalContext?` erweitert.
- [x] `lib/pipeline/pass0-procurement.ts` erstellt: TED fetch → Batch-Dedup → DB-Dedup (external_notice_id) → Hard Filter → RawLead[].
- [x] Orchestrator: `runPass0()` vor Pass 1, Merge in `allRelevantLeads`, 13 Procurement-DB-Felder im Insert.
- [x] `procurement` Feld durch ScoredLead (pass2) propagiert; EnrichedLead erbt via Spread.
- [x] Open-Data ZIP: TODO-Kommentar in pass0, wartet auf ZIP-Library (fflate/jszip).

## Task 7 - Scoring und Prompts ✅ (2026-06-08)

- [x] **Filter F** in `postProcessScoring()`: `too_late` → auto-NOT + Score ≤ 35; `unknown` + HOT/WARM → cap COLD (59).
- [x] Stream-Warnung bei Sales-Window-Cap (`unknown` Deckelung).
- [x] PASS_2_PROMPT: Procurement Anti-Halluzination — Deadline/CPV/Phase nicht erfinden; offene Ausschreibung ≠ LP5+; `additionalContext` gilt als autoritativ.
- [ ] Unit-Tests fuer Filter F (too_late, unknown-Cap, open/closing_soon unberuehrt).

## Task 8 - Tavily und Firecrawl ✅ (2026-06-08)

- [x] `migrations/008_tavily_forward_queries.sql` erstellt — **manuell in Supabase ausfuehren**.
- [x] Deaktiviert: `GU beauftragt Suche` (enabled=false).
- [x] Aktualisiert: competitionline, wettbewerbe-aktuell, BauNetz (Negativterme), Klinik-Neubauten, Industrie.
- [x] Neu: VgV Planungswettbewerb, BIM CDE Ausschreibung, Projektsteuerung AHO/DVP, Baubeschluesse Kommunen, Sanierung oeffentliche Gebaeude, Private Grossinvestoren Neubau.
- [ ] Firecrawl nur bei kurzem Content, fehlenden Fakten, dynamischer Seite oder relevantem PDF ausloesen.

## Task 9 - UI

- [ ] LeadCard um Deadline, Notice-Typ, Sales-Window, Buyer, CPV-Hinweis und Source Kind erweitern.
- [ ] `too_late` immer als NOT darstellen.
- [ ] Detailseite um strukturierte Vergabedaten, Original-Notice, Dokumente und CPV erweitern.
- [ ] Dashboard-KPIs fuer Open Sales Windows, Closing Soon und Hard-Filter-Auto-NOT ergaenzen.
- [ ] Bestehende NetzWerkPlan-Tokens und Layouts unveraendert weiterverwenden.

## Task 10 - Abschluss

- [ ] Neue Unit-Tests ausfuehren.
- [ ] Gesamte Vitest-Suite ausfuehren.
- [ ] `npm run build` ausfuehren.
- [ ] E2E-Smoke-Tests ausfuehren.
- [ ] Einen realen TED- und einen Open-Data-Datensatz durch Pass 0 bis Speicherung pruefen.
- [ ] Dokumentieren, wie viele Notices vor AI gefiltert und wie viele offene Sales-Fenster gefunden wurden.

## Akzeptanz

- HOT/WARM enthaelt keine Award-, Zuschlags-, Fertigstellungs- oder Referenzmeldungen.
- Abgelaufene Fristen und LP5+/Ausfuehrung werden deterministisch NOT.
- Jeder Ausschreibungslead zeigt Quelle, Notice-Typ, Publikationsdatum, Frist und Sales Window, soweit vorhanden.
- Firecrawl bleibt Content-Fallback und entscheidet nie ueber Sales-Timing.
- Fehlende Daten bleiben `null`.
- Bestehende Lead-Validierung, Scoring-, Source- und E2E-Tests bleiben gruen.
