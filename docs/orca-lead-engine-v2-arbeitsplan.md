# Orca Lead Engine v2 Arbeitsplan

> Quelle: `orca-lead-engine-konzept-v2.html`
> Stand: 2026-06-08
> Arbeitsmodus: Schrittweise Umsetzung mit TDD fuer Pipeline-/Schema-Logik und gezielten UI-Checks fuer Frontend-Aenderungen.

## Ziel

Die bestehende Orca Lead Engine wird vom einfachen Lead-Pipeline-Prototypen zur NetzWerkPlan Sales-Maschine ausgebaut: Persona-Erkennung, Sales-Hebel, Anti-Halluzination, echte Enrichment-Strategie, Bauherrn-Lookup, neue Quellen und ein UI, das HOT/WARM/COLD/NOT sowie DIRECT/OPENER/INDIRECT unmittelbar sichtbar macht.

## Aktueller Projektstand

- Next.js 15 App Router mit TypeScript, Tailwind v4, shadcn/ui, Supabase, OpenRouter, Tavily und RSS.
- Bestehende Pipeline in `lib/pipeline/` mit Pass 1 Relevanz, Pass 2 Scoring, Pass 3 Cross-Reference.
- Aktuelles DB-Schema in `migrations/001_init.sql` kennt noch kein `hebel_type`, keine erweiterten Personas, keine `lead_class`, keine Sales-Strategie-Felder und keine Lookup-Verknuepfungen.
- Aktuelle Prompts in `lib/ai/prompts.ts` enthalten noch simulierte Kontakte und explizite Beispiel-Platzhalter. Das kollidiert mit der Anti-Halluzinations-Regel aus dem Konzept.
- UI in `app/page.tsx` und `app/leads/page.tsx` ist funktionsfaehig, aber noch nicht auf die v2-Lead-Logik ausgelegt.
- Auffaelliger Bug im aktuellen Pass 1: `allRawLeads` wird nie befuellt, obwohl `rawLeads` aus den Source-Ergebnissen berechnet wird. Dadurch koennen Source-Run-Counts im Orchestrator falsch bleiben.

## Leitplanken

- Keine neuen Pipeline-Features ohne vorherigen Test fuer die betroffene Logik.
- KI-Ausgaben werden mit Zod validiert und danach mit eigenen Validatoren bereinigt.
- Fehlende Daten bleiben `null`; keine Fantasie-Namen, keine Platzhalter-Kontakte.
- Jede Phase soll einzeln lauffaehig und demo-faehig bleiben.
- UI baut auf gespeicherten, validierten Feldern auf; keine wichtige Sales-Logik nur im Frontend rekonstruieren.

## Phase 0 - Fundament pruefen

**Ziel:** Den aktuellen Prototyp stabilisieren, bevor v2-Felder eingebaut werden.

**Dateien:**
- `lib/pipeline/pass1-broad.ts`
- `lib/pipeline/orchestrator.ts`
- `lib/pipeline/stream.ts`
- `app/api/pipeline/run/route.ts`
- `package.json`

**Tasks:**

- [x] Test-Setup klaeren und einrichten, falls noch kein Runner fuer TS-Unit-Tests vorhanden ist.
- [x] Failing Test fuer Pass 1 schreiben: `runPass1` gibt alle rohen Leads in `rawLeads` zurueck und filtert relevante Leads separat.
- [x] Pass-1-Bug fixen: `allRawLeads` korrekt befuellen oder entfernen und `rawLeads` zurueckgeben.
- [x] Pipeline-Run einmal gegen vorhandene Quellen ausfuehren und Stream-Events/Run-Stats pruefen.
  - 2026-06-07: Vollstaendiger Run abgeschlossen: Pass 1 = 97, Pass 2 = 66, Pass 3 = 22, Dauer 480s (vorher Timeout). Pass-1-AI-Filter auf 8 parallele Batches umgestellt (war sequenziell) — Durchlaufzeit von >90s auf ~25s reduziert.
- [x] README-Status aktualisieren, sobald der Smoke-Test real durchgelaufen ist.

**Akzeptanz:**
- Source-Counts im Orchestrator basieren auf echten rohen Leads.
- Pipeline kann ohne UI-Regression gestartet werden.

## Phase A - Pipeline-Refactoring nach v2-Konzept

**Ziel:** Personas, Sales-Hebel, Lead-Klassen, Scoring-Breakdown und Anti-Halluzination als Backend-Wahrheit etablieren.

**Dateien:**
- `migrations/004_lead_engine_v2.sql`
- `lib/supabase/types.ts`
- `lib/ai/schemas.ts`
- `lib/ai/prompts.ts`
- `lib/pipeline/pass1-broad.ts`
- `lib/pipeline/pass2-deep.ts`
- `lib/pipeline/pass3-cross.ts`
- `lib/pipeline/orchestrator.ts`
- Neu: `lib/pipeline/lead-validation.ts`
- Neu: `lib/pipeline/scoring.ts`

**Schema-Erweiterungen:**
- `persona`: `bauherr_public`, `bauherr_private`, `gu`, `projektsteuerer`, `planer`, `unknown`
- `hebel_type`: `direct`, `opener`, `indirect`
- `hebel_multiplier`: numeric
- `basis_score`: integer
- `final_score`: integer
- `lead_class`: `hot`, `warm`, `cold`, `not`
- `bauherr_name`, `architekt_name`, `gu_name`, `ps_name`
- `project_phase`, `project_date`
- `score_breakdown` JSONB
- `sales_strategy`, `killer_arguments`, `best_timing`, `decision_makers`
- `data_quality`: `verified`, `inferred`, `missing`
- `opener_lead_id` fuer spaetere Lookup-Verknuepfung

**Tasks:**

- [x] Migration fuer v2-Felder schreiben.
  - 2026-06-07: `npm run check:schema` gegen Supabase ausgefuehrt. Ergebnis: v2-Migration ist noch nicht angewendet (`leads.lead_class` fehlt). `migrations/004_lead_engine_v2.sql` muss im Supabase SQL Editor ausgefuehrt werden.
  - 2026-06-07: Pipeline-Preflight ergaenzt. `runPipeline` prueft die v2-Spalten vor Source-Fetch und AI-Calls, damit fehlende Migrationen sofort klar fehlschlagen.
  - 2026-06-07: Nach Ausfuehrung von `004_lead_engine_v2.sql` meldet `npm run check:schema`: OK.
- [x] Supabase-Typen manuell synchronisieren oder spaeter per Supabase CLI generieren.
- [x] Zod-Schemas fuer Pass 1, Pass 2 und Pass 3 an Konzept anpassen.
- [x] Failing Tests fuer `calculateFinalScore` schreiben: direct x1.0, opener x0.7, indirect x0.4.
- [x] Scoring-Helfer in `lib/pipeline/scoring.ts` implementieren.
- [x] Failing Tests fuer Lead-Klassifizierung schreiben: HOT/WARM/COLD/NOT anhand finalem Score und `is_lead`.
- [x] Failing Tests fuer Anti-Halluzinations-Validator schreiben: blockiert `Max Mustermann`, `John Doe`, `Anna Schmidt`, generische Firmen wie `Architektur AG` und unpassende E-Mail-Domains.
- [x] Validator in `lib/pipeline/lead-validation.ts` implementieren.
- [x] Pass-1-Prompt auf Persona + Hebel-Erkennung umbauen.
- [x] Pass 1 gibt Persona, Hebel-Typ und Begruendung an relevante Leads weiter; Pass 2 persistiert diesen Kontext in `pass1Data`.
- [x] Pass-2-Prompt auf strukturierte Extraktion + Score-Breakdown umbauen.
- [x] Pass-3-Prompt auf Enrichment + Sales-Strategie umbauen und simulierte Kontakte entfernen.
- [x] Orchestrator-Speicherung auf neue Felder erweitern.
- [x] Test-Run mit 5 echten Leads dokumentieren.
  - 2026-06-07: `/api/pipeline/run?limit=5` gegen lokalen Produktionsserver ausgefuehrt. Ergebnis: Pass 1 = 5, Pass 2 = 5, Pass 3 = 4, Abschluss-Event `done`. Danach `npm run test:e2e` gruen.

**Akzeptanz:**
- Jeder gespeicherte Lead hat `persona`, `hebel_type`, `basis_score`, `final_score`, `lead_class` und `data_quality`.
- Keine Beispiel- oder Platzhalterkontakte werden gespeichert.
- OPENER-Leads koennen sauber von DIRECT-Leads unterschieden werden.

## Phase B - UI im NetzWerkPlan-Branding

**Ziel:** Die v2-Sales-Logik in der Oberflaeche sichtbar und nutzbar machen.

**Dateien:**
- `app/globals.css`
- `app/page.tsx`
- `app/leads/page.tsx`
- `app/leads/[id]/page.tsx`
- `components/Sidebar.tsx`
- Neu: `components/LeadCard.tsx`
- Neu: `components/LeadFilters.tsx`
- Neu: `components/ScoreBreakdown.tsx`

**Tasks:**

- [x] NetzWerkPlan-Farb-Tokens in `app/globals.css` konsolidieren: Blau, Gold, Statusfarben, neutrale UI-Flaechen.
- [x] Dashboard-Stats auf HOT, WARM, OPENER und verfuegbare Bauherrn-Lookups umstellen.
- [x] Lead-Hauptansicht von Tabelle auf 4 Tabs HOT/WARM/COLD/NOT umbauen.
- [x] Lead-Card bauen mit Score, Hebel-Badge, Persona-Badge, Bauherr/Architekt/Kontakt und Sales-Strategie.
- [x] OPENER-Karten mit Bauherrn-Lookup-Button anzeigen, aber nur wenn `hebel_type = opener`.
- [x] Filter-Panel mit Min-Score, Hebel, Persona, Min-Volumen, Standort und Reset.
- [x] Detailseite um Score-Breakdown, Datenqualitaet und Enrichment-Historie erweitern.
- [x] Mobile und Desktop technisch pruefen.
  - 2026-06-07: Playwright eingerichtet. `npm run test:e2e` prueft Dashboard und Leads auf Chromium Desktop und Mobile gegen `next start`, inklusive Horizontal-Overflow-Check.

**Akzeptanz:**
- Vertrieb sieht in 5 Sekunden: Klasse, Hebel, Persona, Score, naechster Sales-Schritt.
- Filter veraendern die Lead-Liste ohne Layout-Spruenge.
- OPENER- und DIRECT-Leads sind visuell eindeutig unterscheidbar.

## Phase C - Bauherrn-Lookup

**Ziel:** Aus einem OPENER-Lead einen verifizierbaren DIRECT-Bauherrn-Lead erzeugen.

**Dateien:**
- Neu: `app/api/bauherrn-lookup/[leadId]/route.ts`
- Neu: `lib/pipeline/bauherrn-lookup.ts`
- `lib/ai/schemas.ts`
- `lib/ai/prompts.ts`
- `lib/pipeline/orchestrator.ts`
- `app/leads/page.tsx`
- `app/leads/[id]/page.tsx`

**Tasks:**

- [x] Failing Test schreiben: Lookup lehnt Nicht-OPENER-Leads ab.
- [x] Failing Test schreiben: Lookup gibt `null` fuer Bauherr zurueck, wenn Quellenlage unklar ist.
- [x] Dediziertes Bauherrn-Lookup-Schema definieren.
- [x] Tavily-Recherche fuer Projekt + Architekt + Standort implementieren.
- [ ] Optional Apollo-Enrichment nur fuer validierte Bauherrn-Top-Leads anbinden.
- [x] Neuen DIRECT-Lead mit `opener_lead_id` speichern.
- [x] UI-Button an API anbinden und Lade-/Fehlerzustand darstellen.
- [x] Lookup-Ergebnis in der Lead-Detailseite verlinken.
  - 2026-06-07: DIRECT-Lead zeigt "Erstellt aus OPENER-Lead" Card mit Link zurueck. OPENER-Lead zeigt alle erzeugten DIRECT-Leads mit Score und Bauherr-Name.

**Akzeptanz:**
- Ein OPENER-Lead kann einen neuen DIRECT-Lead erzeugen.
- Unklare Lookups speichern keine erfundenen Bauherren.
- Ursprungs-Lead und erzeugter Lead bleiben nachvollziehbar verknuepft.

## Phase D - Neue Quellen integrieren

**Ziel:** Quellenabdeckung auf die v2-Personas ausweiten.

**Dateien:**
- `migrations/002_seed_sources.sql` oder neue Seed-Migration
- `lib/sources/types.ts`
- `lib/sources/index.ts`
- `lib/sources/tavily-adapter.ts`
- `app/sources/page.tsx`

**Quellen-Buckets:**
- Bauherrn oeffentlich: `service.bund.de`, TED EU, oeffentlichevergabe.de, eVergabe-Laender, DB Bieterportal, Autobahn GmbH.
- Bauherrn privat: Klinik-Neubau, Industrie-Erweiterungen, Wohnungsbau-Grossprojekte.
- GU: Goldbeck, Zueblin, Strabag, Hochtief, allgemeine `GU beauftragt`-Suche.
- Projektsteuerer: DVP, AHO, VgV-Projektsteuerung, Drees & Sommer, Hill International.
- Architekten/Tueroeffner: competitionline, wettbewerbe-aktuell, BauNetz, Architektenkammern.

**Tasks:**

- [x] Source-Konfiguration um Persona-/Prioritaets-Metadaten erweitern.
  - 2026-06-07: `migrations/005_source_persona.sql` ergaenzt `persona` und `priority` Spalten. `lib/sources/types.ts` um `SourcePersona` und `SourcePriority` erweitert.
- [x] Seeds fuer neue Quellen ergaenzen.
  - 2026-06-07: 8 neue Tavily-Quellen in `005_source_persona.sql`: Klinik, Industrie, Wohnungsbau, Goldbeck, GU-Suche, DVP, Drees & Sommer, VgV, Architektenkammer.
- [x] Tavily-Queries pro Quellen-Bucket konkretisieren.
  - 2026-06-07: Spezifische Queries pro Bucket in Migration eingebettet.
- [x] Tests fuer Source-Normalisierung schreiben: Jede Quelle liefert `sourceId`, `sourceUrl`, `title`, `description`, optional `publishedAt`.
  - 2026-06-07: `tests/source-normalization.test.ts` mit 9 Tests gruen. RSS + Tavily + Persona-Metadaten abgedeckt.
- [x] UI fuer Quellen nach Prioritaet und Persona gruppieren.
  - 2026-06-07: `app/sources/page.tsx` auf Card-Grid mit Persona-Gruppen umgebaut. P1/P2/P3 Badge pro Quelle.
- [ ] Editierbarkeit von Source-Konfigurationen planen oder als spaetere Admin-Funktion abgrenzen.

**Akzeptanz:**
- Quellen lassen sich nach Persona und Prioritaet auswerten.
- Pipeline kann neue Tavily-Buckets ohne Sonderlogik pro Bucket verarbeiten.

## Phase E - Demo-Vorbereitung

**Ziel:** Stabile Demo fuer Mersch/NetzWerkPlan mit reproduzierbaren Ergebnissen.

**Dateien:**
- Neu: `docs/demo-mersch-script.md`
- Optional neu: `migrations/005_demo_seed_leads.sql`
- Optional neu: `lib/demo/demo-cache.ts`
- `app/page.tsx`
- `app/leads/page.tsx`

**Tasks:**

- [x] Demo-Story schreiben: Schneeballprinzip, DIRECT vs OPENER, Lookup, Sales-Strategie.
  - 2026-06-07: `docs/demo-mersch-script.md` erstellt. 8-Minuten-Ablauf mit Backup-Szenarien.
- [x] Demo-Cache oder Seed-Leads fuer stabile Vorfuehrung anlegen.
  - 2026-06-07: `migrations/006_demo_seed_leads.sql` angelegt, dann auf Nutzerwunsch geloescht — "keine Mockup-Daten". Demo laeuft ausschliesslich mit echten Pipeline-Runs.
- [x] Empty States und Error States fuer Pipeline, Leads, Lookup und Sources polieren.
  - 2026-06-07: Runs-Seite auf Card-Layout mit Status-Icons umgebaut. Empty States auf allen Seiten vorhanden.
- [x] Animationen nur dort einsetzen, wo sie Status oder Fortschritt erklaeren.
  - 2026-06-07: Framer Motion nur Dashboard-Eingang + PipelineStream-Events. Kein dekoratives Flackern.
- [x] PipelineStream-Komponente auf 3-Karten-Layout umgebaut.
  - 2026-06-07: `components/PassCard.tsx` neu erstellt. `components/PipelineStream.tsx` zeigt Pass 1 / Pass 2 / Pass 3 als Grid. Zustand: idle/running/complete/error mit Farbakzenten. Auto-Scroll Logs. Animate-on-complete Footer-Statistik.
- [x] Runs-Seite auf Card-Layout poliert.
  - 2026-06-07: `app/runs/page.tsx` zeigt Status-Icons (CheckCircle, XCircle, Clock), Pass1→Pass2→Pass3-Pfeil-Flow, Empty State mit Zap-Icon.
- [x] Build laufen lassen.
  - 2026-06-07: `npm run build` gruen. Alle Routen dynamisch gerendert, keine TS/ESLint-Fehler.
- [ ] Demo-Durchlauf dokumentieren: Startseite, Pipeline, HOT-Lead, OPENER-Lookup, DIRECT-Folge-Lead.

**Akzeptanz:**
- Demo funktioniert ohne Live-Zufall als reproduzierbarer Ablauf.
- Sales-Nutzen ist vor dem technischen Detail sichtbar.

## Bug-Fixes und Qualitaets-Nacharbeiten (2026-06-07)

Fixes die nach dem ersten echten Full-Run notwendig waren:

### Pass-1-Timeout-Fix
- **Problem:** Pass-1-AI-Filter lief sequenziell — bei 97 rohen Leads >90s Timeout.
- **Fix:** `lib/pipeline/pass1-broad.ts` — parallele Batches mit `CONCURRENCY=8` via `Promise.all`.
- **Ergebnis:** Pass-1-Filterzeit von >90s auf ~25s reduziert. Gesamt-Run jetzt ~60-80s statt Timeout.

### Lead-Qualitaet Fix
- **Problem:** Alle Leads hatten Score 85, alle waren INDIRECT, "Architekturbüro X" in DB, BauNetz-Ranking-Seiten als Leads.
- **Fix 1 - Prompts:** `lib/ai/prompts.ts` komplett ueberarbeitet:
  - Pass 1: Explizite NICHT-Lead-Liste (Ranking-Seiten, Login-Seiten, Jahresberichte, Bot-Captcha-Seiten, generische Plattformseiten).
  - Pass 2: Explizite Punkt-Spannen pro Scoring-Dimension (Aktualitaet/Volumen/Phase/Persona/Komplexitaet). Strikte Null-Regel. Kein Platzhalter-Firmennamen.
  - Pass 3: Strikte Anti-Halluzinations-Formulierung. Beispiel-Placeholder aus Prompt entfernt.
- **Fix 2 - Validator:** `lib/pipeline/lead-validation.ts` — `GENERIC_COMPANY_PATTERNS` erweitert um: `Architekturbüro X`, `Bauunternehmen X`, generische Firmensuffixe.
- **Fix 3 - Orchestrator:** `lib/pipeline/orchestrator.ts` — `normalizeCompanyName()` auf `company_name`-Feld angewendet. Import aus `lead-validation.ts`.

### Zod-Schema-Fix score_reasoning
- **Problem:** AI liefert `score_reasoning` manchmal als Objekt statt String — Zod `z.string()` schlaegt fehl.
- **Fix:** `lib/ai/schemas.ts` — `z.union([z.string(), z.record(z.string(), z.unknown())]).transform(v => typeof v === 'string' ? v : JSON.stringify(v))`.

### Test-Fixes
- Pass-1-Batch-Test: `toHaveBeenCalledTimes(1)` → `toHaveBeenCalledTimes(2)` nach Batch-Refactor.
- Vitest ESM-Mock-Fehler `@tavily/core`: `vi.spyOn` auf ESM nicht moeglich → top-level `vi.mock('@tavily/core', ...)` mit shared `mockSearch`-Referenz.
- Pass-3-Prompt-Test: `not.toContain('Max Mustermann')` schlagte fehl weil Platzhalter im Prompt. Entfernt.

## Offene Entscheidungen

- Soll Apollo sofort integriert werden oder erst nach stabiler Tavily-/Validator-Phase?
- Soll das bestehende `score`-Feld als Alias fuer `final_score` bleiben oder komplett ersetzt werden?
- Sollen Lead-Klassen als reine Score-Schwellen gelten oder zusaetzlich `data_quality` beruecksichtigen?
- Soll Source-Konfiguration im UI editierbar sein oder zunaechst nur per Seed/Migration?
- Welche Supabase-Migrationen sind schon produktiv ausgefuehrt und duerfen nicht mehr veraendert werden?

## Phase F - UI Redesign (NetzWerkPlan Branding)

**Ziel:** Komplettes visuelles Redesign nach Claude-Design-Vorlage. Kein Backend angefasst.

**Quellen:** Claude Design Bundle `ORCA Lead Engine.html` — TAR-Archiv entpackt, alle JSX/CSS Source-Files ausgelesen.

**Umgesetzte Dateien:**

- [x] `app/globals.css` — CSS-Token-System komplett: `--navy`, `--gold`, `--console-bg`, `--font-head/body/mono`, Shadows, Animationen (`revealUp`, `funnel-fill`, `cursor-blink`, `pulse-ring`)
- [x] `app/layout.tsx` — Sora + JetBrains Mono via `next/font/google`. Font-CSS-Variablen injiziert.
- [x] `components/Sidebar.tsx` — Dunkles Navy (`#1a1f6e`), NetzWerkPlan-Logo oben (`public/netzwerkplan-logo.png`), Gold-Akzent bei aktivem Nav-Link, Online-Dot im Footer
- [x] `components/DashboardClient.tsx` — Hero-Section mit Navy-Gradient, Grid-Lines-Overlay, Gold-Glow, Funnel-Panel (letzter Run), KPI-Strip 4-spaltig
- [x] `components/PassCard.tsx` — Dunkle Konsole (`#0f1117`), Lucide-Icons statt Emojis, Status-Streifen links (gold=running, green=complete, red=error), Cursor-Blink
- [x] `components/PipelineStream.tsx` — Section-Label mit Navy/Gold-Icon-Box, Live-Badge mit Pulse-Ring
- [x] `components/LeadCard.tsx` — Tier-Streifen links, Score-Ring (SVG), Hover-Lift, neue HOT/WARM/COLD/NOT + DIRECT/OPENER/INDIRECT Badges
- [x] `app/leads/page.tsx` — Tab-Navigation HOT/WARM/COLD/NOT (URL-Param `?tab=`), Group-Header, Filter-Panel
- [x] `app/sources/page.tsx` — Navy-Gruppen-Header mit Icon-Box, P1/P2/P3-Badges, Active-Dot grün
- [x] `app/runs/page.tsx` — Run-Cards mit Status-Streifen, ChevronRight statt `→`, Dauer-Spalte
- [x] `app/page.tsx` — Pass-Counts (pass_1/2/3_results) aus letztem Run an DashboardClient weitergegeben

**Offen:**
- [x] NetzWerkPlan-Logo Sidebar: `public/netzwerkplan-logo.png` liegt und rendert korrekt — PNG enthält "NetzWerkPlan" + "an orca group company" als Bildinhalt, `next/image` zeigt es oben links in der Sidebar.

## Vollstaendigkeitspruefung 2026-06-08 (Morgen-Session)

**Alle Seiten und Backend verifiziert:**

| Seite | Status | Details |
|---|---|---|
| `/` Dashboard | ✅ | 54 HOT, Funnel 38→32→22, KPI-Strip, echte Daten |
| `/sources` | ✅ | 19 Quellen, Navy-Headers, P1/P2 Badges, Active-Dots |
| `/leads` | ✅ | 73 HOT / 22 WARM / 8 COLD, ScoreRings, Filters |
| `/runs` | ✅ | 15 Runs, completed/failed, Pass-Zahlen, Dauer |
| `/api/pipeline/run` | ✅ | GET SSE-Stream, 200 + `text/event-stream` |

**Bug-Fixes aus dieser Session:**

### LeadCard Client-Component Bug
- **Problem 1:** `components/LeadCard.tsx` hatte `onMouseEnter/onMouseLeave` Event-Handler ohne `'use client'`-Direktive → Leads-Seite crashte mit "Event handlers cannot be passed to Client Component props".
- **Fix:** `'use client'` am Anfang von `LeadCard.tsx` hinzugefuegt.

### Client-Funktion in Server-Komponente Bug
- **Problem 2:** Nach dem `'use client'`-Fix: `getFinalScore` und `getLeadClass` waren in der Client-Komponente `LeadCard.tsx` als Exports definiert, wurden aber im Server-Component `app/leads/page.tsx` importiert. Next.js verbietet das: "Attempted to call getFinalScore() from the server but getFinalScore is on the client."
- **Fix:** Neue Datei `lib/lead-utils.ts` erstellt mit reinen Hilfsfunktionen (`getFinalScore`, `getLeadClass`, `clampScore`, `LeadClass` Type). Beide Dateien (`app/leads/page.tsx` und `components/LeadCard.tsx`) importieren jetzt aus `@/lib/lead-utils`.

## Empfohlene naechste Umsetzung

1. Phase 0 abschliessen, besonders Pass-1-Rohdaten-Bug und Smoke-Test.
2. Phase A in kleinen TDD-Schritten beginnen: erst `scoring.ts`, dann `lead-validation.ts`, dann Zod-Schemas und Prompts.
3. Erst wenn v2-Felder in der DB gespeichert werden, mit Lead-Card und Tabs in Phase B starten.

## UI-Nacharbeit - PassCard Terminal-Fenster (2026-06-08)

**Ziel:** Die drei Scan-/Match-/Connect-Terminals behalten eine feste Hoehe und verhalten sich bei laufenden Logs wie ein Terminal.

**Datei:**
- `components/PassCard.tsx`

**Tasks:**

- [x] Log-Container auf feste Hoehe `240px` umstellen und wachsendes Flex-Verhalten entfernen.
- [x] Logs chronologisch rendern und mit `flex-direction: column-reverse` am unteren Rand halten.
- [x] Scroll-Lock implementieren: Auto-Scroll nur, solange der Nutzer am unteren Rand ist.
- [x] Bei manuellem Hochscrollen neue Logs zaehlen und einen "neue Eintraege"-Button anzeigen.
- [x] Log-Schrift auf `13px`, Zeilenhoehe auf `1.5` und Textfarbe auf einen helleren Slate-Ton setzen.
- [x] Zeitstempel als `HH:mm:ss` vor jeder Log-Zeile anzeigen.
- [x] Komponententest fuer Auto-Scroll und Scroll-Lock zuerst fehlschlagen lassen.
- [ ] Pipeline-Smoke-Test dokumentieren: konstante Hoehe, neueste Zeile unten, Historie scrollbar.

**Leitplanken:**

- Keine Aenderung an Pipeline-Logik oder SSE-Event-Struktur.
- Keine neuen Libraries und keine Design-Aenderungen ausserhalb des Log-Fensters.

## Lead-Qualitaet - Sales-Timing (2026-06-08)

- [x] Root Cause am Westendbruecke-Lead verifiziert: Volltext war vorhanden, aber LP5+/laufende Ausfuehrung erhielt faelschlich 20 Phasenpunkte.
- [x] Match-Prompt korrigiert: LP5+/laufende Bauarbeiten erhalten 0 Phasenpunkte und Auto-NOT.
- [x] Hard-Filter ergaenzt: Ausfuehrungsphase mit vergangenem Projekt-/Baubeginn erzwingt `lead_class = not`.
- [x] Regressionstest fuer bereits gestartete Ausfuehrung ergaenzt.
- [x] Firecrawl nicht als Scoring-Fix, sondern als serverseitigen Content-Fallback integriert.
- [x] Tavily bleibt Suche; Firecrawl `/v2/scrape` wird nur bei weniger als 1.000 Zeichen Inhalt aufgerufen.
- [x] Firecrawl-Ausfall faellt auf vorhandenen Tavily-Text zurueck und stoppt die Pipeline nicht.

## Phase G - Aktuelle Quellen und offenes Sales-Fenster

**Ziel:** Nicht moeglichst viele Bau-Nachrichten sammeln, sondern aktuelle Projekte finden, bei denen eine CDE-Einfuehrung noch realistisch ist.

**Detailplan:** `docs/quellenstrategie-aktuelle-leads.md`

**Implementierungsplan:** `docs/strukturierte-vergabedaten-implementierungsplan.md`

**Prioritaet:**

1. Bekanntmachungsservice Oeffentliche Vergabe Open Data (eForms/OCDS/CSV)
2. TED Search API mit strukturierten Notice-Typ-, CPV-, Datums- und Fristfiltern
3. Tavily fuer fruehe Projektsignale ohne strukturierte API
4. Firecrawl fuer Detailseiten und Vergabe-PDFs

**Tasks:**

- [ ] Offene Bekanntmachungen, Vorinformationen und Teilnahmewettbewerbe separat modellieren.
- [ ] Award-/Result-Notices bereits vor dem KI-Scoring ausschliessen.
- [ ] `deadline`, `notice_type`, `procurement_stage` und `sales_window` als Felder planen.
- [ ] Abgelaufene Fristen und bereits gestartete Ausfuehrung deterministisch auf NOT setzen.
- [ ] CPV-Filter fuer Architektur, Ingenieurwesen, Projektsteuerung und direkte CDE-/BIM-Beschaffung definieren.
- [ ] Bestehende rueckblickende Tavily-Queries ersetzen.
- [ ] Quellen-Ertrag pro Lauf messen und schlechte Quellen automatisch sichtbar machen.

**Akzeptanz:**

- HOT/WARM enthaelt keine Zuschlags- oder Fertigstellungsmeldungen.
- Jeder Ausschreibungs-Lead zeigt Notice-Typ, Publikationsdatum und Frist.
- Priorisiert werden LP2-LP4, Projektsteuerung, BIM/CDE und komplexer Hochbau.
- Firecrawl verbessert unvollstaendige Inhalte, entscheidet aber nicht ueber das Sales-Timing.

**Fortschritt 2026-06-08:**

- [x] Schritt 1 abgeschlossen: Procurement-Typen und gruppenbasierter CPV-Helper.
- [x] Schritt 2 abgeschlossen: Procurement Hard Filter mit sieben Regressionstests.
- [x] Schritt 3 abgeschlossen: additive Migration 007 und synchronisierte Supabase-Types.
- [x] Migration 007 produktiv ausgefuehrt; REST-Spaltencheck und `npm run check:schema` gruen.
- [x] Pipeline-Preflight prueft Migration 007 vor Source- und AI-Aufrufen.
- [x] Schritt 4 abgeschlossen: TED-v3-Adapter, reale Feldformen und Live-Query verifiziert.
- [x] Schritt 5 abgeschlossen: Open-Data Adapter fuer OCDS/eForms/CSV mit offizieller Bulk-API.
- [x] Schritt 6 abgeschlossen: Pass 0 Procurement-Scan — siehe Phase H.

**Fortschritt 2026-06-09:**

- [x] Alle Phase-G-Ziele erfuellt: HOT/WARM enthaelt keine Zuschlags-/Fertigstellungsmeldungen mehr (PASS_1 + PASS_2 Prompt-Regeln). Jeder TED-Lead zeigt Notice-Typ, Publikationsdatum, Frist. CPV-Filter aktiv.
- [x] 32 aktive Quellen (Tavily + RSS + TED) decken alle Bausektoren ab.
- [x] Quellen-Ertrag sichtbar im Dashboard-Widget (letzte 7 Tage).

## Phase H — TED-Integration + Procurement-Pipeline (abgeschlossen 2026-06-09)

**Ziel:** Strukturierte Vergabedaten (TED Europa) als erste Pipeline-Stufe (Pass 0) integrieren. Deterministische Hard-Filter vor KI-Calls. Vollstaendige end-to-end Verifikation mit echten TED-Leads in DB.

**Neue Dateien:**
- `lib/pipeline/pass0-procurement.ts` — Pass 0 Orchestrator (TED fetch → Dedup → Hard Filter → RawLead)
- `lib/pipeline/procurement-filter.ts` — deterministischer Hard Filter (kein AI-Cost)
- `lib/sources/procurement/ted-adapter.ts` — TED Europa v3 JSON API
- `lib/sources/procurement/open-data-adapter.ts` — OCDS/eForms/CSV Normalizer (ZIP TODO)
- `lib/sources/procurement/types.ts` — ProcurementNotice Interface
- `migrations/008_tavily_forward_queries.sql` — Forward-Looking Queries + 6 neue Buckets
- `migrations/009_sector_expansion.sql` — 8 neue Sektor-Buckets

**Tasks:**

- [x] Pass 0 implementiert: TED fetch → Batch-Dedup → DB-Dedup → Hard Filter → RawLead[]
- [x] `ProcurementMeta` Interface: externalId, salesWindow, deadline, cpvCodes, buyerName, estimatedValue etc.
- [x] `additionalContext` in RawLead injiziert → PASS_2_PROMPT bekommt strukturierte Vergabedaten
- [x] `procurement` Feld durch Pass 2 → Pass 3 → DB propagiert (13 Felder im DB-Insert)
- [x] `pass0_complete` Stream-Event: fetched/relevant/filtered/duplicates
- [x] Orchestrator: `tedLimit` URL-Parameter fuer schnelle Test-Runs (`?tedLimit=3`)
- [x] Filter F in `postProcessScoring()`: `too_late` → auto-NOT (Score ≤ 35); `unknown` kein Cap
- [x] Filter A fuer Procurement: immer `publishedAt` als Referenz (nicht KI-extrahiertes Baudatum)
- [x] PASS_2_PROMPT Anti-Halluzination: project_date = Publikationsdatum, nicht historisches Baubeginn-Datum
- [x] Tavily Forward Queries Migration 008: rueckblickende Queries ersetzt, 6 neue Buckets
- [x] UI LeadCard: TED-Badge (navy), Sales-Window-Badge (gold/gruen), Deadline in Meta-Zeile
- [x] UI Detail-Seite: Vergabe-Daten Block (Notice-Typ, Phase, Deadline, Auftraggeber, Wert, CPV, TED-Link)
- [x] **Bug Fix 1**: `source_id: 'ted'` war String statt UUID-FK → silent DB-Insert-Fehler → UUID-Lookup in runPass0
- [x] **Bug Fix 2**: KI halluzinierte historisches Baudatum → Filter A rejected alle TED-Leads → procurement nutzt publishedAt
- [x] **Bug Fix 3**: `ContactSchema email` `.optional()` crashte bei KI-Null → `.nullish()` fix
- [x] Error-Logging in Orchestrator DB-Insert hinzugefuegt (war silent, bugs unsichtbar)
- [x] End-to-end verifiziert: 2 echte HOT-TED-Leads in DB (DB InfraGO AG 92, Hochsauerlandkreis 82)
- [x] Dedup verifiziert: zweiter Run zeigt `duplicates: 2` ✓
- [x] Dashboard Quellen-Performance Widget: Top 10 Quellen mit HOT+WARM-Rate, Qualitaets-Bar, TED-Badge
- [x] Sektor-Erweiterung Migration 009: 8 neue Buckets (Schulen, Hochschule, Kultur, Sport/Stadion, Pflege, RZ, Hotel, Justiz) → 32 aktive Quellen
- [x] PASS_1_PROMPT: explizite Regeln gegen abgeschlossene/laufende Projekte (kein AI-Cost fuer offensichtlich alte Leads)

**Akzeptanz:**

- TED-Lead fliesst von Pass 0 → Pass 2 (scoring) → Pass 3 (enrichment) → DB mit allen 13 Procurement-Feldern ✓
- Abgelaufene/vergabe-abgeschlossene Notices werden vor KI-Call herausgefiltert ✓
- HOT/WARM enthaelt keine Fertigstellungs-/Zuschlagsmeldungen ✓
- 32 aktive Quellen decken alle relevanten Bausektoren ab ✓

**Offen:**

- [ ] Open-Data ZIP-Import (wartet auf ZIP-Library-Freigabe / in Pass 0 als Fallback abgefangen)
- [x] Deep Research end-to-end verifizieren (braucht frischen HOT-Lead)
- [x] OPENER/LOOKUPS Dashboard-Count pruefen (zeigt 0)
- [x] Leads-Seite: "Alle"-Tab hinzufuegen
