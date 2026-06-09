# Quellenstrategie fuer aktuelle winplan-2.0-Leads

> Stand: 2026-06-08
> Ziel: Projekte finden, bevor Bauauftrag oder Bauausfuehrung gestartet sind.

## Produkt-Fit

winplan 2.0 ist besonders relevant, wenn viele Beteiligte, Plaene, Dokumente und Freigaben koordiniert werden muessen:

- Projektraum und automatisierte Dokumenten-Workflows fuer das Buero
- mobile Plaene, Aufgaben, Maengel und Bautagebuch fuer die Baustelle
- BIM-/IFC-Viewer und Kollisionspruefung fuer komplexe 3D-Projekte
- ISO-27001-zertifizierte CDE mit Hosting in deutschen Rechenzentren

Das beste Sales-Fenster liegt deshalb vor oder waehrend LP2-LP4. LP5+ und bereits gestartete Bauarbeiten sind fuer eine Neueinfuehrung normalerweise zu spaet.

## Option A - Strukturierte Vergabedaten zuerst

**Empfehlung:** Diese Option zuerst umsetzen. Sie liefert die aktuellsten und am besten filterbaren Signale.

### 1. Bekanntmachungsservice Oeffentliche Vergabe

Der Datenservice Oeffentlicher Einkauf buendelt Bekanntmachungen von Bund, Laendern und Kommunen. Die Open-Data-Schnittstelle stellt eForms, OCDS und CSV bereit.

**Gesucht werden:**

- Auftragsbekanntmachungen und Teilnahmewettbewerbe
- Vorinformationen und Markterkundungen
- Planungsleistungen fuer neue Hochbauprojekte
- Projektsteuerung nach AHO
- BIM-Management, BIM-Koordination und CDE/Projektraum

**Ausgeschlossen werden:**

- Vergabebekanntmachungen vergebener Auftraege
- Zuschlagsbekanntmachungen
- Bauausfuehrung bereits begonnen
- reine Tiefbau-, Strassen-, Bruecken- und Gleisbauprojekte ohne Hochbauanteil

### 2. TED Search API

Die offizielle TED Search API kann ohne Authentifizierung nach veroeffentlichten Bekanntmachungen durchsucht werden. Statt RSS sollen strukturierte Felder und Notice-Typen verwendet werden.

**Filter:**

- Land der Leistung: Deutschland
- Publikationsdatum: letzte 7 Tage, spaeter taeglicher Delta-Lauf
- Notice-Typ: Planung, Wettbewerbsausschreibung, Auftragsbekanntmachung, Vorinformation
- keine Result-/Award-Notices
- Frist muss in der Zukunft liegen

**Relevante CPV-Gruppen:**

- `71000000`: Dienstleistungen von Architektur-, Konstruktions- und Ingenieurbueros
- `71200000`: Dienstleistungen von Architekturbueros
- `71300000`: Dienstleistungen von Ingenieurbueros
- `71541000`: Projektmanagement im Bauwesen
- zusaetzlich Software-/Dokumentenmanagement-Codes fuer direkte CDE-Beschaffung pruefen

**Vorteile:**

- genaue Publikations- und Angebotsfristen
- Auftraggeber, Ort, CPV und Notice-Typ strukturiert
- keine KI noetig, um Award-Notices von offenen Verfahren zu unterscheiden

## Option B - Tavily fuer fruehe Projektsignale

Tavily bleibt fuer Quellen sinnvoll, die keine einheitliche API besitzen. Die Suche muss auf Zukunftssignale statt Projektrueckblicke umgestellt werden.

### Suchcluster 1 - Direkte CDE-/BIM-Beschaffung

```text
("Common Data Environment" OR CDE OR Projektraum OR
"Projektkommunikationssystem" OR BIM-Management OR BIM-Koordination OR
"Dokumentenmanagement Bau") (Ausschreibung OR Vergabe OR Markterkundung)
```

```text
(IFC OR BIM OR Kollisionspruefung OR Maengelmanagement OR Bautagebuch)
(Leistungsbeschreibung OR Vergabeunterlagen OR Teilnahmewettbewerb)
```

### Suchcluster 2 - Planungsstart grosser Hochbauprojekte

```text
("Objektplanung Gebaeude" OR Generalplanung OR Projektsteuerung OR
"Technische Ausruestung") (VgV OR Teilnahmewettbewerb OR Ausschreibung)
(Neubau OR Erweiterung OR Sanierung)
```

```text
(Klinik OR Krankenhaus OR Schule OR Campus OR Labor OR Verwaltungsgebaeude)
("Planungsleistungen" OR "Projektsteuerung") (Ausschreibung OR VgV)
```

### Suchcluster 3 - Beschluss und Finanzierung

```text
(Baubeschluss OR Planungsbeschluss OR Finanzierung beschlossen OR
Foerderbescheid OR Investitionsbeschluss)
(Neubau OR Erweiterung OR Generalsanierung)
```

```text
site:*.de (Ratsinformationssystem OR Sitzungsvorlage)
(Neubau OR Generalsanierung) (Planung OR Vergabe)
```

### Suchcluster 4 - Private Bauherren

```text
(investiert OR plant OR erweitert OR Bauantrag OR Baugenehmigung)
(Werk OR Klinik OR Logistikzentrum OR Labor OR Rechenzentrum OR Quartier)
("2026" OR "2027")
```

```text
site:company-domain.de (Presse OR News)
(Neubau OR Erweiterung OR Investition) (Planung OR genehmigt OR Baustart geplant)
```

### Negative Suchbegriffe

```text
-Referenz -fertiggestellt -eroeffnet -eingeweiht -gewonnen
-Preistraeger -Auftrag-vergeben -Baubeginn-erfolgt -Bauarbeiten-laufen
-Jahresbericht -Geschaeftsbericht
```

Die Negativbegriffe reduzieren Rauschen, ersetzen aber nicht die Hard-Filter im Match-Schritt.

## Option C - Firecrawl als gezielte Tiefenrecherche

Firecrawl ist kein Suchindex und soll nicht jede URL ungefiltert crawlen.

### Einsatz

1. Tavily oder eine strukturierte API findet eine aktuelle Bekanntmachung.
2. Firecrawl liest die Detailseite und verlinkte Vergabeunterlagen.
3. Die KI extrahiert:
   - Auftraggeber/Bauherr
   - Angebots- oder Teilnahmefrist
   - geplanten Planungs- und Baubeginn
   - Leistungsphasen
   - Projektvolumen
   - BIM-, CDE-, IFC- und Dokumentationsanforderungen
   - Projektsteuerer, Planer und beteiligte Gewerke
4. Der deterministische Filter entscheidet, ob das Sales-Fenster noch offen ist.

### Firecrawl nur ausloesen, wenn

- Tavily weniger als 1.000 Zeichen Inhalt liefert
- Frist, Projektphase oder Bauherr fehlen
- die Seite JavaScript-lastig ist
- relevante PDFs oder Vergabeunterlagen verlinkt sind
- der Lead nach dem ersten Scan grundsaetzlich relevant ist

### Spaetere Erweiterung

- `crawl` nur auf bekannten offiziellen Vergabedomaenen mit engem Pfad-Limit
- PDFs einzeln scrapen, nicht komplette Portale rekursiv crawlen
- URL und Abrufzeit je extrahiertem Fakt speichern

## Empfohlene Quellen-Prioritaet

### P0 - taeglich, strukturiert

1. Bekanntmachungsservice Oeffentliche Vergabe Open Data
2. TED Search API
3. service.bund.de / e-Vergabe Bund als Ergaenzung

### P1 - taeglich, zielgerichtete Suche

1. Vergabeportale der Bundeslaender
2. DTVP und Deutsche eVergabe
3. DB-Bieterportal fuer Hochbau, Stationen und Immobilien
4. Klinik-, Hochschul- und kommunale Bauvergabe
5. Planungs- und Projektsteuerungsvergaben

### P2 - fruehe Signale

1. Ratsinformationssysteme und kommunale Bau-/Planungsbeschluesse
2. Krankenhaus-Investitionsprogramme
3. Hochschulbau- und Landesbauprogramme
4. Pressebereiche grosser privater Bauherren
5. Bauantrags-, Bebauungsplan- und Foerdermeldungen

### P3 - nur als Opener

1. Wettbewerbsauslobungen vor Entscheidung
2. Wettbewerbsergebnisse nur, wenn Bauherr und naechste Planungsphase offen sind
3. Architekten-News nur mit konkretem zukuenftigem Projekt

## Neue Qualifikationslogik

Ein Lead ist fuer winplan 2.0 besonders stark, wenn mindestens eines dieser Signale vorhanden ist:

- offene Angebots-/Teilnahmefrist
- LP2-LP4 oder Planungsleistungen werden gerade vergeben
- Projektsteuerung/BIM-Management wird ausgeschrieben
- CDE, Projektraum, IFC, BIM-Abwicklungsplan oder Kollisionspruefung genannt
- komplexer Hochbau mit mehreren Fachplanern und langer Laufzeit
- Bauherr ist direkt identifizierbar und Bauausfuehrung hat noch nicht begonnen

Auto-NOT:

- Zuschlag/Bauauftrag bereits vergeben und Baubeginn liegt in der Vergangenheit
- Bauausfuehrung laeuft
- reine Projekt-Referenz oder Fertigstellungsmeldung
- reine Tiefbauleistung ohne relevanten Hochbau-/Koordinationsanteil
- Angebots- oder Teilnahmefrist abgelaufen

## Umsetzungsreihenfolge

1. Bekanntmachungsservice-Open-Data-Adapter untersuchen und gegen aktuelle Daten testen.
2. TED-Search-API-Adapter mit Notice-Typ-, CPV-, Datums- und Fristfiltern bauen.
3. Bestehende Tavily-Queries von Rueckblicken auf offene Planungs-/Vergabesignale umstellen.
4. `deadline`, `notice_type`, `procurement_stage` und `sales_window` als Pipeline-Felder planen.
5. Frist- und Award-Filter deterministisch vor dem Scoring anwenden.
6. Firecrawl auf Detailseiten und relevante PDFs begrenzen.
7. Quellenqualitaet messen: Treffer, relevante Leads, HOT/WARM, Auto-NOT und Duplikate pro Quelle.
