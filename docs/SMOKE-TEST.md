# NetzWerkPlan Lead Engine — Smoke-Test Checklist
**Datum:** 09.06.2026 | **Tester:** Eeraj | **Ziel:** Demo-Freigabe für Oliver

> Alle Tests auf `http://localhost:3000` — echte Daten, kein Mock.
> Abhaken wenn OK, Bemerkung bei Abweichung eintragen.

---

## 1. Dashboard (`/`)

| # | Test | Erwartung | OK? |
|---|------|-----------|-----|
| 1.1 | Seite lädt ohne Fehler | Kein 500/Crash, Hero-Bereich sichtbar | ☐ |
| 1.2 | Hero-Zahl (HOT-Leads) | Zahl > 0, korrekte Farbe (Gold) | ☐ |
| 1.3 | "Letzter Lauf" Label | Datum + Status angezeigt (z.B. `completed · 09.06.2026`) | ☐ |
| 1.4 | Funnel-Panel (Letzter Lauf) | Scan / Match / Connect — Balken und Zahlen sichtbar | ☐ |
| 1.5 | KPI-Strip: WARM-Leads | Zahl > 0 | ☐ |
| 1.6 | KPI-Strip: TED-Leads | Zahl ≥ 2 (mind. 2 echte TED-Leads in DB) | ☐ |
| 1.7 | KPI-Strip: Neue heute | Zahl ≥ 0 (0 = OK wenn kein Run heute) | ☐ |
| 1.8 | KPI-Strip: Aktive Quellen | Zahl = 32 | ☐ |
| 1.9 | Quellen-Performance-Tabelle | Mind. 1 Zeile sichtbar, TED-Badge navy | ☐ |
| 1.10 | "Alle Leads" Link | Navigiert zu `/leads` | ☐ |

---

## 2. Leads-Seite (`/leads`)

### 2a. Tabs & Counts

| # | Test | Erwartung | OK? |
|---|------|-----------|-----|
| 2.1 | Seite lädt (Default: `heute`) | Kein Crash, Tab-Leiste sichtbar | ☐ |
| 2.2 | "Alle"-Tab (1. Tab) | Sichtbar mit LayoutList-Icon, zeigt Gesamt-Count | ☐ |
| 2.3 | "Alle"-Tab klicken | Alle Lead-Klassen gemischt in Liste | ☐ |
| 2.4 | HOT-Tab | Nur HOT-Leads (rote Flame-Icon), Count > 0 nach Zeitraum 7d | ☐ |
| 2.5 | WARM-Tab | Nur WARM-Leads | ☐ |
| 2.6 | COLD-Tab | Nur COLD-Leads (oder leer = OK) | ☐ |
| 2.7 | NOT-Tab | Nur NOT-Leads (oder leer = OK) | ☐ |

### 2b. Filter

| # | Test | Erwartung | OK? |
|---|------|-----------|-----|
| 2.8 | Zeitraum auf "7 Tage" | URL `?zeitraum=7d`, Lead-Count ändert sich | ☐ |
| 2.9 | Zeitraum auf "Letzter Run" | Zeigt Leads aus dem letzten Pipeline-Lauf | ☐ |
| 2.10 | Min-Score auf 80 | Nur HOT-Leads (Score ≥ 80) | ☐ |
| 2.11 | Min-Score auf 0 | Alle Leads inkl. NOT sichtbar | ☐ |
| 2.12 | Filter-Reset (Seite neu laden) | Default-State wiederhergestellt | ☐ |

### 2c. Lead-Cards

| # | Test | Erwartung | OK? |
|---|------|-----------|-----|
| 2.13 | HOT-Lead Card | Score-Ring (Zahl), HOT-Badge rot, Titel, Hauptakteur | ☐ |
| 2.14 | TED-Lead Card | TED-Badge navy + Frist-Badge sichtbar | ☐ |
| 2.15 | "Gefunden: TT.MM.JJJJ" | Timestamp aus `created_at` sichtbar | ☐ |
| 2.16 | "Details" Button | Navigiert zu `/leads/[id]` | ☐ |
| 2.17 | Pagination | Bei >15 Leads: "Nächste" Button, Seitenzahl korrekt | ☐ |

---

## 3. Lead-Detail (`/leads/[id]`) — PassCard

> Test mit **HOT-TED-Lead** (DB InfraGO, Score 92) oder einem anderen HOT-Lead.

| # | Test | Erwartung | OK? |
|---|------|-----------|-----|
| 3.1 | Seite lädt ohne Crash | Kein 500, Titel sichtbar | ☐ |
| 3.2 | Score-Box (oben links) | Score-Zahl (z.B. 92), HOT-Badge, "von 100 Punkten" | ☐ |
| 3.3 | Badges-Zeile | HOT + DIRECT/OPENER + TED EUROPA + Frist-Badge | ☐ |
| 3.4 | WHO/WHEN/WHERE/VOLUME | 2×2 Infoblock-Grid sichtbar, Werte gefüllt | ☐ |
| 3.5 | Vergabe-Daten Block | Ausschreibung, Phase, Deadline (Datum + Farbe), Auftraggeber | ☐ |
| 3.6 | Notice-ID Link | `TED Notice: 370908-2026` als klickbarer Link zu ted.europa.eu | ☐ |
| 3.7 | CPV-Codes | Mindestens 1 Code sichtbar | ☐ |
| 3.8 | Sales-Strategie | Gold-Box mit KI-Text (kein "undefined") | ☐ |
| 3.9 | Score-Breakdown | 5 farbige Balken: Phase/Volumen/Persona/Aktualität/Komplexität | ☐ |
| 3.10 | Score-Balken Summe | Summe ergibt basis_score (z.B. 92 = 20+20+15+25+12) | ☐ |
| 3.11 | Kontakte / Deep Research | Entweder echte Kontakte ODER "Cross-validated: Keine Kontakte" | ☐ |
| 3.12 | "Zurück"-Navigation | Browser-Back oder Link → zurück zu `/leads` | ☐ |

---

## 4. Pipeline starten (Dashboard)

| # | Test | Erwartung | OK? |
|---|------|-----------|-----|
| 4.1 | "Pipeline starten" Button klicken | Button disabled + "Pipeline läuft…", Zap-Icon spinnt | ☐ |
| 4.2 | Live-Stream erscheint | Terminal-Fenster öffnet sich unter dem Hero | ☐ |
| 4.3 | Pass 0 Event | `[SCAN] TED: X Notices gefunden` im Stream | ☐ |
| 4.4 | Pass 1 Events | `[SCAN] Quelle: X relevant` Nachrichten für mehrere Quellen | ☐ |
| 4.5 | Pass 2 Events | `[MATCH] Lead scored: X` Nachrichten (Score ≥ 40) | ☐ |
| 4.6 | Pass 3 Events | `[CONNECT] Deep Research` für HOT-Leads | ☐ |
| 4.7 | Pipeline-Ende | `done`-Event, Funnel-Panel aktualisiert (Scan/Match/Connect Zahlen) | ☐ |
| 4.8 | Neue Leads in DB | Nach Run: Leads-Seite zeigt neue `created_at`-Timestamps | ☐ |
| 4.9 | Tab schließen + neu öffnen | Pipeline lief weiter (SSE-Disconnect kein Abbruch), Run in `/runs` = `completed` | ☐ |

---

## 5. Quellen-Seite (`/sources`)

| # | Test | Erwartung | OK? |
|---|------|-----------|-----|
| 5.1 | Seite lädt | Liste aller Quellen sichtbar | ☐ |
| 5.2 | Quellen-Count | 32+ Quellen (inkl. neue Sektoren aus Migration 009) | ☐ |
| 5.3 | TED-Quelle sichtbar | "TED Europa (EU-Vergabe)" in der Liste, `ted`-Kind-Badge | ☐ |
| 5.4 | Neue Sektoren sichtbar | z.B. "Rechenzentrum Data Center Bau", "Schulneubau Bildungsbauten" | ☐ |

---

## 6. Pipeline-Runs (`/runs`)

| # | Test | Erwartung | OK? |
|---|------|-----------|-----|
| 6.1 | Seite lädt | Liste der Pipeline-Runs sichtbar | ☐ |
| 6.2 | Letzter Run Status | `completed` (nicht `failed`) | ☐ |
| 6.3 | Scan/Match/Connect Zahlen | Alle drei > 0 in einem kürzlichen Run | ☐ |
| 6.4 | Connect ≥ 1 | Mind. 1 HOT-Lead durch Pass 3 (Deep Research) gelaufen | ☐ |

---

## 7. API-Smoke (optional, für technisches Review)

```bash
# SSE Pipeline-Endpunkt erreichbar
curl -N "http://localhost:3000/api/pipeline/run?limit=2&tedLimit=3" 2>&1 | head -20

# Erwartung: data: {"type":"pass0_complete",...} Zeilen
```

| # | Test | Erwartung | OK? |
|---|------|-----------|-----|
| 7.1 | `GET /api/pipeline/run` | HTTP 200, `Content-Type: text/event-stream` | ☐ |
| 7.2 | Erste Events im Stream | `pass0_complete` oder `log` Event innerhalb 10s | ☐ |

---

## Gesamtbewertung

| Bereich | Status |
|---------|--------|
| Dashboard | ☐ OK / ☐ Fehler |
| Leads-Seite | ☐ OK / ☐ Fehler |
| Lead-Detail (PassCard) | ☐ OK / ☐ Fehler |
| Pipeline (Live-Run) | ☐ OK / ☐ Fehler |
| Quellen-Seite | ☐ OK / ☐ Fehler |
| Pipeline-Runs | ☐ OK / ☐ Fehler |

**Demo-freigabe:** ☐ JA — alle Kernfunktionen OK | ☐ NEIN — Blocker vorhanden

---

## Bekannte Einschränkungen (kein Blocker)

- Pass 0 Open-Data ZIP-Import: noch nicht implementiert (wartet auf fflate/jszip)
- Kontakt-Details bei Deep Research: Tavily findet nicht immer Ansprechpartner → "Keine Kontakte" = erwartetes Verhalten
- Volumen `null` bei manchen Leads: TED-Notices ohne Schätzwert → WHO/VOLUME Block leer = OK

---

*Erstellt: 09.06.2026 | NetzWerkPlan Lead Engine v1.0-demo*
