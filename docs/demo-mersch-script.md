# Demo-Script: ORCA Lead Engine für NetzWerkPlan
> Zielgruppe: Mersch / NetzWerkPlan Sales-Team
> Dauer: ~8 Minuten
> Stand: 2026-06-07

## Setup-Check (vor der Demo, 2 Min)

- [ ] `npm run dev` läuft auf Port 3000
- [ ] Supabase erreichbar (Dashboard lädt Stats)
- [ ] Mindestens 10 Leads in DB (HOT-Lane nicht leer)
- [ ] Mindestens 1 OPENER-Lead vorhanden
- [ ] Browser-Tab: `localhost:3000` vorbereitet, F11 Fullscreen
- [ ] Dev-Tools geschlossen

---

## Ablauf (8 Minuten)

### 1. Einstieg — Das Problem (1 Min)

**Sagen:**
> "NetzWerkPlan erreicht heute Bauherren meist zu spät — wenn die Vergabe schon entschieden ist.
> Das hier ist eine Maschine, die Projekte findet, bevor sie öffentlich ausgeschrieben werden."

**Zeigen:** Dashboard, kurzer Blick auf die Zahlen (HOT, WARM, OPENER).

---

### 2. Das Schneeballprinzip — INDIRECT → OPENER → DIRECT (2 Min)

**Konzept erklären:**
> "Die Pipeline denkt in drei Hebeln:
> - DIRECT = wir sprechen den Bauherrn direkt an. Höchste Priorität.
> - OPENER = ein Architekt oder Planer hat gewonnen. Er öffnet die Tür zum Bauherrn.
> - INDIRECT = früher Hinweis, Bauherr noch unklar."

**Zeigen:**
1. Leads → HOT-Tab öffnen
2. DIRECT-Lead anklicken → Score, Persona, Sales-Strategie zeigen
3. Zurück → OPENER-Lead suchen (Badge `opener`)
4. OPENER-Lead anklicken → Lookup-Button zeigen

**Kernaussage:**
> "Aus einem Architekten-Wettbewerb wird ein verifizierter Bauherrn-Kontakt.
> Das ist das Schneeballprinzip."

---

### 3. Live-Lookup — OPENER → DIRECT (2 Min)

**Zeigen:**
1. OPENER-Lead öffnen (am besten mit Architekt-Name und Standort)
2. "Bauherrn-Lookup starten" klicken
3. Warten (~15-30s) — während des Wartens erklären:
   > "Tavily sucht jetzt live nach dem Bauherrn hinter diesem Projekt.
   > KI-Validator blockiert Fantasie-Namen — nur echte Organisationen werden gespeichert."
4. Neuer DIRECT-Lead erscheint → direkt weiterleiten
5. Detailseite zeigt "Erstellt aus OPENER-Lead [Link]"

**Wenn kein Bauherr gefunden:**
> "Die Maschine erfindet nichts. Kein Bauherr = kein Lead. Besser kein Treffer als ein falscher."

---

### 4. Pipeline starten (1 Min)

**Zeigen:**
1. Dashboard → "Pipeline starten"
2. Live-Stream: Pass 1 → 2 → 3 mit Events
3. Neue Leads erscheinen nach Abschluss in /leads

**Sagen:**
> "19 Quellen. Öffentliche Vergaben, Wettbewerbe, GU-Beauftragungen, Projektsteuerer.
> Läuft täglich automatisch — morgens sind frische Leads da."

---

### 5. Quellen & Priorität (1 Min)

**Zeigen:** Sources-Seite
- Persona-Gruppen: Bauherr öffentlich, privat, GU, Projektsteuerer, Planer
- P1/P2 Prioritäts-Badges

**Sagen:**
> "Jede Quelle ist einem Persona-Bucket zugeordnet.
> P1 täglich, P2 wöchentlich. Das steuern wir — keine manuellen Suchen mehr."

---

### 6. Abschluss (1 Min)

**Kernaussagen:**
- Kein Halluzinations-Risiko: Validator blockiert Platzhalter
- DIRECT vs OPENER: Vertrieb sieht sofort welchen Ansatz wählen
- Sales-Strategie pro Lead: KI liefert den nächsten Schritt
- Erweiterbar: neue Quellen per Seed, Apollo-Enrichment optional

**Nächste Schritte vorschlagen:**
> "Demo-Zugang einrichten, erste echte Pipeline-Woche, Outreach-Templates pro Hebel-Typ."

---

## Backup-Szenarien

| Problem | Lösung |
|---------|--------|
| Lookup dauert >30s | "Tavily sucht live — in Produktion gecacht" |
| Keine OPENER-Leads | Demo-Seed laufen lassen: `npm run demo:seed` |
| Pipeline-Timeout | "Das war absichtlich auf Demo-Limit=5 gestellt" |
| Schwarze Seite | `.next` löschen, `npm run dev` neu |

---

## Demo-Seed (stabile Fallback-Leads)

Wenn DB leer oder kein OPENER vorhanden:

```bash
# In Supabase SQL Editor ausführen:
# migrations/006_demo_seed_leads.sql
```

Erzeugt: 3 HOT/DIRECT, 2 WARM/OPENER, 1 COLD/INDIRECT — alle mit vollständigen v2-Feldern.
